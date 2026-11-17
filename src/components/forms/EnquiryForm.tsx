'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ALL_SERVICES, CAP_BY_ID, CAPS, HC_QUESTIONS, SVC_BY_NAME } from '@/content';
import { useShortlist } from '@/hooks/useShortlist';
import { listJoin } from '@/lib/format';
import { siteConfig } from '@/config/site';
import { XIcon } from '@/components/common/Icons';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { TurnstileField } from './TurnstileField';
import type { CapId } from '@/types/domain';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readRefCookieOrStorage(): string {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)cg_ref=([^;]+)/);
    if (m && m[1]) {
      return decodeURIComponent(m[1]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('cg-ref');
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string; ts?: number };
        const ageDays = parsed.ts ? (Date.now() - parsed.ts) / 86400_000 : 0;
        if (parsed.code && ageDays <= 90) {
          return String(parsed.code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        }
      }
    } catch {
      // Ignore malformed storage
    }
  }
  return '';
}

export function EnquiryForm({ initialPartnerRef = '' }: { initialPartnerRef?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: shortlist, remove: removeShortlist, clear: clearShortlist } = useShortlist();

  const capsParam = searchParams.get('caps') || '';
  const progParam = searchParams.get('programme') || '';
  const noteParam = searchParams.get('note') || '';

  const [prefillCleared, setPrefillCleared] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [programme, setProgramme] = useState('');
  const [description, setDescription] = useState('');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [source, setSource] = useState('');
  const [partnerRef, setPartnerRef] = useState(initialPartnerRef);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentUpdates, setConsentUpdates] = useState(false);
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const [errors, setErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const prefCapNames = !prefillCleared
    ? capsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => CAP_BY_ID[id as CapId]?.name || id)
    : [];

  const activeProg = !prefillCleared ? progParam : '';

  // Hydrate prefill + shortlist + referral code
  useEffect(() => {
    const initialNeeds = new Set<string>(prefCapNames);
    if (activeProg) initialNeeds.add('An integrated programme');
    shortlist.forEach((svcName) => {
      const s = SVC_BY_NAME[svcName];
      if (s && s.cap !== 'custom' && CAP_BY_ID[s.cap]) {
        initialNeeds.add(CAP_BY_ID[s.cap].name);
      }
    });
    if (initialNeeds.size > 0) {
      setNeeds((prev) => Array.from(new Set([...prev, ...initialNeeds])));
    }
    if (activeProg) {
      setProgramme(activeProg);
    }
    if (!prefillCleared) {
      const autoDesc = noteParam
        ? `${noteParam} `
        : activeProg
          ? activeProg === 'Custom Solutions'
            ? `I’d like a custom programme${prefCapNames.length ? ` covering ${listJoin(prefCapNames)}` : ''}. `
            : `I’m interested in the ${activeProg} programme. `
          : '';
      if (autoDesc) {
        setDescription((prev) => (prev ? prev : autoDesc));
      }
    }
    if (!partnerRef) {
      const ref = readRefCookieOrStorage();
      if (ref) setPartnerRef(ref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsParam, progParam, noteParam, shortlist.length, prefillCleared]);

  const errorMap = Object.fromEntries(errors.map((e) => [e.id, e.msg]));

  const toggleNeed = (label: string) => {
    setNeeds((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  const validate = () => {
    const e: Array<{ id: string; msg: string }> = [];
    if (!name.trim()) e.push({ id: 'e_name', msg: 'Enter your full name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'e_email', msg: 'Enter an email address like name@company.com.' });
    }
    const ph = phone.trim();
    if (ph && !/^[+()\d\s-]{7,20}$/.test(ph)) {
      e.push({ id: 'e_phone', msg: 'Enter a phone number using digits, spaces and a leading +.' });
    }
    if (!company.trim()) e.push({ id: 'e_company', msg: 'Enter your company or brand name.' });
    if (!role) e.push({ id: 'e_role', msg: 'Choose your role.' });
    const site = website.trim();
    if (site && (/\s/.test(site) || !site.includes('.'))) {
      e.push({ id: 'e_site', msg: 'Enter a web address like company.com.' });
    }
    if (needs.length === 0) e.push({ id: 'e_needs', msg: 'Choose at least one thing you need.' });
    if (description.trim().length < 20) {
      e.push({
        id: 'e_desc',
        msg: 'Tell us a little about the project, in at least 20 characters.',
      });
    }
    if (!timeline) e.push({ id: 'e_time', msg: 'Choose a timeline.' });
    if (!budget) e.push({ id: 'e_budget', msg: 'Choose a budget range, or Not sure yet.' });
    if (!consentPrivacy) {
      e.push({ id: 'e_consent', msg: 'Agree to the privacy terms so we can reply.' });
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setSubmitError('');
    if (errs.length > 0) return;

    setBusy(true);
    try {
      const cleanPartnerRef = partnerRef
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 16);

      const utm: Record<string, string> = {};
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const val = searchParams.get(k);
        if (val) utm[k] = val.slice(0, 200);
      }

      let healthCheckAnswers: number[] | undefined;
      if (noteParam.includes('Growth Health Check') && typeof window !== 'undefined') {
        try {
          const rawHc = window.localStorage.getItem('cg-health');
          if (rawHc) {
            const parsedHc = JSON.parse(rawHc) as { ans?: number[]; done?: boolean };
            if (
              parsedHc.done &&
              Array.isArray(parsedHc.ans) &&
              parsedHc.ans.length === HC_QUESTIONS.length &&
              parsedHc.ans.every((n) => typeof n === 'number' && n >= 0 && n <= 3)
            ) {
              healthCheckAnswers = parsedHc.ans;
            }
          }
        } catch {
          // Ignore malformed health check state
        }
      }

      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          role,
          website: website.trim(),
          partnerRef: cleanPartnerRef,
          needs,
          shortlist,
          programme,
          description: description.trim(),
          timeline,
          budget,
          source,
          utm: Object.keys(utm).length > 0 ? utm : undefined,
          healthCheckAnswers,
          consentPrivacy: true,
          consentUpdates,
          consentWhatsApp,
          turnstileToken,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ref?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error || 'Could not send enquiry.');
      }
      clearShortlist();
      const firstName = name.trim().split(' ')[0] || '';
      const q = new URLSearchParams();
      if (body?.ref) q.set('ref', body.ref);
      if (firstName) q.set('name', firstName);
      router.push(`/thank-you?${q.toString()}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'This page couldn’t send your details. Please try again in a moment.',
      );
      setBusy(false);
    }
  };

  const needOptions = [...CAPS.map((c) => c.name), 'An integrated programme', 'Not sure yet'];

  return (
    <div>
      {!prefillCleared && (activeProg || prefCapNames.length > 0) && (
        <div className="prefill">
          <p>
            <strong>Starting from your selection:</strong>{' '}
            {activeProg
              ? `${activeProg}${prefCapNames.length ? ` (${listJoin(prefCapNames)})` : ''}`
              : listJoin(prefCapNames)}
          </p>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setPrefillCleared(true);
              setProgramme('');
              router.replace('/start-a-project');
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      <div id="slBox">
        <div className="sl-box">
          {shortlist.length === 0 ? (
            <p className="small muted">
              Browsing services? Add them to this enquiry from any capability page or the{' '}
              <Link className="tlink" href="/services">
                full list of {ALL_SERVICES.length} services
              </Link>
              .
            </p>
          ) : (
            <>
              <p>
                <strong>
                  {shortlist.length} {shortlist.length === 1 ? 'service' : 'services'} shortlisted.
                </strong>{' '}
                <span className="muted small">We’ll scope these together.</span>
              </p>
              <ul>
                {shortlist.map((svcName) => (
                  <li key={svcName}>
                    {svcName}
                    <button
                      type="button"
                      aria-label={`Remove ${svcName}`}
                      onClick={() => removeShortlist(svcName)}
                    >
                      <XIcon />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="small" style={{ marginTop: 12 }}>
                <Link className="tlink" href="/services">
                  Add more services
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <form id="enquiryForm" noValidate onSubmit={handleSubmit}>
        <div id="enquiryErrors">
          {submitError && (
            <div className="alert alert-error" style={{ marginBottom: 28 }}>
              <strong>This page couldn’t send your details.</strong> Your answers are still here.
              Email them to <PlaceholderText text={siteConfig.contact.email} /> instead, or try
              again in a moment. ({submitError})
            </div>
          )}
          {errors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 28 }}>
              <strong>
                Check {errors.length} {errors.length === 1 ? 'field' : 'fields'} before sending.
              </strong>
              <ul>
                {errors.map((er) => (
                  <li key={er.id}>
                    <button
                      type="button"
                      className="btn-quiet"
                      style={{ minHeight: 32, padding: 0, color: 'inherit' }}
                      onClick={() => document.getElementById(er.id)?.focus()}
                    >
                      {er.msg}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="e_name">Full name</label>
            <input
              id="e_name"
              name="e_name"
              type="text"
              autoComplete="name"
              required
              aria-invalid={Boolean(errorMap.e_name) || undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="err">{errorMap.e_name || ''}</p>
          </div>

          <div className="field">
            <label htmlFor="e_email">Work email</label>
            <input
              id="e_email"
              name="e_email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(errorMap.e_email) || undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="err">{errorMap.e_email || ''}</p>
          </div>

          <div className="field">
            <label htmlFor="e_phone">
              Phone <span className="opt">(optional)</span>
            </label>
            <p className="hint" id="e_phone-hint">
              Include country code
            </p>
            <input
              id="e_phone"
              name="e_phone"
              type="tel"
              autoComplete="tel"
              aria-describedby="e_phone-hint e_phone-err"
              aria-invalid={Boolean(errorMap.e_phone) || undefined}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="err" id="e_phone-err">
              {errorMap.e_phone || ''}
            </p>
          </div>

          <div className="field">
            <label htmlFor="e_company">Company or brand</label>
            <input
              id="e_company"
              name="e_company"
              type="text"
              autoComplete="organization"
              required
              aria-invalid={Boolean(errorMap.e_company) || undefined}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <p className="err">{errorMap.e_company || ''}</p>
          </div>

          <div className="field">
            <label htmlFor="e_role">Your role</label>
            <select
              id="e_role"
              name="e_role"
              required
              aria-invalid={Boolean(errorMap.e_role) || undefined}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Choose one</option>
              {['Founder or CEO', 'Marketing', 'Operations', 'Event organiser', 'Other'].map(
                (opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ),
              )}
            </select>
            <p className="err">{errorMap.e_role || ''}</p>
          </div>

          <div className="field">
            <label htmlFor="e_site">
              Website or LinkedIn <span className="opt">(optional)</span>
            </label>
            <input
              id="e_site"
              name="e_site"
              type="url"
              autoComplete="url"
              aria-invalid={Boolean(errorMap.e_site) || undefined}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <p className="err">{errorMap.e_site || ''}</p>
          </div>

          <fieldset className="field full" id="e_needs" aria-describedby="e_needs-err">
            <legend>What do you need?</legend>
            <div className="chips">
              {needOptions.map((opt) => (
                <label className="chip" key={opt}>
                  <input
                    type="checkbox"
                    name="e_needs"
                    value={opt}
                    checked={needs.includes(opt)}
                    onChange={() => toggleNeed(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            <p className="err" id="e_needs-err">
              {errorMap.e_needs || ''}
            </p>
          </fieldset>

          <div className="field full">
            <label htmlFor="e_desc">Tell us about the project</label>
            <p className="hint" id="e_desc-hint">
              What are you trying to achieve, and what’s already in place?
            </p>
            <textarea
              id="e_desc"
              name="e_desc"
              required
              aria-describedby="e_desc-hint e_desc-err"
              aria-invalid={Boolean(errorMap.e_desc) || undefined}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="err" id="e_desc-err">
              {errorMap.e_desc || ''}
            </p>
          </div>

          <div className="field">
            <label htmlFor="e_time">Timeline</label>
            <select
              id="e_time"
              name="e_time"
              required
              aria-invalid={Boolean(errorMap.e_time) || undefined}
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            >
              <option value="">Choose one</option>
              {[
                'As soon as possible',
                'Within 1–3 months',
                'In 3–6 months',
                'Just exploring',
              ].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="err">{errorMap.e_time || ''}</p>
          </div>

          <div className="field">
            <label htmlFor="e_budget">Budget range (INR)</label>
            <p className="hint" id="e_budget-hint">
              <PlaceholderText text="[Adjust bands once pricing is set]" />
            </p>
            <select
              id="e_budget"
              name="e_budget"
              required
              aria-describedby="e_budget-hint e_budget-err"
              aria-invalid={Boolean(errorMap.e_budget) || undefined}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            >
              <option value="">Choose one</option>
              {[
                'Under ₹1 lakh',
                '₹1–5 lakh',
                '₹5–15 lakh',
                'Above ₹15 lakh',
                'Not sure yet',
              ].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="err" id="e_budget-err">
              {errorMap.e_budget || ''}
            </p>
          </div>

          <div className="field">
            <label htmlFor="e_source">
              How did you hear about us? <span className="opt">(optional)</span>
            </label>
            <select
              id="e_source"
              name="e_source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Choose one</option>
              {['Search', 'LinkedIn', 'Referral', 'Event', 'Podcast', 'Other'].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="e_ref">
              Referral or partner code <span className="opt">(optional)</span>
            </label>
            <p className="hint" id="e_ref-hint">
              If a partner referred you, add their code
            </p>
            <input
              id="e_ref"
              name="e_ref"
              type="text"
              aria-describedby="e_ref-hint"
              value={partnerRef}
              onChange={(e) => setPartnerRef(e.target.value)}
            />
          </div>

          <div className="field full" style={{ gap: 14 }}>
            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="e_consent"
                  name="e_consent"
                  required
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                />
                <span>
                  I agree to Collabify using these details to respond to my enquiry, as described in
                  the{' '}
                  <Link className="tlink" href="/privacy">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errorMap.e_consent || ''}
              </p>
            </div>

            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="e_updates"
                  name="e_updates"
                  checked={consentUpdates}
                  onChange={(e) => setConsentUpdates(e.target.checked)}
                />
                <span>Send me occasional updates and insights by email.</span>
              </label>
            </div>

            <div>
              <label className="check">
                <input
                  type="checkbox"
                  id="e_whatsapp"
                  name="e_whatsapp"
                  checked={consentWhatsApp}
                  onChange={(e) => setConsentWhatsApp(e.target.checked)}
                />
                <span>You may contact me on WhatsApp about this enquiry.</span>
              </label>
            </div>
          </div>

          <TurnstileField onToken={setTurnstileToken} />
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" id="enquirySubmit" disabled={busy}>
            {busy ? 'Sending…' : 'Send enquiry'}
          </button>
          <span className="muted small">
            We reply within <span className="ph">[two working days]</span>.
          </span>
        </div>
      </form>
    </div>
  );
}
