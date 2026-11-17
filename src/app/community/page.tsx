import Link from 'next/link';
import type { Metadata } from 'next';
import { CHANNELS, COMMUNITY, COMM_RULES } from '@/content';
import { buildMetadata, faqJsonLd } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';

const COMMUNITY_FAQS: Array<[string, string]> = [
  [
    'Is the community free?',
    'No. Membership is paid, so everyone in the room has chosen to invest in it.',
  ],
  [
    'How do I pay?',
    `After you apply, you’ll see a secure payment link for your plan. We open your access once payment is confirmed, usually within ${COMMUNITY.confirmTime}.`,
  ],
  ['Can I get a refund?', COMMUNITY.refund],
  [
    'Who can see my profile?',
    'Only active members. You choose what goes in your profile when you apply.',
  ],
  [
    'Is membership the same as hiring Collabify?',
    'No. Membership gives you access to the community. Our services are separate and scoped on their own.',
  ],
];

export const metadata: Metadata = buildMetadata({
  title: 'Collabify Community · Paid networking for founders and builders',
  description:
    'A paid, members-only community for founders, operators and creators across India: member chat channels, a member directory and introductions.',
  path: '/community',
});

export default function CommunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(COMMUNITY_FAQS)) }}
      />

      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Community' }]}
        h1="A room full of people building something."
        lede="The Collabify Community is a paid, members-only network for founders, operators and creators across India. Ask questions, find collaborators and meet people worth knowing."
        buttons={
          <>
            <Link className="btn btn-primary" href="/community/join">
              Apply to join
            </Link>
            <Link className="btn btn-secondary" href="/community/chat">
              Members area
            </Link>
          </>
        }
      />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2>What members get</h2>
          </div>
          <div className="commit">
            <div>
              <h3>Member chat channels</h3>
              <p>
                Topic channels for introductions, growth, tech, hiring, collaborations and events.
              </p>
            </div>
            <div>
              <h3>Member directory</h3>
              <p>See who’s in the room: role, company, city and what they’re working on.</p>
            </div>
            <div>
              <h3>Introductions</h3>
              <p>
                Tell us who you’d like to meet, and we’ll introduce you where there’s a genuine fit.
              </p>
            </div>
            <div>
              <h3>Events</h3>
              <p>Priority access to Collabify events as they launch.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap two-col">
          <h2 style={{ fontSize: '1.6rem' }}>Channels</h2>
          <dl className="svc-list">
            {CHANNELS.map((c) => (
              <div className="svc" key={c[0]}>
                <dt># {c[1]}</dt>
                <dd>{c[2]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="sec sec-alt" id="plans">
        <div className="wrap">
          <div className="sec-head split">
            <h2>Membership plans</h2>
            <p className="lede">
              Choose monthly or annual. You pay after your application is in, through a secure
              payment link.
            </p>
          </div>
          <div className="plans">
            {COMMUNITY.plans.map((p) => (
              <div className={`plan${p.featured ? ' feat' : ''}`} key={p.id}>
                <h3>{p.name}</h3>
                <p className="price">
                  <PlaceholderText text={p.price} /> <span className="per">{p.per}</span>
                </p>
                <p className="muted small">
                  <PlaceholderText text={p.note} />
                </p>
                <ul>
                  {p.features.map((f, idx) => (
                    <li key={idx}>
                      <PlaceholderText text={f} />
                    </li>
                  ))}
                </ul>
                <Link
                  className={`btn ${p.featured ? 'btn-primary' : 'btn-secondary'}`}
                  href={`/community/join?plan=${encodeURIComponent(p.id)}`}
                >
                  Apply for {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2>How joining works</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>Apply</h3>
              <p>Tell us who you are, what you’re working on and which plan you want.</p>
            </li>
            <li>
              <h3>Pay</h3>
              <p>Use the secure payment link shown after you apply.</p>
            </li>
            <li>
              <h3>Get access</h3>
              <p>
                We confirm your payment and open the members area, usually within{' '}
                <PlaceholderText text={COMMUNITY.confirmTime} />.
              </p>
            </li>
            <li>
              <h3>Say hello</h3>
              <p>Introduce yourself in the Introductions channel and start meeting people.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>Community rules</h2>
          </div>
          <div className="beliefs">
            {COMM_RULES.map((r) => (
              <div key={r[0]}>
                <h3>{r[0]}</h3>
                <p>
                  <PlaceholderText text={r[1] ?? ''} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap two-col">
          <h2>Questions</h2>
          <FaqAccordion faqs={COMMUNITY_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
