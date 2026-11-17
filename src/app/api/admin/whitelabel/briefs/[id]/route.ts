import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicEnv } from '@/config/env';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';
import { sendWhiteLabelUpdateEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

const briefStatusSchema = z.object({
  status: z.enum(['Received', 'Scoping', 'Quoted', 'In progress', 'Delivered', 'On hold']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = briefStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid brief status.' }, { status: 400 });
  }

  const { data: brief, error } = await guard.admin
    .from('wl_briefs')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not update brief.' }, { status: 500 });
  }
  if (!brief) {
    return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });
  }

  const [{ data: app }, { data: prof }] = await Promise.all([
    guard.admin.from('wl_applications').select('email, name, company').eq('user_id', brief.partner_id).maybeSingle(),
    guard.admin.from('profiles').select('email, full_name').eq('id', brief.partner_id).maybeSingle(),
  ]);

  const to = app?.email || prof?.email;
  if (to) {
    await sendWhiteLabelUpdateEmail({
      to,
      name: app?.name || prof?.full_name || 'Partner',
      company: app?.company || 'Your agency',
      subject: `Brief ${brief.id} status updated to ${parsed.data.status}`,
      heading: `Brief status updated: ${parsed.data.status}`,
      message: `Your white-label brief “${brief.title}” (${brief.id}) is now marked as ${parsed.data.status}.`,
      siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'whitelabel.brief_status_updated',
    entityType: 'wl_brief',
    entityId: id,
    details: { status: parsed.data.status },
    request,
  });

  return NextResponse.json({ ok: true, brief });
}

