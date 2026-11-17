import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const rl = checkRateLimit(`chat-del:${user.id}`, 30, 60_000);
    if (!rl.allowed) {
      return apiError('RATE_LIMITED', 'Too many delete requests.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      });
    }

    const { id } = await context.params;
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: msg } = await admin
      .from('messages')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!msg) {
      return apiError('NOT_FOUND', 'Message not found.', 404);
    }

    const isStaff = isStaffRole(profile?.role);
    if (msg.user_id !== user.id && !isStaff) {
      return apiError('FORBIDDEN', 'Forbidden', 403);
    }

    const { error } = await admin
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id);

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not delete message.', 500);
    }

    if (isStaff && msg.user_id !== user.id) {
      await writeAuditLog({
        actorId: user.id,
        action: 'community.message_moderated',
        entityType: 'message',
        entityId: id,
        request,
      });
    }

    return apiOk({});
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to delete message.', 500);
  }
}
