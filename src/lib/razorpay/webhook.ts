export type MembershipTransition =
  | 'activate'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | null;

export function resolveMembershipTransition(eventType: string): MembershipTransition {
  if (
    eventType === 'subscription.activated' ||
    eventType === 'subscription.charged' ||
    eventType === 'subscription.resumed'
  ) {
    return 'activate';
  }
  if (
    eventType === 'subscription.halted' ||
    eventType === 'subscription.pending' ||
    eventType === 'subscription.paused' ||
    eventType === 'payment.failed'
  ) {
    return 'past_due';
  }
  if (eventType === 'subscription.cancelled') {
    return 'cancelled';
  }
  if (eventType === 'subscription.completed' || eventType === 'subscription.expired') {
    return 'expired';
  }
  return null;
}

const PROCESSING_STALE_MS = 120_000;

export function decideWebhookProcessing(
  existing: { status?: string | null; processed_at?: string | null } | null,
  nowMs = Date.now(),
): 'proceed' | 'duplicate' | 'in_progress' {
  if (!existing) return 'proceed';
  const status = existing.status ?? 'processed';

  if (status === 'processed') return 'duplicate';
  if (status === 'failed') return 'proceed';

  if (status === 'processing') {
    const startedMs = existing.processed_at ? Date.parse(existing.processed_at) : NaN;
    if (!Number.isNaN(startedMs) && nowMs - startedMs < PROCESSING_STALE_MS) {
      return 'in_progress';
    }
    return 'proceed';
  }

  return 'duplicate';
}

