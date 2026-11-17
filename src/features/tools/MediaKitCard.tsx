import type { CSSProperties } from 'react';
import { LOGO, MK_THEMES } from '@/content';
import { initials, safeUrl } from '@/lib/format';

export interface MediaKitData {
  v: 1;
  n: string;
  h: string;
  ni: string;
  c: string;
  b: string;
  th: string;
  p: Array<[string, string, string, string]>;
  a: { ci: string; ag: string; g: string };
  r: Array<[string, string]>;
  ro: boolean;
  br: string;
  e: string;
  ph: string;
  l: string;
}

export function fmtCount(v: string | number): string {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  if (!n) return '';
  if (n >= 1e7) return `${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '')} Cr`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

export function fmtINR(v: string | number): string {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return n ? `₹${n.toLocaleString('en-IN')}` : '';
}

export function mkTotal(d: MediaKitData): number {
  return (d.p || []).reduce((s, p) => s + (Number(String(p[1]).replace(/[^\d.]/g, '')) || 0), 0);
}

export function mkLinks(d: MediaKitData): string[] {
  return String(d.l || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
    .filter(safeUrl);
}

export function MediaKitCard({ d, live = false }: { d: MediaKitData; live?: boolean }) {
  const th = MK_THEMES[d.th] || MK_THEMES.sunset || ['Sunset', '#FF9D3E', '#DA5773'];
  const total = mkTotal(d);
  const name = d.n || 'Your name';
  const handle = d.h ? (d.h.charAt(0) === '@' ? d.h : `@${d.h}`) : '@yourhandle';
  const plats = (d.p || []).filter((p) => p[0] && p[1]);
  const rates = (d.r || []).filter((r) => r[0] && (d.ro || r[1]));
  const links = mkLinks(d);
  const sub = [d.ni, d.c].filter(Boolean).join(', ');
  const aud = [
    ['Top cities', d.a?.ci || ''],
    ['Main age group', d.a?.ag || ''],
    ['Audience split', d.a?.g || ''],
  ].filter((x): x is [string, string] => Boolean(x[1]));

  const style = { '--mk1': th[1], '--mk2': th[2] } as CSSProperties;

  return (
    <article className="mk-card" style={style}>
      <header className="mk-head">
        <div className="mk-av" aria-hidden="true">
          {initials(name)}
        </div>
        <div>
          <p className="mk-name">{name}</p>
          <p className="mk-handle">{handle}</p>
          {sub && <p className="mk-sub">{sub}</p>}
        </div>
      </header>
      <div className="mk-body">
        {d.b && <p className="mk-bio">{d.b}</p>}
        {total > 0 && (
          <div className="mk-total">
            <b>{fmtCount(total)}</b>
            <span>Combined followers</span>
          </div>
        )}
        {plats.length > 0 && (
          <div className="mk-plats">
            {plats.map((p, idx) => (
              <div className="mk-plat" key={`${p[0]}-${idx}`}>
                <strong>{p[0]}</strong>
                <span>
                  <b>{fmtCount(p[1])}</b> followers
                </span>
                {p[2] && (
                  <span>
                    <b>{fmtCount(p[2])}</b> avg views
                  </span>
                )}
                {p[3] && (
                  <span>
                    <b>{String(p[3]).replace(/[^\d.]/g, '')}%</b> engagement
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {aud.length > 0 && (
          <>
            <h3 className="mk-h">Audience</h3>
            <dl className="mk-aud">
              {aud.map(([k, val]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {rates.length > 0 && (
          <>
            <h3 className="mk-h">Rate card</h3>
            <ul className="mk-rates">
              {rates.map((r, idx) => (
                <li key={`${r[0]}-${idx}`}>
                  <span>{r[0]}</span>
                  <b>{d.ro ? 'On request' : fmtINR(r[1])}</b>
                </li>
              ))}
            </ul>
          </>
        )}
        {d.br && (
          <>
            <h3 className="mk-h">Brands I’ve worked with</h3>
            <p className="mk-brands">{d.br}</p>
          </>
        )}
        {(d.e || d.ph || links.length > 0) && (
          <>
            <h3 className="mk-h">Contact</h3>
            <p className="mk-contact">
              {d.e && (
                <>
                  {live ? <a href={`mailto:${d.e}`}>{d.e}</a> : d.e}
                  <br />
                </>
              )}
              {d.ph && (
                <>
                  {d.ph}
                  <br />
                </>
              )}
              {links.map((u, idx) => (
                <span key={u}>
                  {idx > 0 && <br />}
                  {live ? (
                    <a href={u} target="_blank" rel="noopener nofollow noreferrer">
                      {u.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  ) : (
                    u.replace(/^https?:\/\/(www\.)?/, '')
                  )}
                </span>
              ))}
            </p>
          </>
        )}
      </div>
      <footer className="mk-foot">
        <img src={LOGO.mark} alt="" />
        Made free with Collabify
      </footer>
    </article>
  );
}

