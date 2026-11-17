import crypto from 'node:crypto';
import { publicEnv } from '@/config/env';
import { apiError, apiOk } from '@/lib/api/response';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import {
  decideWebhookProcessing,
  resolveMembershipTransition,
} from '@/lib/razorpay/webhook';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import {
  sendPaymentFailedEmail,
  sendSubscriptionConfirmedEmail,
} from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

interface RazorpayWebhookPayload {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        subscription_id?: string;
        notes?: Record<string, unknown>;
        email?: string;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number;
        ended_at?: number;
        plan_id?: string;
        notes?: Record<string, unknown>;
      };
    };
  };
}

export async function POST(request: Request) {
  let admin: ReturnType<typeof getSupabaseAdminClient> = null;
  let eventId = '';

  try {
    const rawBody = await request.text();
    const sig = request.headers.get('x-razorpay-signature');

    if (!verifyRazorpayWebhookSignature(rawBody, sig)) {
      return apiError('VALIDATION_ERROR', 'Invalid webhook signature.', 400);
    }

    let parsed: RazorpayWebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return apiError('VALIDATION_ERROR', 'Malformed webhook payload.', 400);
    }

    const eventType = parsed.event || 'unknown';
    const eventIdHeader = request.headers.get('x-razorpay-event-id');
    eventId =
      eventIdHeader ||
      crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 48);

    admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    // Phase 1: Acquire two-phase idempotency lock in webhook_events
    const { error: idempErr } = await admin.from('webhook_events').insert({
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      status: 'processing',
      error_message: null,
      processed_at: new Date().toISOString(),
      payload: parsed as unknown as Record<string, unknown>,
    });

    if (idempErr) {
      if (idempErr.code !== '23505') {
        console.error('[webhook/razorpay] webhook_events insert error:', idempErr);
        return apiError('INTERNAL_ERROR', 'Could not record webhook.', 500);
      }

      const { data: existing } = await admin
        .from('webhook_events')
        .select('status, processed_at')
        .eq('provider', 'razorpay')
        .eq('event_id', eventId)
        .maybeSingle<{ status?: string | null; processed_at?: string | null }>();

      const decision = decideWebhookProcessing(existing ?? null);
      if (decision === 'duplicate') {
        return apiOk({ duplicate: true });
      }
      if (decision === 'in_progress') {
        return apiError('CONFLICT', 'Webhook event is currently being processed.', 409);
      }

      // Retryable: reclaim failed or stale processing event row
      const { error: reclaimErr } = await admin
        .from('webhook_events')
        .update({
          status: 'processing',
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq('provider', 'razorpay')
        .eq('event_id', eventId);

      if (reclaimErr) {
        console.error('[webhook/razorpay] lock reclaim error:', reclaimErr);
        return apiError('INTERNAL_ERROR', 'Could not acquire webhook lock.', 500);
      }
    }

    // Phase 2: Process payment record & membership state transition
    const payment = parsed.payload?.payment?.entity;
    const subscription = parsed.payload?.subscription?.entity;
    const subId = subscription?.id || payment?.subscription_id || null;

    let userId: string | null =
      (subscription?.notes?.user_id as string | undefined) ||
      (payment?.notes?.user_id as string | undefined) ||
      null;

    if (!userId && subId) {
      const { data: existingMem } = await admin
        .from('memberships')
        .select('user_id')
        .eq('razorpay_subscription_id', subId)
        .maybeSingle();
      userId = existingMem?.user_id ?? null;
    }

    const plan =
      (subscription?.notes?.plan as string | undefined) ||
      (payment?.notes?.plan as string | undefined) ||
      'monthly';

    if (payment?.id) {
      const { error: payErr } = await admin.from('payments').upsert(
        {
          id: payment.id,
          user_id: userId,
          purpose: 'community_membership',
          amount_paise: Number(payment.amount || 0),
          currency: payment.currency || 'INR',
          status: payment.status || eventType,
          razorpay_subscription_id: subId,
          raw: parsed as unknown as Record<string, unknown>,
        },
        { onConflict: 'id' },
      );
      if (payErr) {
        throw new Error(`Payment upsert failed: ${payErr.message}`);
      }
    }

    const transition = resolveMembershipTransition(eventType);

    if (userId && transition) {
      const [{ data: app }, { data: prof }] = await Promise.all([
        admin.from('community_applications').select('*').eq('user_id', userId).maybeSingle(),
        admin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle(),
      ]);

      const targetEmail = app?.email || prof?.email || payment?.email || '';
      const targetName = app?.name || prof?.full_name || 'Member';
      const periodEnd = subscription?.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : null;

      if (transition === 'activate') {
        const { error: memErr } = await admin.from('memberships').upsert(
          {
            user_id: userId,
            plan,
            status: 'active',
            razorpay_subscription_id: subId,
            current_period_end: periodEnd,
            cancelled_at: null,
            display_name: targetName,
            role: app?.role ?? null,
            company: app?.company ?? null,
            city: app?.city ?? null,
            linkedin: app?.linkedin ?? null,
            interests: app?.interests ?? [],
            working_on: app?.working_on ?? null,
          },
          { onConflict: 'user_id' },
        );
        if (memErr) {
          throw new Error(`Membership activation failed: ${memErr.message}`);
        }

        if (
          targetEmail &&
          (eventType === 'subscription.activated' || eventType === 'subscription.resumed')
        ) {
          await sendSubscriptionConfirmedEmail({
            to: targetEmail,
            name: targetName,
            plan,
            periodEnd,
            siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
          });
        }
      } else if (transition === 'past_due') {
        const { error: memErr } = await admin
          .from('memberships')
          .update({ status: 'past_due' })
          .eq('user_id', userId);
        if (memErr) {
          throw new Error(`Membership past_due update failed: ${memErr.message}`);
        }

        if (targetEmail) {
          await sendPaymentFailedEmail({
            to: targetEmail,
            name: targetName,
            siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
          });
        }
      } else if (transition === 'cancelled' || transition === 'expired') {
        const { error: memErr } = await admin
          .from('memberships')
          .update({
            status: transition,
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (memErr) {
          throw new Error(`Membership termination update failed: ${memErr.message}`);
        }
      }
    }

    await admin
      .from('webhook_events')
      .update({
        status: 'processed',
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq('provider', 'razorpay')
      .eq('event_id', eventId);

    await writeAuditLog({
      actorId: userId,
      action: `webhook.razorpay.${eventType}`,
      entityType: 'subscription',
      entityId: subId || payment?.id || eventId,
      details: { eventId, status: payment?.status || subscription?.status || eventType },
    });

    return apiOk({ processed: true });
  } catch (err) {
    console.error('[webhook/razorpay] unhandled error:', err);
    if (admin && eventId) {
      await admin
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message.slice(0, 500) : 'Processing failed',
        })
        .eq('provider', 'razorpay')
        .eq('event_id', eventId);
    }
    return apiError('INTERNAL_ERROR', 'Webhook processing error.', 500);
  }
}
