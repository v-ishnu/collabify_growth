import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getSessionUserAndProfile, getSupabaseServerClient, isStaffRole } from '@/lib/supabase/server';
import type { PostRow } from '@/types/database';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { NoticeBox } from '@/components/common/NoticeBox';
import { BlogEditor } from '@/features/blog/BlogEditor';

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: 'Edit post · Collabify Growth',
    description: 'Edit blog post.',
    path: `/blog/write/${slug}`,
    noIndex: true,
  });
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const { user, profile } = await getSessionUserAndProfile();
  const canEdit = Boolean(user && isStaffRole(profile?.role));

  let post: PostRow | null = null;
  if (canEdit) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle<PostRow>();
      post = data ?? null;
    }
  }

  return (
    <section className="sec-tight">
      <div className="wrap">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: 'Edit post' },
          ]}
        />
        <h1 className="chat-h1">Edit post</h1>
        <div style={{ marginTop: 24 }}>
          {!canEdit ? (
            <NoticeBox
              title="Only the site owner and editors can write posts"
              body="Sign in with an owner or editor account to write and publish."
            >
              <Link className="btn btn-secondary" href="/blog">
                Back to the blog
              </Link>
              {!user && (
                <Link className="btn btn-primary" href={`/auth/signin?next=/blog/write/${slug}`}>
                  Sign in
                </Link>
              )}
            </NoticeBox>
          ) : !post ? (
            <NoticeBox title="That post doesn’t exist" body="It may have been deleted.">
              <Link className="btn btn-primary" href="/blog/write">
                Write a new post
              </Link>
            </NoticeBox>
          ) : (
            <BlogEditor initialPost={post} />
          )}
        </div>
      </div>
    </section>
  );
}

