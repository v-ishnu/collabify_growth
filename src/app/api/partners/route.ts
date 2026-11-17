import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { generateShortId, hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp, verifyTurnstileToken } from '@/lib/turnstile';
import { partnerApplicationSchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail, sendPartnerEnquiryEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const POLICY_VERSION = '2026-04-01';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const clientIp = extractClientIp(request);
    const ipHash = hashIp(clientIp);
    const rl = checkRateLimit(`partner:${ipHash ?? 'anon'}`, 8, 60 * 60_000);
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
    const parsed = partnerApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required partner fields.',
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
        'Partner application intake is temporarily unavailable. Please email us directly.',
        503,
      );
    }

    const id = `CGP-${generateShortId(6).toUpperCase()}`;

    const { error: insertErr } = await admin.from('specialist_applications').insert({
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      city: data.city,
      partner_type: data.partnerType,
      availability: data.availability,
      capabilities: data.capabilities,
      portfolio: data.portfolioUrl,
      rate: data.rate,
      audience: data.audience,
      status: 'new',
    });

    if (insertErr) {
      console.error('[api/partners] insert failed:', insertErr);
      return apiError('INTERNAL_ERROR', 'Could not save application.', 500);
    }

    const { error: consentErr } = await admin.from('consent_log').insert({
      email: data.email.toLowerCase(),
      purpose: 'partner',
      granted: true,
      source: '/partners',
      policy_version: POLICY_VERSION,
      ip_hash: ipHash,
    });
    if (consentErr) {
      console.error('[api/partners] consent_log failed:', consentErr);
    }

    await writeAuditLog({
      actorId: null,
      action: 'specialist.applied',
      entityType: 'specialist_application',
      entityId: id,
      details: { partnerType: data.partnerType, city: data.city },
      request,
    });

    await Promise.all([
      sendPartnerEnquiryEmail({
        to: data.email,
        name: data.name,
        ref: id,
        partnerType: data.partnerType,
      }),
      sendAdminAlertEmail({
        subject: `New specialist application ${id} — ${data.name}`,
        heading: `New partner application (${id})`,
        lines: [
          ['Name', `${data.name} (${data.email})`],
          ['Type', data.partnerType],
          ['City / Availability', `${data.city} · ${data.availability}`],
          ['Capabilities', data.capabilities.join(', ')],
          ['Portfolio', data.portfolioUrl],
        ],
      }),
    ]);

    return apiOk({ id, ref: id }, { status: 201 });
  } catch (err) {
    console.error('[api/partners] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit application right now.', 500);
  }
}
