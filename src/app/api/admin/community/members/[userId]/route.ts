import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const memberStatusSchema = z.object({
  status: z.enum(['active', 'past_due', 'cancelled', 'expired']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = memberStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid membership status.' }, { status: 400 });
  }

  const { data: mem, error } = await guard.admin
    .from('memberships')
    .update({
      status: parsed.data.status,
      cancelled_at: parsed.data.status === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not update membership.' }, { status: 500 });
  }
  if (!mem) {
    return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'community.member_status_changed',
    entityType: 'membership',
    entityId: userId,
    details: { status: parsed.data.status },
    request,
  });

  return NextResponse.json({ ok: true, membership: mem });
}

