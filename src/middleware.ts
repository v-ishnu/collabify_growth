import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isSupabaseConfigured, publicEnv } from '@/config/env';

const PROTECTED_PREFIXES = ['/admin', '/inbox', '/blog/write', '/community/chat'];
const STAFF_PREFIXES = ['/admin', '/inbox', '/blog/write'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const requiresStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/signin';
    signInUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  if (isProtected && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .maybeSingle<{ role?: string; is_suspended?: boolean }>();

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      const suspendedUrl = request.nextUrl.clone();
      suspendedUrl.pathname = '/auth/signin';
      suspendedUrl.search = '?error=suspended';
      return NextResponse.redirect(suspendedUrl);
    }

    if (requiresStaff && !['owner', 'admin', 'editor'].includes(profile?.role ?? '')) {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = '/auth/signin';
      forbiddenUrl.search = '?error=forbidden';
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
