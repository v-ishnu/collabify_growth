import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/config/env';
import { hashIp } from '@/lib/crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/turnstile';

export async function handleReferralRedirect(
  request: Request,
  rawCode: string,
  segments: string[],
) {
  const cleanCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const safePath = segments
    .filter((s) => s && s !== '.' && s !== '..')
    .map((s) => encodeURIComponent(s))
    .join('/');
  const landingPath = safePath ? `/${safePath}` : '/';

  const url = new URL(request.url);
  const search = url.search || '';
  const destination = new URL(`${landingPath}${search}`, url.origin);

  const env = getServerEnv();
  const cookieStore = await cookies();
  const existing = cookieStore
    .get('cg_ref')
    ?.value?.toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);

  const response = NextResponse.redirect(destination, 302);

  if (cleanCode) {
    const shouldSetCookie =
      env.AFFILIATE_ATTRIBUTION_MODEL === 'last_touch' || !existing;

    if (shouldSetCookie) {
      response.cookies.set('cg_ref', cleanCode, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: env.AFFILIATE_WINDOW_DAYS * 86400,
      });
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
      await admin.from('referral_clicks').insert({
        code: cleanCode,
        landing_path: landingPath,
        ip_hash: hashIp(extractClientIp(request)),
        user_agent: (request.headers.get('user-agent') || '').slice(0, 300) || null,
      });
    }
  }

  return response;
}

