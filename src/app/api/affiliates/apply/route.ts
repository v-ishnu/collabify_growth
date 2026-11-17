import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile } from '@/lib/supabase/server';
import { extractClientIp } from '@/lib/turnstile';
import { affiliateApplySchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail } from '@/lib/email/resend';
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

    const rl = checkRateLimit(`aff-app:${user.id}`, 5, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = affiliateApplySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required fields.',
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
      .from('affiliates')
      .select('status, code, approved_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: affiliate, error } = await admin
      .from('affiliates')
      .upsert(
        {
          user_id: user.id,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          city: data.city,
          share_channels: data.share_channels,
          audience: data.audience,
          link: data.link,
          status: existing?.status === 'approved' ? 'approved' : 'pending',
          code: existing?.code ?? null,
          approved_at: existing?.approved_at ?? null,
        },
        { onConflict: 'user_id' },
      )
      .select('user_id, name, email, phone, city, share_channels, audience, link, status, code, approved_at, created_at')
      .single();

    if (error || !affiliate) {
      console.error('[api/affiliates/apply] error:', error);
      return apiError('INTERNAL_ERROR', 'Could not save application.', 500);
    }

    await admin.from('consent_log').insert({
      email: data.email.toLowerCase(),
      purpose: 'affiliate',
      granted: true,
      source: '/affiliates',
      policy_version: POLICY_VERSION,
      ip_hash: hashIp(extractClientIp(request)),
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'affiliate.applied',
      entityType: 'affiliate',
      entityId: user.id,
      details: { city: data.city, channels: data.share_channels },
      request,
    });

    await sendAdminAlertEmail({
      subject: `Affiliate application — ${data.name} (${data.city})`,
      heading: 'New Affiliate Program Application',
      lines: [
        ['Applicant', `${data.name} (${data.email})`],
        ['City', data.city],
        ['Channels', data.share_channels.join(', ')],
        ['Primary link', data.link || 'None'],
      ],
    });

    return apiOk(
      { affiliate: { ...affiliate, payout_details: null } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[api/affiliates/apply] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit application.', 500);
  }
}

