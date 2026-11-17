import type { MetadataRoute } from 'next';
import { publicEnv } from '@/config/env';

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth/', '/community/chat', '/blog/write', '/thank-you'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

