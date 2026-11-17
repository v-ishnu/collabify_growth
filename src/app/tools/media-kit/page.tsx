import type { Metadata } from 'next';
import { buildMetadata, faqJsonLd } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';
import { MediaKitMaker } from '@/features/tools/MediaKitMaker';

const MEDIA_KIT_FAQS: Array<[string, string]> = [
  [
    'What should a media kit include?',
    'Who you are, your platforms and follower counts, typical views and engagement, who your audience is, your rates, brands you’ve worked with and how to reach you. This tool covers all of them.',
  ],
  [
    'Should I show my rates?',
    'Showing rates saves time with brands that have a fixed budget. If you prefer to negotiate each deal, tick “Show rates on request” and your deliverables appear without prices.',
  ],
  [
    'Where do my numbers come from?',
    'You enter them yourself from your platform insights. Keep them current: brands often check, and accurate numbers build trust.',
  ],
  [
    'Is my data saved anywhere?',
    'Your draft is saved only in this browser so you don’t lose your work. It leaves your device only if you share your link or choose to join the creator network.',
  ],
  [
    'Is it really free?',
    'Yes. The card carries a small “Made free with Collabify” line, and that’s the only thing we ask in return.',
  ],
];

export const metadata: Metadata = buildMetadata({
  title: 'Free Media Kit Maker for Creators · Collabify',
  description:
    'Make a professional influencer media kit and rate card for free. No sign-up. Download it as an image or share it as a link with brands.',
  path: '/tools/media-kit',
});

export default function MediaKitMakerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(MEDIA_KIT_FAQS)) }}
      />

      <section className="pagehero mk-hero">
        <div className="wrap">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'For creators' }]} />
          <h1>Your media kit, ready for brands in minutes.</h1>
          <p className="lede">
            A free media kit and rate card maker for creators. Add your platforms, audience and
            rates, pick a design, then download it or share it as a link. No sign-up needed.
          </p>
          <ul className="mk-perks">
            <li>Free to use</li>
            <li>No account</li>
            <li>Your details stay in your browser</li>
          </ul>
        </div>
      </section>

      <MediaKitMaker />

      <section className="sec">
        <div className="wrap two-col">
          <h2>Media kit questions</h2>
          <FaqAccordion faqs={MEDIA_KIT_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
