import { z } from 'zod';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getRazorpayClient, verifyRazorpaySubscriptionSignature } from '@/lib/razorpay';
import { getSessionUserAndProfile } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  razorpay_payment_id: z.string().trim().min(4).max(100),
  razorpay_subscription_id: z.string().trim().min(4).max(100),
  razorpay_signature: z.string().trim().min(10).max(200),
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
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const rl = checkRateLimit(`rzp-verify:${user.id}`, 12, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many verification attempts.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid payment confirmation payload.', 400);
    }

    const sigValid = verifyRazorpaySubscriptionSignature({
      paymentId: parsed.data.razorpay_payment_id,
      subscriptionId: parsed.data.razorpay_subscription_id,
      signature: parsed.data.razorpay_signature,
    });

    if (!sigValid) {
      await writeAuditLog({
        actorId: user.id,
        action: 'payment.signature_invalid',
        entityType: 'payment',
        entityId: parsed.data.razorpay_payment_id,
        details: { subscription_id: parsed.data.razorpay_subscription_id },
        request,
      });
      return apiError('VALIDATION_ERROR', 'Payment signature verification failed.', 400);
    }

    // Verify ownership server-side directly against Razorpay API; final activation happens in verified webhook.
    const rzp = getRazorpayClient();
    if (rzp) {
      const sub = await rzp.subscriptions.fetch(parsed.data.razorpay_subscription_id);
      const subNotesUserId =
        sub && typeof sub.notes === 'object' && sub.notes !== null
          ? (sub.notes as Record<string, unknown>).user_id
          : null;
      if (subNotesUserId && subNotesUserId !== user.id) {
        return apiError('FORBIDDEN', 'Subscription ownership mismatch.', 403);
      }
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'payment.checkout_verified',
      entityType: 'payment',
      entityId: parsed.data.razorpay_payment_id,
      details: {
        subscription_id: parsed.data.razorpay_subscription_id,
        plan: parsed.data.plan,
      },
      request,
    });

    return apiOk({ pendingWebhookSettlement: true });
  } catch (err) {
    console.error('[api/payments/razorpay/verify] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to verify payment signature.', 500);
  }
}

