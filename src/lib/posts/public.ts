import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, publicEnv } from '@/config/env';
import type { PostRow } from '@/types/database';

function getAnonSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublishedPosts(limit?: number): Promise<PostRow[]> {
  const supabase = getAnonSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as PostRow[];
}

export async function getPublishedPostBySlug(slug: string): Promise<PostRow | null> {
  const supabase = getAnonSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle<PostRow>();

  if (error || !data) return null;
  return data;
}

export async function getRedirectTarget(
  fromPath: string
): Promise<{ to_path: string; status: number } | null> {
  const supabase = getAnonSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('redirects')
    .select('to_path, status')
    .eq('from_path', fromPath)
    .maybeSingle<{ to_path: string; status?: number }>();

  if (!data) return null;
  return { to_path: data.to_path, status: data.status ?? 301 };
}
