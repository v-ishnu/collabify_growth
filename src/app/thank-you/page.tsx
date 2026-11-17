import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Thank You · Collabify Growth',
  description: 'Thanks for your enquiry.',
  path: '/thank-you',
  noIndex: true,
});

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; ref?: string }>;
}) {
  const { name, ref } = await searchParams;
  const cleanName = (name || '').trim().slice(0, 60);
  const cleanRef = (ref || '').trim().slice(0, 32);

  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <span className="kicker">
          <b aria-hidden="true" />
          Enquiry received
        </span>
        <h1 style={{ marginTop: 20 }}>
          Thanks{cleanName ? `, ${cleanName}` : ''}. We’ve got your enquiry.
        </h1>
        <p className="lede" style={{ marginTop: 24 }}>
          We’ll review what you’ve shared and reply within{' '}
          <span className="ph">[two working days]</span>. If it looks like a fit, we’ll suggest a
          short discovery call.
        </p>
        {cleanRef && (
          <p style={{ marginTop: 20 }}>
            Your reference: <strong>{cleanRef}</strong>
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 36 }}>
          <Link className="btn btn-secondary" href="/how-we-work">
            See how we work
          </Link>
          <Link className="btn btn-secondary" href="/solutions">
            Explore integrated solutions
          </Link>
        </div>
      </div>
    </section>
  );
}

