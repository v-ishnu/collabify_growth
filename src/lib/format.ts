export function listJoin(arr: string[]): string {
  if (arr.length < 2) return arr[0] ?? '';
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

export interface StartProjectPrefill {
  caps?: string[];
  programme?: string;
  note?: string;
  partnerType?: string;
}

export function buildStartProjectUrl(prefill?: StartProjectPrefill): string {
  if (!prefill) return '/start-a-project';
  const params = new URLSearchParams();
  if (prefill.caps && prefill.caps.length > 0) {
    params.set('caps', prefill.caps.join(','));
  }
  if (prefill.programme) {
    params.set('programme', prefill.programme);
  }
  if (prefill.note) {
    params.set('note', prefill.note);
  }
  if (prefill.partnerType) {
    params.set('partnerType', prefill.partnerType);
  }
  const q = params.toString();
  return q ? `/start-a-project?${q}` : '/start-a-project';
}

export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/, '');
}

export function initials(name: string): string {
  return (
    String(name || '')
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'M'
  );
}

export function safeUrl(u: string | null | undefined): boolean {
  return /^https?:\/\/[^\s"'<>]+$/i.test(String(u || ''));
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function fmtChatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    return d.toDateString() === now.toDateString()
      ? t
      : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${t}`;
  } catch {
    return '';
  }
}
