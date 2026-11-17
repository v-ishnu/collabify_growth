import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ALL_SERVICES,
  CAPS,
  PROGRAMMES,
  TEAM_SIZE,
} from '@/content';
import { buildMetadata } from '@/lib/seo';
import { fmtDay } from '@/lib/format';
import { estimateReadMins } from '@/lib/markdown';
import { getPublishedPosts } from '@/lib/posts/public';
import { CapIcon, ToolIcon } from '@/components/common/Icons';
import { CtaBand } from '@/components/common/CtaBand';
import { ProofSection } from '@/components/common/ProofSection';
import { ShowcaseCarousel } from '@/features/home/ShowcaseCarousel';
import { CapabilityMarquee } from '@/features/home/CapabilityMarquee';
import { ProgrammeComposer } from '@/features/home/ProgrammeComposer';
import { MediaKitCard, type MediaKitData } from '@/features/tools/MediaKitCard';

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: 'Collabify Growth · Growth, Technology, Media & Events',
  description:
    'One partner for brand, marketing, websites and apps, podcasts, PR, founder operations and events. Start with one service or an integrated programme.',
  path: '/',
});

const SAMPLE_MEDIA_KIT: MediaKitData = {
  v: 1,
  n: 'Your Name',
  h: 'yourhandle',
  ni: 'Travel',
  c: 'Jaipur',
  b: 'Slow travel and food stories from small-town India.',
  th: 'sunset',
  p: [
    ['Instagram', '48200', '21000', '4.6'],
    ['YouTube', '12800', '9000', ''],
  ],
  a: { ci: 'Jaipur, Delhi, Mumbai', ag: '18–24', g: '58% women' },
  r: [
    ['Instagram Reel', ''],
    ['YouTube integration (60–90 sec)', ''],
  ],
  ro: true,
  br: '',
  e: 'hello@yourname.in',
  ph: '',
  l: '',
};

const CHAIN_ROWS: Array<[string, string]> = [
  ['The brand', 'a designer'],
  ['The website', 'a developer'],
  ['The ads', 'an agency'],
  ['The content', 'a freelancer'],
  ['The PR', 'someone else'],
  ['The launch event', 'a vendor'],
];

const HOME_SEGMENTS = [
  'Startup founders',
  'Growth-stage startups',
  'SMEs',
  'B2B companies',
  'Corporate brands',
  'Executives and personal brands',
  'Event and exhibition organisers',
  'Podcast and media businesses',
  'Institutions and ecosystem organisations',
];

