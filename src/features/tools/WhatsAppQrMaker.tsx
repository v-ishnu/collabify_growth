'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ThemePicker } from '@/components/tools/ThemePicker';
import { WhatsAppPosterCard } from '@/components/tools/WhatsAppPosterCard';
import { listJoin, slugify } from '@/lib/format';
import { copyToClipboard, downloadBlob, waNumber } from '@/lib/tools/shared';
import {
  WA_EMPTY,
  type WhatsAppQrData,
  renderWhatsAppPosterPng,
  waLink,
} from '@/lib/tools/whatsapp';

const STORAGE_KEY = 'cg-waqr';

type MsgState =
  | { type: 'error'; text: string }
  | { type: 'copy'; copied: boolean; link: string }
  | { type: 'downloaded' }
  | null;

export function WhatsAppQrMaker() {
  const [data, setData] = useState<WhatsAppQrData>(() => ({ ...WA_EMPTY }));
  const [hydrated, setHydrated] = useState(false);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [busyAction, setBusyAction] = useState<'poster' | 'qr' | null>(null);
  const [msg, setMsg] = useState<MsgState>(null);

  const errRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WhatsAppQrData>;
        if (parsed && parsed.v === 1) {
          setData({ ...WA_EMPTY, ...parsed, v: 1 });
        }
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    if (msg?.type === 'error' && data.n.trim() && waNumber(data.num)) {
      setMsg(null);
    }
  }, [data, hydrated, msg?.type]);

  function updateField<K extends keyof WhatsAppQrData>(key: K, val: WhatsAppQrData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  function validate(): string[] {
    const miss: string[] = [];
    if (!data.n.trim()) miss.push('your business name');
    if (!waNumber(data.num)) {
      miss.push('a WhatsApp number with 10 digits, or with your country code');
    }
    return miss;
  }

  async function handleCopy() {
    const miss = validate();
    if (miss.length > 0) {
      setMsg({ type: 'error', text: `Add ${listJoin(miss)} first.` });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    const link = waLink(data);
    const copied = await copyToClipboard(link);
    setMsg({ type: 'copy', copied, link });
    if (!copied) {
      requestAnimationFrame(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      });
    }
  }

  async function handleDownload(qrOnly: boolean) {
    const miss = validate();
    if (miss.length > 0) {
      setMsg({ type: 'error', text: `Add ${listJoin(miss)} first.` });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    setBusyAction(qrOnly ? 'qr' : 'poster');
    try {
      const blob = await renderWhatsAppPosterPng(data, qrOnly);
      const name = `${slugify(data.n) || 'whatsapp'}${qrOnly ? '-qr.png' : '-whatsapp-poster.png'}`;
      downloadBlob(blob, name);
      setMsg({ type: 'downloaded' });
    } catch (err) {
      const noQr = err instanceof Error && err.message === 'no-qr';
      setMsg({
        type: 'error',
        text: noQr
          ? 'The download didn’t work. The QR code couldn’t be created. Reload the page and try again.'
          : 'The download didn’t work. Try again.',
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={`mk-tool${mobileView === 'preview' ? ' show-preview' : ''}`}>
      <form
        id="waForm"
        className="mk-form"
        noValidate
        onSubmit={(e: FormEvent) => e.preventDefault()}
      >
        <fieldset className="mk-sec">
          <legend>Your business</legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="wa_n">Business name</label>
              <input
                type="text"
                id="wa_n"
                autoComplete="organization"
                maxLength={60}
                value={data.n}
                onChange={(e) => updateField('n', e.target.value.slice(0, 60))}
              />
            </div>
            <div className="field">
              <label htmlFor="wa_num">WhatsApp number</label>
              <input
                type="tel"
                id="wa_num"
                autoComplete="tel"
                placeholder="98765 43210"
                maxLength={20}
                value={data.num}
                onChange={(e) => updateField('num', e.target.value.slice(0, 20))}
              />
            </div>
            <div className="field full">
              <label htmlFor="wa_msg">
                Message customers start with <span className="opt">(optional)</span>
              </label>
              <input
                type="text"
                id="wa_msg"
                maxLength={160}
                value={data.msg}
                onChange={(e) => updateField('msg', e.target.value.slice(0, 160))}
              />
            </div>
            <div className="field full">
              <label htmlFor="wa_tag">Line on the poster</label>
              <input
                type="text"
                id="wa_tag"
                maxLength={60}
                value={data.tag}
                onChange={(e) => updateField('tag', e.target.value.slice(0, 60))}
              />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Ten-digit Indian numbers get +91 added. For other countries, include the country code.
          </p>
        </fieldset>

        <fieldset className="mk-sec">
          <legend>Design</legend>
          <ThemePicker
            name="wa_th"
            selected={data.th}
            onChange={(val) => updateField('th', val)}
          />
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

        <div id="waPreview" className="mk-preview">
          <WhatsAppPosterCard d={data} />
        </div>

        <div className="mk-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busyAction !== null}
            onClick={() => handleDownload(false)}
          >
            {busyAction === 'poster' ? 'Preparing…' : 'Download poster'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busyAction !== null}
            onClick={() => handleDownload(true)}
          >
            {busyAction === 'qr' ? 'Preparing…' : 'Download QR only'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            Copy WhatsApp link
          </button>
        </div>

        <div id="waMsg" aria-live="polite" style={{ marginTop: 14 }}>
          {msg?.type === 'error' && (
            <div className="alert alert-error" tabIndex={-1} ref={errRef}>
              <strong>{msg.text}</strong>
            </div>
          )}
          {msg?.type === 'downloaded' && (
            <div className="alert alert-ok">
              <strong>Downloaded.</strong> Print it on A5 or A4 and place it where customers wait or
              pay.
            </div>
          )}
          {msg?.type === 'copy' && (
            <div className="alert alert-ok">
              <strong>{msg.copied ? 'Link copied.' : 'Here’s your link.'}</strong> Add it to your
              Instagram bio, Google Business Profile or website.
              <label className="sr-only" htmlFor="waLinkOut">
                WhatsApp link
              </label>
              <input
                ref={linkInputRef}
                type="text"
                id="waLinkOut"
                readOnly
                value={msg.link}
                style={{ marginTop: 10, width: '100%' }}
              />
              <p style={{ marginTop: 8 }}>
                <a className="tlink" href={msg.link} target="_blank" rel="noopener">
                  Test it
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

