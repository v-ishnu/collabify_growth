import type { Metadata } from 'next';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { SolutionsView } from '@/features/solutions/SolutionsView';

export const metadata: Metadata = buildMetadata({
  title: 'Integrated Growth Programmes · Collabify Growth',
  description:
    'Founder Growth, Startup Launch, Event Growth, Digital Transformation, Corporate Media and Founder OS Setup: one plan, one lead, one report.',
  path: '/solutions',
});

export default function SolutionsPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Solutions' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SolutionsView />
    </>
  );
}

