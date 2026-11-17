import { MK_THEMES } from '@/content';
import { slugify } from '@/lib/format';
import { urlDecodeObj, urlEncodeObj, waNumber } from './shared';

export interface InviteData {
  v: 1;
  t: string;
  host: string;
  d: string;
  s: string;
  e: string;
  vn: string;
  ad: string;
  mp: string;
  on: string;
  ds: string;
  wa: string;
  rb: string;
  th: string;
}

export const IV_EMPTY: InviteData = {
  v: 1,
  t: '',
  host: '',
  d: '',
  s: '',
  e: '',
  vn: '',
  ad: '',
  mp: '',
  on: '',
  ds: '',
  wa: '',
  rb: '',
  th: 'berry',
};

export function normalizeInvite(raw: unknown): InviteData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<InviteData>;
  if (r.v !== 1) return null;
  return {
    v: 1,
    t: String(r.t || '').slice(0, 80),
    host: String(r.host || '').slice(0, 60),
    d: String(r.d || ''),
    s: String(r.s || ''),
    e: String(r.e || ''),
    vn: String(r.vn || '').slice(0, 80),
    ad: String(r.ad || '').slice(0, 140),
    mp: String(r.mp || '').slice(0, 300),
    on: String(r.on || '').slice(0, 300),
    ds: String(r.ds || '').slice(0, 300),
    wa: String(r.wa || '').slice(0, 20),
    rb: String(r.rb || ''),
    th: r.th && MK_THEMES[r.th] ? r.th : 'berry',
  };
}

export function encodeInvite(d: InviteData): string {
  return urlEncodeObj(d);
}

export function decodeInvite(code: string): InviteData | null {
  return normalizeInvite(urlDecodeObj<unknown>(code));
}

export function validateInvite(d: InviteData): string[] {
  const m: string[] = [];
  if (!d.t.trim()) m.push('an event name');
  if (!d.host.trim()) m.push('the host’s name');
  if (!d.d.trim()) m.push('a date');
  if (!d.s.trim()) m.push('a start time');
  if (!waNumber(d.wa)) m.push('a WhatsApp number with 10 digits, or with your country code');
  return m;
}

export function fmtLongDate(ymd: string | null | undefined): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return '';
  try {
    return new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return ymd || '';
  }
}

export function fmtTime(hm: string | null | undefined): string {
  if (!/^\d{2}:\d{2}$/.test(hm || '')) return '';
  const parts = String(hm).split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? ' am' : ' pm'}`;
}

export function ivTimes(d: InviteData): { start: Date; end: Date; s: string; e: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.d) || !/^\d{2}:\d{2}$/.test(d.s)) return null;
  const start = new Date(`${d.d}T${d.s}:00+05:30`);
  let end = /^\d{2}:\d{2}$/.test(d.e)
    ? new Date(`${d.d}T${d.e}:00+05:30`)
    : new Date(start.getTime() + 2 * 3600e3);
  if (end <= start) end = new Date(end.getTime() + 864e5);
  const z = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return { start, end, s: z(start), e: z(end) };
}

export function ivGcal(d: InviteData): string {
  const t = ivTimes(d);
  if (!t) return '';
  const loc = [d.vn, d.ad].filter(Boolean).join(', ') || d.on;
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent(d.t) +
    `&dates=${t.s}/${t.e}` +
    `&details=${encodeURIComponent((d.ds || '') + (d.on ? `\n${d.on}` : ''))}` +
    `&location=${encodeURIComponent(loc)}`
  );
}

export function ivIcs(d: InviteData): string {
  const t = ivTimes(d);
  if (!t) return '';
  const escI = (s: string) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Collabify//Invite//EN',
    'BEGIN:VEVENT',
    `UID:${t.s}-${slugify(d.t)}@collabify`,
    `DTSTAMP:${t.s}`,
    `DTSTART:${t.s}`,
    `DTEND:${t.e}`,
    `SUMMARY:${escI(d.t)}`,
    `DESCRIPTION:${escI(d.ds)}`,
    `LOCATION:${escI([d.vn, d.ad].filter(Boolean).join(', ') || d.on)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

