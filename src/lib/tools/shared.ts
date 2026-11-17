import { LOGO } from '@/content';

export function urlEncodeObj<T>(data: T): string {
  const json = JSON.stringify(data);
  if (typeof window === 'undefined') {
    return Buffer.from(json, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function urlDecodeObj<T>(str: string): T | null {
  try {
    if (!str) return null;
    if (typeof window === 'undefined') {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '==='.slice((b64.length + 3) % 4);
      const text = Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(text) as T;
    }
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export function digitsOnly(s: string | null | undefined): string {
  return String(s || '').replace(/\D/g, '');
}

export function waNumber(s: string | null | undefined): string {
  let d = digitsOnly(s);
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 && d.length <= 15 ? d : '';
}

export function waShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback handled by caller
  }
  return false;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function resolveCanvasFonts(): Promise<{ display: string; body: string }> {
  const fallbackDisplay = '"Bricolage Grotesque", system-ui, sans-serif';
  const fallbackBody = '"Instrument Sans", system-ui, sans-serif';
  if (typeof document === 'undefined') {
    return { display: fallbackDisplay, body: fallbackBody };
  }

  let display = fallbackDisplay;
  let body = fallbackBody;
  try {
    const h = document.querySelector('h1');
    const dFam = h ? getComputedStyle(h).fontFamily : '';
    const bFam = getComputedStyle(document.body).fontFamily;
    if (dFam) display = dFam;
    if (bFam) body = bFam;

    const firstDisplay = (display.split(',')[0] || '"Bricolage Grotesque"').trim();
    const firstBody = (body.split(',')[0] || '"Instrument Sans"').trim();
    await Promise.allSettled([
      document.fonts.load(`800 68px ${firstDisplay}`),
      document.fonts.load(`700 40px ${firstDisplay}`),
      document.fonts.load(`600 32px ${firstBody}`),
      document.fonts.load(`500 32px ${firstBody}`),
      document.fonts.ready,
    ]);
  } catch {
    // non-fatal; browser uses computed or fallback fonts
  }
  return { display, body };
}

export function loadLogoMarkImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = LOGO.mark;
  });
}

