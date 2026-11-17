import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { getServerEnv } from '@/config/env';

let rzpClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  if (!rzpClient) {
    rzpClient = new Razorpay({
      key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return rzpClient;
}

export function getPlanConfig(plan: 'monthly' | 'annual'): {
  planId: string;
  amountPaise: number;
  label: string;
  totalCount: number;
} {
  const env = getServerEnv();
  if (plan === 'annual') {
    return {
      planId: env.RAZORPAY_PLAN_ANNUAL,
      amountPaise: 14_999 * 100,
      label: 'Annual membership (₹14,999/year)',
      totalCount: 5,
    };
  }
  return {
    planId: env.RAZORPAY_PLAN_MONTHLY,
    amountPaise: 1_999 * 100,
    label: 'Monthly membership (₹1,999/month)',
    totalCount: 60,
  };
}

function timingSafeHexEqual(expectedHex: string, providedHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(providedHex.trim(), 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyRazorpaySubscriptionSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const env = getServerEnv();
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const payload = `${params.paymentId}|${params.subscriptionId}`;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  return timingSafeHexEqual(expected, params.signature);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const env = getServerEnv();
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return timingSafeHexEqual(expected, signatureHeader);
}

