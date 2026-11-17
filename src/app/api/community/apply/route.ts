import { publicEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { hashIp } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile } from '@/lib/supabase/server';
import { extractClientIp } from '@/lib/turnstile';
import { communityApplySchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail, sendCommunityApplicationEmail } from '@/lib/email/resend';
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
      return apiError('UNAUTHORIZED', 'Sign in required to apply.', 401);
    }

    const rl = checkRateLimit(`comm-app:${user.id}`, 5, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = communityApplySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required application fields.',
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
      .from('community_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    const nextStatus = existing?.status === 'approved' ? 'approved' : 'pending';

    const { data: application, error } = await admin
      .from('community_applications')
      .upsert(
        {
          user_id: user.id,
          name: data.name,
          email: data.email.toLowerCase(),
          role: data.role,
          company: data.company,
          city: data.city,
          linkedin: data.linkedin,
          working_on: data.working_on,
          interests: data.interests,
          plan: data.plan,
          status: nextStatus,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();

    if (error || !application) {
      console.error('[api/community/apply] upsert failed:', error);
      return apiError('INTERNAL_ERROR', 'Could not save application.', 500);
    }

    const ipHash = hashIp(extractClientIp(request));
    await admin.from('consent_log').insert([
      {
        email: data.email.toLowerCase(),
        purpose: 'community_rules_privacy',
        granted: true,
        source: '/community/join',
        policy_version: POLICY_VERSION,
        ip_hash: ipHash,
      },
      {
        email: data.email.toLowerCase(),
        purpose: 'community_directory',
        granted: Boolean(data.consent_directory),
        source: '/community/join',
        policy_version: POLICY_VERSION,
        ip_hash: ipHash,
      },
    ]);

    const { data: membership } = await admin
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    await writeAuditLog({
      actorId: user.id,
      action: 'community.applied',
      entityType: 'community_application',
      entityId: user.id,
      details: { plan: data.plan, city: data.city },
      request,
    });

    await Promise.all([
      sendCommunityApplicationEmail({
        to: data.email,
        name: data.name,
        status: 'pending',
        siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      }),
      sendAdminAlertEmail({
        subject: `Community application — ${data.name} (${data.company})`,
        heading: 'New Community Application',
        lines: [
          ['Applicant', `${data.name} (${data.email})`],
          ['Role / Company', `${data.role} at ${data.company}`],
          ['City / Plan', `${data.city} · ${data.plan}`],
          ['Interests', data.interests.join(', ')],
        ],
      }),
    ]);

    return apiOk({ application, membership: membership ?? null }, { status: 201 });
  } catch (err) {
    console.error('[api/community/apply] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit application.', 500);
  }
}

