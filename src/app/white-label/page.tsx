import Link from 'next/link';
import type { Metadata } from 'next';
import { ALL_SERVICES, CAP_BY_ID, WHITELABEL, WL_READY } from '@/content';
import type { CapId } from '@/types/domain';
import { buildMetadata, faqJsonLd } from '@/lib/seo';
import { getSessionUserAndProfile, getSupabaseServerClient } from '@/lib/supabase/server';
import type {
  WlApplicationRow,
  WlBriefFileRow,
  WlBriefRow,
  WlPartnerRow,
} from '@/types/database';
import { PageHero } from '@/components/common/PageHero';
import { ScrollTargetButton } from '@/components/common/ScrollTargetButton';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { CapIcon } from '@/components/common/Icons';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';
import { WhiteLabelPortalClient } from '@/features/whitelabel/WhiteLabelPortalClient';

export const dynamic = 'force-dynamic';

const WL_FAQS: Array<[string, string]> = [
  [
    'Will my client know you did the work?',
    'No. We work under your brand, and only speak to your client if you ask us to, using the name and email you choose.',
  ],
  [
    'Who owns the client relationship?',
    'You do. You quote, invoice and manage your client. We never contact them for other work.',
  ],
  [
    'How does pricing work?',
    `${WHITELABEL.pricing} You set your own price to your client.`,
  ],
  [
    'What about quality?',
    'Same team, same checklists and the same standards as our direct clients. Your partner manager reviews every delivery before it reaches you.',
  ],
  ['Is there a minimum commitment?', WHITELABEL.minimum],
];

export const metadata: Metadata = buildMetadata({
  title: 'White-Label Services for Agencies · Collabify Growth',
  description:
    'Agencies, freelancers and consultants: sell websites, content, campaigns, podcasts and events under your own brand. Collabify delivers behind the scenes.',
  path: '/white-label',
});

export default async function WhiteLabelPage() {
  const { user, profile } = await getSessionUserAndProfile();
  let application: WlApplicationRow | null = null;
  let partner: WlPartnerRow | null = null;
  let briefs: Array<WlBriefRow & { files?: WlBriefFileRow[] }> = [];

  if (user) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const [appRes, partRes, briefRes] = await Promise.all([
        supabase
          .from('wl_applications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle<WlApplicationRow>(),
        supabase
          .from('wl_partners')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle<WlPartnerRow>(),
        supabase
          .from('wl_briefs')
          .select('*')
          .eq('partner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      application = appRes.data ?? null;
      partner = partRes.data ?? null;
      const loadedBriefs = (briefRes.data as WlBriefRow[]) || [];
      if (loadedBriefs.length > 0) {
        const { data: fileRows } = await supabase
          .from('wl_brief_files')
          .select('*')
          .in(
            'brief_id',
            loadedBriefs.map((b) => b.id),
          )
          .order('created_at', { ascending: false });
        const filesMap: Record<string, WlBriefFileRow[]> = {};
        for (const f of (fileRows as WlBriefFileRow[]) || []) {
          if (!filesMap[f.brief_id]) filesMap[f.brief_id] = [];
          filesMap[f.brief_id]!.push(f);
        }
        briefs = loadedBriefs.map((b) => ({ ...b, files: filesMap[b.id] ?? [] }));
      }
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(WL_FAQS)) }}
      />

      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'White-label for agencies' }]}
        h1="Sell more services under your own brand."
        lede="Agencies, freelancers and consultants: offer websites, content, campaigns, podcasts and events to your clients. We deliver behind the scenes, unbranded, and you keep the client relationship."
        buttons={
          <>
            <ScrollTargetButton targetId="wlRoot" focusFirst className="btn btn-primary">
              Become a partner
            </ScrollTargetButton>
            <ScrollTargetButton targetId="wlWhat" className="btn btn-secondary">
              What we can deliver
            </ScrollTargetButton>
          </>
        }
      />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>Apply and sign an NDA</h3>
              <p>We agree partner pricing, timelines and a non-solicitation clause.</p>
            </li>
            <li>
              <h3>Send a brief</h3>
              <p>Use your partner portal. No client names needed if you’d rather not share them.</p>
            </li>
            <li>
              <h3>We deliver unbranded</h3>
              <p>Files, reports and handovers carry your branding, or none at all.</p>
            </li>
            <li>
              <h3>You bill your client</h3>
              <p>Set your own price. We invoice you at partner rates.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>What you get</h2>
          </div>
          <div className="commit">
            <div>
              <h3>Your brand, not ours</h3>
              <p>
                Deliverables, reports and documents carry your branding. We never mention Collabify
                to your clients.
              </p>
            </div>
            <div>
              <h3>We never approach your clients</h3>
              <p>The NDA includes non-solicitation: your clients stay yours.</p>
            </div>
            <div>
              <h3>Partner pricing</h3>
              <p>
                <PlaceholderText text={WHITELABEL.pricing} />
              </p>
            </div>
            <div>
              <h3>One partner manager</h3>
              <p>One person handles your briefs, timelines and quality checks.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="wlWhat">
        <div className="wrap">
          <div className="sec-head split">
            <h2>What we can deliver under your brand</h2>
            <p className="lede">
              Most of our {ALL_SERVICES.length} services can run white-label. These are the most
              requested.
            </p>
          </div>
          <dl className="svc-list">
            {WL_READY.map(([capId, desc]) => {
              const id = capId as CapId;
              const cap = CAP_BY_ID[id];
              if (!cap) return null;
              return (
                <div className="svc" key={capId}>
                  <dt>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CapIcon id={id} />
                      {cap.name}
                    </span>
                  </dt>
                  <dd>{desc}</dd>
                  <dd className="act">
                    <Link className="tlink small" href={`/capabilities/${cap.slug}`}>
                      All services
                    </Link>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <section className="sec sec-alt" id="wlRootSec">
        <div className="wrap">
          <div id="wlRoot" tabIndex={-1}>
            <WhiteLabelPortalClient
              initialUser={
                user ? { id: user.id, email: user.email, fullName: profile?.full_name ?? null } : null
              }
              initialApplication={application}
              initialPartner={partner}
              initialBriefs={briefs}
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap two-col">
          <h2>Questions</h2>
          <FaqAccordion faqs={WL_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
