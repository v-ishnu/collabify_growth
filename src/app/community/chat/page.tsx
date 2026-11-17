import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import {
  getSessionUserAndProfile,
  getSupabaseServerClient,
  isStaffRole,
} from '@/lib/supabase/server';
import type { MembershipRow, MessageRow } from '@/types/database';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { NoticeBox } from '@/components/common/NoticeBox';
import { CommunityChatClient } from '@/features/community/CommunityChatClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Members area · Collabify Community',
  description: 'Members-only chat for the Collabify Community.',
  path: '/community/chat',
  noIndex: true,
});

export default async function CommunityChatPage() {
  const { user, profile } = await getSessionUserAndProfile();
  const canModerate = Boolean(user && isStaffRole(profile?.role));

  let isActiveMember = canModerate;
  let initialMembers: MembershipRow[] = [];
  let initialMessages: MessageRow[] = [];

  if (user) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      if (!canModerate) {
        const { data: ownMem } = await supabase
          .from('memberships')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle<{ status: string; current_period_end: string | null }>();
        isActiveMember = Boolean(
          ownMem &&
            ownMem.status === 'active' &&
            (!ownMem.current_period_end || Date.parse(ownMem.current_period_end) > Date.now()),
        );
      }

      if (isActiveMember) {
        const [memsRes, msgsRes] = await Promise.all([
          supabase.from('memberships').select('*').eq('status', 'active'),
          supabase
            .from('messages')
            .select('*')
            .eq('channel_id', 'introductions')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(150),
        ]);
        initialMembers = (memsRes.data as MembershipRow[]) || [];
        initialMessages = ((msgsRes.data as MessageRow[]) || []).reverse();
      }
    }
  }

  return (
    <section className="sec-tight">
      <div className="wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Community', href: '/community' },
            { label: 'Members area' },
          ]}
        />
        <h1 className="chat-h1">Members area</h1>

        <div id="chatRoot" style={{ marginTop: 20 }}>
          {!user ? (
            <NoticeBox
              title="This area is for active members"
              body="Sign in with your member account, or apply to join the community."
            >
              <Link className="btn btn-primary" href="/auth/signin?next=/community/chat">
                Sign in
              </Link>
              <Link className="btn btn-secondary" href="/community/join">
                Apply or check status
              </Link>
            </NoticeBox>
          ) : !isActiveMember ? (
            <NoticeBox
              title="This area is for active members"
              body="Apply to join, or check where your application is up to."
            >
              <Link className="btn btn-primary" href="/community/join">
                Apply or check status
              </Link>
              <Link className="btn btn-secondary" href="/community">
                About the community
              </Link>
            </NoticeBox>
          ) : (
            <CommunityChatClient
              currentUserId={user.id}
              canModerate={canModerate}
              initialMembers={initialMembers}
              initialMessages={initialMessages}
            />
          )}
        </div>
      </div>
    </section>
  );
}

