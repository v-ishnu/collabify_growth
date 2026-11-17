import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PROG_BY_SLUG, PROGRAMMES } from '@/content';
import { buildMetadata, breadcrumbJsonLd, serviceJsonLd } from '@/lib/seo';
import { SolutionsView } from '@/features/solutions/SolutionsView';

export function generateStaticParams() {
  return [...PROGRAMMES.map((p) => ({ slug: p.slug })), { slug: 'custom' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'custom') {
    return buildMetadata({
      title: 'Custom Solutions · Collabify Growth',
      description:
        'Bespoke integrated programmes across marketing, technology, content, PR, hiring, distribution and events.',
      path: '/solutions/custom',
    });
  }
  const prog = PROG_BY_SLUG[slug];
  if (!prog) {
    return buildMetadata({
      title: 'Solutions · Collabify Growth',
      description: 'Integrated Growth Programmes.',
      path: `/solutions/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${prog.name} · Integrated Growth Programmes · Collabify Growth`,
    description: `${prog.line} (${prog.for})`,
    path: `/solutions/${prog.slug}`,
  });
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== 'custom' && !PROG_BY_SLUG[slug]) {
    notFound();
  }

  const prog = PROG_BY_SLUG[slug];
  const label = prog ? prog.name : 'Custom Solutions';
  const desc = prog ? prog.line : 'Bespoke integrated growth and technology programme.';

  const ld = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: label },
    ]),
    serviceJsonLd(label, desc, `/solutions/${slug}`),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SolutionsView highlightSlug={slug} />
    </>
  );
}

