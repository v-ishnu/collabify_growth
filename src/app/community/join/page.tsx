import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getSessionUserAndProfile, getSupabaseServerClient } from '@/lib/supabase/server';
import type { CommunityApplicationRow, MembershipRow } from '@/types/database';
import { PageHero } from '@/components/common/PageHero';
import { CommunityJoinClient } from '@/features/community/CommunityJoinClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Apply to join · Collabify Community',
  description: 'Apply for a paid Collabify Community membership.',
  path: '/community/join',
});

export default async function CommunityJoinPage() {
  const { user, profile } = await getSessionUserAndProfile();
  let application: CommunityApplicationRow | null = null;
  let membership: MembershipRow | null = null;

  if (user) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const [appRes, memRes] = await Promise.all([
        supabase
          .from('community_applications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle<CommunityApplicationRow>(),
        supabase
          .from('memberships')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle<MembershipRow>(),
      ]);
      application = appRes.data ?? null;
      membership = memRes.data ?? null;
    }
  }

  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Community', href: '/community' },
          { label: 'Apply' },
        ]}
        h1="Apply to join the community."
        lede="Tell us who you are and choose a plan. After you apply, you’ll pay through a secure link and we’ll open your access."
      />

      <section className="sec" style={{ paddingTop: 'clamp(32px,4vw,56px)' }}>
        <div className="wrap" id="joinRoot">
          <Suspense fallback={<p className="muted">Loading…</p>}>
            <CommunityJoinClient
              initialUser={
                user ? { id: user.id, email: user.email, fullName: profile?.full_name ?? null } : null
              }
              initialApplication={application}
              initialMembership={membership}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}

