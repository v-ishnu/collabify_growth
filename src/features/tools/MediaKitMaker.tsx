'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MK_DELIVERABLES, MK_EMPTY, MK_NICHES, MK_PLATFORMS } from '@/content';
import { listJoin, slugify } from '@/lib/format';
import { XIcon } from '@/components/common/Icons';
import { ThemePicker } from '@/components/tools/ThemePicker';
import { ShareToolBar } from '@/components/tools/ShareToolBar';
import { MediaKitCard, type MediaKitData, fmtCount, mkLinks } from './MediaKitCard';
import {
  cloneEmptyMediaKit,
  encodeMediaKit,
  normalizeMediaKit,
  renderMediaKitPng,
  validateMediaKit,
} from '@/lib/tools/media-kit';
import { copyToClipboard, downloadBlob } from '@/lib/tools/shared';

const STORAGE_KEY = 'cg-mediakit';

type MsgState =
  | { type: 'error'; text: string }
  | { type: 'ok'; title: string; body: string; url?: string; path?: string }
  | null;

export function MediaKitMaker() {
  const router = useRouter();
  const [data, setData] = useState<MediaKitData>(() => cloneEmptyMediaKit());
  const [hydrated, setHydrated] = useState(false);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState<MsgState>(null);

  const errRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeMediaKit(JSON.parse(raw));
        if (parsed) setData(parsed);
      }
    } catch {
      // ignore invalid stored draft
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage quota errors
    }
    if (msg?.type === 'error' && validateMediaKit(data).length === 0) {
      setMsg(null);
    }
  }, [data, hydrated, msg?.type]);

  function updateField<K extends keyof MediaKitData>(key: K, val: MediaKitData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  function updateAudience<K extends keyof MediaKitData['a']>(key: K, val: string) {
    setData((prev) => ({ ...prev, a: { ...prev.a, [key]: val } }));
  }

  function updatePlat(idx: number, col: number, val: string) {
    setData((prev) => ({
      ...prev,
      p: prev.p.map((row, rIdx) => {
        if (rIdx !== idx) return row;
        const next: [string, string, string, string] = [...row];
        next[col] = val.slice(0, 20);
        return next;
      }),
    }));
  }

  function addPlat() {
    if (data.p.length >= 6) return;
    setData((prev) => ({
      ...prev,
      p: [...prev.p, ['Instagram', '', '', '']],
    }));
  }

  function removePlat(idx: number) {
    setData((prev) => ({
      ...prev,
      p:
        prev.p.length > 1
          ? prev.p.filter((_, rIdx) => rIdx !== idx)
          : [['Instagram', '', '', '']],
    }));
  }

  function updateRate(idx: number, col: number, val: string) {
    setData((prev) => ({
      ...prev,
      r: prev.r.map((row, rIdx) => {
        if (rIdx !== idx) return row;
        const next: [string, string] = [...row];
        next[col] = val.slice(0, 60);
        return next;
      }),
    }));
  }

  function addRate() {
    if (data.r.length >= 8) return;
    setData((prev) => ({
      ...prev,
      r: [...prev.r, ['', '']],
    }));
  }

  function removeRate(idx: number) {
    setData((prev) => ({
      ...prev,
      r: prev.r.length > 1 ? prev.r.filter((_, rIdx) => rIdx !== idx) : [['', '']],
    }));
  }

  function handleReset() {
    if (typeof window !== 'undefined' && !window.confirm('Clear everything and start again?')) {
      return;
    }
    const empty = cloneEmptyMediaKit();
    setData(empty);
    setMsg(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MK_EMPTY));
    } catch {
      // ignore
    }
  }

  async function handleDownload() {
    const miss = validateMediaKit(data);
    if (miss.length > 0) {
      setMsg({ type: 'error', text: `Add ${listJoin(miss)} first.` });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    setDownloading(true);
    try {
      const blob = await renderMediaKitPng(data);
      const name = `media-kit-${slugify(data.h.replace(/^@/, '')) || 'creator'}.png`;
      downloadBlob(blob, name);
      setMsg({
        type: 'ok',
        title: 'Your media kit is ready.',
        body: 'Send it to brands, or pin it in your stories.',
      });
    } catch {
      setMsg({
        type: 'error',
        text: 'The image didn’t download. Try again, or use the share link instead.',
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const miss = validateMediaKit(data);
    if (miss.length > 0) {
      setMsg({ type: 'error', text: `Add ${listJoin(miss)} first.` });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    const code = encodeMediaKit(data);
    const path = `/c/${code}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${path}`;
    const copied = await copyToClipboard(url);
    setMsg({
      type: 'ok',
      title: copied ? 'Link copied.' : 'Here’s your link.',
      body: 'Put it in your bio or send it to brands. Anyone with the link can see your card.',
      url,
      path,
    });
    if (!copied) {
      requestAnimationFrame(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      });
    }
  }

  function handleJoinNetwork() {
    const params = new URLSearchParams();
    if (data.n) params.set('name', data.n);
    if (data.e) params.set('email', data.e);
    if (data.ph) params.set('phone', data.ph);
    if (data.c) params.set('city', data.c);
    const firstLink = mkLinks(data)[0];
    if (firstLink) params.set('link', firstLink);
    const audLines = data.p
      .filter((p) => p[0] && p[1])
      .map((p) => `${p[0]}: ${fmtCount(p[1])} followers`)
      .concat(data.ni ? [`Niche: ${data.ni}`] : []);
    if (audLines.length > 0) params.set('audience', audLines.join('\n'));
    params.set('creator', '1');
    router.push(`/partners?${params.toString()}`);
  }

  return (
    <>
      <section className="sec" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap">
          <div className={`mk-tool${mobileView === 'preview' ? ' show-preview' : ''}`}>
          <form
            id="mkForm"
            className="mk-form"
            noValidate
            onSubmit={(e: FormEvent) => e.preventDefault()}
          >
            <fieldset className="mk-sec">
              <legend>About you</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="mk_n">Name</label>
                  <input
                    type="text"
                    id="mk_n"
                    autoComplete="name"
                    maxLength={60}
                    value={data.n}
                    onChange={(e) => updateField('n', e.target.value.slice(0, 60))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mk_h">Handle</label>
                  <input
                    type="text"
                    id="mk_h"
                    maxLength={40}
                    placeholder="@yourhandle"
                    value={data.h}
                    onChange={(e) => updateField('h', e.target.value.slice(0, 40))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mk_ni">
                    Niche <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mk_ni"
                    list="mkNiches"
                    maxLength={40}
                    value={data.ni}
                    onChange={(e) => updateField('ni', e.target.value.slice(0, 40))}
                  />
                  <datalist id="mkNiches">
                    {MK_NICHES.map((niche) => (
                      <option key={niche} value={niche} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="mk_c">
                    City <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mk_c"
                    autoComplete="address-level2"
                    maxLength={40}
                    value={data.c}
                    onChange={(e) => updateField('c', e.target.value.slice(0, 40))}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="mk_b">
                    Short bio <span className="opt">(up to 160 characters)</span>
                  </label>
                  <textarea
                    id="mk_b"
                    maxLength={160}
                    style={{ minHeight: 84 }}
                    value={data.b}
                    onChange={(e) => updateField('b', e.target.value.slice(0, 160))}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="mk-sec">
              <legend>Platforms</legend>
              <p className="hint">Use the numbers from your own insights.</p>
              <div id="mkPlats">
                {data.p.map((p, k) => (
                  <div className="mk-row" data-row="plat" key={k}>
                    <div className="field">
                      <label htmlFor={`mkp${k}a`}>Platform</label>
                      <select
                        id={`mkp${k}a`}
                        value={p[0]}
                        onChange={(e) => updatePlat(k, 0, e.target.value)}
                      >
                        {MK_PLATFORMS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`mkp${k}b`}>Followers</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id={`mkp${k}b`}
                        placeholder="25000"
                        value={p[1]}
                        onChange={(e) => updatePlat(k, 1, e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`mkp${k}c`}>Avg views</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id={`mkp${k}c`}
                        value={p[2]}
                        onChange={(e) => updatePlat(k, 2, e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`mkp${k}d`}>Engagement %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        id={`mkp${k}d`}
                        value={p[3]}
                        onChange={(e) => updatePlat(k, 3, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="mk-del"
                      aria-label="Remove this platform"
                      onClick={() => removePlat(k)}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
              {data.p.length < 6 && (
                <button type="button" className="btn-quiet" onClick={addPlat}>
                  Add a platform
                </button>
              )}
            </fieldset>

            <fieldset className="mk-sec">
              <legend>Audience</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="mk_aci">
                    Top cities <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mk_aci"
                    placeholder="Mumbai, Delhi, Pune"
                    maxLength={80}
                    value={data.a.ci}
                    onChange={(e) => updateAudience('ci', e.target.value.slice(0, 80))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mk_aag">
                    Main age group <span className="opt">(optional)</span>
                  </label>
                  <select
                    id="mk_aag"
                    value={data.a.ag}
                    onChange={(e) => updateAudience('ag', e.target.value)}
                  >
                    <option value="">Choose one</option>
                    {['13–17', '18–24', '25–34', '35–44', '45+'].map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="mk_ag">
                    Audience split <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mk_ag"
                    placeholder="For example, 60% women"
                    maxLength={60}
                    value={data.a.g}
                    onChange={(e) => updateAudience('g', e.target.value.slice(0, 60))}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="mk-sec">
              <legend>Rate card</legend>
              <div id="mkRates">
                {data.r.map((r, k) => (
                  <div className="mk-row mk-row-rate" data-row="rate" key={k}>
                    <div className="field">
                      <label htmlFor={`mkr${k}a`}>Deliverable</label>
                      <input
                        type="text"
                        id={`mkr${k}a`}
                        list="mkDeliv"
                        value={r[0]}
                        onChange={(e) => updateRate(k, 0, e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`mkr${k}b`}>Price (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id={`mkr${k}b`}
                        placeholder="15000"
                        value={r[1]}
                        onChange={(e) => updateRate(k, 1, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="mk-del"
                      aria-label="Remove this deliverable"
                      onClick={() => removeRate(k)}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
              <datalist id="mkDeliv">
                {MK_DELIVERABLES.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {data.r.length < 8 && (
                <button type="button" className="btn-quiet" onClick={addRate}>
                  Add a deliverable
                </button>
              )}
              <label className="check" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  id="mk_ro"
                  checked={data.ro}
                  onChange={(e) => updateField('ro', e.target.checked)}
                />
                <span>Show rates on request instead of prices</span>
              </label>
            </fieldset>

            <fieldset className="mk-sec">
              <legend>Brands and contact</legend>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="mk_br">
                    Brands you’ve worked with <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mk_br"
                    maxLength={140}
                    placeholder="Separate with commas"
                    value={data.br}
                    onChange={(e) => updateField('br', e.target.value.slice(0, 140))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mk_e">Email for brand enquiries</label>
                  <input
                    type="email"
                    id="mk_e"
                    autoComplete="email"
                    maxLength={80}
                    value={data.e}
                    onChange={(e) => updateField('e', e.target.value.slice(0, 80))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mk_ph">
                    Phone or WhatsApp <span className="opt">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="mk_ph"
                    autoComplete="tel"
                    maxLength={20}
                    value={data.ph}
                    onChange={(e) => updateField('ph', e.target.value.slice(0, 20))}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="mk_l">
                    Links <span className="opt">(one per line, up to 4)</span>
                  </label>
                  <textarea
                    id="mk_l"
                    style={{ minHeight: 84 }}
                    placeholder="instagram.com/yourhandle"
                    maxLength={400}
                    value={data.l}
                    onChange={(e) => updateField('l', e.target.value.slice(0, 400))}
                  />
                </div>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Anything on your card is visible to anyone you share it with.
              </p>
            </fieldset>

            <fieldset className="mk-sec">
              <legend>Design</legend>
              <ThemePicker
                name="mk_th"
                selected={data.th}
                onChange={(val) => updateField('th', val)}
              />
              <div className="form-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn-quiet" onClick={handleReset}>
                  Start again
                </button>
              </div>
            </fieldset>
          </form>

          <div className="mk-side">
            <div className="mk-preview-tabs" role="tablist" aria-label="View">
              <button
                type="button"
                role="tab"
                aria-selected={mobileView === 'form'}
                onClick={() => setMobileView('form')}
              >
                Edit
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileView === 'preview'}
                onClick={() => setMobileView('preview')}
              >
                Preview
              </button>
            </div>

            <div id="mkPreview" className="mk-preview" aria-live="off">
              <MediaKitCard d={data} />
            </div>

            <div className="mk-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={downloading}
                onClick={handleDownload}
              >
                {downloading ? 'Preparing…' : 'Download image'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleShare}>
                Get share link
              </button>
            </div>

            <div id="mkMsg" aria-live="polite">
              {msg?.type === 'error' && (
                <div className="alert alert-error" tabIndex={-1} ref={errRef}>
                  <strong>{msg.text}</strong>
                </div>
              )}
              {msg?.type === 'ok' && (
                <div className="alert alert-ok">
                  <strong>{msg.title}</strong> {msg.body}
                  {msg.url && (
                    <>
                      <label className="sr-only" htmlFor="mkLink">
                        Your share link
                      </label>
                      <input
                        ref={linkInputRef}
                        type="text"
                        id="mkLink"
                        readOnly
                        value={msg.url}
                        style={{ marginTop: 10 }}
                      />
                      {msg.path && (
                        <p style={{ marginTop: 8 }}>
                          <Link className="tlink" href={msg.path}>
                            Open your card
                          </Link>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
          <ShareToolBar path="/tools/media-kit" line="Free media kit maker for creators:" />
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap two-col">
          <h2>Want brand deals?</h2>
          <div>
            <p className="lede">
              Join the Collabify creator network. When a brand campaign fits your audience, we’ll
              get in touch. It’s optional, and you choose what to share.
            </p>
            <div className="btn-row" style={{ marginTop: 22 }}>
              <button type="button" className="btn btn-primary" onClick={handleJoinNetwork}>
                Join the creator network
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
