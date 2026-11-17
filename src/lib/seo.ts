import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  publishedTime?: string | null;
  image?: string;
}

export function buildMetadata(input: PageMetaInput): Metadata {
  const url = `${siteConfig.url}${input.path === '/' ? '' : input.path}`;
  const ogImage = input.image || `${siteConfig.url}${siteConfig.socialOgDefault}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: siteConfig.name,
      type: input.type || 'website',
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.legalEntityName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/collabify-mark-512.png`,
    email: siteConfig.contact.email,
    description:
      'Marketing, technology, media, PR, founder systems, events, and creator/partner distribution as one connected growth practice.',
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      ...(item.path ? { item: `${siteConfig.url}${item.path}` } : {}),
    })),
  };
}

export function faqJsonLd(faqs: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

export function serviceJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: `${siteConfig.url}${path}`,
    provider: {
      '@type': 'Organization',
      name: siteConfig.legalEntityName,
      url: siteConfig.url,
    },
  };
}