export default async function HomePage() {
  const recentPosts = await getPublishedPosts(3);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker">
              <b aria-hidden="true" />
              Growth, technology, media, PR and events
            </span>
            <h1>One partner to build, distribute and grow your business.</h1>
            <p className="lede">
              Collabify Growth brings brand, marketing, technology, media, PR, founder operations
              and events into one coordinated team, so you can go from idea to launch without
              managing six agencies.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" href="/start-a-project">
                Start a Project
              </Link>
              <Link className="btn btn-secondary" href="/health-check">
                Take the free growth check
              </Link>
            </div>
            <p className="hero-note">
              14 questions, an instant score and your three priorities. Or{' '}
              <Link className="tlink" href="/capabilities">
                explore capabilities
              </Link>
              .
            </p>
          </div>
          <ShowcaseCarousel />
        </div>
      </section>

      <CapabilityMarquee />

      <section className="sec-tight">
        <div className="wrap">
          <h2 className="sr-only">Collabify in numbers</h2>
          <div className="stats">
            <div>
              <b>{TEAM_SIZE}</b>
              <span>People on the team</span>
            </div>
            <div>
              <b>{CAPS.length}</b>
              <span>Connected capabilities</span>
            </div>
            <Link href="/services">
              <b>{ALL_SERVICES.length}</b>
              <span>Services in our catalogue</span>
            </Link>
            <div>
              <b>1</b>
              <span>Project lead per engagement</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec creator-band">
        <div className="wrap creator-promo">
          <div>
            <span className="kicker">
              <b aria-hidden="true" />
              Free for creators
            </span>
            <h2>Make your media kit in minutes. Free.</h2>
            <p className="lede">
              Add your platforms, audience and rates, pick a design, and get a professional media
              kit to send to brands. Download it or share it as a link. No sign-up.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" href="/tools/media-kit">
                Make my free media kit
              </Link>
              <Link className="btn btn-secondary" href="/tools">
                See all free tools
              </Link>
            </div>
          </div>
          <div className="creator-sample" aria-hidden="true">
            <span className="sample-tag">Example</span>
            <MediaKitCard d={SAMPLE_MEDIA_KIT} />
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap handoff">
          <div>
            <h2>Growth breaks at the hand-offs.</h2>
            <p className="lede" style={{ marginTop: 20 }}>
              Most businesses buy growth in pieces. Each supplier does their part. No one owns the
              whole, so briefs get repeated, timelines drift and the story changes from channel to
              channel.
            </p>
            <p className="kick">
              Collabify replaces the hand-offs with one plan, one project lead and one standard of
              delivery.
            </p>
          </div>
          <div>
            <h3 className="sr-only">The usual way growth gets bought</h3>
            <ul className="chain">
              {CHAIN_ROWS.map(([what, who]) => (
                <li key={what}>
                  <span>{what}</span>
                  <span>{who}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec on-brand">
        <div className="wrap">
          <h2 className="sr-only">Build. Distribute. Experience.</h2>
          <div className="bde">
            <div className="bde-row">
              <p className="bde-word" aria-hidden="true">
                Build.
              </p>
              <p>
                <strong>The foundations.</strong> Brand, websites, apps, systems and the operations
                behind them.
              </p>
            </div>
            <div className="bde-row">
              <p className="bde-word" aria-hidden="true">
                Distribute.
              </p>
              <p>
                <strong>The reach.</strong> Content, PR, campaigns, creators and communities that
                carry your story to the right audiences.
              </p>
            </div>
            <div className="bde-row">
              <p className="bde-word" aria-hidden="true">
                Experience.
              </p>
              <p>
                <strong>The moments.</strong> Events, activations and live content that turn
                attention into relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Seven capabilities. One coordinated team.</h2>
            <p className="lede">
              Use one, or combine several. Either way, you work with one Collabify lead.
            </p>
          </div>
          <div className="caplist">
            {CAPS.map((c) => (
              <Link className="caprow" href={`/capabilities/${c.slug}`} key={c.id}>
                <h3>
                  <CapIcon id={c.id} />
                  {c.name}
                </h3>
                <div>
                  <p>{c.menu}</p>
                </div>
                <span className="cnt">{c.count} services</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>Start with a service. Or solve the whole problem.</h2>
          </div>
          <div className="split2">
            <div className="way">
              <h3>A single service</h3>
              <p className="muted">
                Need a website, a podcast, a PR campaign or an event? Hire us for exactly that,
                with a clear scope and a fixed set of deliverables.
              </p>
              <div className="btn-row">
                <Link className="btn btn-secondary" href="/capabilities">
                  Browse services
                </Link>
              </div>
            </div>
            <div className="way alt on-brand">
              <h3>An integrated programme</h3>
              <p>
                Launching a company, a product or an event? We combine the capabilities you need
                into one programme, with one plan, one lead and one report.
              </p>
              <div className="prog-links">
                {PROGRAMMES.map((p) => (
                  <Link key={p.slug} href={`/solutions/${p.slug}`}>
                    {p.name}
                  </Link>
                ))}
              </div>
              <div className="btn-row">
                <Link className="btn btn-primary" href="/solutions">
                  See integrated solutions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec on-brand">
        <div className="wrap build-grid">
          <div>
            <h2>Build your own programme.</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Not sure what you need? Pick the capabilities that apply and we’ll suggest the closest
              programme. Whatever you choose, one Collabify lead coordinates it.
            </p>
            <div className="btn-row" style={{ marginTop: 28 }}>
              <Link className="btn btn-secondary" href="/solutions">
                Compare programmes
              </Link>
            </div>
          </div>
          <ProgrammeComposer />
        </div>
      </section>

      {/* <ProofSection /> */}

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head split">
            <h2>From first call to final report.</h2>
            <p className="lede">
              The same four stages for a single landing page or a year-long programme.
            </p>
          </div>
          <ol className="steps">
            <li>
              <h3>Discover</h3>
              <p>We learn your goals, constraints and what’s already in place.</p>
            </li>
            <li>
              <h3>Scope</h3>
              <p>You get a written proposal: deliverables, timeline, dependencies and price.</p>
            </li>
            <li>
              <h3>Deliver</h3>
              <p>A named project lead runs the work, with reviews and approvals at each stage.</p>
            </li>
            <li>
              <h3>Report and grow</h3>
              <p>We report what was delivered and what it achieved, then plan what’s next.</p>
            </li>
          </ol>
          <p style={{ marginTop: 32 }}>
            <Link className="tlink" href="/how-we-work">
              How we work
            </Link>
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Built for people building something.</h2>
            <p className="lede">
              Founders, growing companies, established businesses and the organisers who bring
              people together.
            </p>
          </div>
          <div className="segments">
            {HOME_SEGMENTS.map((seg) => (
              <Link key={seg} href="/who-we-serve">
                {seg}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>What you can hold us to.</h2>
          </div>
          <div className="commit">
            <div>
              <h3>Clear scope</h3>
              <p>Deliverables, revision rounds and exclusions are written down before work starts.</p>
            </div>
            <div>
              <h3>One accountable lead</h3>
              <p>One person owns your project, even when several specialists deliver it.</p>
            </div>
            <div>
              <h3>The right specialists</h3>
              <p>
                Our {TEAM_SIZE}-person team covers the core work. For specialist production and niche
                skills we bring in qualified partners, and we stay responsible for the quality.
              </p>
            </div>
            <div>
              <h3>Honest reporting</h3>
              <p>
                We report results as they are. We never promise rankings, press coverage, virality
                or registrations, because no one can honestly guarantee them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap community-teaser">
          <div>
            <h2>Join the Collabify Community.</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              A paid, members-only network for founders, operators and creators. Topic channels, a
              member directory and introductions to people worth knowing.
            </p>
          </div>
          <div className="btn-row">
            <Link className="btn btn-primary" href="/community">
              Explore the community
            </Link>
            <Link className="btn btn-secondary" href="/community/join">
              Apply to join
            </Link>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Three more ways to grow with Collabify.</h2>
            <p className="lede">
              Free tools for creators and small businesses, commission for people who refer
              clients, and white-label delivery for agencies.
            </p>
          </div>
          <div className="grow-grid">
            <div className="grow-card">
              <ToolIcon k="kit" color="#FF9D3E" />
              <h3>Free tools</h3>
              <p>
                A growth health check, plus media kit, event invite and WhatsApp QR makers. Free,
                with no sign-up.
              </p>
              <Link className="tlink" href="/tools">
                Explore free tools
              </Link>
            </div>
            <div className="grow-card">
              <ToolIcon k="refer" color="#35AFA0" />
              <h3>Refer and earn</h3>
              <p>
                Recommend us to founders and businesses, and earn commission when they become
                clients.
              </p>
              <Link className="tlink" href="/affiliates">
                Join the affiliate program
              </Link>
            </div>
            <div className="grow-card">
              <ToolIcon k="layers" color="#6B6FCB" />
              <h3>White-label for agencies</h3>
              <p>Sell our services under your own brand. We deliver behind the scenes.</p>
              <Link className="tlink" href="/white-label">
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {recentPosts.length > 0 && (
        <section className="sec" id="homeBlog">
          <div className="wrap">
            <div className="sec-head split">
              <h2>From the blog.</h2>
              <p className="lede">
                Practical writing on growth, technology and building a business.
              </p>
            </div>
            <div id="homePosts">
              {recentPosts.map((p) => (
                <Link className="post-row" href={`/blog/${encodeURIComponent(p.slug)}`} key={p.slug}>
                  <p className="post-meta">{fmtDay(p.published_at || p.created_at)}</p>
                  <div>
                    <h3>{p.title}</h3>
                    <p className="muted">{p.seo_description || ''}</p>
                  </div>
                  <p className="post-meta">
                    {p.category || 'Article'}, {p.read_mins || estimateReadMins(p.body_md)} min read
                  </p>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: 24 }}>
              <Link className="tlink" href="/blog">
                Read all articles
              </Link>
            </p>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
