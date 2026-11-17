import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicEnv } from '@/config/env';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';
import { sendCommunityApplicationEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

const appStatusSchema = z.object({
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
  const parsed = appStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  const { data: app, error } = await guard.admin
    .from('community_applications')
    .update({ status: parsed.data.status })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not update application.' }, { status: 500 });
  }
  if (!app) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: `community.application_${parsed.data.status}`,
    entityType: 'community_application',
    entityId: userId,
    request,
  });

  if (parsed.data.status === 'approved' || parsed.data.status === 'declined') {
    await sendCommunityApplicationEmail({
      to: app.email,
      name: app.name,
      status: parsed.data.status,
      siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    });
  }

  return NextResponse.json({ ok: true, application: app });
}

