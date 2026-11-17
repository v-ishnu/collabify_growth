import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const specialistStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'approved', 'declined']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = specialistStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid specialist status.' }, { status: 400 });
  }

  const { data, error } = await guard.admin
    .from('specialist_applications')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not update specialist application.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Specialist application not found.' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'specialist.status_updated',
    entityType: 'specialist_application',
    entityId: id,
    details: { status: parsed.data.status },
    request,
  });

  return NextResponse.json({ ok: true, specialist: data });
}

