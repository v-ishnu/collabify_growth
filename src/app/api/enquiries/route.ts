import { cookies } from 'next/headers';
import { getServerEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { generateShortId, hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp, verifyTurnstileToken } from '@/lib/turnstile';
import { enquirySchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail, sendEnquiryConfirmationEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const POLICY_VERSION = '2026-04-01';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const clientIp = extractClientIp(request);
    const ipHash = hashIp(clientIp);
    const rl = checkRateLimit(`enq:${ipHash ?? 'anon'}`, 10, 60 * 60_000);
    if (!rl.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Too many submissions. Please wait a bit before trying again.',
        429,
        undefined,
        { 'Retry-After': String(rl.retryAfterSeconds) },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required enquiry fields.',
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
        'Project enquiry intake is temporarily unavailable. Please email us directly.',
        503,
      );
    }

    const cookieStore = await cookies();
    const cookieRef = cookieStore
      .get('cg_ref')
      ?.value?.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 16);

    const env = getServerEnv();
    const resolvedPartnerRef =
      env.AFFILIATE_ATTRIBUTION_MODEL === 'first_touch'
        ? cookieRef || data.partnerRef || null
        : data.partnerRef || cookieRef || null;

    const id = `CG-${generateShortId(7).toUpperCase()}`;

    const { error: rpcErr } = await admin.rpc('create_enquiry_atomic', {
      p_id: id,
      p_name: data.name,
      p_email: data.email.toLowerCase(),
      p_phone: data.phone ?? null,
      p_company: data.company,
      p_role: data.role,
      p_website: data.website ?? null,
      p_needs: data.needs,
      p_shortlist: data.shortlist,
      p_programme: data.programme ?? null,
      p_description: data.description,
      p_timeline: data.timeline,
      p_budget: data.budget,
      p_source: data.source ?? null,
      p_partner_ref: resolvedPartnerRef,
      p_utm: data.utm ?? null,
      p_consent_updates: Boolean(data.consentUpdates),
      p_consent_whatsapp: Boolean(data.consentWhatsApp),
      p_policy_version: POLICY_VERSION,
      p_ip_hash: ipHash,
      p_health_check_answers: data.healthCheckAnswers ?? null,
    });

    if (rpcErr) {
      console.error('[api/enquiries] atomic rpc failed:', rpcErr);
      return apiError('INTERNAL_ERROR', 'Could not save your enquiry.', 500);
    }

    await writeAuditLog({
      actorId: null,
      action: 'enquiry.created',
      entityType: 'enquiry',
      entityId: id,
      details: { company: data.company, partner_ref: resolvedPartnerRef },
      request,
    });

    await Promise.all([
      sendEnquiryConfirmationEmail({
        to: data.email,
        name: data.name,
        ref: id,
        company: data.company,
        needs: data.needs,
      }),
      sendAdminAlertEmail({
        subject: `New enquiry ${id} — ${data.company}`,
        heading: `New project enquiry (${id})`,
        lines: [
          ['From', `${data.name} (${data.email})`],
          ['Company', `${data.company} — ${data.role}`],
          ['Needs', data.needs.join(', ')],
          ['Programme', data.programme || 'None'],
          ['Budget / Timeline', `${data.budget} · ${data.timeline}`],
          ['Affiliate Ref', resolvedPartnerRef || 'None'],
        ],
      }),
    ]);

    return apiOk({ id, ref: id }, { status: 201 });
  } catch (err) {
    console.error('[api/enquiries] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit enquiry right now.', 500);
  }
}
