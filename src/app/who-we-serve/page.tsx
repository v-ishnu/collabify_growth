import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SEGMENTS } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { CtaBand } from '@/components/common/CtaBand';

export const metadata: Metadata = buildMetadata({
  title: 'Who We Serve · Collabify Growth',
  description:
    'Startups, B2B companies, SMEs, corporate brands, executives, event organisers, media businesses and ecosystem organisations across India.',
  path: '/who-we-serve',
});

export default function WhoWeServePage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Who We Serve' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Who We Serve' }]}
        h1="Built for people building something."
        lede="Founders, growing companies, established businesses and the organisers who bring people together. Here’s where we’d suggest starting."
      />

      <section className="sec" style={{ paddingTop: 'clamp(24px,3vw,40px)' }}>
        <div className="wrap">
          {SEGMENTS.map(([title, chal, help, links]) => (
            <article className="seg" key={title}>
              <h2>{title}</h2>
              <p className="chal">{chal}</p>
              <div>
                <p className="help">{help}</p>
                <p className="start">
                  <span className="muted">Start with</span>{' '}
                  {links.map(([label, href], idx) => (
                    <Fragment key={href}>
                      {idx > 0 && ' '}
                      <Link className="tlink" href={href}>
                        {label}
                      </Link>
                    </Fragment>
                  ))}
                </p>
              </div>
            </article>
          ))}

          <div className="callout" style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: '1.4rem' }}>Not sure where you fit?</h2>
            <p className="muted">
              Tell us what you’re working on and we’ll suggest where to start.
            </p>
            <div className="btn-row" style={{ marginTop: 20 }}>
              <Link className="btn btn-primary" href="/start-a-project">
                Start a Project
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

