import { z } from 'zod';
import { getServerEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPlanConfig, getRazorpayClient } from '@/lib/razorpay';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const subSchema = z.object({
  plan: z.enum(['monthly', 'annual']),
});

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Sign in required.', 401);
    }

    const rl = checkRateLimit(`rzp-sub:${user.id}`, 8, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many checkout attempts. Try again shortly.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = subSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Choose monthly or annual plan.', 400);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const [{ data: app }, { data: existingMem }] = await Promise.all([
      admin
        .from('community_applications')
        .select('status, name, email')
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('memberships')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!app || app.status !== 'approved') {
      return apiError(
        'FORBIDDEN',
        'An approved community application is required before checkout.',
        403,
      );
    }

    const alreadyActive =
      existingMem?.status === 'active' &&
      (!existingMem.current_period_end || Date.parse(existingMem.current_period_end) > Date.now());
    if (alreadyActive) {
      return apiError(
        'CONFLICT',
        'You already have an active community membership.',
        409,
      );
    }

    const rzp = getRazorpayClient();
    const env = getServerEnv();
    const planCfg = getPlanConfig(parsed.data.plan);

    if (!rzp || !planCfg.planId) {
      return apiError(
        'SERVICE_UNAVAILABLE',
        'Razorpay subscription billing is not yet configured in environment variables.',
        503,
      );
    }

    const subscription = await rzp.subscriptions.create({
      plan_id: planCfg.planId,
      customer_notify: 1,
      total_count: planCfg.totalCount,
      notes: {
        user_id: user.id,
        plan: parsed.data.plan,
        email: app.email,
      },
    });

    return apiOk({
      subscriptionId: subscription.id,
      keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      name: 'Collabify Community',
      description: planCfg.label,
    });
  } catch (err) {
    console.error('[api/payments/razorpay/subscription] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to initialize subscription checkout.', 500);
  }
}
