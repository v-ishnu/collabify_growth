import { publicEnv } from '@/config/env';
import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { generateShortId } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { whiteLabelBriefSchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail, sendWhiteLabelUpdateEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const staff = isStaffRole(profile?.role);
    let query = admin
      .from('wl_briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!staff) {
      query = query.eq('partner_id', user.id);
    }

    const { data: briefs, error } = await query;
    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not load briefs.', 500);
    }

    const briefIds = (briefs ?? []).map((b) => b.id);
    const filesMap: Record<string, unknown[]> = {};
    if (briefIds.length > 0) {
      const { data: files } = await admin
        .from('wl_brief_files')
        .select('*')
        .in('brief_id', briefIds)
        .order('created_at', { ascending: false });
      for (const f of files ?? []) {
        if (!filesMap[f.brief_id]) filesMap[f.brief_id] = [];
        filesMap[f.brief_id]!.push(f);
      }
    }

    return apiOk({
      briefs: (briefs ?? []).map((b) => ({ ...b, files: filesMap[b.id] ?? [] })),
    });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to fetch briefs.', 500);
  }
}

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const rl = checkRateLimit(`wl-brief:${user.id}`, 12, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many briefs submitted.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: partner } = await admin
      .from('wl_partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!partner || partner.status !== 'active') {
      return apiError('FORBIDDEN', 'An active white-label partner account is required.', 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = whiteLabelBriefSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Check all required brief fields.',
        400,
      );
    }

    const id = `WL-${generateShortId(6).toUpperCase()}`;
    const data = parsed.data;
    const { data: brief, error } = await admin
      .from('wl_briefs')
      .insert({
        id,
        partner_id: user.id,
        title: data.title,
        industry: data.industry,
        capability: data.capability,
        services: data.services,
        due_date: data.due_date || null,
        budget: data.budget,
        details: data.details,
        branding: data.branding,
        status: 'Received',
      })
      .select('*')
      .single();

    if (error || !brief) {
      console.error('[api/whitelabel/briefs] insert failed:', error);
      return apiError('INTERNAL_ERROR', 'Could not save brief.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'whitelabel.brief_created',
      entityType: 'wl_brief',
      entityId: id,
      details: { capability: data.capability, budget: data.budget },
      request,
    });

    if (user.email) {
      await sendWhiteLabelUpdateEmail({
        to: user.email,
        name: profile?.full_name || partner.company,
        company: partner.company,
        subject: `Brief received: ${data.title} (${id})`,
        heading: `White-label brief ${id} received`,
        message: `We’ve logged your brief “${data.title}” (${data.capability}, budget ${data.budget}). Your partner manager will review scope and reply shortly.`,
        siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      });
    }

    await sendAdminAlertEmail({
      subject: `White-label brief ${id} — ${partner.company}`,
      heading: `New white-label brief (${id})`,
      lines: [
        ['Agency', partner.company],
        ['Title', data.title],
        ['Capability / Budget', `${data.capability} · ${data.budget}`],
        ['Services', data.services],
      ],
    });

    return apiOk({ brief: { ...brief, files: [] } }, { status: 201 });
  } catch (err) {
    console.error('[api/whitelabel/briefs] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to submit brief.', 500);
  }
}
