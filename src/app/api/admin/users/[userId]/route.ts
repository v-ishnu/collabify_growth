import { z } from 'zod';
import { apiError, apiOk } from '@/lib/api/response';
import { requireStaffSession } from '@/lib/admin/auth';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const userManageSchema = z
  .object({
    role: z.enum(['owner', 'admin', 'editor', 'user']).optional(),
    is_suspended: z.boolean().optional(),
    suspended_reason: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => v.role !== undefined || v.is_suspended !== undefined, {
    message: 'Provide a role or suspension status to update.',
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireStaffSession(true, request);
  if (!guard.ok) return guard.response;

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = userManageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid user update payload.',
      400,
    );
  }

  const { data: target } = await guard.admin
    .from('profiles')
    .select('id, role, is_suspended')
    .eq('id', userId)
    .maybeSingle();

  if (!target) {
    return apiError('NOT_FOUND', 'User profile not found.', 404);
  }

  if (target.role === 'owner' && guard.profile.role !== 'owner') {
    return apiError('FORBIDDEN', 'Only an owner can modify another owner.', 403);
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.role !== undefined) {
    if (parsed.data.role === 'owner' && guard.profile.role !== 'owner') {
      return apiError('FORBIDDEN', 'Only an owner can grant the owner role.', 403);
    }

    if (userId === guard.user.id && parsed.data.role !== target.role && target.role === 'owner') {
      const { count } = await guard.admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');
      if ((count ?? 0) <= 1) {
        return apiError(
          'VALIDATION_ERROR',
          'Promote another owner before changing your own role.',
          400,
        );
      }
    }
    updates.role = parsed.data.role;
  }

  if (parsed.data.is_suspended !== undefined) {
    if (parsed.data.is_suspended && userId === guard.user.id) {
      return apiError('VALIDATION_ERROR', 'You cannot suspend your own account.', 400);
    }
    if (parsed.data.is_suspended && target.role === 'owner') {
      const { count } = await guard.admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner')
        .eq('is_suspended', false);
      if ((count ?? 0) <= 1) {
        return apiError('VALIDATION_ERROR', 'Cannot suspend the last active owner.', 400);
      }
    }

    updates.is_suspended = parsed.data.is_suspended;
    updates.suspended_at = parsed.data.is_suspended ? new Date().toISOString() : null;
    updates.suspended_reason = parsed.data.is_suspended
      ? parsed.data.suspended_reason || 'Suspended by administrator'
      : null;
  }

  const { data: updated, error } = await guard.admin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !updated) {
    return apiError('INTERNAL_ERROR', 'Could not update user profile.', 500);
  }

  if (parsed.data.role !== undefined && parsed.data.role !== target.role) {
    await writeAuditLog({
      actorId: guard.user.id,
      action: 'user.role_changed',
      entityType: 'profile',
      entityId: userId,
      details: { from: target.role, to: parsed.data.role },
      request,
    });
  }

  if (parsed.data.is_suspended !== undefined && parsed.data.is_suspended !== target.is_suspended) {
    await writeAuditLog({
      actorId: guard.user.id,
      action: parsed.data.is_suspended ? 'user.suspended' : 'user.unsuspended',
      entityType: 'profile',
      entityId: userId,
      details: { reason: updates.suspended_reason ?? null },
      request,
    });
  }

  return apiOk({ profile: updated });
}
