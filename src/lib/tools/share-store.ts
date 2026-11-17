import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { MediaKitData } from '@/features/tools/MediaKitCard';
import { decodeMediaKit, normalizeMediaKit } from './media-kit';
import { type InviteData, decodeInvite, normalizeInvite } from './invite';

export async function resolveSharedMediaKit(codeOrId: string): Promise<MediaKitData | null> {
  const inline = decodeMediaKit(codeOrId);
  if (inline) return inline;

  if (!/^[A-Za-z0-9_-]{4,24}$/.test(codeOrId)) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('share_links')
    .select('payload')
    .eq('id', codeOrId)
    .eq('kind', 'mediakit')
    .maybeSingle();

  if (!data) return null;
  return normalizeMediaKit(data.payload);
}

export async function resolveSharedInvite(codeOrId: string): Promise<InviteData | null> {
  const inline = decodeInvite(codeOrId);
  if (inline && inline.t) return inline;

  if (!/^[A-Za-z0-9_-]{4,24}$/.test(codeOrId)) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('share_links')
    .select('payload')
    .eq('id', codeOrId)
    .eq('kind', 'invite')
    .maybeSingle();

  if (!data) return null;
  const normalized = normalizeInvite(data.payload);
  return normalized && normalized.t ? normalized : null;
}
