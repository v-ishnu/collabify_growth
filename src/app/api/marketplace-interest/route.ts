import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { generateShortId, hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp, verifyTurnstileToken } from '@/lib/turnstile';
import { marketplaceInterestSchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const POLICY_VERSION = '2026-04-01';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const clientIp = extractClientIp(request);
    const ipHash = hashIp(clientIp);
    const rl = checkRateLimit(`mkt:${ipHash ?? 'anon'}`, 10, 60 * 60_000);
    if (!rl.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Too many submissions. Please wait before trying again.',
        429,
        undefined,
        { 'Retry-After': String(rl.retryAfterSeconds) },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = marketplaceInterestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required fields.',
        400,
      );
    }

    const data = parsed.data;
    const turnstile = await verifyTurnstileToken(data.turnstileToken, clientIp);
    if (!turnstile.ok) {
      return apiError(
        'VALIDATION_ERROR',
        'Please complete the spam check before sending.',
        400,
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError(
        'SERVICE_UNAVAILABLE',
        'Marketplace waitlist registration is temporarily unavailable.',
        503,
      );
    }

    const id = `CGM-${generateShortId(6).toUpperCase()}`;

    const { error: insertErr } = await admin.from('marketplace_interest').insert({
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      company: data.company,
      role: data.role,
      audiences: data.note,
      status: 'new',
    });

    if (insertErr) {
      console.error('[api/marketplace-interest] insert failed:', insertErr);
      return apiError('INTERNAL_ERROR', 'Could not register interest.', 500);
    }

    const { error: consentErr } = await admin.from('consent_log').insert({
      email: data.email.toLowerCase(),
      purpose: 'marketplace_interest',
      granted: true,
      source: '/solutions/distribution',
      policy_version: POLICY_VERSION,
      ip_hash: ipHash,
    });
    if (consentErr) {
      console.error('[api/marketplace-interest] consent_log failed:', consentErr);
    }

    await writeAuditLog({
      actorId: null,
      action: 'marketplace_interest.created',
      entityType: 'marketplace_interest',
      entityId: id,
      details: { role: data.role },
      request,
    });

    await sendAdminAlertEmail({
      subject: `Marketplace waitlist ${id} — ${data.name}`,
      heading: `Marketplace interest (${id})`,
      lines: [
        ['Name', `${data.name} (${data.email})`],
        ['Role', data.role],
        ['Company', data.company || 'Not provided'],
        ['Audiences / Notes', data.note || 'None'],
      ],
    });

    return apiOk({ id }, { status: 201 });
  } catch (err) {
    console.error('[api/marketplace-interest] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to save request right now.', 500);
  }
}
