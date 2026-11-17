import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { getPublishedPosts } from '@/lib/posts/public';
import { PageHero } from '@/components/common/PageHero';
import { CtaBand } from '@/components/common/CtaBand';
import { BlogIndexClient } from '@/features/blog/BlogIndexClient';

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: 'Blog · Collabify Growth',
  description:
    'Practical writing on growth, technology, media, PR, founder operations and events from the Collabify Growth team.',
  path: '/blog',
});

export default async function BlogPage() {
  const posts = await getPublishedPosts(200);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Blog' }]}
        h1="Ideas for people building businesses."
        lede="Practical writing on growth, technology, media, PR, founder operations and events from the Collabify team."
      />

      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <BlogIndexClient initialPosts={posts} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}

