import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const payoutSchema = z.object({
  affiliate_id: z.string().uuid(),
  amount_inr: z.number().int().positive().max(10_000_000),
  method: z.enum(['UPI', 'Bank transfer']),
  reference: z.string().trim().max(120).nullable().optional(),
});

export async function POST(request: Request) {
  const guard = await requireStaffSession(true, request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Enter a valid payout amount.' },
      { status: 400 },
    );
  }

  const { data: payout, error } = await guard.admin
    .from('payouts')
    .insert({
      affiliate_id: parsed.data.affiliate_id,
      amount_inr: parsed.data.amount_inr,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
    })
    .select('*')
    .single();

  if (error || !payout) {
    return NextResponse.json({ error: 'Could not record payout.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: 'affiliate.payout_recorded',
    entityType: 'payout',
    entityId: String(payout.id),
    details: {
      affiliate_id: parsed.data.affiliate_id,
      amount_inr: parsed.data.amount_inr,
      method: parsed.data.method,
    },
    request,
  });

  return NextResponse.json({ ok: true, payout }, { status: 201 });
}

