import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { CtaBand } from '@/components/common/CtaBand';
import { ShareToolBar } from '@/components/tools/ShareToolBar';
import { EventInviteMaker } from '@/features/tools/EventInviteMaker';

export const metadata: Metadata = buildMetadata({
  title: 'Free Event Invite Maker with WhatsApp RSVP · Collabify',
  description:
    'Make a free event invite page with WhatsApp RSVP and add-to-calendar buttons. Share one link with all your guests. No sign-up.',
  path: '/tools/invite',
});

export default function EventInviteMakerPage() {
  return (
    <>
      <section className="pagehero mk-hero">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Free tools', href: '/tools' },
              { label: 'Event invite maker' },
            ]}
          />
          <h1>Invite everyone with one beautiful link.</h1>
          <p className="lede">
            Make a free invite page for your meetup, launch, workshop or celebration. Guests reply
            on WhatsApp and add it to their calendar in one tap.
          </p>
          <ul className="mk-perks">
            <li>Free to use</li>
            <li>No account</li>
            <li>RSVPs come straight to your WhatsApp</li>
          </ul>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <EventInviteMaker />
          <ShareToolBar path="/tools/invite" line="Free event invite maker with WhatsApp RSVP:" />
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Planning something bigger?</h2>
          <div>
            <p className="lede">
              Conferences, launches and brand activations need more than an invite. Collabify plans
              and runs events end to end.
            </p>
            <div className="btn-row" style={{ marginTop: 22 }}>
              <Link className="btn btn-primary" href="/capabilities/events">
                See event services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

