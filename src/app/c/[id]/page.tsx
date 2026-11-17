import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildStartProjectUrl } from '@/lib/format';
import { MediaKitCard } from '@/features/tools/MediaKitCard';
import { resolveSharedMediaKit } from '@/lib/tools/share-store';

interface CardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { id } = await params;
  const d = await resolveSharedMediaKit(id);
  if (!d) {
    return buildMetadata({
      title: 'Media kit not found · Collabify',
      description: 'This shared media kit link could not be decoded.',
      path: `/c/${id}`,
      noIndex: true,
    });
  }
  const name = d.n || 'Creator';
  return buildMetadata({
    title: `${name} media kit · Made with Collabify`,
    description: `${name}’s media kit and rate card.`,
    path: `/c/${id}`,
    noIndex: true,
  });
}

export default async function SharedMediaKitPage({ params }: CardPageProps) {
  const { id } = await params;
  const d = await resolveSharedMediaKit(id);

  if (!d) {
    return (
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <h1>This media kit link doesn’t work.</h1>
          <p className="lede" style={{ marginTop: 20 }}>
            It may have been copied only partly. Ask the creator to send it again, or make your own
            for free.
          </p>
          <div className="btn-row" style={{ marginTop: 28 }}>
            <Link className="btn btn-primary" href="/tools/media-kit">
              Make your free media kit
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sec-tight mk-shared">
      <div className="wrap">
        <h1 className="sr-only">{d.n || 'Creator'} media kit</h1>
        <MediaKitCard d={d} live />

        <div className="mk-shared-ctas">
          <div className="callout">
            <h2 style={{ fontSize: '1.25rem' }}>Are you a creator?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Make a media kit like this one. Free, no sign-up.
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link className="btn btn-primary" href="/tools/media-kit">
                Make yours free
              </Link>
            </div>
          </div>

          <div className="callout">
            <h2 style={{ fontSize: '1.25rem' }}>Are you a brand?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Collabify plans and runs creator campaigns, from finding the right creators to
              reporting results.
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link
                className="btn btn-secondary"
                href={buildStartProjectUrl({
                  caps: ['brand', 'network'],
                  note: 'I’d like help planning a creator campaign.',
                })}
              >
                Plan a creator campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

