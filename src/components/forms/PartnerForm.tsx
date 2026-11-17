'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CAPS, PARTNER_TYPES } from '@/content';
import { siteConfig } from '@/config/site';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { TurnstileField } from './TurnstileField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function PartnerForm() {
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [partnerType, setPartnerType] = useState('');
  const [availability, setAvailability] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [rate, setRate] = useState('');
  const [audience, setAudience] = useState('');
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const [errors, setErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const qName = searchParams.get('name');
    const qEmail = searchParams.get('email');
    const qPhone = searchParams.get('phone');
    const qCity = searchParams.get('city');
    const qLink = searchParams.get('link');
    const qAud = searchParams.get('audience');
    const qCreator = searchParams.get('creator');
    if (qName) setName(qName);
    if (qEmail) setEmail(qEmail);
    if (qPhone) setPhone(qPhone);
    if (qCity) setCity(qCity);
    if (qLink) setPortfolioUrl(qLink);
    if (qAud) setAudience(qAud);
    if (qCreator === '1') {
      setPartnerType('Creators and publishers');
      setCapabilities((prev) =>
        prev.includes('Network & Experiences') ? prev : [...prev, 'Network & Experiences'],
      );
      document.getElementById('partnerFormSec')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const errorMap = Object.fromEntries(errors.map((e) => [e.id, e.msg]));

  const toggleCap = (capName: string) => {
    setCapabilities((prev) =>
      prev.includes(capName) ? prev.filter((x) => x !== capName) : [...prev, capName],
    );
  };

  const validate = () => {
    const e: Array<{ id: string; msg: string }> = [];
    if (!name.trim()) e.push({ id: 'p_name', msg: 'Enter your full name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'p_email', msg: 'Enter an email address like name@domain.com.' });
    }
    const ph = phone.trim();
    if (ph && !/^[+()\d\s-]{7,20}$/.test(ph)) {
      e.push({ id: 'p_phone', msg: 'Enter a phone number using digits, spaces and a leading +.' });
    }
    if (!city.trim()) e.push({ id: 'p_city', msg: 'Enter your city.' });
    if (!partnerType) e.push({ id: 'p_type', msg: 'Choose your partner type.' });
    if (!availability) e.push({ id: 'p_avail', msg: 'Choose your availability.' });
    if (capabilities.length === 0) {
      e.push({ id: 'p_caps', msg: 'Choose at least one capability.' });
    }
    const link = portfolioUrl.trim();
    if (!link || /\s/.test(link) || !link.includes('.')) {
      e.push({ id: 'p_link', msg: 'Enter a portfolio or website link like yourname.com.' });
    }
    if (!consent) {
      e.push({
        id: 'p_consent',
        msg: 'Agree to the privacy terms so we can store your application.',
      });
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
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          partnerType,
          availability,
          capabilities,
          portfolioUrl: portfolioUrl.trim(),
          rate: rate.trim(),
          audience: audience.trim(),
          consent: true,
          turnstileToken,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ref?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error || 'Could not submit application.');
      }
      setRefCode(body?.ref || 'RECEIVED');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'This page couldn’t send your details.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (refCode) {
    return (
      <div className="alert alert-ok" id="partnerDone">
        <strong>Thanks for applying.</strong> We review every application and will contact you when
        there’s a project that fits your skills. Applying doesn’t guarantee work. Your reference:{' '}
        <strong>{refCode}</strong>
      </div>
    );
  }

  return (
    <form id="partnerForm" noValidate onSubmit={handleSubmit}>
      <div id="partnerErrors">
        {submitError && (
          <div className="alert alert-error" style={{ marginBottom: 28 }}>
            <strong>This page couldn’t send your details.</strong> Your answers are still here.
            Email them to <PlaceholderText text={siteConfig.contact.email} /> instead, or try again
            in a moment. ({submitError})
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
          <label htmlFor="p_name">Full name</label>
          <input
            id="p_name"
            name="p_name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={Boolean(errorMap.p_name) || undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="err">{errorMap.p_name || ''}</p>
        </div>

        <div className="field">
          <label htmlFor="p_email">Email</label>
          <input
            id="p_email"
            name="p_email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errorMap.p_email) || undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="err">{errorMap.p_email || ''}</p>
        </div>

        <div className="field">
          <label htmlFor="p_phone">
            Phone <span className="opt">(optional)</span>
          </label>
          <p className="hint" id="p_phone-hint">
            Include country code
          </p>
          <input
            id="p_phone"
            name="p_phone"
            type="tel"
            autoComplete="tel"
            aria-describedby="p_phone-hint p_phone-err"
            aria-invalid={Boolean(errorMap.p_phone) || undefined}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="err" id="p_phone-err">
            {errorMap.p_phone || ''}
          </p>
        </div>

        <div className="field">
          <label htmlFor="p_city">City</label>
          <input
            id="p_city"
            name="p_city"
            type="text"
            autoComplete="address-level2"
            required
            aria-invalid={Boolean(errorMap.p_city) || undefined}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <p className="err">{errorMap.p_city || ''}</p>
        </div>

        <div className="field">
          <label htmlFor="p_type">Partner type</label>
          <select
            id="p_type"
            name="p_type"
            required
            aria-invalid={Boolean(errorMap.p_type) || undefined}
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value)}
          >
            <option value="">Choose one</option>
            {[...PARTNER_TYPES.map((p) => p[0]), 'Other'].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <p className="err">{errorMap.p_type || ''}</p>
        </div>

        <div className="field">
          <label htmlFor="p_avail">Availability</label>
          <select
            id="p_avail"
            name="p_avail"
            required
            aria-invalid={Boolean(errorMap.p_avail) || undefined}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="">Choose one</option>
            {['Available now', 'Available within a month', 'Occasional projects only'].map(
              (opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ),
            )}
          </select>
          <p className="err">{errorMap.p_avail || ''}</p>
        </div>

        <fieldset className="field full" id="p_caps" aria-describedby="p_caps-err">
          <legend>Which capabilities do you work in?</legend>
          <div className="chips">
            {CAPS.map((c) => (
              <label className="chip" key={c.id}>
                <input
                  type="checkbox"
                  name="p_caps"
                  value={c.name}
                  checked={capabilities.includes(c.name)}
                  onChange={() => toggleCap(c.name)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
          <p className="err" id="p_caps-err">
            {errorMap.p_caps || ''}
          </p>
        </fieldset>

        <div className="field">
          <label htmlFor="p_link">Portfolio or website link</label>
          <input
            id="p_link"
            name="p_link"
            type="url"
            autoComplete="url"
            required
            aria-invalid={Boolean(errorMap.p_link) || undefined}
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
          />
          <p className="err">{errorMap.p_link || ''}</p>
        </div>

        <div className="field">
          <label htmlFor="p_rate">
            Typical rate range <span className="opt">(optional)</span>
          </label>
          <p className="hint" id="p_rate-hint">
            For example, per day, per project or per post
          </p>
          <input
            id="p_rate"
            name="p_rate"
            type="text"
            aria-describedby="p_rate-hint"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <div className="field full">
          <label htmlFor="p_aud">
            Audience size and platforms{' '}
            <span className="opt">(creators, publishers and communities only)</span>
          </label>
          <textarea
            id="p_aud"
            name="p_aud"
            style={{ minHeight: 96 }}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>

        <div className="field full">
          <label className="check">
            <input
              type="checkbox"
              id="p_consent"
              name="p_consent"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to Collabify storing my details to contact me about partnership
              opportunities, as described in the{' '}
              <Link className="tlink" href="/privacy">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <p className="err" style={{ marginLeft: 36 }}>
            {errorMap.p_consent || ''}
          </p>
        </div>

        <TurnstileField onToken={setTurnstileToken} />
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Apply to partner'}
        </button>
      </div>
    </form>
  );
}

