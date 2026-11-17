import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateEnquirySchema = z.object({
  stage: z.enum(['New', 'Contacted', 'Proposal sent', 'Won', 'Lost']),
  value_inr: z.number().int().min(0).max(500_000_000).nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateEnquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid enquiry update payload.' }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {
    stage: parsed.data.stage,
  };
  if (parsed.data.value_inr !== undefined) {
    updateFields.value_inr = parsed.data.value_inr;
  }
  if (parsed.data.owner_id !== undefined) {
    updateFields.owner_id = parsed.data.owner_id;
  }

  const { data, error } = await guard.admin
    .from('enquiries')
    .update(updateFields)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not update enquiry.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'enquiry.updated',
    entityType: 'enquiry',
    entityId: id,
    details: updateFields,
    request,
  });

  return NextResponse.json({ ok: true, enquiry: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffSession(true, request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const { error } = await guard.admin.from('enquiries').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Could not delete enquiry.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'enquiry.deleted',
    entityType: 'enquiry',
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}

