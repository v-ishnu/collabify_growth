'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TurnstileField } from './TurnstileField';

const ROLES = [
  'A brand looking for distribution',
  'A creator or publisher',
  'A community owner',
  'Something else',
] as const;

const ROLE_MAP: Record<string, 'brand' | 'creator' | 'agency' | 'vendor' | 'other'> = {
  'A brand looking for distribution': 'brand',
  'A creator or publisher': 'creator',
  'A community owner': 'other',
  'Something else': 'other',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function MarketplaceInterestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [audiences, setAudiences] = useState('');
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [errors, setErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const errorMap = Object.fromEntries(errors.map((e) => [e.id, e.msg]));

  const validate = () => {
    const e: Array<{ id: string; msg: string }> = [];
    if (!name.trim()) e.push({ id: 'i_name', msg: 'Enter your name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'i_email', msg: 'Enter an email address like name@company.com.' });
    }
    if (!role) e.push({ id: 'i_role', msg: 'Choose the option that describes you.' });
    if (!consent) {
      e.push({ id: 'i_consent', msg: 'Agree to the privacy terms so we can send updates.' });
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
      const res = await fetch('/api/marketplace-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          city: '',
          company: company.trim(),
          role: ROLE_MAP[role] || 'other',
          note: [company.trim(), audiences.trim()].filter(Boolean).join(' — '),
          consent: true,
          turnstileToken,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Could not register your interest right now.');
      }
      setDone(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'This page couldn’t send your details. Please try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="alert alert-ok" id="interestDone" style={{ marginTop: 28 }}>
        <strong>You’re on the list.</strong> We’ll share updates as the marketplace develops.
      </div>
    );
  }

  return (
    <form id="interestForm" className="form-grid" noValidate style={{ marginTop: 28 }} onSubmit={handleSubmit}>
      <div className="full" id="interestStatus" aria-live="polite">
        {submitError && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <strong>Couldn’t save your details.</strong> {submitError}
          </div>
        )}
        {errors.length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
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
      </div>

      <div className="field">
        <label htmlFor="i_name">Name</label>
        <input
          id="i_name"
          name="i_name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={Boolean(errorMap.i_name) || undefined}
          aria-describedby="i_name-err"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="err" id="i_name-err">
          {errorMap.i_name || ''}
        </p>
      </div>

      <div className="field">
        <label htmlFor="i_email">Email</label>
        <input
          id="i_email"
          name="i_email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errorMap.i_email) || undefined}
          aria-describedby="i_email-err"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="err" id="i_email-err">
          {errorMap.i_email || ''}
        </p>
      </div>

      <div className="field">
        <label htmlFor="i_company">
          Company or channel <span className="opt">(optional)</span>
        </label>
        <input
          id="i_company"
          name="i_company"
          type="text"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="i_role">You are a</label>
        <select
          id="i_role"
          name="i_role"
          required
          aria-invalid={Boolean(errorMap.i_role) || undefined}
          aria-describedby="i_role-err"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Choose one</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <p className="err" id="i_role-err">
          {errorMap.i_role || ''}
        </p>
      </div>

      <div className="field full">
        <label htmlFor="i_aud">
          Audiences you reach or want to reach <span className="opt">(optional)</span>
        </label>
        <textarea
          id="i_aud"
          name="i_aud"
          style={{ minHeight: 96 }}
          value={audiences}
          onChange={(e) => setAudiences(e.target.value)}
        />
      </div>

      <div className="field full">
        <label className="check">
          <input
            type="checkbox"
            id="i_consent"
            name="i_consent"
            required
            aria-describedby="i_consent-err"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I agree to Collabify storing these details to send me marketplace updates, as described
            in the{' '}
            <Link className="tlink" href="/privacy">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <p className="err" id="i_consent-err" style={{ marginLeft: 36 }}>
          {errorMap.i_consent || ''}
        </p>
      </div>

      <TurnstileField onToken={setTurnstileToken} />

      <div className="full form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Register interest'}
        </button>
      </div>
    </form>
  );
}

