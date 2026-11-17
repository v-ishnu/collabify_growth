import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateShortId } from '@/lib/crypto';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const affiliateUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'declined', 'removed']),
});

function buildAffiliateCode(name: string): string {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6) || 'PARTNER';
  const suffix = generateShortId(3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `${letters}${suffix}`.slice(0, 12);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffSession(false, request);
  if (!guard.ok) return guard.response;

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = affiliateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid affiliate status.' }, { status: 400 });
  }

  const { data: current } = await guard.admin
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: 'Affiliate application not found.' }, { status: 404 });
  }

  const updateFields: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === 'approved') {
    if (!current.code) {
      updateFields.code = buildAffiliateCode(current.name);
    }
    if (!current.approved_at) {
      updateFields.approved_at = new Date().toISOString();
    }
  }

  const { data, error } = await guard.admin
    .from('affiliates')
    .update(updateFields)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update affiliate status.' }, { status: 500 });
  }

  await writeAuditLog({
    actorId: guard.user.id,
    action: `affiliate.${parsed.data.status}`,
    entityType: 'affiliate',
    entityId: userId,
    details: { code: data.code },
    request,
  });

  return NextResponse.json({ ok: true, affiliate: { ...data, payout_details: null } });
}

