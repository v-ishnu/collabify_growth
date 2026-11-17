'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AFF_TARGETS, normalizeHref } from '@/content';
import { siteConfig } from '@/config/site';
import { fmtDay } from '@/lib/format';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { NoticeBox } from '@/components/common/NoticeBox';
import { fmtINR } from '@/features/tools/MediaKitCard';
import { copyToClipboard, waShareUrl } from '@/lib/tools/shared';
import type { AffiliateRow, PayoutRow, ReferralRow } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SHARE_OPTIONS = [
  'Instagram',
  'YouTube',
  'LinkedIn',
  'WhatsApp groups',
  'Newsletter',
  'Client introductions',
  'Other',
];

interface AffiliatePortalClientProps {
  initialUser: { id: string; email: string | null; fullName: string | null } | null;
  initialAffiliate: AffiliateRow | null;
  initialReferrals: ReferralRow[];
  initialPayouts: PayoutRow[];
  initialClickCount: number;
  hasPayoutDetails: boolean;
  maskedUpiOrBank?: string | null;
}

export function AffiliatePortalClient({
  initialUser,
  initialAffiliate,
  initialReferrals,
  initialPayouts,
  initialClickCount,
  hasPayoutDetails: initHasPayout,
  maskedUpiOrBank: initMaskedPayout,
}: AffiliatePortalClientProps) {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<AffiliateRow | null>(initialAffiliate);
  const [origin, setOrigin] = useState(siteConfig.url);

  // Application state
  const [name, setName] = useState(initialUser?.fullName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [audience, setAudience] = useState('');
  const [link, setLink] = useState('');
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [errors, setErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [busy, setBusy] = useState(false);

  // Dashboard state
  const [targetPath, setTargetPath] = useState('/');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'Bank transfer'>('UPI');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutHolder, setPayoutHolder] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');
  const [hasPayoutDetails, setHasPayoutDetails] = useState(initHasPayout);
  const [maskedPayout, setMaskedPayout] = useState(initMaskedPayout || '');
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!initialUser) {
    return (
      <NoticeBox
        title="Sign in to join the affiliate program"
        body="Sign in or create a free Collabify account to apply for a partner link and track referrals."
      >
        <Link className="btn btn-primary" href="/auth/signin?next=/affiliates">
          Sign in to apply
        </Link>
      </NoticeBox>
    );
  }

  function buildRefLink(code: string, path: string): string {
    const clean = normalizeHref(path);
    return `${origin}/r/${code}${clean === '/' ? '' : clean}`;
  }

  async function handleCopyText(id: string, value: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleSavePayoutDetails(e: FormEvent) {
    e.preventDefault();
    setPayoutMsg('');
    if (payoutMethod === 'UPI' && !payoutUpi.trim().includes('@')) {
      setPayoutMsg('Enter a valid UPI ID (e.g. name@okaxis).');
      return;
    }
    if (
      payoutMethod === 'Bank transfer' &&
      (!payoutHolder.trim() || payoutAccount.trim().length < 8 || payoutIfsc.trim().length < 11)
    ) {
      setPayoutMsg('Enter account holder name, account number, and valid IFSC code.');
      return;
    }
    setPayoutSaving(true);
    try {
      const res = await fetch('/api/affiliates/payout-details', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          payoutMethod === 'UPI'
            ? { method: 'UPI', upi_id: payoutUpi.trim() }
            : {
                method: 'Bank transfer',
                account_holder: payoutHolder.trim(),
                account_number: payoutAccount.trim(),
                ifsc: payoutIfsc.trim().toUpperCase(),
              }
        ),
      });
      const json = (await res.json()) as { masked?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'Could not save payout details.');
      setHasPayoutDetails(true);
      setMaskedPayout(json.masked || 'Saved securely');
      setPayoutUpi('');
      setPayoutAccount('');
      setPayoutIfsc('');
      setPayoutMsg('Payout details encrypted and saved.');
    } catch (err) {
      setPayoutMsg(err instanceof Error ? err.message : 'Unable to save payout details.');
    } finally {
      setPayoutSaving(false);
    }
  }

  if (affiliate) {
    if (affiliate.status === 'approved' && affiliate.code) {
      const code = affiliate.code;
      const partnerUrl = buildRefLink(code, targetPath);
      const sumBy = (statuses: string[]) =>
        initialReferrals
          .filter((r) => statuses.includes(r.status))
          .reduce((s, r) => s + (r.commission_inr || 0), 0);

      const wonCount = initialReferrals.filter(
        (r) => r.status === 'Won' || r.status === 'Commission paid'
      ).length;
      const commissionDue = sumBy(['Won']);
      const commissionPaid = sumBy(['Commission paid']);

      const promoLines: Array<[string, string]> = [
        [
          'Creators',
          `Made my media kit for brand deals in a few minutes, free, with no sign-up. Try it: ${buildRefLink(
            code,
            '/tools/media-kit'
          )} #ad`,
        ],
        [
          'Event hosts',
          `Hosting something? Make a free invite page with WhatsApp RSVP and calendar buttons: ${buildRefLink(
            code,
            '/tools/invite'
          )} #ad`,
        ],
        [
          'Small businesses',
          `Free WhatsApp QR poster for your shop counter. Customers scan and chat: ${buildRefLink(
            code,
            '/tools/whatsapp'
          )} #ad`,
        ],
        [
          'Founders',
          `Need a website, content, PR or a launch campaign? Collabify runs it as one team. Start here: ${buildRefLink(
            code,
            '/start-a-project'
          )} #ad`,
        ],
      ];

      return (
        <div id="affDash">
          <div className="sec-head split">
            <h2>Your partner dashboard</h2>
            <p className="lede">
              Your code: <strong>{code}</strong>. Share your link anywhere you’re allowed to.{' '}
              <button
                type="button"
                className="tlink small"
                onClick={async () => {
                  await fetch('/api/auth/signout', { method: 'POST' });
                  router.push('/');
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </p>
          </div>

          <div className="aff-grid">
            <div className="callout">
              <h3>Your link</h3>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="affTarget">Send people to</label>
                <select
                  id="affTarget"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                >
                  {AFF_TARGETS.map((t) => (
                    <option key={t[0]} value={t[0]}>
                      {t[1]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="sr-only" htmlFor="affLink">
                Your partner link
              </label>
              <input
                type="text"
                id="affLink"
                readOnly
                value={partnerUrl}
                style={{ marginTop: 12 }}
              />
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCopyText('main', partnerUrl)}
                >
                  {copiedId === 'main' ? 'Copied' : 'Copy link'}
                </button>
                <a
                  className="btn btn-secondary btn-sm"
                  href={waShareUrl(partnerUrl)}
                  target="_blank"
                  rel="noopener"
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>

            <div className="callout">
              <h3>Your results</h3>
              <div className="aff-stats" id="affStats">
                <div>
                  <b>{initialClickCount}</b>
                  <span>Link clicks</span>
                </div>
                <div>
                  <b>{initialReferrals.length}</b>
                  <span>Referrals</span>
                </div>
                <div>
                  <b>{wonCount}</b>
                  <span>Became clients</span>
                </div>
                <div>
                  <b>{fmtINR(commissionDue) || '₹0'}</b>
                  <span>Commission due</span>
                </div>
                <div>
                  <b>{fmtINR(commissionPaid) || '₹0'}</b>
                  <span>Paid to you</span>
                </div>
              </div>
            </div>
          </div>

          <h3 style={{ margin: '36px 0 12px', fontSize: '1.3rem' }}>Your referrals</h3>
          {initialReferrals.length > 0 ? (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Updated</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Status</th>
                    <th scope="col">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {initialReferrals.map((r) => (
                    <tr key={r.enquiry_id}>
                      <td>{fmtDay(r.updated_at)}</td>
                      <td>{r.enquiry_id}</td>
                      <td>{r.status}</td>
                      <td>{r.commission_inr ? fmtINR(r.commission_inr) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="callout">
              <p className="muted">
                No referrals yet. When someone you sent fills in our enquiry form, they appear here.
              </p>
            </div>
          )}

          {initialPayouts.length > 0 && (
            <>
              <h3 style={{ margin: '36px 0 12px', fontSize: '1.3rem' }}>Payout history</h3>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Method</th>
                      <th scope="col">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialPayouts.map((p) => (
                      <tr key={p.id}>
                        <td>{fmtDay(p.paid_at)}</td>
                        <td>{fmtINR(p.amount_inr)}</td>
                        <td>{p.method}</td>
                        <td>{p.reference || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h3 style={{ margin: '36px 0 12px', fontSize: '1.3rem' }}>Payout details</h3>
          <div className="callout">
            {hasPayoutDetails && (
              <p className="small muted" style={{ marginBottom: 14 }}>
                Saved payout destination: <strong>{maskedPayout || 'Encrypted on file'}</strong>
              </p>
            )}
            <form onSubmit={handleSavePayoutDetails} noValidate>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="po_method">Method</label>
                  <select
                    id="po_method"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as 'UPI' | 'Bank transfer')}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank transfer">Bank transfer</option>
                  </select>
                </div>
                {payoutMethod === 'UPI' ? (
                  <div className="field">
                    <label htmlFor="po_upi">UPI ID</label>
                    <input
                      id="po_upi"
                      type="text"
                      placeholder="yourname@okicici"
                      value={payoutUpi}
                      onChange={(e) => setPayoutUpi(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="po_holder">Account holder name</label>
                      <input
                        id="po_holder"
                        type="text"
                        value={payoutHolder}
                        onChange={(e) => setPayoutHolder(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="po_acc">Account number</label>
                      <input
                        id="po_acc"
                        type="text"
                        inputMode="numeric"
                        value={payoutAccount}
                        onChange={(e) => setPayoutAccount(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="po_ifsc">IFSC code</label>
                      <input
                        id="po_ifsc"
                        type="text"
                        placeholder="HDFC0001234"
                        value={payoutIfsc}
                        onChange={(e) => setPayoutIfsc(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              {payoutMsg && (
                <p className="small" style={{ marginTop: 10 }}>
                  {payoutMsg}
                </p>
              )}
              <div className="btn-row" style={{ marginTop: 14 }}>
                <button type="submit" className="btn btn-secondary btn-sm" disabled={payoutSaving}>
                  {payoutSaving
                    ? 'Encrypting…'
                    : hasPayoutDetails
                      ? 'Update payout details'
                      : 'Save payout details'}
                </button>
              </div>
            </form>
          </div>

          <h3 style={{ margin: '36px 0 12px', fontSize: '1.3rem' }}>Promo kit</h3>
          <p className="muted" style={{ marginBottom: 14 }}>
            Ready-to-post lines with your link. Add your own voice, and keep the #ad label.
          </p>
          <div className="promo-list" id="affPromo">
            {promoLines.map(([label, line], idx) => (
              <div className="promo" key={label}>
                <p className="small muted">
                  <strong>{label}</strong>
                </p>
                <p>{line}</p>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => handleCopyText(`promo-${idx}`, line)}
                >
                  {copiedId === `promo-${idx}` ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const declined = affiliate.status === 'declined' || affiliate.status === 'removed';
    return (
      <div className="status-card">
        <span className="status">{declined ? 'Not approved' : 'Under review'}</span>
        <h2>
          {declined
            ? 'Your application wasn’t approved this time.'
            : `Thanks, ${(affiliate.name || '').split(' ')[0]}. We’re reviewing your application.`}
        </h2>
        <p className="lede">
          {declined ? (
            <>
              If you think this is a mistake, email <PlaceholderText text={siteConfig.contact.email} />.
            </>
          ) : (
            'Your partner link appears here as soon as you’re approved.'
          )}
        </p>
      </div>
    );
  }

  function validate(): Array<{ id: string; msg: string }> {
    const e: Array<{ id: string; msg: string }> = [];
    if (!name.trim()) e.push({ id: 'a_name', msg: 'Enter your full name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'a_email', msg: 'Enter an email address like name@domain.com.' });
    }
    if (!city.trim()) e.push({ id: 'a_city', msg: 'Enter your city.' });
    if (channels.length === 0) e.push({ id: 'a_where', msg: 'Choose at least one place you’ll share.' });
    if (audience.trim().length < 15) {
      e.push({
        id: 'a_aud',
        msg: 'Tell us a little about your audience or network, in at least 15 characters.',
      });
    }
    if (!agreeRules) e.push({ id: 'a_terms', msg: 'Agree to the partner rules to join.' });
    if (!agreePrivacy) {
      e.push({ id: 'a_privacy', msg: 'Agree to the privacy terms so we can run your account.' });
    }
    return e;
  }

  const errMap = Object.fromEntries(errors.map((x) => [x.id, x.msg]));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    setBusy(true);
    try {
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          city: city.trim(),
          share_channels: channels,
          audience: audience.trim(),
          link: link.trim() || null,
          consent: true,
        }),
      });
      const json = (await res.json()) as { affiliate?: AffiliateRow; error?: string };
      if (!res.ok || !json.affiliate) {
        setErrors([{ id: 'submit', msg: json.error || 'We couldn’t send your application.' }]);
        return;
      }
      setAffiliate(json.affiliate);
      router.refresh();
    } catch {
      setErrors([{ id: 'submit', msg: 'We couldn’t send your application. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleChannel(opt: string) {
    setChannels((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  }

  return (
    <div className="form-shell">
      <div>
        <h2>Join the affiliate program</h2>
        <p className="muted" style={{ margin: '10px 0 28px' }}>
          Free to join. Takes about two minutes.
        </p>

        <form id="affForm" noValidate onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 24 }}>
              <strong>
                Check {errors.length} {errors.length === 1 ? 'field' : 'fields'} before sending.
              </strong>
              <ul>
                {errors.map((er) => (
                  <li key={er.id}>{er.msg}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="a_name">Full name</label>
              <input
                id="a_name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="err">{errMap.a_name}</p>
            </div>
            <div className="field">
              <label htmlFor="a_email">Email</label>
              <input
                id="a_email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="err">{errMap.a_email}</p>
            </div>
            <div className="field">
              <label htmlFor="a_phone">
                Phone <span className="opt">(optional)</span>
              </label>
              <input
                id="a_phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="a_city">City</label>
              <input
                id="a_city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <p className="err">{errMap.a_city}</p>
            </div>

            <fieldset className="field full" id="a_where">
              <legend>Where will you share?</legend>
              <div className="chips">
                {SHARE_OPTIONS.map((opt) => (
                  <label className="chip" key={opt}>
                    <input
                      type="checkbox"
                      checked={channels.includes(opt)}
                      onChange={() => toggleChannel(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <p className="err">{errMap.a_where}</p>
            </fieldset>

            <div className="field full">
              <label htmlFor="a_aud">Tell us about your audience or network</label>
              <textarea
                id="a_aud"
                style={{ minHeight: 100 }}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
              <p className="err">{errMap.a_aud}</p>
            </div>

            <div className="field full">
              <label htmlFor="a_link">
                Profile or website link <span className="opt">(optional)</span>
              </label>
              <input
                id="a_link"
                type="url"
                autoComplete="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            <div className="field full" style={{ gap: 14 }}>
              <div>
                <label className="check">
                  <input
                    type="checkbox"
                    id="a_terms"
                    checked={agreeRules}
                    onChange={(e) => setAgreeRules(e.target.checked)}
                  />
                  <span>
                    I agree to the partner rules above, including disclosing my affiliate links.
                  </span>
                </label>
                <p className="err" style={{ marginLeft: 36 }}>
                  {errMap.a_terms}
                </p>
              </div>
              <div>
                <label className="check">
                  <input
                    type="checkbox"
                    id="a_privacy"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  <span>
                    I agree to Collabify storing these details to run the affiliate program, as
                    described in the <Link className="tlink" href="/privacy">Privacy Policy</Link>.
                  </span>
                </label>
                <p className="err" style={{ marginLeft: 36 }}>
                  {errMap.a_privacy}
                </p>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Apply to join'}
            </button>
          </div>
        </form>
      </div>

      <aside className="form-aside">
        <div className="callout">
          <h3>Creators: easy content</h3>
          <p>
            Our free tools make simple, useful videos: a media kit maker, an event invite maker and
            a WhatsApp QR maker. Show one, add your link, and earn when viewers hire us.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link className="tlink" href="/tools">
              See the free tools
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}

