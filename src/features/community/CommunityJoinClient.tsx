'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CHANNELS, COMMUNITY } from '@/content';
import { siteConfig } from '@/config/site';
import { fmtDay } from '@/lib/format';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { NoticeBox } from '@/components/common/NoticeBox';
import type { CommunityApplicationRow, MembershipRow } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface RazorpayWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, cb: (resp: unknown) => void) => void;
  };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const win = window as RazorpayWindow;
    if (win.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean((window as RazorpayWindow).Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface CommunityJoinClientProps {
  initialUser: { id: string; email: string | null; fullName: string | null } | null;
  initialApplication: CommunityApplicationRow | null;
  initialMembership: MembershipRow | null;
}

export function CommunityJoinClient({
  initialUser,
  initialApplication,
  initialMembership,
}: CommunityJoinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qPlan = searchParams.get('plan');

  const [application, setApplication] = useState<CommunityApplicationRow | null>(initialApplication);
  const [membership, setMembership] = useState<MembershipRow | null>(initialMembership);

  const [plan, setPlan] = useState<'monthly' | 'annual'>(
    qPlan === 'monthly' || qPlan === 'annual' ? qPlan : 'annual'
  );
  const [name, setName] = useState(initialUser?.fullName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [workingOn, setWorkingOn] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [consentRules, setConsentRules] = useState(false);
  const [consentDirectory, setConsentDirectory] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const [errors, setErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  useEffect(() => {
    if (qPlan === 'monthly' || qPlan === 'annual') {
      setPlan(qPlan);
    }
  }, [qPlan]);

  if (!initialUser) {
    return (
      <NoticeBox
        title="Sign in to apply"
        body="Create a Collabify account or sign in first so we can link your application and membership."
      >
        <Link className="btn btn-primary" href="/auth/signin?next=/community/join">
          Sign in to continue
        </Link>
        <Link className="btn btn-secondary" href="/community">
          Back to the community
        </Link>
      </NoticeBox>
    );
  }

  async function handleCheckout(planId: 'monthly' | 'annual') {
    setPayMsg('');
    setPayBusy(true);
    try {
      const res = await fetch('/api/payments/razorpay/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await res.json()) as {
        subscriptionId?: string;
        keyId?: string;
        name?: string;
        description?: string;
        error?: string;
        fallbackPaymentLink?: string;
      };

      if (data.fallbackPaymentLink && !data.subscriptionId) {
        window.open(data.fallbackPaymentLink, '_blank', 'noopener,noreferrer');
        return;
      }

      if (!res.ok || !data.subscriptionId || !data.keyId) {
        throw new Error(data.error || 'Could not initialize payment.');
      }

      const loaded = await loadRazorpayScript();
      const RazorpayCtor = (window as RazorpayWindow).Razorpay;
      if (!loaded || !RazorpayCtor) {
        throw new Error('Could not load Razorpay Checkout. Check your network and try again.');
      }

      const rzp = new RazorpayCtor({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: data.name || 'Collabify Community',
        description: data.description || `${planId === 'annual' ? 'Annual' : 'Monthly'} membership`,
        prefill: {
          name: application?.name || initialUser?.fullName || '',
          email: application?.email || initialUser?.email || '',
        },
        handler: async (resp: Record<string, string>) => {
          const ver = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_subscription_id: resp.razorpay_subscription_id,
              razorpay_signature: resp.razorpay_signature,
              plan: planId,
            }),
          });
          if (ver.ok) {
            setPayMsg(
              'Payment signature received. Confirming your subscription — this page will update shortly.'
            );
            router.refresh();
          } else {
            setPayMsg(
              'Payment submitted; confirmation runs automatically via webhook once settled.'
            );
          }
        },
      });
      rzp.on('payment.failed', () => {
        setPayMsg('Payment did not complete. You can try again safely.');
      });
      rzp.open();
    } catch (err) {
      setPayMsg(err instanceof Error ? err.message : 'Unable to start payment.');
    } finally {
      setPayBusy(false);
    }
  }

  if (application) {
    const planInfo = COMMUNITY.plans.find((p) => p.id === application.plan) || COMMUNITY.plans[0]!;
    const summary = (
      <dl>
        <dt>Name</dt>
        <dd>{application.name}</dd>
        <dt>Role</dt>
        <dd>{[application.role, application.company].filter(Boolean).join(', ')}</dd>
        <dt>Plan</dt>
        <dd>{planInfo.name}</dd>
        <dt>Applied</dt>
        <dd>{fmtDay(application.created_at)}</dd>
      </dl>
    );

    if (application.status === 'approved' || membership?.status === 'active') {
      return (
        <div className="status-card">
          <span className="status contacted">Active member</span>
          <h2>You’re in. Welcome to the community.</h2>
          <p className="lede">
            Start by introducing yourself in the Introductions channel: who you are, what you’re
            building and what you need.
          </p>
          <div className="btn-row">
            <Link className="btn btn-primary" href="/community/chat">
              Open the members area
            </Link>
          </div>
          {summary}
        </div>
      );
    }

    if (application.status === 'declined' || application.status === 'removed') {
      return (
        <div className="status-card">
          <span className="status">
            {application.status === 'declined' ? 'Not approved' : 'Membership ended'}
          </span>
          <h2>
            {application.status === 'declined'
              ? 'Your application wasn’t approved this time.'
              : 'Your membership is no longer active.'}
          </h2>
          <p className="lede">
            If you think this is a mistake, email <PlaceholderText text={siteConfig.contact.email} />.
          </p>
          {summary}
        </div>
      );
    }

    return (
      <div className="status-card">
        <span className="status">Step 2 of 3: payment</span>
        <h2>Application received. Now complete your payment.</h2>
        <p className="lede">
          Pay for the {planInfo.name} plan (<PlaceholderText text={planInfo.price} /> {planInfo.per}).
          We open your access once payment is confirmed, usually within{' '}
          <PlaceholderText text={COMMUNITY.confirmTime} />.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={payBusy}
            onClick={() => handleCheckout(application.plan)}
          >
            {payBusy ? 'Opening checkout…' : 'Pay securely'}
          </button>
        </div>
        {payMsg && (
          <div className="alert alert-ok" style={{ marginTop: 14 }}>
            <p>{payMsg}</p>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 14 }}>
          Already paid? You don’t need to do anything else. We send a confirmation email as soon as
          your access is ready.
        </p>
        {summary}
      </div>
    );
  }

  function validate(): Array<{ id: string; msg: string }> {
    const e: Array<{ id: string; msg: string }> = [];
    if (!plan) e.push({ id: 'j_plan', msg: 'Choose a plan.' });
    if (!name.trim()) e.push({ id: 'j_name', msg: 'Enter your full name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'j_email', msg: 'Enter an email address like name@company.com.' });
    }
    if (!role.trim()) e.push({ id: 'j_role', msg: 'Enter your role or title.' });
    if (!company.trim()) e.push({ id: 'j_company', msg: 'Enter your company or project.' });
    if (!city.trim()) e.push({ id: 'j_city', msg: 'Enter your city.' });
    const li = linkedin.trim();
    if (li && (/\s/.test(li) || !li.includes('.'))) {
      e.push({ id: 'j_linkedin', msg: 'Enter a profile link like linkedin.com/in/yourname.' });
    }
    if (workingOn.trim().length < 20) {
      e.push({
        id: 'j_work',
        msg: 'Tell members what you’re working on, in at least 20 characters.',
      });
    }
    if (!consentRules) e.push({ id: 'j_rules', msg: 'Agree to the community rules to join.' });
    if (!consentDirectory) {
      e.push({
        id: 'j_dir',
        msg: 'The member directory is part of membership. Agree to appear in it to join.',
      });
    }
    if (!consentPrivacy) {
      e.push({
        id: 'j_privacy',
        msg: 'Agree to the privacy terms so we can manage your membership.',
      });
    }
    return e;
  }

  const errMap = Object.fromEntries(errors.map((x) => [x.id, x.msg]));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    let li = linkedin.trim();
    if (li && !/^https?:\/\//i.test(li)) li = `https://${li}`;

    setBusy(true);
    try {
      const res = await fetch('/api/community/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          company: company.trim(),
          city: city.trim(),
          linkedin: li || null,
          working_on: workingOn.trim(),
          interests,
          consent_rules: consentRules,
          consent_directory: consentDirectory,
          consent_privacy: consentPrivacy,
        }),
      });
      const json = (await res.json()) as {
        application?: CommunityApplicationRow;
        membership?: MembershipRow | null;
        error?: string;
      };
      if (!res.ok || !json.application) {
        setErrors([{ id: 'submit', msg: json.error || 'We couldn’t send your application.' }]);
        return;
      }
      setApplication(json.application);
      if (json.membership) setMembership(json.membership);
      router.refresh();
    } catch {
      setErrors([{ id: 'submit', msg: 'We couldn’t send your application. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  }

  return (
    <div className="form-shell">
      <form id="joinForm" noValidate onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 28 }}>
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

        <fieldset className="field" id="j_plan" aria-describedby="j_plan-err">
          <legend>Plan</legend>
          <div className="plan-opts">
            {COMMUNITY.plans.map((p) => (
              <label className="plan-opt" key={p.id}>
                <input
                  type="radio"
                  name="j_plan"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id as 'monthly' | 'annual')}
                />
                <span>
                  <b>{p.name}</b>
                  <PlaceholderText text={p.price} /> {p.per}
                </span>
              </label>
            ))}
          </div>
          <p className="err" id="j_plan-err">
            {errMap.j_plan}
          </p>
        </fieldset>

        <div className="form-grid" style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="j_name">Full name</label>
            <input
              id="j_name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="err">{errMap.j_name}</p>
          </div>

          <div className="field">
            <label htmlFor="j_email">Email</label>
            <input
              id="j_email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="err">{errMap.j_email}</p>
          </div>

          <div className="field">
            <label htmlFor="j_role">Role or title</label>
            <input
              id="j_role"
              type="text"
              autoComplete="organization-title"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <p className="err">{errMap.j_role}</p>
          </div>

          <div className="field">
            <label htmlFor="j_company">Company or project</label>
            <input
              id="j_company"
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <p className="err">{errMap.j_company}</p>
          </div>

          <div className="field">
            <label htmlFor="j_city">City</label>
            <input
              id="j_city"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <p className="err">{errMap.j_city}</p>
          </div>

          <div className="field">
            <label htmlFor="j_linkedin">
              LinkedIn profile <span className="opt">(optional)</span>
            </label>
            <input
              id="j_linkedin"
              type="url"
              autoComplete="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
            <p className="err">{errMap.j_linkedin}</p>
          </div>

          <div className="field full">
            <label htmlFor="j_work">What are you working on?</label>
            <p className="hint" id="j_work-hint">
              A few lines other members will see in the directory.
            </p>
            <textarea
              id="j_work"
              style={{ minHeight: 110 }}
              aria-describedby="j_work-hint j_work-err"
              value={workingOn}
              onChange={(e) => setWorkingOn(e.target.value)}
            />
            <p className="err" id="j_work-err">
              {errMap.j_work}
            </p>
          </div>

          <fieldset className="field full" id="j_int">
            <legend>
              What do you want to talk about? <span className="opt">(optional)</span>
            </legend>
            <div className="chips">
              {CHANNELS.slice(2).map((ch) => (
                <label className="chip" key={ch[0]}>
                  <input
                    type="checkbox"
                    checked={interests.includes(ch[1])}
                    onChange={() => toggleInterest(ch[1])}
                  />
                  <span>{ch[1]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field full" style={{ gap: 14 }}>
            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="j_rules"
                  checked={consentRules}
                  onChange={(e) => setConsentRules(e.target.checked)}
                />
                <span>
                  I agree to the <Link className="tlink" href="/community">community rules</Link>.
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errMap.j_rules}
              </p>
            </div>

            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="j_dir"
                  checked={consentDirectory}
                  onChange={(e) => setConsentDirectory(e.target.checked)}
                />
                <span>
                  Show my name, role, company, city, interests and what I’m working on to other
                  members.
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errMap.j_dir}
              </p>
            </div>

            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="j_privacy"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                />
                <span>
                  I agree to Collabify storing these details to manage my membership, as described in
                  the <Link className="tlink" href="/privacy">Privacy Policy</Link>.
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errMap.j_privacy}
              </p>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Submit application'}
          </button>
        </div>
      </form>

      <aside className="form-aside">
        <div className="callout">
          <h3>What happens next</h3>
          <ol style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--muted)' }}>
            <li>Submit this application.</li>
            <li>Pay through the secure link we show you.</li>
            <li>
              We open your access, usually within <PlaceholderText text={COMMUNITY.confirmTime} />.
            </li>
            <li>Introduce yourself in the Introductions channel.</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}

