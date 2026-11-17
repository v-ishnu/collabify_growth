import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { CtaBand } from '@/components/common/CtaBand';
import { ShareToolBar } from '@/components/tools/ShareToolBar';
import { HealthCheckQuiz } from '@/features/tools/HealthCheckQuiz';

export const metadata: Metadata = buildMetadata({
  title: 'Free Growth Health Check for Founders and Businesses · Collabify',
  description:
    'Score your business on brand, website, content, PR, operations, events and partnerships in 14 questions. Free, instant and private.',
  path: '/health-check',
});

export default function HealthCheckPage() {
  return (
    <>
      <section className="pagehero mk-hero">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Free tools', href: '/tools' },
              { label: 'Growth Health Check' },
            ]}
          />
          <h1>How healthy is your growth engine?</h1>
          <p className="lede">
            Answer 14 quick questions about your brand, website, content, PR, operations, events
            and partnerships. Get a score out of 100, a breakdown by area and your three
            priorities.
          </p>
          <ul className="mk-perks">
            <li>About 3 minutes</li>
            <li>Instant result</li>
            <li>Your answers stay in your browser</li>
          </ul>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <HealthCheckQuiz />
          <ShareToolBar path="/health-check" line="Free Growth Health Check for your business:" />
        </div>
      </section>

      <CtaBand />
    </>
  );
}

