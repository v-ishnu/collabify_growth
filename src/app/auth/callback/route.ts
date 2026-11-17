import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeRedirectTarget } from '@/lib/api/response';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const rawType = searchParams.get('type') as EmailOtpType | null;
  const nextPath = safeRedirectTarget(searchParams.get('next'), '/community');

  if (!code && !(tokenHash && rawType && VALID_OTP_TYPES.has(rawType))) {
    return NextResponse.redirect(`${origin}/auth/signin?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth/signin?error=unconfigured`);
  }

  let verifiedUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
    }
    verifiedUser = data.user;
  } else if (tokenHash && rawType && VALID_OTP_TYPES.has(rawType)) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: rawType,
      token_hash: tokenHash,
    });
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
    }
    verifiedUser = data.user;
  }

  if (!verifiedUser) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  const admin = getSupabaseAdminClient();
  if (admin && verifiedUser.email) {
    await admin.from('profiles').upsert(
      {
        id: verifiedUser.id,
        email: verifiedUser.email,
        full_name:
          (verifiedUser.user_metadata?.full_name as string | undefined) ??
          (verifiedUser.user_metadata?.name as string | undefined) ??
          null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_suspended')
    .eq('id', verifiedUser.id)
    .maybeSingle<{ is_suspended?: boolean }>();

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/signin?error=suspended`);
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}

