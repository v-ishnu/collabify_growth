import { getServerEnv } from '@/config/env';

export interface TurnstileVerification {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
}

export function extractClientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  return cfIp || null;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<TurnstileVerification> {
  const env = getServerEnv();
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Allow form submissions in local/unconfigured dev environments while keeping strict enforcement once configured.
    if (process.env.NODE_ENV === 'production' && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      return { ok: false, errorCodes: ['missing-turnstile-secret'] };
    }
    return { ok: true, skipped: true };
  }

  if (!token || !token.trim()) {
    return { ok: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      return { ok: false, errorCodes: [`http-${res.status}`] };
    }

    const data = (await res.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };
    return {
      ok: Boolean(data.success),
      errorCodes: data['error-codes'],
    };
  } catch {
    return { ok: false, errorCodes: ['verification-request-failed'] };
  }
}

