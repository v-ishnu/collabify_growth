import { Suspense } from 'react';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { EnquiryForm } from '@/components/forms/EnquiryForm';

export const metadata: Metadata = buildMetadata({
  title: 'Start a Project · Collabify Growth',
  description:
    'Tell us what you’re building. Share your goals, timeline and budget, and we’ll reply with next steps.',
  path: '/start-a-project',
});

export default async function StartAProjectPage() {
  const cookieStore = await cookies();
  const refCookie = cookieStore.get('cg_ref')?.value || '';

  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Start a Project' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Start a Project' }]}
        h1="Tell us what you’re building."
        lede="One service or a full programme. Share a few details and we’ll reply within [two working days] with next steps."
      />

      <section className="sec" style={{ paddingTop: 'clamp(32px,4vw,56px)' }}>
        <div className="wrap form-shell">
          <Suspense fallback={<p className="muted">Loading form…</p>}>
            <EnquiryForm initialPartnerRef={refCookie} />
          </Suspense>

          <aside className="form-aside">
            <div className="callout">
              <h3>What happens next</h3>
              <ol style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--muted)' }}>
                <li>We read your enquiry and check we’re the right fit.</li>
                <li>If it looks like a fit, we suggest a short discovery call.</li>
                <li>You receive a written proposal: scope, timeline and price.</li>
              </ol>
            </div>
            <div className="callout">
              <h3>Prefer email?</h3>
              <p>
                Write to <PlaceholderText text={siteConfig.contact.email} />.
              </p>
              <p className="small" style={{ marginTop: 8 }}>
                <span className="ph">
                  [Add a booking link for a 20-minute discovery call once your calendar is set up.]
                </span>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

