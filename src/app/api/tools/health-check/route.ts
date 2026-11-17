import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/turnstile';
import { healthCheckSaveSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const ipHash = hashIp(extractClientIp(request));
    const rl = checkRateLimit(`hc:${ipHash ?? 'anon'}`, 20, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = healthCheckSaveSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid health check payload.', 400);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiOk({ stored: false });
    }

    const { error } = await admin.from('health_check_results').insert({
      enquiry_id: parsed.data.enquiry_id ?? null,
      answers: parsed.data.answers,
      total_score: parsed.data.total_score,
    });

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not store results.', 500);
    }

    return apiOk({ stored: true }, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to process health check results.', 500);
  }
}

