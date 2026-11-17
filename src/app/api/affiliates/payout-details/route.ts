import { getServerEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { encryptSensitiveJson, maskIdentifier } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile } from '@/lib/supabase/server';
import { affiliatePayoutDetailsSchema } from '@/lib/validation/schemas';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const rl = checkRateLimit(`aff-payout:${user.id}`, 10, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many updates. Try again shortly.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = affiliatePayoutDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Invalid payout details.',
        400,
      );
    }

    const env = getServerEnv();
    if (!env.APP_ENCRYPTION_SECRET) {
      return apiError(
        'SERVICE_UNAVAILABLE',
        'Encryption key is not configured for storing payout details.',
        503,
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: aff } = await admin
      .from('affiliates')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!aff || aff.status !== 'approved') {
      return apiError('FORBIDDEN', 'Approved affiliate account required.', 403);
    }

    const data = parsed.data;
    const masked =
      data.method === 'UPI'
        ? `UPI ${maskIdentifier(data.upi_id)}`
        : `${data.account_holder} · A/C ${maskIdentifier(data.account_number)} (${data.ifsc})`;

    const cipher = encryptSensitiveJson(data as unknown as Record<string, unknown>);
    const envelope = {
      method: data.method,
      masked,
      cipher,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from('affiliates')
      .update({ payout_details: envelope })
      .eq('user_id', user.id);

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not save payout details.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'affiliate.payout_details_updated',
      entityType: 'affiliate',
      entityId: user.id,
      details: { method: data.method, masked },
      request,
    });

    return apiOk({ masked });
  } catch (err) {
    console.error('[api/affiliates/payout-details] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to store payout details.', 500);
  }
}
