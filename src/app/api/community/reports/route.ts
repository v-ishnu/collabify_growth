import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { communityReportSchema } from '@/lib/validation/schemas';
import { sendAdminAlertEmail } from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    if (!isStaffRole(profile?.role)) {
      const { data: mem } = await admin
        .from('memberships')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      const active =
        mem &&
        mem.status === 'active' &&
        (!mem.current_period_end || Date.parse(mem.current_period_end) > Date.now());
      if (!active) {
        return apiError('FORBIDDEN', 'Active membership required.', 403);
      }
    }

    const rl = checkRateLimit(`report:${user.id}`, 10, 60 * 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many reports submitted.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = communityReportSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid report payload.', 400);
    }

    const { error } = await admin.from('message_reports').insert({
      message_id: parsed.data.message_id,
      reporter_id: user.id,
      reason: parsed.data.reason,
      resolved: false,
    });

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not record report.', 500);
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'community.message_reported',
      entityType: 'message',
      entityId: parsed.data.message_id,
      details: { reason: parsed.data.reason },
      request,
    });

    await sendAdminAlertEmail({
      subject: 'Community message reported for review',
      heading: 'Community Moderation Alert',
      lines: [
        ['Message ID', parsed.data.message_id],
        ['Reporter ID', user.id],
        ['Reason', parsed.data.reason],
      ],
    });

    return apiOk({}, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to submit report.', 500);
  }
}
