import type { Metadata } from 'next';
import { TEAM_SIZE } from '@/content';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { CtaBand } from '@/components/common/CtaBand';

export const metadata: Metadata = buildMetadata({
  title: 'About Collabify Growth · Build. Distribute. Experience.',
  description:
    'Collabify Growth is an integrated growth, technology, media and events company for founders and businesses.',
  path: '/about',
});

export default function AboutPage() {
  const ld = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'About' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        h1="We build connected systems for growth."
        lede="Collabify Growth is an integrated growth, technology, media and events company for founders and businesses."
      />

      <section className="sec-tight">
        <div className="wrap two-col">
          <h2 style={{ fontSize: '1.4rem' }}>Our story</h2>
          <div className="placeholder-block">
            <strong>[Founder story — two or three short paragraphs]</strong>
            In the founder’s voice: what you saw founders and businesses struggling with, why you
            started Collabify, and where you’re based. Keep it specific and personal, and avoid
            claims about scale or clients until they’re true.
          </div>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap two-col">
          <h2 style={{ fontSize: '1.4rem' }}>Why we exist</h2>
          <p className="lede">
            Growth rarely fails for lack of effort. It fails in the gaps between the brand and the
            website, the content and the distribution, the campaign and the follow-up. We started
            Collabify to close those gaps: to give founders and businesses one partner who sees the
            whole picture and is accountable for it.
          </p>
        </div>
      </section>

      <section className="sec on-brand">
        <div className="wrap">
          <div className="two-col">
            <h2 style={{ fontSize: '1.4rem' }}>Vision</h2>
            <p className="statement">
              To build an integrated platform that helps founders and businesses grow their brands,
              build digital products, amplify their stories, organise their operations and create
              meaningful experiences, through one coordinated ecosystem.
            </p>
          </div>
          <div className="two-col" style={{ marginTop: 56 }}>
            <h2 style={{ fontSize: '1.4rem' }}>Mission</h2>
            <p className="lede" style={{ color: '#fff' }}>
              To give founders and businesses one coordinated partner for building, distributing
              and growing, with the craft of specialists and the accountability of a single team.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2>What we believe</h2>
          </div>
          <div className="beliefs">
            <div>
              <h3>Systems over services</h3>
              <p>
                One service solves a task. Connected services move a business from idea to
                execution, from visibility to demand, and from demand to growth.
              </p>
            </div>
            <div>
              <h3>Scope is respect</h3>
              <p>
                Writing down exactly what we’ll deliver protects your time, your budget and our
                relationship.
              </p>
            </div>
            <div>
              <h3>Honesty is a growth strategy</h3>
              <p>We report results as they are and never promise what no one can control.</p>
            </div>
            <div>
              <h3>Specialists, coordinated</h3>
              <p>
                The best work comes from people who do one thing well, led by someone who sees how
                it all fits.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Where we’re heading</h2>
          <div>
            <p className="lede">
              Today, we’re a {TEAM_SIZE}-person integrated services company, working with specialist
              partners where a project needs them, with one point of accountability for every
              project.
            </p>
            <p className="lede">
              As we grow, we’re standardising how we deliver and building tools that make
              collaboration easier for our clients. In time, we plan to turn the workflows that
              prove most valuable into software, built only where clients have shown they need it.
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

