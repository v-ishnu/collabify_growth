import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const referralUpdateSchema = z.object({
  code: z.string().trim().min(2).max(24).optional().nullable(),
  status: z.enum(['Lead', 'Proposal sent', 'Won', 'Commission paid', 'Not converted']),
  commission_inr: z.number().int().min(0).max(50_000_000).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ enquiryId: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { enquiryId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = referralUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid referral update.' }, { status: 400 });
  }

  const cleanCode = parsed.data.code
    ? parsed.data.code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    : null;

  const { data: existing } = await guard.admin
    .from('referrals')
    .select('*')
    .eq('enquiry_id', enquiryId)
    .maybeSingle();

  const targetCode = existing?.code || cleanCode;
  if (!targetCode) {
    return NextResponse.json(
      { error: 'An approved affiliate code is required for referral tracking.' },
      { status: 400 },
    );
  }

  const { data: aff } = await guard.admin
    .from('affiliates')
    .select('code')
    .eq('code', targetCode)
    .eq('status', 'approved')
    .maybeSingle();

  if (!aff) {
    return NextResponse.json(
      { error: 'No approved affiliate matches that partner code.' },
      { status: 400 },
    );
  }

  const { data: referral, error } = await guard.admin
    .from('referrals')
    .upsert(
      {
        enquiry_id: enquiryId,
        code: aff.code,
        status: parsed.data.status,
        commission_inr: parsed.data.commission_inr ?? null,
      },
      { onConflict: 'enquiry_id' },
    )
    .select('*')
    .single();

  if (error || !referral) {
    return NextResponse.json({ error: 'Could not update referral.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'referral.updated',
    entityType: 'referral',
    entityId: enquiryId,
    details: { status: parsed.data.status, commission_inr: parsed.data.commission_inr ?? null },
    request,
  });

  return NextResponse.json({ ok: true, referral });
}

