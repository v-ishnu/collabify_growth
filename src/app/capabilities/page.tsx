import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_SERVICES, CAPS, TEAM_SIZE } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { CapIcon } from '@/components/common/Icons';
import { PageHero } from '@/components/common/PageHero';
import { CtaBand } from '@/components/common/CtaBand';

export const metadata: Metadata = buildMetadata({
  title: 'Capabilities · Collabify Growth',
  description:
    'Seven connected capabilities: brand and marketing, technology, media, PR, founder operations, events and distribution. One coordinated team.',
  path: '/capabilities',
});

export default function CapabilitiesPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Capabilities' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Capabilities' }]}
        h1="Seven capabilities, built to work together."
        lede="Strategy, technology, content, PR, operations and events. Each led by specialists, all coordinated by one team."
      />

      <section className="sec">
        <div className="wrap">
          <div className="caplist">
            {CAPS.map((c) => (
              <Link className="caprow" href={`/capabilities/${c.slug}`} key={c.id}>
                <h3>
                  <CapIcon id={c.id} />
                  {c.name}
                </h3>
                <div>
                  <p>{c.card}</p>
                </div>
                <span className="cnt">{c.count} services</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: 28 }}>
            <Link className="tlink" href="/services">
              Browse and search all {ALL_SERVICES.length} services
            </Link>
          </p>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>Most growth problems cross more than one line.</h2>
          </div>
          <div className="commit">
            <div>
              <h3>A founder building a public profile</h3>
              <p>
                Needs positioning, a personal website, a podcast, regular content, PR and a CRM to
                follow up on new conversations.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link className="tlink" href="/solutions/founder-growth">
                  Founder Growth
                </Link>
              </p>
            </div>
            <div>
              <h3>A startup preparing to launch</h3>
              <p>Needs a brand, a website or app, a launch campaign, PR and a lead pipeline.</p>
              <p style={{ marginTop: 12 }}>
                <Link className="tlink" href="/solutions/startup-launch">
                  Startup Launch
                </Link>
              </p>
            </div>
            <div>
              <h3>An event organiser</h3>
              <p>
                Needs a concept, branding, a ticketing site, invitations, audience growth, sponsors,
                production and post-event content.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link className="tlink" href="/solutions/event-growth">
                  Event Growth
                </Link>
              </p>
            </div>
            <div>
              <h3>Something that doesn’t fit a category?</h3>
              <p>
                Tell us the problem. We’ll design a programme across marketing, technology,
                content, PR, hiring, distribution and events, scope it in writing and lead it end
                to end.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link className="tlink" href="/start-a-project">
                  Start a Project
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap two-col">
          <h2 style={{ fontSize: '1.4rem' }}>How we deliver</h2>
          <p className="lede">
            Every capability is delivered by our {TEAM_SIZE}-person team, with specialist partners
            (studios, production vendors and freelancers we qualify and manage) where a project
            needs them. You deal with one Collabify lead throughout, and we stay accountable for
            quality.
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

