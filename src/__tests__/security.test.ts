import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptSensitiveJson,
  encryptSensitiveJson,
  hashIp,
  maskIdentifier,
} from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  verifyRazorpaySubscriptionSignature,
  verifyRazorpayWebhookSignature,
} from '@/lib/razorpay';
import { mdToHtml } from '@/lib/markdown';

describe('Security, Encryption, Payments & XSS defenses', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.APP_ENCRYPTION_SECRET = 'test-encryption-secret-32-chars-min';
    process.env.IP_HASH_SALT = 'test-ip-salt';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret_12345';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_webhook_secret_67890';
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('encrypts and decrypts affiliate payout JSON round-trip and masks identifiers', () => {
    const secretPayload = {
      method: 'Bank transfer',
      account_holder: 'Asha Mehta',
      account_number: '998877665544',
      ifsc: 'ICIC0001234',
    };
    const token = encryptSensitiveJson(secretPayload);
    expect(token).not.toContain('998877665544');

    const decoded = decryptSensitiveJson(token);
    expect(decoded).toEqual(secretPayload);

    expect(maskIdentifier('998877665544')).toBe('••••5544');
    expect(maskIdentifier('123')).toBe('****');
    expect(hashIp('203.0.113.10')).toHaveLength(32);
    expect(hashIp(null)).toBeNull();
  });

  it('enforces sliding-window rate limits per key', () => {
    const key = `test-rl-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('verifies valid Razorpay subscription and webhook HMAC signatures and rejects tampering', () => {
    const payId = 'pay_test123';
    const subId = 'sub_test456';
    const validSig = crypto
      .createHmac('sha256', 'rzp_test_secret_12345')
      .update(`${payId}|${subId}`)
      .digest('hex');

    expect(
      verifyRazorpaySubscriptionSignature({
        paymentId: payId,
        subscriptionId: subId,
        signature: validSig,
      }),
    ).toBe(true);

    expect(
      verifyRazorpaySubscriptionSignature({
        paymentId: payId,
        subscriptionId: 'sub_tampered',
        signature: validSig,
      }),
    ).toBe(false);

    const body = JSON.stringify({ event: 'subscription.activated', payload: {} });
    const whSig = crypto
      .createHmac('sha256', 'rzp_webhook_secret_67890')
      .update(body)
      .digest('hex');

    expect(verifyRazorpayWebhookSignature(body, whSig)).toBe(true);
    expect(verifyRazorpayWebhookSignature(body + ' ', whSig)).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, null)).toBe(false);
  });

  it('sanitizes dangerous HTML and javascript: links in markdown rendering', () => {
    const evil = `# Title\n\n<script>alert(1)</script>\n\n[Click me](javascript:alert(1))\n\nSafe **bold** text.`;
    const html = mdToHtml(evil);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<strong>bold</strong>');
  });
});

