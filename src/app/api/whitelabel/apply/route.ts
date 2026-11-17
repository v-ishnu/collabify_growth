import { publicEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile } from '@/lib/supabase/server';
import { extractClientIp } from '@/lib/turnstile';
import { whiteLabelApplySchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail, sendWhiteLabelUpdateEmail } from '@/lib/email/resend';
import { ensureProfileRow, writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const POLICY_VERSION = '2026-04-01';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Sign in required.', 401);
    }

    const rl = checkRateLimit(`wl-app:${user.id}`, 5, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = whiteLabelApplySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required partner fields.',
        400,
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const data = parsed.data;
    await ensureProfileRow({ id: user.id, email: user.email, fullName: data.name });

    const { data: existing } = await admin
      .from('wl_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: application, error } = await admin
      .from('wl_applications')
      .upsert(
        {
          user_id: user.id,
          company: data.company,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          website: data.website,
          city: data.city,
          capabilities: data.capabilities,
          volume: data.volume,
          notes: data.notes,
          nda_agreed: true,
          nda_agreed_at: new Date().toISOString(),
          status: existing?.status === 'approved' ? 'approved' : 'pending',
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();

    if (error || !application) {
      console.error('[api/whitelabel/apply] error:', error);
      return apiError('INTERNAL_ERROR', 'Could not save white-label application.', 500);
    }

    const ipHash = hashIp(extractClientIp(request));
    await admin.from('consent_log').insert([
      {
        email: data.email.toLowerCase(),
        purpose: 'white_label_privacy',
        granted: true,
        source: '/white-label',
        policy_version: POLICY_VERSION,
        ip_hash: ipHash,
      },
      {
        email: data.email.toLowerCase(),
        purpose: 'white_label_nda',
        granted: true,
        source: '/white-label',
        policy_version: POLICY_VERSION,
        ip_hash: ipHash,
      },
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: 'whitelabel.applied',
      entityType: 'wl_application',
      entityId: user.id,
      details: { company: data.company, volume: data.volume },
      request,
    });

    await Promise.all([
      sendWhiteLabelUpdateEmail({
        to: data.email,
        name: data.name,
        company: data.company,
        subject: 'We received your white-label partner application — Collabify Growth',
        heading: 'White-label application received',
        message: 'Thanks for applying and confirming our mutual confidentiality terms. Our partnerships team reviews each agency application within two working days.',
        siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      }),
      sendAdminAlertEmail({
        subject: `White-label application — ${data.company}`,
        heading: 'New White-Label Partner Application',
        lines: [
          ['Agency', `${data.company} (${data.city})`],
          ['Contact', `${data.name} (${data.email})`],
          ['Capabilities', data.capabilities.join(', ')],
          ['Expected volume', data.volume],
        ],
      }),
    ]);

    return apiOk({ application }, { status: 201 });
  } catch (err) {
    console.error('[api/whitelabel/apply] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit application.', 500);
  }
}

