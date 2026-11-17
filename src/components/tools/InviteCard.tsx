'use client';

import { type CSSProperties, type MouseEvent, useRef, useState } from 'react';
import { LOGO, MK_THEMES } from '@/content';
import { safeUrl, slugify } from '@/lib/format';
import { downloadBlob, waNumber } from '@/lib/tools/shared';
import {
  type InviteData,
  fmtLongDate,
  fmtTime,
  ivGcal,
  ivIcs,
} from '@/lib/tools/invite';

export function InviteCard({ d, live = false }: { d: InviteData; live?: boolean }) {
  const th = MK_THEMES[d.th] || MK_THEMES.berry || ['Berry', '#DA5773', '#41448F'];
  const dateStr = fmtLongDate(d.d);
  const timeStr = [fmtTime(d.s), fmtTime(d.e)].filter(Boolean).join(' to ');
  const mapsUrl = safeUrl(d.mp)
    ? d.mp
    : d.vn || d.ad
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [d.vn, d.ad].filter(Boolean).join(', ')
        )}`
      : '';
  const gcalUrl = ivGcal(d);

  const [guestName, setGuestName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const style = { '--mk1': th[1], '--mk2': th[2] } as CSSProperties;

  const num = waNumber(d.wa);
  const effectiveName = guestName.trim() || 'a guest';
  const when = dateStr;
  const yesHref = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(
        `Hi ${d.host}, this is ${effectiveName}. I’m coming to ${d.t} on ${when}.`
      )}`
    : '#';
  const noHref = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(
        `Hi ${d.host}, this is ${effectiveName}. Sorry, I can’t make it to ${d.t} on ${when}.`
      )}`
    : '#';

  let calMonth = 'Date';
  let calDay = '–';
  if (dateStr) {
    try {
      const dt = new Date(`${d.d}T00:00:00`);
      calMonth = dt.toLocaleDateString('en-IN', { month: 'short' });
      calDay = String(dt.getDate());
    } catch {
      calMonth = 'Date';
      calDay = '–';
    }
  }

  function handleRsvpClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!guestName.trim()) {
      e.preventDefault();
      setNameErr('Enter your name so the host knows who’s replying.');
      nameRef.current?.focus();
    }
  }

  function handleIcsDownload() {
    const ics = ivIcs(d);
    if (!ics) return;
    downloadBlob(new Blob([ics], { type: 'text/calendar' }), `${slugify(d.t) || 'event'}.ics`);
  }

  return (
    <article className="mk-card iv-card" style={style}>
      <header className="iv-head">
        <p className="iv-kick">You’re invited</p>
        <p className="iv-title">{d.t || 'Your event name'}</p>
        <p className="iv-host">Hosted by {d.host || 'you'}</p>
      </header>

      <div className="mk-body">
        <div className="iv-when">
          <div className="iv-cal" aria-hidden="true">
            <span>{calMonth}</span>
            <b>{calDay}</b>
          </div>
          <div>
            <p className="iv-date">{dateStr || 'Pick a date'}</p>
            <p className="muted">{timeStr || 'Add a start time'}</p>
          </div>
        </div>

        {(d.vn || d.ad) && (
          <div className="iv-where">
            <p>
              <strong>{d.vn || 'Venue'}</strong>
            </p>
            {d.ad && <p className="muted">{d.ad}</p>}
            {live && mapsUrl && (
              <a className="tlink" href={mapsUrl} target="_blank" rel="noopener">
                Open in Maps
              </a>
            )}
          </div>
        )}

        {d.on && (
          <div className="iv-where">
            <p>
              <strong>Online</strong>
            </p>
            {live && safeUrl(d.on) ? (
              <a className="tlink" href={d.on} target="_blank" rel="noopener">
                Join link
              </a>
            ) : (
              <p className="muted">Joining link shared on the invite</p>
            )}
          </div>
        )}

        {d.ds && <p className="iv-about">{d.ds}</p>}

        <div className="iv-rsvp">
          <p>
            <strong>Will you come?</strong>
            {d.rb && (
              <>
                {' '}
                <span className="muted">Please reply by {fmtLongDate(d.rb)}.</span>
              </>
            )}
          </p>

          {live ? (
            <>
              <label className="sr-only" htmlFor="ivName">
                Your name
              </label>
              <input
                ref={nameRef}
                type="text"
                id="ivName"
                placeholder="Your name"
                autoComplete="name"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setNameErr('');
                }}
              />
              <p className="err" id="ivNameErr">
                {nameErr}
              </p>
              <div className="btn-row">
                <a
                  className="btn btn-primary btn-sm"
                  id="ivYes"
                  href={yesHref}
                  target="_blank"
                  rel="noopener"
                  onClick={handleRsvpClick}
                >
                  I’m coming
                </a>
                <a
                  className="btn btn-secondary btn-sm"
                  id="ivNo"
                  href={noHref}
                  target="_blank"
                  rel="noopener"
                  onClick={handleRsvpClick}
                >
                  Can’t make it
                </a>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                Your reply opens WhatsApp with a message to the host.
              </p>
              {gcalUrl && (
                <div className="btn-row" style={{ marginTop: 14 }}>
                  <a className="tlink small" href={gcalUrl} target="_blank" rel="noopener">
                    Add to Google Calendar
                  </a>
                  <button type="button" className="btn-quiet small" id="ivIcs" onClick={handleIcsDownload}>
                    Apple or Outlook calendar
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="btn-row">
              <span className="btn btn-primary btn-sm" aria-hidden="true">
                I’m coming
              </span>
              <span className="btn btn-secondary btn-sm" aria-hidden="true">
                Can’t make it
              </span>
            </div>
          )}
        </div>
      </div>

      <footer className="mk-foot">
        <img src={LOGO.mark} alt="" />
        Invite made free with Collabify
      </footer>
    </article>
  );
}

