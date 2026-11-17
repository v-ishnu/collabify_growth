import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getSessionUserAndProfile, isStaffRole } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { NoticeBox } from '@/components/common/NoticeBox';
import { BlogEditor } from '@/features/blog/BlogEditor';

export const metadata: Metadata = buildMetadata({
  title: 'Write a post · Collabify Growth',
  description: 'Write and publish articles on Collabify Growth.',
  path: '/blog/write',
  noIndex: true,
});

export default async function WritePostPage() {
  const { user, profile } = await getSessionUserAndProfile();
  const canEdit = Boolean(user && isStaffRole(profile?.role));

  return (
    <section className="sec-tight">
      <div className="wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: 'Write a post' },
          ]}
        />
        <h1 className="chat-h1">Write a post</h1>
        <div style={{ marginTop: 24 }}>
          {canEdit ? (
            <BlogEditor />
          ) : (
            <NoticeBox
              title="Only the site owner and editors can write posts"
              body="Sign in with an owner or editor account to write and publish."
            >
              <Link className="btn btn-secondary" href="/blog">
                Back to the blog
              </Link>
              {!user && (
                <Link className="btn btn-primary" href="/auth/signin?next=/blog/write">
                  Sign in
                </Link>
              )}
            </NoticeBox>
          )}
        </div>
      </div>
    </section>
  );
}

