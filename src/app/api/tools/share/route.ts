import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { generateShortId, hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/turnstile';
import { shareLinkCreateSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const ipHash = hashIp(extractClientIp(request));
    const rl = checkRateLimit(`share:${ipHash ?? 'anon'}`, 30, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many links created.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = shareLinkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid share link payload.', 400);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Short links unavailable without database.', 503);
    }

    const id = generateShortId(7);
    const { error } = await admin.from('share_links').insert({
      id,
      kind: parsed.data.kind,
      payload: parsed.data.payload,
    });

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not save share link.', 500);
    }

    const prefix = parsed.data.kind === 'mediakit' ? '/c' : '/i';
    return apiOk({ id, path: `${prefix}/${id}` }, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to create share link.', 500);
  }
}

