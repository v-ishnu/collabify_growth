import Link from 'next/link';
import type { Metadata } from 'next';
import { TOOLS, normalizeHref } from '@/content';
import { buildMetadata } from '@/lib/seo';
import { PageHero } from '@/components/common/PageHero';
import { ToolIcon } from '@/components/common/Icons';
import { CtaBand } from '@/components/common/CtaBand';

export const metadata: Metadata = buildMetadata({
  title: 'Free Tools for Creators, Event Hosts and Small Businesses · Collabify',
  description:
    'Free, no-sign-up tools from Collabify: a creator media kit maker, an event invite and RSVP page maker, and a WhatsApp QR poster maker.',
  path: '/tools',
});

export default function ToolsDirectoryPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Free tools' }]}
        h1="Free tools that do one job well."
        lede="Built by the Collabify team for creators, event hosts and small businesses. Free to use, no sign-up, and your details stay in your browser."
      />

      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <div className="tool-list">
            {TOOLS.map((t) => (
              <Link className="tool-row" href={normalizeHref(t.href)} key={t.k}>
                <ToolIcon k={t.k} color={t.c} />
                <div>
                  <p className="small muted">{t.for}</p>
                  <h2>{t.name}</h2>
                  <p className="muted">{t.line}</p>
                </div>
                <span className="btn btn-secondary btn-sm" aria-hidden="true">
                  Open tool
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Share a tool, earn on what follows</h2>
          <div>
            <p className="lede">
              Creators and consultants who share our tools with their partner link earn commission
              when someone they sent becomes a client.
            </p>
            <div className="btn-row" style={{ marginTop: 22 }}>
              <Link className="btn btn-primary" href="/affiliates">
                See the affiliate program
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

