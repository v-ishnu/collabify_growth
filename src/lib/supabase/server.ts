import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, publicEnv } from '@/config/env';
import type { ProfileRow } from '@/types/database';

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where mutating cookies is not allowed.
          }
        },
      },
    },
  );
}

export async function getSessionUserAndProfile(): Promise<{
  user: { id: string; email: string | null } | null;
  profile: ProfileRow | null;
  suspended?: boolean;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { user: null, profile: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (profile?.is_suspended) {
    return { user: null, profile: null, suspended: true };
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
    suspended: false,
  };
}

export function isStaffRole(role: ProfileRow['role'] | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

export function isAdminRole(role: ProfileRow['role'] | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
