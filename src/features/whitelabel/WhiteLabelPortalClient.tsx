'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CAPS } from '@/content';
import { siteConfig } from '@/config/site';
import { fmtDay } from '@/lib/format';
import { PlaceholderText } from '@/components/common/PlaceholderText';
import { NoticeBox } from '@/components/common/NoticeBox';
import type { WlApplicationRow, WlBriefRow, WlPartnerRow } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface BriefWithFiles extends WlBriefRow {
  files?: Array<{ id: number; storage_path: string; file_name?: string; created_at: string }>;
}

interface WhiteLabelPortalClientProps {
  initialUser: { id: string; email: string | null; fullName: string | null } | null;
  initialApplication: WlApplicationRow | null;
  initialPartner: WlPartnerRow | null;
  initialBriefs: BriefWithFiles[];
}

export function WhiteLabelPortalClient({
  initialUser,
  initialApplication,
  initialPartner,
  initialBriefs,
}: WhiteLabelPortalClientProps) {
  const router = useRouter();
  const [application, setApplication] = useState<WlApplicationRow | null>(initialApplication);
  const [partner] = useState<WlPartnerRow | null>(initialPartner);
  const [briefs, setBriefs] = useState<BriefWithFiles[]>(initialBriefs);

  // Application form
  const [company, setCompany] = useState('');
  const [name, setName] = useState(initialUser?.fullName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [caps, setCaps] = useState<string[]>([]);
  const [volume, setVolume] = useState('');
  const [notes, setNotes] = useState('');
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [appErrors, setAppErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [appBusy, setAppBusy] = useState(false);

  // Brief form
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [capability, setCapability] = useState('');
  const [services, setServices] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [details, setDetails] = useState('');
  const [branding, setBranding] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [briefErrors, setBriefErrors] = useState<Array<{ id: string; msg: string }>>([]);
  const [briefOk, setBriefOk] = useState('');
  const [briefBusy, setBriefBusy] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  async function handleDownloadFile(briefId: string, fileId: number) {
    setDownloadingFileId(fileId);
    try {
      const res = await fetch(
        `/api/whitelabel/briefs/${encodeURIComponent(briefId)}/files`,
      );
      const json = (await res.json()) as {
        files?: Array<{ id: number; signed_url?: string | null }>;
      };
      const match = json.files?.find((f) => f.id === fileId);
      if (match?.signed_url) {
        window.open(match.signed_url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  if (!initialUser) {
    return (
      <NoticeBox
        title="Sign in to apply"
        body="Sign in with your agency email to submit a white-label partner application or open your brief portal."
      >
        <Link className="btn btn-primary" href="/auth/signin?next=/white-label">
          Sign in to continue
        </Link>
      </NoticeBox>
    );
  }

  async function handleBriefSubmit(e: FormEvent) {
    e.preventDefault();
    setBriefOk('');
    const errs: Array<{ id: string; msg: string }> = [];
    if (!title.trim()) errs.push({ id: 'b_title', msg: 'Name the project.' });
    if (!industry.trim()) errs.push({ id: 'b_industry', msg: 'Enter the client’s industry.' });
    if (!capability) errs.push({ id: 'b_cap', msg: 'Choose a capability.' });
    if (!services.trim()) errs.push({ id: 'b_services', msg: 'List the services you need.' });
    if (!budget) errs.push({ id: 'b_budget', msg: 'Choose a budget range, or Not sure yet.' });
    if (details.trim().length < 30) {
      errs.push({ id: 'b_details', msg: 'Describe the brief in at least 30 characters.' });
    }
    setBriefErrors(errs);
    if (errs.length > 0) return;

    setBriefBusy(true);
    try {
      const res = await fetch('/api/whitelabel/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          industry: industry.trim(),
          capability,
          services: services.trim(),
          due_date: dueDate || null,
          budget,
          details: details.trim(),
          branding: branding.trim() || null,
        }),
      });
      const json = (await res.json()) as { brief?: BriefWithFiles; error?: string };
      if (!res.ok || !json.brief) {
        setBriefErrors([{ id: 'submit', msg: json.error || 'We couldn’t send that brief.' }]);
        return;
      }

      let createdBrief = json.brief;
      if (pendingFile) {
        const fd = new FormData();
        fd.append('file', pendingFile);
        const upRes = await fetch(
          `/api/whitelabel/briefs/${encodeURIComponent(createdBrief.id)}/files`,
          { method: 'POST', body: fd }
        );
        if (upRes.ok) {
          const upJson = (await upRes.json()) as {
            file?: { id: number; storage_path: string; file_name?: string; created_at: string };
          };
          if (upJson.file) {
            createdBrief = { ...createdBrief, files: [upJson.file] };
          }
        }
      }

      setBriefs((prev) => [createdBrief, ...prev]);
      setTitle('');
      setIndustry('');
      setCapability('');
      setServices('');
      setDueDate('');
      setBudget('');
      setDetails('');
      setBranding('');
      setPendingFile(null);
      setBriefOk('Brief sent. Your partner manager will confirm scope and timing.');
      router.refresh();
    } catch {
      setBriefErrors([{ id: 'submit', msg: 'We couldn’t send that brief. Please try again.' }]);
    } finally {
      setBriefBusy(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) {
      setBriefErrors([{ id: 'b_file', msg: 'Files must be 10 MB or smaller.' }]);
      e.target.value = '';
      setPendingFile(null);
      return;
    }
    setPendingFile(f);
  }

  if (partner && partner.status === 'active') {
    const bErrMap = Object.fromEntries(briefErrors.map((x) => [x.id, x.msg]));
    return (
      <div id="wlPortal">
        <div className="sec-head split">
          <h2>{partner.company || 'Partner'} partner portal</h2>
          <p className="lede">
            Send briefs and track delivery. Everything here is confidential.{' '}
            <button type="button" className="tlink small" onClick={handleSignOut}>
              Sign out
            </button>
          </p>
        </div>

        <div className="form-shell">
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>New brief</h3>
            <form id="wlBrief" noValidate onSubmit={handleBriefSubmit}>
              {briefOk && (
                <div className="alert alert-ok" style={{ marginBottom: 20 }}>
                  <strong>{briefOk}</strong>
                </div>
              )}
              {briefErrors.length > 0 && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <strong>
                    Check {briefErrors.length} {briefErrors.length === 1 ? 'field' : 'fields'} first.
                  </strong>
                  <ul>
                    {briefErrors.map((er) => (
                      <li key={er.id}>{er.msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="b_title">Project name</label>
                  <p className="hint">Use a code name if you prefer</p>
                  <input
                    id="b_title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="err">{bErrMap.b_title}</p>
                </div>
                <div className="field">
                  <label htmlFor="b_industry">Client industry</label>
                  <input
                    id="b_industry"
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                  <p className="err">{bErrMap.b_industry}</p>
                </div>
                <div className="field">
                  <label htmlFor="b_cap">Capability</label>
                  <select
                    id="b_cap"
                    value={capability}
                    onChange={(e) => setCapability(e.target.value)}
                  >
                    <option value="">Choose one</option>
                    {CAPS.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="err">{bErrMap.b_cap}</p>
                </div>
                <div className="field">
                  <label htmlFor="b_services">Services needed</label>
                  <p className="hint">For example, website and landing pages</p>
                  <input
                    id="b_services"
                    type="text"
                    value={services}
                    onChange={(e) => setServices(e.target.value)}
                  />
                  <p className="err">{bErrMap.b_services}</p>
                </div>
                <div className="field">
                  <label htmlFor="b_due">Deadline</label>
                  <input
                    id="b_due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="b_budget">Budget range (INR)</label>
                  <select
                    id="b_budget"
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
                    ].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="err">{bErrMap.b_budget}</p>
                </div>
                <div className="field full">
                  <label htmlFor="b_details">Brief</label>
                  <textarea
                    id="b_details"
                    style={{ minHeight: 120 }}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                  <p className="err">{bErrMap.b_details}</p>
                </div>
                <div className="field full">
                  <label htmlFor="b_brand">
                    Branding instructions <span className="opt">(optional)</span>
                  </label>
                  <input
                    id="b_brand"
                    type="text"
                    placeholder="Whose logo and email to use on deliverables"
                    value={branding}
                    onChange={(e) => setBranding(e.target.value)}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="b_file">
                    Attach brief file <span className="opt">(optional, PDF/DOCX/PNG up to 10 MB)</span>
                  </label>
                  <input
                    id="b_file"
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                  />
                  <p className="err">{bErrMap.b_file}</p>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={briefBusy}>
                  {briefBusy ? 'Sending…' : 'Send brief'}
                </button>
              </div>
            </form>
          </div>

          <aside className="form-aside">
            <div className="callout">
              <h3>Your briefs</h3>
              <div id="wlBriefs" style={{ marginTop: 12 }}>
                {briefs.length === 0 ? (
                  <p className="muted small">
                    No briefs yet. Your first one appears here with its status.
                  </p>
                ) : (
                  <ul className="brief-list">
                    {briefs.map((b) => (
                      <li key={b.id}>
                        <strong>{b.title}</strong>
                        <span
                          className={`status${b.status === 'Delivered' ? ' contacted' : ''}`}
                        >
                          {b.status || 'Received'}
                        </span>
                        <span className="small muted">
                          {b.capability}
                          {b.due_date ? `, due ${fmtDay(b.due_date)}` : ''}
                        </span>
                        {b.files && b.files.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                            {b.files.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                className="tlink small"
                                disabled={downloadingFileId === f.id}
                                onClick={() => handleDownloadFile(b.id, f.id)}
                              >
                                {downloadingFileId === f.id
                                  ? 'Opening…'
                                  : `Download ${f.file_name || 'attachment'}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (application) {
    const declined = application.status === 'declined' || application.status === 'removed';
    return (
      <div className="status-card">
        <span className="status">{declined ? 'Not approved' : 'Under review'}</span>
        <h2>
          {declined
            ? 'We can’t take this partnership on right now.'
            : 'Thanks. We’ll be in touch about partner terms and the NDA.'}
        </h2>
        <p className="lede">
          {declined ? (
            <>
              Email <PlaceholderText text={siteConfig.contact.email} /> if you’d like to talk it
              through.
            </>
          ) : (
            'Your partner portal opens here once you’re approved.'
          )}
        </p>
      </div>
    );
  }

  function validateApp(): Array<{ id: string; msg: string }> {
    const e: Array<{ id: string; msg: string }> = [];
    if (!company.trim()) e.push({ id: 'w_company', msg: 'Enter your agency or business name.' });
    if (!name.trim()) e.push({ id: 'w_name', msg: 'Enter your name.' });
    if (!EMAIL_RE.test(email.trim())) {
      e.push({ id: 'w_email', msg: 'Enter an email address like name@agency.com.' });
    }
    if (!city.trim()) e.push({ id: 'w_city', msg: 'Enter your city.' });
    if (caps.length === 0) e.push({ id: 'w_caps', msg: 'Choose at least one capability.' });
    if (!volume) e.push({ id: 'w_vol', msg: 'Choose an expected volume, or Not sure yet.' });
    if (!ndaAgreed) {
      e.push({
        id: 'w_nda',
        msg: 'Accept the mutual NDA and non-solicitation terms to become a partner.',
      });
    }
    if (!privacyAgreed) {
      e.push({ id: 'w_privacy', msg: 'Agree to the privacy terms so we can contact you.' });
    }
    return e;
  }

  const errMap = Object.fromEntries(appErrors.map((x) => [x.id, x.msg]));

  async function handleAppSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateApp();
    setAppErrors(errs);
    if (errs.length > 0) return;

    setAppBusy(true);
    try {
      const res = await fetch('/api/whitelabel/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          website: website.trim() || null,
          city: city.trim(),
          capabilities: caps,
          volume,
          notes: notes.trim() || null,
          nda_agreed: ndaAgreed,
          consent: true,
        }),
      });
      const json = (await res.json()) as { application?: WlApplicationRow; error?: string };
      if (!res.ok || !json.application) {
        setAppErrors([{ id: 'submit', msg: json.error || 'We couldn’t send your application.' }]);
        return;
      }
      setApplication(json.application);
      router.refresh();
    } catch {
      setAppErrors([{ id: 'submit', msg: 'We couldn’t send your application. Please try again.' }]);
    } finally {
      setAppBusy(false);
    }
  }

  function toggleCap(capName: string) {
    setCaps((prev) =>
      prev.includes(capName) ? prev.filter((x) => x !== capName) : [...prev, capName]
    );
  }

  return (
    <div className="form-shell">
      <div>
        <h2>Become a white-label partner</h2>
        <p className="muted" style={{ margin: '10px 0 28px' }}>
          Tell us about your business and what your clients ask for.
        </p>

        <form id="wlForm" noValidate onSubmit={handleAppSubmit}>
          {appErrors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 24 }}>
              <strong>
                Check {appErrors.length} {appErrors.length === 1 ? 'field' : 'fields'} before
                sending.
              </strong>
              <ul>
                {appErrors.map((er) => (
                  <li key={er.id}>{er.msg}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="w_company">Agency or business name</label>
              <input
                id="w_company"
                type="text"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <p className="err">{errMap.w_company}</p>
            </div>
            <div className="field">
              <label htmlFor="w_name">Your name</label>
              <input
                id="w_name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="err">{errMap.w_name}</p>
            </div>
            <div className="field">
              <label htmlFor="w_email">Work email</label>
              <input
                id="w_email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="err">{errMap.w_email}</p>
            </div>
            <div className="field">
              <label htmlFor="w_phone">
                Phone <span className="opt">(optional)</span>
              </label>
              <input
                id="w_phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="w_site">
                Website <span className="opt">(optional)</span>
              </label>
              <input
                id="w_site"
                type="url"
                autoComplete="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="w_city">City</label>
              <input
                id="w_city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <p className="err">{errMap.w_city}</p>
            </div>

            <fieldset className="field full" id="w_caps">
              <legend>Which capabilities would you resell?</legend>
              <div className="chips">
                {CAPS.map((c) => (
                  <label className="chip" key={c.id}>
                    <input
                      type="checkbox"
                      checked={caps.includes(c.name)}
                      onChange={() => toggleCap(c.name)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
              <p className="err">{errMap.w_caps}</p>
            </fieldset>

            <div className="field">
              <label htmlFor="w_vol">Expected projects per month</label>
              <select id="w_vol" value={volume} onChange={(e) => setVolume(e.target.value)}>
                <option value="">Choose one</option>
                {['1–2', '3–5', '6–10', 'More than 10', 'Not sure yet'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <p className="err">{errMap.w_vol}</p>
            </div>

            <div className="field full">
              <label htmlFor="w_more">
                Anything else we should know? <span className="opt">(optional)</span>
              </label>
              <textarea
                id="w_more"
                style={{ minHeight: 96 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="field full">
              <label className="check">
                <input
                  type="checkbox"
                  id="w_nda"
                  checked={ndaAgreed}
                  onChange={(e) => setNdaAgreed(e.target.checked)}
                />
                <span>
                  I accept Collabify’s mutual confidentiality and non-solicitation partner NDA terms.
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errMap.w_nda}
              </p>
            </div>

            <div className="field full">
              <label className="check">
                <input
                  type="checkbox"
                  id="w_privacy"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                />
                <span>
                  I agree to Collabify storing these details to discuss a partnership, as described
                  in the <Link className="tlink" href="/privacy">Privacy Policy</Link>.
                </span>
              </label>
              <p className="err" style={{ marginLeft: 36 }}>
                {errMap.w_privacy}
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={appBusy}>
              {appBusy ? 'Sending…' : 'Apply to partner'}
            </button>
          </div>
        </form>
      </div>

      <aside className="form-aside">
        <div className="callout">
          <h3>Confidential by default</h3>
          <p>Your application and briefs are visible only to our partner team.</p>
        </div>
      </aside>
    </div>
  );
}

