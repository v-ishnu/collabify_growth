import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { hashIp } from '@/lib/crypto';
import { extractClientIp } from '@/lib/turnstile';

export interface AuditEntryInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  request?: Request;
}

export async function writeAuditLog(input: AuditEntryInput): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    const ipHash = input.request ? hashIp(extractClientIp(input.request)) : null;

    await admin.from('audit_logs').insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      details: input.details ?? {},
      ip_hash: ipHash,
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err);
  }
}

export async function ensureProfileRow(user: {
  id: string;
  email: string | null;
  fullName?: string | null;
}): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  await admin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      full_name: user.fullName ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

