import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CAP_BY_ID, CAP_BY_SLUG, CAPS, OWN_EVENTS, SVC_BY_NAME } from '@/content';
import { buildMetadata, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo';
import { buildStartProjectUrl } from '@/lib/format';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { ServiceRow } from '@/components/common/ServiceRow';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';
import { ScrollTargetButton } from '@/components/common/ScrollTargetButton';
import { MarketplaceInterestForm } from '@/components/forms/MarketplaceInterestForm';

export function generateStaticParams() {
  return CAPS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = CAP_BY_SLUG[slug];
  if (!c) {
    return buildMetadata({
      title: 'Capability Not Found · Collabify Growth',
      description: 'Requested capability was not found.',
      path: `/capabilities/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${c.title} · Collabify Growth`,
    description: c.desc,
    path: `/capabilities/${c.slug}`,
  });
}

export default async function CapabilityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = CAP_BY_SLUG[slug];
  if (!c) notFound();

  const idx = CAPS.findIndex((x) => x.slug === c.slug);
  const prev = CAPS[(idx - 1 + CAPS.length) % CAPS.length]!;
  const next = CAPS[(idx + 1) % CAPS.length]!;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Capabilities', path: '/capabilities' },
      { name: c.name },
    ]),
    serviceJsonLd(c.name, c.desc, `/capabilities/${c.slug}`),
    faqJsonLd(c.faqs),
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
          { label: c.name },
        ]}
        h1={c.h1}
        lede={c.sub}
        buttons={
          <>
            <Link className="btn btn-primary" href={buildStartProjectUrl({ caps: [c.id] })}>
              Start a Project
            </Link>
            <Link className="btn btn-secondary" href={c.btn2[1]}>
              {c.btn2[0]}
            </Link>
          </>
        }
        extra={
          <nav className="jump" aria-label="On this page">
            {c.groups.map((g, gi) => (
              <ScrollTargetButton key={g.title} targetId={`grp-${gi}`} label={g.title} />
            ))}
            {c.marketplace && (
              <>
                <ScrollTargetButton targetId="own-events" label="Collabify events" />
                <ScrollTargetButton targetId="marketplace" label="Marketplace" />
              </>
            )}
            <ScrollTargetButton targetId="faq" label="Questions" />
          </nav>
        }
      />

      <section className="sec-tight">
        <div className="wrap">
          <p className="intro">
            <PlaceholderText text={c.intro} />
          </p>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 24 }}>
        <div className="wrap">
          {c.groups.map((g, gi) => (
            <div className="svc-group" id={`grp-${gi}`} key={g.title}>
              <h2>
                {g.title}
                <span className="gcount">
                  {g.items.length} {g.items.length === 1 ? 'service' : 'services'}
                </span>
              </h2>
              <dl className="svc-list">
                {g.items.map((it) => {
                  const svc = SVC_BY_NAME[it[0]];
                  return svc ? <ServiceRow key={svc.name} service={svc} /> : null;
                })}
              </dl>
            </div>
          ))}
        </div>
      </section>

      {c.marketplace && (
        <>
          <section className="sec" id="own-events">
            <div className="wrap two-col">
              <div>
                <span className="planned">Coming soon</span>
                <h2 style={{ marginTop: 16 }}>Collabify events</h2>
              </div>
              <div>
                <p className="lede">
                  Our own event formats for founders and business leaders, each with its own
                  audience, programme and sponsorship model. Sponsorship and partnership enquiries are
                  welcome.
                </p>
                {OWN_EVENTS.map((e, i) => (
                  <div className="event-card" key={i}>
                    <h3>
                      <PlaceholderText text={e.name} />
                    </h3>
                    <dl>
                      <dt>Format</dt>
                      <dd>
                        <PlaceholderText text={e.format} />
                      </dd>
                      <dt>Date</dt>
                      <dd>
                        <PlaceholderText text={e.date} />
                      </dd>
                      <dt>City</dt>
                      <dd>
                        <PlaceholderText text={e.city} />
                      </dd>
                      <dt>Who it’s for</dt>
                      <dd>
                        <PlaceholderText text={e.audience} />
                      </dd>
                    </dl>
                    <div className="btn-row">
                      <Link
                        className="btn btn-primary btn-sm"
                        href={buildStartProjectUrl({
                          caps: ['events'],
                          programme: 'Collabify events',
                          note: 'I’d like to discuss sponsoring or partnering on a Collabify event.',
                        })}
                      >
                        Enquire about sponsorship
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="sec sec-alt" id="marketplace">
            <div className="wrap two-col">
              <div>
                <span className="planned">Planned</span>
                <h2 style={{ marginTop: 16 }}>Collabify Distribution Marketplace</h2>
              </div>
              <div>
                <p className="lede">
                  We’re planning a platform that connects brands with creators, communities,
                  newsletters and publishers for managed campaigns. It isn’t available yet. Today,
                  we run these campaigns as a managed service.
                </p>
                <MarketplaceInterestForm />
              </div>
            </div>
          </section>
        </>
      )}

      <section className={`sec-tight${c.marketplace ? '' : ' sec-alt'}`}>
        <div className="wrap two-col">
          <h2 style={{ fontSize: '1.4rem' }}>Works well with</h2>
          <ul className="pairs">
            {c.pairs.map(([pairCapId, note]) => {
              const target = CAP_BY_ID[pairCapId];
              return (
                <li key={pairCapId}>
                  <Link className="tlink" href={`/capabilities/${target.slug}`}>
                    {target.name}
                  </Link>{' '}
                  <span className="muted">{note}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="sec" id="faq">
        <div className="wrap two-col">
          <h2>Questions buyers ask</h2>
          <FaqAccordion faqs={c.faqs} />
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap nextprev">
          <Link href={`/capabilities/${prev.slug}`}>
            <small>Previous capability</small>
            <strong>{prev.name}</strong>
          </Link>
          <Link className="nx" href={`/capabilities/${next.slug}`}>
            <small>Next capability</small>
            <strong>{next.name}</strong>
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

