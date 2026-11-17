import { describe, expect, it } from 'vitest';
import {
  apiError,
  apiOk,
  assertSameOrigin,
  safeRedirectTarget,
} from '@/lib/api/response';
import {
  decideWebhookProcessing,
  resolveMembershipTransition,
} from '@/lib/razorpay/webhook';
import { isAdminRole, isStaffRole } from '@/lib/supabase/server';

describe('API Response Envelope, CSRF Guards & Auth Hardening', () => {
  it('produces uniform structured JSON envelopes without leaking internals', async () => {
    const okRes = apiOk({ id: 'CG-1234', count: 2 }, { status: 201 });
    expect(okRes.status).toBe(201);
    const okBody = await okRes.json();
    expect(okBody).toEqual({
      success: true,
      ok: true,
      id: 'CG-1234',
      count: 2,
    });

    const errRes = apiError('VALIDATION_ERROR', 'Check required fields.', 400, { field: 'email' });
    expect(errRes.status).toBe(400);
    const errBody = await errRes.json();
    expect(errBody).toEqual({
      success: false,
      ok: false,
      error: 'Check required fields.',
      errorCode: 'VALIDATION_ERROR',
      errorDetail: {
        code: 'VALIDATION_ERROR',
        message: 'Check required fields.',
        details: { field: 'email' },
      },
    });
  });

  it('blocks cross-origin mutations and permits matching host origins', async () => {
    const crossSiteReq = new Request('https://collabify.growth/api/enquiries', {
      method: 'POST',
      headers: {
        host: 'collabify.growth',
        'sec-fetch-site': 'cross-site',
      },
    });
    const res1 = assertSameOrigin(crossSiteReq);
    expect(res1.ok).toBe(false);
    if (!res1.ok) {
      expect(res1.response.status).toBe(403);
    }

    const evilOriginReq = new Request('https://collabify.growth/api/admin/overview', {
      method: 'POST',
      headers: {
        host: 'collabify.growth',
        origin: 'https://attacker.example',
      },
    });
    const res2 = assertSameOrigin(evilOriginReq);
    expect(res2.ok).toBe(false);

    const evilRefererReq = new Request('https://collabify.growth/api/blog/posts', {
      method: 'POST',
      headers: {
        host: 'collabify.growth',
        referer: 'https://attacker.example/csrf.html',
      },
    });
    const res3 = assertSameOrigin(evilRefererReq);
    expect(res3.ok).toBe(false);

    const validOriginReq = new Request('https://collabify.growth/api/enquiries', {
      method: 'POST',
      headers: {
        'x-forwarded-host': 'collabify.growth',
        origin: 'https://collabify.growth',
        'sec-fetch-site': 'same-origin',
      },
    });
    expect(assertSameOrigin(validOriginReq).ok).toBe(true);
  });

  it('rejects open-redirect and backslash bypass targets in post-login navigation', () => {
    expect(safeRedirectTarget('/admin?tab=users#top')).toBe('/admin?tab=users#top');
    expect(safeRedirectTarget('/white-label')).toBe('/white-label');
    expect(safeRedirectTarget(null)).toBe('/community');
    expect(safeRedirectTarget('https://evil.com')).toBe('/community');
    expect(safeRedirectTarget('//evil.com')).toBe('/community');
    expect(safeRedirectTarget('/\\evil.com')).toBe('/community');
    expect(safeRedirectTarget('/safe\\evil')).toBe('/community');
    expect(safeRedirectTarget('javascript:alert(1)')).toBe('/community');
    expect(safeRedirectTarget('/admin\r\nLocation: https://evil.com')).toBe('/community');
  });

  it('enforces staff and admin role separation accurately', () => {
    expect(isStaffRole('owner')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('editor')).toBe(true);
    expect(isStaffRole('user')).toBe(false);
    expect(isStaffRole(null)).toBe(false);

    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('editor')).toBe(false);
    expect(isAdminRole('user')).toBe(false);
  });
});

describe('Razorpay Two-Phase Webhook Idempotency & State Machine', () => {
  it('handles fresh, duplicate, failed, active-lock, and stale-lock webhook records', () => {
    const now = Date.UTC(2026, 10, 12, 12, 0, 0);

    expect(decideWebhookProcessing(null, now)).toBe('proceed');
    expect(decideWebhookProcessing({ status: 'processed', processed_at: new Date(now).toISOString() }, now)).toBe(
      'duplicate',
    );
    expect(decideWebhookProcessing({ status: 'failed', processed_at: new Date(now).toISOString() }, now)).toBe(
      'proceed',
    );
    expect(
      decideWebhookProcessing({ status: 'processing', processed_at: new Date(now - 20_000).toISOString() }, now),
    ).toBe('in_progress');
    expect(
      decideWebhookProcessing({ status: 'processing', processed_at: new Date(now - 180_000).toISOString() }, now),
    ).toBe('proceed');
  });

  it('maps Razorpay webhook event names cleanly to membership lifecycle transitions', () => {
    expect(resolveMembershipTransition('subscription.activated')).toBe('activate');
    expect(resolveMembershipTransition('subscription.charged')).toBe('activate');
    expect(resolveMembershipTransition('subscription.resumed')).toBe('activate');
    expect(resolveMembershipTransition('subscription.paused')).toBe('past_due');
    expect(resolveMembershipTransition('subscription.halted')).toBe('past_due');
    expect(resolveMembershipTransition('subscription.pending')).toBe('past_due');
    expect(resolveMembershipTransition('payment.failed')).toBe('past_due');
    expect(resolveMembershipTransition('subscription.cancelled')).toBe('cancelled');
    expect(resolveMembershipTransition('subscription.expired')).toBe('expired');
    expect(resolveMembershipTransition('subscription.completed')).toBe('expired');
    expect(resolveMembershipTransition('payment.authorized')).toBeNull();
  });
});

