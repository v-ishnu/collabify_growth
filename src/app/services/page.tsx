import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ALL_SERVICES } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { CtaBand } from '@/components/common/CtaBand';
import { ServicesFinder } from '@/features/services/ServicesFinder';

export const metadata: Metadata = buildMetadata({
  title: 'All Services · Collabify Growth',
  description: `Search all ${ALL_SERVICES.length} Collabify Growth services across brand, marketing, technology, media, PR, founder operations, events and distribution.`,
  path: '/services',
});

export default function ServicesPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'All services' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'All services' }]}
        h1={`All ${ALL_SERVICES.length} services, in one place.`}
        lede="Search, or filter by capability. Add services to your enquiry as you go, and we’ll scope them together."
      />
      <Suspense
        fallback={
          <section className="sec">
            <div className="wrap">
              <p className="muted">Loading services…</p>
            </div>
          </section>
        }
      >
        <ServicesFinder />
      </Suspense>
      <CtaBand />
    </>
  );
}

