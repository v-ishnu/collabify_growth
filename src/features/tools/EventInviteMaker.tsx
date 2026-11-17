'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemePicker } from '@/components/tools/ThemePicker';
import { InviteCard } from '@/components/tools/InviteCard';
import { listJoin } from '@/lib/format';
import {
  IV_EMPTY,
  type InviteData,
  encodeInvite,
  fmtLongDate,
  normalizeInvite,
  validateInvite,
} from '@/lib/tools/invite';
import { copyToClipboard, waShareUrl } from '@/lib/tools/shared';

const STORAGE_KEY = 'cg-invite';

type MsgState =
  | { type: 'error'; text: string }
  | { type: 'wa'; href: string }
  | { type: 'link'; copied: boolean; url: string; path: string }
  | null;

export function EventInviteMaker() {
  const [data, setData] = useState<InviteData>(() => ({ ...IV_EMPTY }));
  const [hydrated, setHydrated] = useState(false);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [msg, setMsg] = useState<MsgState>(null);

  const errRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeInvite(JSON.parse(raw));
        if (parsed) setData(parsed);
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
      // ignore storage errors
    }
    if (msg?.type === 'error' && validateInvite(data).length === 0) {
      setMsg(null);
    }
  }, [data, hydrated, msg?.type]);

  function updateField<K extends keyof InviteData>(key: K, val: InviteData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  async function handleAction(kind: 'link' | 'wa') {
    const miss = validateInvite(data);
    if (miss.length > 0) {
      setMsg({ type: 'error', text: `Add ${listJoin(miss)} first.` });
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }

    const code = encodeInvite(data);
    const path = `/i/${code}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}${path}`;

    if (kind === 'wa') {
      const text = `You’re invited to ${data.t} on ${fmtLongDate(data.d)}. Details and RSVP: ${link}`;
      setMsg({ type: 'wa', href: waShareUrl(text) });
      return;
    }

    const copied = await copyToClipboard(link);
    setMsg({ type: 'link', copied, url: link, path });
    if (!copied) {
      requestAnimationFrame(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      });
    }
  }

  return (
    <div className={`mk-tool${mobileView === 'preview' ? ' show-preview' : ''}`}>
      <form
        id="ivForm"
        className="mk-form"
        noValidate
        onSubmit={(e: FormEvent) => e.preventDefault()}
      >
        <fieldset className="mk-sec">
          <legend>Event</legend>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="iv_t">Event name</label>
              <input
                type="text"
                id="iv_t"
                maxLength={80}
                placeholder="Founders’ evening, Product launch, Birthday dinner"
                value={data.t}
                onChange={(e) => updateField('t', e.target.value.slice(0, 80))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_host">Hosted by</label>
              <input
                type="text"
                id="iv_host"
                autoComplete="name"
                maxLength={60}
                value={data.host}
                onChange={(e) => updateField('host', e.target.value.slice(0, 60))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_d">Date</label>
              <input
                type="date"
                id="iv_d"
                value={data.d}
                onChange={(e) => updateField('d', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_s">Starts</label>
              <input
                type="time"
                id="iv_s"
                value={data.s}
                onChange={(e) => updateField('s', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_e">
                Ends <span className="opt">(optional)</span>
              </label>
              <input
                type="time"
                id="iv_e"
                value={data.e}
                onChange={(e) => updateField('e', e.target.value)}
              />
            </div>
            <div className="field full">
              <label htmlFor="iv_ds">
                About the event <span className="opt">(optional)</span>
              </label>
              <textarea
                id="iv_ds"
                maxLength={300}
                style={{ minHeight: 90 }}
                value={data.ds}
                onChange={(e) => updateField('ds', e.target.value.slice(0, 300))}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="mk-sec">
          <legend>Where</legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="iv_vn">
                Venue name <span className="opt">(optional)</span>
              </label>
              <input
                type="text"
                id="iv_vn"
                maxLength={80}
                value={data.vn}
                onChange={(e) => updateField('vn', e.target.value.slice(0, 80))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_ad">
                Address <span className="opt">(optional)</span>
              </label>
              <input
                type="text"
                id="iv_ad"
                autoComplete="street-address"
                maxLength={140}
                value={data.ad}
                onChange={(e) => updateField('ad', e.target.value.slice(0, 140))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_mp">
                Google Maps link <span className="opt">(optional)</span>
              </label>
              <input
                type="url"
                id="iv_mp"
                placeholder="Paste from Google Maps"
                maxLength={300}
                value={data.mp}
                onChange={(e) => updateField('mp', e.target.value.slice(0, 300))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_on">
                Online joining link <span className="opt">(optional)</span>
              </label>
              <input
                type="url"
                id="iv_on"
                placeholder="For online or hybrid events"
                maxLength={300}
                value={data.on}
                onChange={(e) => updateField('on', e.target.value.slice(0, 300))}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="mk-sec">
          <legend>RSVP</legend>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="iv_wa">Your WhatsApp number</label>
              <input
                type="tel"
                id="iv_wa"
                autoComplete="tel"
                placeholder="98765 43210"
                maxLength={20}
                value={data.wa}
                onChange={(e) => updateField('wa', e.target.value.slice(0, 20))}
              />
            </div>
            <div className="field">
              <label htmlFor="iv_rb">
                Reply by <span className="opt">(optional)</span>
              </label>
              <input
                type="date"
                id="iv_rb"
                value={data.rb}
                onChange={(e) => updateField('rb', e.target.value)}
              />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Guests’ replies arrive as WhatsApp messages to this number. Anyone with your invite
            link can see your event details.
          </p>
        </fieldset>

        <fieldset className="mk-sec">
          <legend>Design</legend>
          <ThemePicker
            name="iv_th"
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

        <div id="ivPreview" className="mk-preview">
          <InviteCard d={data} />
        </div>

        <div className="mk-actions">
          <button type="button" className="btn btn-primary" onClick={() => handleAction('link')}>
            Get invite link
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleAction('wa')}>
            Send on WhatsApp
          </button>
        </div>

        <div id="ivMsg" aria-live="polite" style={{ marginTop: 14 }}>
          {msg?.type === 'error' && (
            <div className="alert alert-error" tabIndex={-1} ref={errRef}>
              <strong>{msg.text}</strong>
            </div>
          )}
          {msg?.type === 'wa' && (
            <div className="alert alert-ok">
              <strong>Ready to send.</strong>{' '}
              <a className="tlink" href={msg.href} target="_blank" rel="noopener">
                Open WhatsApp with your invite
              </a>
            </div>
          )}
          {msg?.type === 'link' && (
            <div className="alert alert-ok">
              <strong>{msg.copied ? 'Invite link copied.' : 'Here’s your invite link.'}</strong>{' '}
              Share it in chats, groups or your bio.
              <label className="sr-only" htmlFor="ivLink">
                Your invite link
              </label>
              <input
                ref={linkInputRef}
                type="text"
                id="ivLink"
                readOnly
                value={msg.url}
                style={{ marginTop: 10, width: '100%' }}
              />
              <p style={{ marginTop: 8 }}>
                <Link className="tlink" href={msg.path}>
                  Open your invite
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

