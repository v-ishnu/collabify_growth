import type { MetadataRoute } from 'next';
import { publicEnv } from '@/config/env';
import { CAPS, PROGRAMMES } from '@/content';
import { getPublishedPosts } from '@/lib/posts/public';

export const dynamic = 'force-dynamic';

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/capabilities', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/solutions', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/services/business-website-development', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/how-we-work', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/tools/media-kit', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/invite', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/tools/whatsapp', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/health-check', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.85, changeFrequency: 'daily' },
  { path: '/community', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/affiliates', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/white-label', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/partners', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/start-a-project', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const r of STATIC_ROUTES) {
    entries.push({
      url: `${base}${r.path || '/'}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    });
  }

  for (const cap of CAPS) {
    entries.push({
      url: `${base}/capabilities/${cap.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    });
  }

  for (const prog of PROGRAMMES) {
    entries.push({
      url: `${base}/solutions/${prog.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    });
  }
  entries.push({
    url: `${base}/solutions/custom`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  });

  const posts = await getPublishedPosts().catch(() => []);
  for (const post of posts) {
    entries.push({
      url: `${base}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: new Date(post.updated_at || post.published_at || post.created_at),
      changeFrequency: 'monthly',
      priority: 0.75,
    });
  }

  return entries;
}
