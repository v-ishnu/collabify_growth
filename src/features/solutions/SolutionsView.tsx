'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMMES } from '@/content';
import { buildStartProjectUrl } from '@/lib/format';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { ComparisonTable } from '@/components/common/ComparisonTable';
import { CtaBand } from '@/components/common/CtaBand';

export function SolutionsView({ highlightSlug }: { highlightSlug?: string }) {
  useEffect(() => {
    if (!highlightSlug) return;
    const el = document.getElementById(`prog-${highlightSlug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('target');
    }
  }, [highlightSlug]);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Solutions' }]}
        h1="Integrated programmes for the moments that matter."
        lede="When a goal needs more than one capability, we combine them into one programme, with one plan, one lead and one report."
        buttons={
          <Link className="btn btn-primary" href="/start-a-project">
            Start a Project
          </Link>
        }
      />

      <section className="sec-tight sec-alt">
        <div className="wrap">
          <h2 className="sr-only">How every programme runs</h2>
          <div className="runs">
            <div>
              <h3>Scoped in writing</h3>
              <p>Deliverables, timeline, dependencies, price and reporting are agreed before work starts.</p>
            </div>
            <div>
              <h3>One project lead</h3>
              <p>One person coordinates every specialist and is your single point of contact.</p>
            </div>
            <div>
              <h3>Phased delivery</h3>
              <p>Work moves in stages, with your approval at each one.</p>
            </div>
            <div>
              <h3>One report</h3>
              <p>Progress and results across every channel, in one place.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 'clamp(32px,4vw,56px)' }}>
        <div className="wrap">
          {PROGRAMMES.map((p) => (
            <article
              key={p.slug}
              className={`prog${highlightSlug === p.slug ? ' target' : ''}`}
              id={`prog-${p.slug}`}
            >
              <div>
                <h2>{p.name}</h2>
                <p className="for">
                  <strong>Who it’s for:</strong> {p.for}
                </p>
              </div>
              <div>
                <p className="line">{p.line}</p>
                <ul className="inc" aria-label="Included">
                  {p.includes.map((item) => (
                    <li key={item}>
                      <PlaceholderText text={item} />
                    </li>
                  ))}
                </ul>
                <div className="btn-row">
                  <Link
                    className="btn btn-primary"
                    href={buildStartProjectUrl({ caps: p.caps, programme: p.name })}
                  >
                    Start with {p.name}
                  </Link>
                </div>
              </div>
            </article>
          ))}

          <article
            className={`prog${highlightSlug === 'custom' ? ' target' : ''}`}
            id="prog-custom"
          >
            <div>
              <h2>Custom Solutions</h2>
              <p className="for">
                <strong>Who it’s for:</strong> Anyone whose situation doesn’t fit a programme.
              </p>
            </div>
            <div>
              <p className="line">
                Bring us the problem. We’ll design a programme across marketing, technology,
                content, PR, hiring, distribution and events, then scope it in writing before
                anything starts.
              </p>
              <div className="btn-row">
                <Link
                  className="btn btn-primary"
                  href={buildStartProjectUrl({ caps: [], programme: 'Custom Solutions' })}
                >
                  Start a custom project
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Why one programme beats several suppliers</h2>
            <p className="lede">
              One plan, one lead and one report, compared with the usual alternatives.
            </p>
          </div>
          <ComparisonTable />
        </div>
      </section>

      <CtaBand />
    </>
  );
}

