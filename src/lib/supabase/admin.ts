import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv, isSupabaseConfigured } from '@/config/env';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient() cannot be executed in browser context.');
  }
  if (!isSupabaseConfigured()) return null;
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

