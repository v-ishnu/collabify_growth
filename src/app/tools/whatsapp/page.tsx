import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { CtaBand } from '@/components/common/CtaBand';
import { ShareToolBar } from '@/components/tools/ShareToolBar';
import { WhatsAppQrMaker } from '@/features/tools/WhatsAppQrMaker';

export const metadata: Metadata = buildMetadata({
  title: 'Free WhatsApp QR Code and Link Maker · Collabify',
  description:
    'Make a free WhatsApp click-to-chat link and a printable QR poster for your shop or business. No sign-up.',
  path: '/tools/whatsapp',
});

export default function WhatsAppQrMakerPage() {
  return (
    <>
      <section className="pagehero mk-hero">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Free tools', href: '/tools' },
              { label: 'WhatsApp QR maker' },
            ]}
          />
          <h1>Let customers message you in one scan.</h1>
          <p className="lede">
            Make a free WhatsApp link and a printable QR poster for your counter, menu, packaging
            or stall. Customers scan and start chatting.
          </p>
          <ul className="mk-perks">
            <li>Free to use</li>
            <li>No account</li>
            <li>Print-ready poster</li>
          </ul>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <WhatsAppQrMaker />
          <ShareToolBar path="/tools/whatsapp" line="Free WhatsApp QR poster maker for shops:" />
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Want more customers to message you?</h2>
          <div>
            <p className="lede">
              Local campaigns, WhatsApp marketing to opted-in customers and Google visibility for
              your area. Collabify runs it for you.
            </p>
            <div className="btn-row" style={{ marginTop: 22 }}>
              <Link className="btn btn-primary" href="/capabilities/brand-marketing">
                See marketing services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

