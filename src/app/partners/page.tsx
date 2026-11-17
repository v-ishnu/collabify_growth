import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PARTNER_TYPES } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { ScrollTargetButton } from '@/components/common/ScrollTargetButton';
import { PartnerForm } from '@/components/forms/PartnerForm';

export const metadata: Metadata = buildMetadata({
  title: 'Partner With Us · Collabify Growth',
  description:
    'Freelancers, studios, event vendors, creators and community builders: apply to join the Collabify Growth specialist network.',
  path: '/partners',
});

export default function PartnersPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Partner With Us' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Partner With Us' }]}
        h1="Do your best work, on well-run projects."
        lede="We’re building a network of independent specialists, studios, vendors, creators and community builders across India. If you’re excellent at what you do, we’d like to hear from you."
        buttons={
          <ScrollTargetButton
            targetId="partnerFormSec"
            label="Apply to partner"
            className="btn btn-primary"
            focusTarget
          />
        }
      />

      <section className="sec">
        <div className="wrap two-col">
          <h2>Who we work with</h2>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Partner type</th>
                  <th scope="col">Examples</th>
                </tr>
              </thead>
              <tbody>
                {PARTNER_TYPES.map(([type, examples]) => (
                  <tr key={type}>
                    <td>
                      <strong>{type}</strong>
                    </td>
                    <td>{examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap split2">
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 20 }}>What you can expect</h2>
            <div className="commit" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <h3>Clear briefs</h3>
                <p>Defined scope, deliverables and deadlines before you start.</p>
              </div>
              <div>
                <h3>Fair, documented terms</h3>
                <p>
                  Rates and <span className="ph">[payment terms]</span> agreed in writing for every
                  engagement.
                </p>
              </div>
              <div>
                <h3>One point of contact</h3>
                <p>A Collabify lead who handles the client relationship, so you can focus on the work.</p>
              </div>
              <div>
                <h3>Credit where it’s allowed</h3>
                <p>We share portfolio rights where the client agrees.</p>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 20 }}>What we expect</h2>
            <div className="commit" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <h3>The agreed standard</h3>
                <p>Work delivered to the agreed quality and timeline.</p>
              </div>
              <div>
                <h3>Confidentiality</h3>
                <p>Client information and credentials stay private.</p>
              </div>
              <div>
                <h3>Compliance</h3>
                <p>Platform rules, advertising disclosure and data protection law, every time.</p>
              </div>
              <div>
                <h3>Early warnings</h3>
                <p>Honest communication when something is at risk.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="partnerFormSec" tabIndex={-1}>
        <div className="wrap form-shell">
          <div>
            <h2>Apply to partner</h2>
            <p className="muted" style={{ margin: '12px 0 32px' }}>
              Takes about three minutes. Fields marked optional can be left blank.
            </p>
            <Suspense fallback={<p className="muted">Loading form…</p>}>
              <PartnerForm />
            </Suspense>
          </div>
          <aside className="form-aside">
            <div className="callout">
              <h3>What happens next</h3>
              <p>
                We review every application and contact you when there’s a project that fits your
                skills. Applying doesn’t guarantee work.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

