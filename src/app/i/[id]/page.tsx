import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { InviteCard } from '@/components/tools/InviteCard';
import { resolveSharedInvite } from '@/lib/tools/share-store';

interface SharedInvitePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SharedInvitePageProps): Promise<Metadata> {
  const { id } = await params;
  const d = await resolveSharedInvite(id);
  if (!d) {
    return buildMetadata({
      title: 'Invite not found · Collabify',
      description: 'This shared event invite link could not be decoded.',
      path: `/i/${id}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${d.t} · You’re invited`,
    description: `Invitation to ${d.t} hosted by ${d.host}.`,
    path: `/i/${id}`,
    noIndex: true,
  });
}

export default async function SharedInvitePage({ params }: SharedInvitePageProps) {
  const { id } = await params;
  const d = await resolveSharedInvite(id);

  if (!d) {
    return (
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <h1>This invite link doesn’t work.</h1>
          <p className="lede" style={{ marginTop: 20 }}>
            It may have been copied only partly. Ask the host to send it again.
          </p>
          <div className="btn-row" style={{ marginTop: 28 }}>
            <Link className="btn btn-primary" href="/tools/invite">
              Make your own free invite
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sec-tight mk-shared">
      <div className="wrap">
        <h1 className="sr-only">{d.t}</h1>
        <InviteCard d={d} live />

        <div className="mk-shared-ctas">
          <div className="callout">
            <h2 style={{ fontSize: '1.2rem' }}>Hosting something too?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Make an invite like this one. Free, no sign-up.
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link className="btn btn-primary" href="/tools/invite">
                Make your invite
              </Link>
            </div>
          </div>

          <div className="callout">
            <h2 style={{ fontSize: '1.2rem' }}>Planning a bigger event?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Collabify plans and runs conferences, launches and activations.
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link className="btn btn-secondary" href="/capabilities/events">
                Event services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

