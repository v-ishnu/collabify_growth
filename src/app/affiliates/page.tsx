import type { Metadata } from 'next';
import { AFFILIATE } from '@/content';
import { buildMetadata, faqJsonLd } from '@/lib/seo';
import { getSessionUserAndProfile, getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AffiliateRow, PayoutRow, ReferralRow } from '@/types/database';
import { PageHero } from '@/components/common/PageHero';
import { ScrollTargetButton } from '@/components/common/ScrollTargetButton';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { FaqAccordion } from '@/components/common/FaqAccordion';
import { CtaBand } from '@/components/common/CtaBand';
import { AffiliatePortalClient } from '@/features/affiliates/AffiliatePortalClient';

export const dynamic = 'force-dynamic';

const AFFILIATE_FAQS: Array<[string, string]> = [
  [
    'Do I need a big following?',
    'No. One good introduction to the right business can be worth more than a viral post.',
  ],
  [
    'How do you know a client came from me?',
    `Your link saves your partner code in the visitor’s browser for ${AFFILIATE.windowDays} days, and our enquiry form records it. Clients can also type your code into the form.`,
  ],
  ['When do I get paid?', AFFILIATE.payout],
  [
    'Can I also be a white-label partner?',
    'Yes. Agencies often do both: refer work they don’t want to manage, and resell work under their own brand.',
  ],
];

export const metadata: Metadata = buildMetadata({
  title: 'Affiliate Program: Earn by Recommending Collabify',
  description:
    'Refer founders and businesses to Collabify Growth and earn commission when they become clients. Free to join for creators, freelancers and consultants.',
  path: '/affiliates',
});

export default async function AffiliatesPage() {
  const { user, profile } = await getSessionUserAndProfile();
  let affiliate: AffiliateRow | null = null;
  let referrals: ReferralRow[] = [];
  let payouts: PayoutRow[] = [];
  let clickCount = 0;

  if (user) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle<AffiliateRow>();
      affiliate = aff ?? null;

      if (affiliate?.status === 'approved' && affiliate.code) {
        const [refRes, payRes] = await Promise.all([
          supabase
            .from('referrals')
            .select('*')
            .eq('code', affiliate.code)
            .order('updated_at', { ascending: false }),
          supabase
            .from('payouts')
            .select('*')
            .eq('affiliate_id', user.id)
            .order('paid_at', { ascending: false }),
        ]);
        referrals = (refRes.data as ReferralRow[]) || [];
        payouts = (payRes.data as PayoutRow[]) || [];

        const admin = getSupabaseAdminClient();
        if (admin) {
          const { count } = await admin
            .from('referral_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('code', affiliate.code);
          clickCount = count || 0;
        }
      }
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(AFFILIATE_FAQS)) }}
      />

      <PageHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Affiliate program' }]}
        h1="Earn by recommending Collabify."
        lede={`Refer founders and businesses who need marketing, technology, media, PR or events. When they become a client, you earn ${AFFILIATE.rate} ${AFFILIATE.basis}. Free to join.`}
        buttons={
          <>
            <ScrollTargetButton targetId="affRoot" focusFirst className="btn btn-primary">
              Join the program
            </ScrollTargetButton>
            <ScrollTargetButton targetId="affHow" className="btn btn-secondary">
              How it works
            </ScrollTargetButton>
          </>
        }
      />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2>Who it’s for</h2>
          </div>
          <div className="commit">
            <div>
              <h3>Creators and influencers</h3>
              <p>
                Make a video about our free tools, add your link, and earn when a viewer becomes a
                client. No brief, no fee negotiation.
              </p>
            </div>
            <div>
              <h3>Freelancers and consultants</h3>
              <p>
                Refer the work you don’t do yourself, such as an app, an event or a PR campaign, and
                keep your client happy.
              </p>
            </div>
            <div>
              <h3>Founders and community leaders</h3>
              <p>
                Recommend us to the founders in your network when they need a website, a launch or a
                team to run growth.
              </p>
            </div>
            <div>
              <h3>Our clients</h3>
              <p>
                Know a business that needs what we did for you? Refer them and earn on the work they
                buy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-alt" id="affHow">
        <div className="wrap">
          <div className="sec-head">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>Apply</h3>
              <p>
                Tell us where you’ll share. Approval usually takes{' '}
                <PlaceholderText text="[one working day]" />.
              </p>
            </li>
            <li>
              <h3>Get your link</h3>
              <p>Your personal link can point to any page, including our free tools.</p>
            </li>
            <li>
              <h3>Share it</h3>
              <p>Videos, posts, newsletters, WhatsApp groups or a direct introduction.</p>
            </li>
            <li>
              <h3>Earn</h3>
              <p>When a client you referred pays, your commission is confirmed and paid out.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec">
        <div className="wrap two-col">
          <h2>The details</h2>
          <div className="tbl-wrap">
            <table>
              <tbody>
                <tr>
                  <th scope="row">Commission</th>
                  <td>
                    <PlaceholderText text={`${AFFILIATE.rate} ${AFFILIATE.basis}`} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Credit window</th>
                  <td>
                    {AFFILIATE.windowDays} days from the first click on your link. If someone used
                    more than one partner’s link, the first link gets the credit.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Payouts</th>
                  <td>
                    <PlaceholderText text={AFFILIATE.payout} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Minimum payout</th>
                  <td>
                    <PlaceholderText text={AFFILIATE.minimum} />
                  </td>
                </tr>
                <tr>
                  <th scope="row">What counts</th>
                  <td>
                    New clients who buy any Collabify service or programme. Community memberships
                    and free tools don’t earn commission.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <h2>Partner rules</h2>
          </div>
          <div className="beliefs">
            <div>
              <h3>Always disclose</h3>
              <p>
                Label posts that use your link, such as #ad or “affiliate link”, as ASCI’s
                influencer guidelines require.
              </p>
            </div>
            <div>
              <h3>No spam</h3>
              <p>
                Share only where people have agreed to hear from you. No bulk messages or community
                spam.
              </p>
            </div>
            <div>
              <h3>Be accurate</h3>
              <p>
                Don’t promise prices, results or timelines on our behalf. Point people to a proposal
                instead.
              </p>
            </div>
            <div>
              <h3>No brand bidding or self-referral</h3>
              <p>
                Don’t run paid search ads on our name, and don’t refer yourself or your own company.{' '}
                <PlaceholderText text="[Add full affiliate terms.]" />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="affRootSec">
        <div className="wrap">
          <div id="affRoot" tabIndex={-1}>
            <AffiliatePortalClient
              initialUser={
                user ? { id: user.id, email: user.email, fullName: profile?.full_name ?? null } : null
              }
              initialAffiliate={
                affiliate ? { ...affiliate, payout_details: null } : null
              }
              initialReferrals={referrals}
              initialPayouts={payouts}
              initialClickCount={clickCount}
              hasPayoutDetails={Boolean(affiliate?.payout_details)}
              maskedUpiOrBank={
                affiliate?.payout_details && typeof affiliate.payout_details.masked === 'string'
                  ? affiliate.payout_details.masked
                  : null
              }
            />
          </div>
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Questions</h2>
          <FaqAccordion faqs={AFFILIATE_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}

