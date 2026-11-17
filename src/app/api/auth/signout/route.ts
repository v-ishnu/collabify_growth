import { apiError, apiOk, assertSameOrigin } from '@/lib/api/response';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    return apiOk({ signedOut: true });
  } catch (err) {
    console.error('[api/auth/signout] error:', err);
    return apiError('INTERNAL_ERROR', 'Unable to sign out cleanly.', 500);
  }
}

