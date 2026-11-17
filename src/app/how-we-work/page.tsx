import type { Metadata } from 'next';
import Link from 'next/link';
import { ENGAGEMENTS, PROCESS, TEAM_SIZE } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { ComparisonTable } from '@/components/common/ComparisonTable';

export const metadata: Metadata = buildMetadata({
  title: 'How We Work · Collabify Growth',
  description:
    'Clear scope, one accountable lead and honest reporting. See how we take every project from first conversation to final report.',
  path: '/how-we-work',
});

export default function HowWeWorkPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'How We Work' },
  ]);

  let stepNum = 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'How We Work' }]}
        h1="Clear scope. One lead. No surprises."
        lede="How we take a project from first conversation to final report, and what you can expect at every step."
      />

      <section className="sec-tight">
        <div className="wrap split2">
          <div className="way">
            <h3>A single service</h3>
            <p className="muted">
              One defined piece of work, such as a website, a podcast season or a PR campaign, with
              a fixed scope and deliverables.
            </p>
          </div>
          <div className="way">
            <h3>An integrated programme</h3>
            <p className="muted">
              Several capabilities combined under one plan, one project lead and one report.
            </p>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 'clamp(24px,3vw,48px)' }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Our process, in 13 steps</h2>
          </div>
          {PROCESS.map(([stageName, items]) => (
            <div className="stage" key={stageName}>
              <h2>{stageName}</h2>
              <ol>
                {items.map(([stepTitle, stepDesc]) => {
                  stepNum++;
                  return (
                    <li key={stepTitle} value={stepNum}>
                      <span className="n" aria-hidden="true">
                        {String(stepNum).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{stepTitle}</strong>
                        <span>{stepDesc}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Our standards</h2>
          <div>
            <p className="lede">
              Every service we offer has a named owner, a documented process, a quality checklist, a
              defined deliverables list, a timeline, an approval step, a reporting format, an
              escalation route and a written scope boundary.{' '}
              <span className="ph">
                [Publish this line only once each launch service has its SOP and checklist in place.]
              </span>
            </p>
          </div>
        </div>
        <div className="wrap two-col" style={{ marginTop: 56 }}>
          <h2>Who does the work</h2>
          <p className="lede">
            Your project is led by a member of our {TEAM_SIZE}-person team. Delivery combines that
            team with specialist partners where a project needs them: studios, production vendors
            and niche specialists we qualify, brief and manage. You always know who is working on
            your project, and we stay responsible for the result.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Compare your options</h2>
            <p className="lede">
              The same work can be bought in different ways. Here’s how they differ.
            </p>
          </div>
          <ComparisonTable />
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>How engagements are structured</h2>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Engagement type</th>
                  <th scope="col">Typically used for</th>
                </tr>
              </thead>
              <tbody>
                {ENGAGEMENTS.map(([name, usedFor]) => (
                  <tr key={name}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{usedFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sec on-brand">
        <div className="wrap two-col">
          <h2>What we won’t promise</h2>
          <p className="lede">
            We don’t promise unlimited revisions, guaranteed search rankings, guaranteed press
            coverage, virality or a set number of registrations. No one can honestly control those
            outcomes. We promise the work, the standard and an honest account of the results.
          </p>
        </div>
      </section>

      <section className="sec sec-alt cta-band">
        <div className="wrap">
          <div>
            <h2>One partner, from idea to launch.</h2>
            <p className="lede">
              Bring us one project or the whole plan. We’ll scope it, assemble the right team and
              lead it from brief to report.
            </p>
          </div>
          <div className="btn-row">
            <Link className="btn btn-primary" href="/start-a-project">
              Start a Project
            </Link>
            <Link className="btn btn-secondary" href="/how-we-work">
              See how we work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

