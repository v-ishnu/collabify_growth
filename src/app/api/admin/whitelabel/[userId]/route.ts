import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicEnv } from '@/config/env';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';
import { sendWhiteLabelUpdateEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

const wlUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'declined', 'removed']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = wlUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  const { data: app } = await guard.admin
    .from('wl_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: 'White-label application not found.' }, { status: 404 });
  }

  const { data: updated, error } = await guard.admin
    .from('wl_applications')
    .update({ status: parsed.data.status })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Could not update application.' }, { status: 500 });
  }

  if (parsed.data.status === 'approved') {
    await guard.admin.from('wl_partners').upsert(
      {
        user_id: userId,
        company: app.company,
        status: 'active',
        nda_signed_at: app.nda_agreed_at || new Date().toISOString(),
        manager_id: guard.user.id,
      },
      { onConflict: 'user_id' },
    );

    await sendWhiteLabelUpdateEmail({
      to: app.email,
      name: app.name,
      company: app.company,
      subject: 'Your White-Label Partner account is approved — Collabify Growth',
      heading: 'White-label access unlocked',
      message: 'Your agency has been approved as a white-label partner. Sign in and visit your portal to submit client briefs and attach supporting assets.',
      siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    });
  } else if (parsed.data.status === 'declined') {
    await sendWhiteLabelUpdateEmail({
      to: app.email,
      name: app.name,
      company: app.company,
      subject: 'Update on your White-Label application — Collabify Growth',
      heading: 'Update on your white-label application',
      message: 'Thank you for applying to our white-label program. Unfortunately we cannot onboard new partner capacity for your category right now.',
      siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: `whitelabel.${parsed.data.status}`,
    entityType: 'wl_application',
    entityId: userId,
    details: { company: app.company },
    request,
  });

  return NextResponse.json({ ok: true, application: updated });
}

