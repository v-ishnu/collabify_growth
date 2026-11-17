import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo';
import { buildStartProjectUrl } from '@/lib/format';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';

export const metadata: Metadata = buildMetadata({
  title: 'Business Website Development · Collabify Growth',
  description:
    'Responsive business websites with a CMS your team can update. Design, development, launch and training from one accountable team.',
  path: '/services/business-website-development',
});

const INCLUDED: Array<[string, string]> = [
  ['Discovery and structure', 'Discovery workshop, sitemap and content structure.'],
  [
    'Design',
    'Desktop and mobile designs: home page plus up to [X] page templates, with [2] revision rounds per design stage.',
  ],
  ['Development', 'Built on [your chosen CMS] for up to [X] pages.'],
  ['Forms', 'Contact forms connected to your email or CRM.'],
  ['Search basics', 'Page titles, meta descriptions, XML sitemap and analytics setup. [SEO]'],
  ['Quality checks', 'Speed, mobile and accessibility checks before launch.'],
  ['Launch', 'Domain, DNS, SSL and hosting setup.'],
  ['Training', 'A recorded training session for your team.'],
  ['Aftercare', '[30] days of post-launch fixes.'],
];

const STEPS = ['Discover', 'Structure', 'Design', 'Build', 'Review', 'Launch', 'Handover'];

const FAQS: Array<[string, string]> = [
  [
    'Can we update the site ourselves?',
    'Yes. It’s built on a content management system, and we train your team before handover.',
  ],
  [
    'Who owns the website?',
    'You do, on full payment, as set out in your contract [confirm in contract template]. All accounts are registered to your business.',
  ],
  [
    'Do you write the content?',
    'We can. Copywriting is available as an add-on, or we’ll guide your team with a content structure for each page.',
  ],
];

export default function BusinessWebsiteDevelopmentPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Capabilities', path: '/capabilities' },
      { name: 'Technology', path: '/capabilities/technology' },
      { name: 'Business websites' },
    ]),
    serviceJsonLd(
      'Corporate & Business Website Development',
      'Responsive, fast-loading business websites with a content management system your team can update.',
      '/services/business-website-development',
    ),
    faqJsonLd(FAQS),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Capabilities', href: '/capabilities' },
          { label: 'Technology', href: '/capabilities/technology' },
          { label: 'Business websites' },
        ]}
        h1="A business website that explains what you do and makes it easy to get in touch."
        lede="Responsive, fast-loading websites with a content management system your team can update. Designed, built and launched by one accountable team."
        buttons={
          <Link className="btn btn-primary" href={buildStartProjectUrl({ caps: ['tech'] })}>
            Start a website project
          </Link>
        }
      />

      <section className="sec">
        <div className="wrap">
          <div className="svc-group" style={{ borderTop: 0, paddingTop: 0 }}>
            <h2>Who it’s for</h2>
            <dl className="svc-list">
              {[
                'Your current website no longer reflects what you sell.',
                'You’re launching a business and need a credible site, not a template.',
                'Your team needs to update content without calling a developer.',
              ].map((line) => (
                <div className="svc" style={{ gridTemplateColumns: '1fr' }} key={line}>
                  <dt style={{ fontWeight: 500 }}>{line}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="svc-group">
            <h2>What’s included</h2>
            <dl className="svc-list">
              {INCLUDED.map(([term, desc]) => (
                <div className="svc" key={term}>
                  <dt>
                    <PlaceholderText text={term} />
                  </dt>
                  <dd>
                    <PlaceholderText text={desc} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="svc-group">
            <h2>How it works</h2>
            <div>
              <ol
                className="steps"
                style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}
              >
                {STEPS.map((s) => (
                  <li key={s}>
                    <h3>{s}</h3>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="svc-group">
            <h2>What you receive</h2>
            <p className="lede">
              The live website, admin access for your team, design files, a short user guide, a
              credentials and accounts list, and a record of every plugin, licence and third-party
              service used.
            </p>
          </div>

          <div className="svc-group">
            <h2>Not included</h2>
            <p className="lede">
              Copywriting beyond <span className="ph">[X]</span> pages, photography and video, paid
              stock assets, ongoing search work, maintenance after the fix period, and third-party
              fees such as hosting, domain and premium plugins.
            </p>
          </div>

          <div className="svc-group">
            <h2>Timeline</h2>
            <p className="lede">
              <span className="ph">[X–Y weeks]</span>, confirmed in your proposal.
            </p>
          </div>

          <div className="svc-group">
            <h2>Pairs well with</h2>
            <ul className="pairs">
              <li>
                <Link className="tlink" href="/capabilities/brand-marketing">
                  Visual Identity &amp; Brand Guidelines
                </Link>
              </li>
              <li>
                <Link className="tlink" href="/capabilities/brand-marketing">
                  Brand Messaging &amp; Storytelling
                </Link>
              </li>
              <li>
                <Link className="tlink" href="/capabilities/technology">
                  Website &amp; Application Maintenance
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Questions buyers ask</h2>
          <FaqAccordion faqs={FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}

