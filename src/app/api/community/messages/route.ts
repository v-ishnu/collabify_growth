import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { communityMessageSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const VALID_CHANNELS = new Set([
  'introductions',
  'general',
  'growth',
  'tech',
  'hiring',
  'collabs',
  'events',
]);

async function canAccessCommunity(userId: string, role?: string | null): Promise<boolean> {
  if (isStaffRole(role as 'owner' | 'admin' | 'editor' | 'user' | null)) return true;
  const admin = getSupabaseAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from('memberships')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data || data.status !== 'active') return false;
  if (data.current_period_end && Date.parse(data.current_period_end) < Date.now()) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  try {
    const { user, profile, suspended } = await getSessionUserAndProfile();
    if (suspended) {
      return apiError('ACCOUNT_SUSPENDED', 'Your account has been suspended.', 403);
    }
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }
    const allowed = await canAccessCommunity(user.id, profile?.role);
    if (!allowed) {
      return apiError('FORBIDDEN', 'Active community membership required.', 403);
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'general';
    if (!VALID_CHANNELS.has(channel)) {
      return apiError('VALIDATION_ERROR', 'Invalid channel.', 400);
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data, error } = await admin
      .from('messages')
      .select('*')
      .eq('channel_id', channel)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return apiError('INTERNAL_ERROR', 'Could not load messages.', 500);
    }

    return apiOk({ messages: (data ?? []).reverse() });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to load channel messages.', 500);
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
    const allowed = await canAccessCommunity(user.id, profile?.role);
    if (!allowed) {
      return apiError('FORBIDDEN', 'Active community membership required.', 403);
    }

    const rl = checkRateLimit(`chat:${user.id}`, 30, 60_000);
    if (!rl.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Slow down slightly before sending more messages.',
        429,
        undefined,
        { 'Retry-After': String(rl.retryAfterSeconds) },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = communityMessageSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Invalid message.',
        400,
      );
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return apiError('SERVICE_UNAVAILABLE', 'Database unavailable.', 503);
    }

    const { data: message, error } = await admin
      .from('messages')
      .insert({
        channel_id: parsed.data.channel_id,
        user_id: user.id,
        body: parsed.data.body,
      })
      .select('*')
      .single();

    if (error || !message) {
      return apiError('INTERNAL_ERROR', 'Could not send message.', 500);
    }

    return apiOk({ message }, { status: 201 });
  } catch {
    return apiError('INTERNAL_ERROR', 'Unable to send message.', 500);
  }
}
