import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isAdminRole, isStaffRole } from '@/lib/supabase/server';
import type { ProfileRow } from '@/types/database';

export async function requireStaffSession(
  adminOnly = false,
  request?: Request,
): Promise<
  | {
      ok: true;
      user: { id: string; email: string | null };
      profile: ProfileRow;
      admin: SupabaseClient;
    }
  | { ok: false; response: NextResponse }
> {
  if (request && request.method !== 'GET' && request.method !== 'HEAD') {
    const originCheck = assertSameOrigin(request);
    if (!originCheck.ok) return originCheck;
  }

  const { user, profile, suspended } = await getSessionUserAndProfile();
  if (suspended) {
    return {
      ok: false,
      response: apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403),
    };
  }
  if (!user || !profile) {
    return {
      ok: false,
      response: apiError('UNAUTHORIZED', 'Authentication required.', 401),
    };
  }

  const authorized = adminOnly ? isAdminRole(profile.role) : isStaffRole(profile.role);
  if (!authorized) {
    return {
      ok: false,
      response: apiError('FORBIDDEN', 'Insufficient permissions.', 403),
    };
  }

  const rl = checkRateLimit(`staff:${user.id}`, 180, 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      response: apiError('RATE_LIMITED', 'Too many administrative actions.', 429, undefined, {
        'Retry-After': String(rl.retryAfterSeconds),
      }),
    };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      response: apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503),
    };
  }

  return { ok: true, user, profile, admin };
}

