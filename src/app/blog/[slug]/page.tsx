import Link from 'next/link';
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { fmtDay } from '@/lib/format';
import { mdToHtml } from '@/lib/markdown';
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getRedirectTarget,
} from '@/lib/posts/public';
import { getSessionUserAndProfile, getSupabaseServerClient, isStaffRole } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { NoticeBox } from '@/components/common/NoticeBox';
import { CtaBand } from '@/components/common/CtaBand';
import type { PostRow } from '@/types/database';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function resolvePostForView(
  slug: string
): Promise<{ post: PostRow | null; isDraft: boolean; canEdit: boolean }> {
  const published = await getPublishedPostBySlug(slug);
  const { user, profile } = await getSessionUserAndProfile();
  const canEdit = Boolean(user && isStaffRole(profile?.role));

  if (published) {
    return { post: published, isDraft: false, canEdit };
  }

  if (canEdit) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle<PostRow>();
      if (data) {
        return { post: data, isDraft: data.status !== 'published', canEdit };
      }
    }
  }

  return { post: null, isDraft: false, canEdit };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    return buildMetadata({
      title: 'Article not found · Collabify Growth',
      description: 'This article doesn’t exist, or it has moved.',
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: post.seo_title || `${post.title} · Collabify Growth`,
    description: post.seo_description || '',
    path: `/blog/${post.slug}`,
    type: 'article',
    publishedTime: post.published_at,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const { post, isDraft, canEdit } = await resolvePostForView(slug);

  if (!post) {
    const redir = await getRedirectTarget(`/blog/${slug}`);
    if (redir) {
      permanentRedirect(redir.to_path);
    }
    return (
      <>
        <section className="sec-tight">
          <div className="wrap">
            <article id="postRoot" className="article">
              <NoticeBox
                title="This article doesn’t exist, or it has moved."
                body="Browse the latest articles instead."
              >
                <Link className="btn btn-secondary" href="/blog">
                  Go to the blog
                </Link>
              </NoticeBox>
            </article>
          </div>
        </section>
        <CtaBand />
      </>
    );
  }

  const allPublished = isDraft ? [] : await getPublishedPosts(20);
  const related = allPublished
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);

  const blogPostingLd = !isDraft
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.seo_description || '',
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: {
          '@type': /collabify/i.test(post.author_name || '') ? 'Organization' : 'Person',
          name: post.author_name || 'Collabify Growth',
        },
        publisher: { '@type': 'Organization', name: siteConfig.legalEntityName },
        keywords: post.focus_keyword || '',
      }
    : null;

  const crumbsLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      {blogPostingLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
        />
      )}

      <section className="sec-tight">
        <div className="wrap">
          <article id="postRoot" className="article">
            {isDraft && (
              <div className="alert alert-error" style={{ marginBottom: 24 }}>
                <strong>Draft preview.</strong> Visitors can’t see this post until you publish it.
              </div>
            )}

            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Blog', href: '/blog' },
                { label: post.title },
              ]}
            />

            <p className="post-meta" style={{ marginTop: 28 }}>
              {post.category || 'Article'}
            </p>
            <h1 className="post-h1">{post.title}</h1>
            <p className="post-byline">
              {post.author_name || 'Collabify Growth'}, {fmtDay(post.published_at || post.updated_at)}
              , {post.read_mins || 1} min read
              {canEdit && (
                <>
                  {'. '}
                  <Link className="tlink" href={`/blog/write/${post.slug}`}>
                    Edit post
                  </Link>
                </>
              )}
            </p>

            <div className="prose" dangerouslySetInnerHTML={{ __html: mdToHtml(post.body_md) }} />

            <aside className="post-cta">
              <h2>Want help putting this into practice?</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Tell us what you’re working on and we’ll suggest where to start.
              </p>
              <div className="btn-row" style={{ marginTop: 18 }}>
                <Link className="btn btn-primary" href="/start-a-project">
                  Start a Project
                </Link>
                <Link className="btn btn-secondary" href="/services">
                  Browse services
                </Link>
              </div>
            </aside>
          </article>
        </div>
      </section>

      {related.length > 0 && (
        <div id="postMore">
          <section className="sec-tight sec-alt">
            <div className="wrap">
              <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Keep reading</h2>
              {related.map((p) => (
                <Link className="post-row" href={`/blog/${p.slug}`} key={p.slug}>
                  <p className="post-meta">{fmtDay(p.published_at)}</p>
                  <div>
                    <h3>{p.title}</h3>
                    <p className="muted">{p.seo_description || ''}</p>
                  </div>
                  <p className="post-meta">
                    {p.category || 'Article'}, {p.read_mins || 1} min read
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <CtaBand />
    </>
  );
}
