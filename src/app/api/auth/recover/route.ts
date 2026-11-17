import { z } from 'zod';
import { getServerEnv, publicEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/turnstile';
import { sendPasswordRecoveryEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

const recoverSchema = z.object({
  email: z.string().trim().email().max(200),
});

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const ipHash = hashIp(extractClientIp(request));
    const rl = checkRateLimit(`recover:${ipHash ?? 'anon'}`, 5, 15 * 60_000);
    if (!rl.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Too many password reset requests. Try again shortly.',
        429,
        undefined,
        { 'Retry-After': String(rl.retryAfterSeconds) },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = recoverSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Enter a valid email address.', 400);
    }

    const admin = getSupabaseAdminClient();
    const env = getServerEnv();
    const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

    if (!admin || !env.RESEND_API_KEY) {
      return apiOk({ fallbackClient: true });
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: parsed.data.email.toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
      },
    });

    if (!error && data?.properties?.action_link) {
      await sendPasswordRecoveryEmail({
        to: parsed.data.email.toLowerCase(),
        recoveryLink: data.properties.action_link,
      });
    }

    // Never reveal whether the email exists in auth.users
    return apiOk({});
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to start password recovery.', 500);
  }
}

