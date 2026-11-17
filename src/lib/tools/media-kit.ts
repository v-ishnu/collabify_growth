import { MK_EMPTY, MK_THEMES } from '@/content';
import { initials } from '@/lib/format';
import {
  type MediaKitData,
  fmtCount,
  fmtINR,
  mkLinks,
  mkTotal,
} from '@/features/tools/MediaKitCard';
import {
  loadLogoMarkImage,
  resolveCanvasFonts,
  urlDecodeObj,
  urlEncodeObj,
  wrapCanvasText,
} from './shared';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cloneEmptyMediaKit(): MediaKitData {
  return JSON.parse(JSON.stringify(MK_EMPTY)) as MediaKitData;
}

export function normalizeMediaKit(raw: unknown): MediaKitData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<MediaKitData>;
  if (r.v !== 1) return null;
  const empty = cloneEmptyMediaKit();
  return {
    ...empty,
    ...r,
    v: 1,
    n: String(r.n || '').slice(0, 60),
    h: String(r.h || '').slice(0, 40),
    ni: String(r.ni || '').slice(0, 40),
    c: String(r.c || '').slice(0, 40),
    b: String(r.b || '').slice(0, 160),
    th: r.th && MK_THEMES[r.th] ? r.th : 'sunset',
    p: Array.isArray(r.p)
      ? r.p.slice(0, 6).map((row) => [
          String(row?.[0] || '').slice(0, 20),
          String(row?.[1] || '').slice(0, 20),
          String(row?.[2] || '').slice(0, 20),
          String(row?.[3] || '').slice(0, 20),
        ])
      : empty.p,
    a: {
      ci: String(r.a?.ci || '').slice(0, 80),
      ag: String(r.a?.ag || ''),
      g: String(r.a?.g || '').slice(0, 60),
    },
    r: Array.isArray(r.r)
      ? r.r.slice(0, 8).map((row) => [
          String(row?.[0] || '').slice(0, 60),
          String(row?.[1] || '').slice(0, 60),
        ])
      : empty.r,
    ro: Boolean(r.ro),
    br: String(r.br || '').slice(0, 140),
    e: String(r.e || '').slice(0, 80),
    ph: String(r.ph || '').slice(0, 20),
    l: String(r.l || '').slice(0, 400),
  };
}

export function encodeMediaKit(d: MediaKitData): string {
  return urlEncodeObj(d);
}

export function decodeMediaKit(code: string): MediaKitData | null {
  return normalizeMediaKit(urlDecodeObj<unknown>(code));
}

export function validateMediaKit(d: MediaKitData): string[] {
  const miss: string[] = [];
  if (!d.n.trim()) miss.push('your name');
  if (!d.h.trim()) miss.push('your handle');
  if (!d.p.some((p) => p[0] && p[1])) miss.push('at least one platform with followers');
  if (!EMAIL_RE.test(d.e.trim())) miss.push('an email for brand enquiries');
  return miss;
}

function drawMediaKitPass(
  ctx: CanvasRenderingContext2D,
  d: MediaKitData,
  W: number,
  draw: boolean,
  markImg: HTMLImageElement | null,
  fonts: { display: string; body: string }
): number {
  const th = MK_THEMES[d.th] || MK_THEMES.sunset || ['Sunset', '#FF9D3E', '#DA5773'];
  const P = 72;
  const inner = W - P * 2;
  const F = (w: number, s: number, fam?: 'b') =>
    `${w} ${s}px ${fam === 'b' ? fonts.body : fonts.display}`;
  const ink = '#13201F';
  const muted = '#55666A';
  const soft = '#F2F5F4';
  const name = d.n || 'Your name';
  const handle = d.h ? (d.h.charAt(0) === '@' ? d.h : `@${d.h}`) : '@yourhandle';
  let y = 0;

  const HB = 380;
  if (draw) {
    const g = ctx.createLinearGradient(0, 0, W, HB);
    g.addColorStop(0, th[1]);
    g.addColorStop(1, th[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HB);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(P + 90, 190, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = th[1];
    ctx.font = F(800, 72);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(name), P + 90, 194);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
  }

  ctx.font = F(800, 68);
  const nameLines = wrapCanvasText(ctx, name, inner - 220).slice(0, 2);
  let ty = nameLines.length > 1 ? 150 : 175;
  nameLines.forEach((l) => {
    if (draw) ctx.fillText(l, P + 220, ty);
    ty += 72;
  });

  ctx.font = F(600, 34, 'b');
  if (draw) {
    ctx.globalAlpha = 0.92;
    ctx.fillText(handle, P + 220, ty - 10);
  }
  const sub = [d.ni, d.c].filter(Boolean).join(', ');
  if (sub) {
    ctx.font = F(500, 30, 'b');
    if (draw) ctx.fillText(sub, P + 220, ty + 34);
  }
  if (draw) ctx.globalAlpha = 1;
  y = HB + 70;

  if (d.b) {
    ctx.font = F(500, 36, 'b');
    ctx.fillStyle = ink;
    wrapCanvasText(ctx, d.b, inner)
      .slice(0, 5)
      .forEach((l) => {
        if (draw) ctx.fillText(l, P, y);
        y += 52;
      });
    y += 30;
  }

  const total = mkTotal(d);
  if (total) {
    ctx.font = F(800, 120);
    ctx.fillStyle = th[1];
    const totalStr = fmtCount(total);
    if (draw) ctx.fillText(totalStr, P, y + 90);
    const tw = ctx.measureText(totalStr).width;
    ctx.font = F(600, 32, 'b');
    ctx.fillStyle = muted;
    if (draw) ctx.fillText('Combined followers', P + tw + 28, y + 86);
    y += 150;
  }

  const plats = d.p.filter((p) => p[0] && p[1]);
  plats.forEach((p) => {
    const h = 112;
    if (draw) {
      ctx.fillStyle = soft;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(P, y, inner, h, 22);
      else ctx.rect(P, y, inner, h);
      ctx.fill();
    }
    ctx.fillStyle = ink;
    ctx.font = F(700, 36);
    if (draw) ctx.fillText(p[0], P + 32, y + 68);
    const cols: Array<[string, string]> = [];
    cols.push([fmtCount(p[1]), 'followers']);
    if (p[2]) cols.push([fmtCount(p[2]), 'avg views']);
    if (p[3]) cols.push([`${String(p[3]).replace(/[^\d.]/g, '')}%`, 'engagement']);

    let cx = W - P - 32;
    cols.reverse().forEach((c) => {
      ctx.font = F(500, 24, 'b');
      const lw = ctx.measureText(c[1]).width;
      ctx.font = F(800, 40);
      const vw = ctx.measureText(c[0]).width;
      const cw = Math.max(lw, vw);
      if (draw) {
        ctx.textAlign = 'right';
        ctx.fillStyle = ink;
        ctx.fillText(c[0], cx, y + 58);
        ctx.font = F(500, 24, 'b');
        ctx.fillStyle = muted;
        ctx.fillText(c[1], cx, y + 90);
        ctx.textAlign = 'left';
      }
      cx -= cw + 44;
    });
    y += h + 18;
  });

  const section = (t: string) => {
    y += 40;
    ctx.font = F(700, 40);
    ctx.fillStyle = ink;
    if (draw) ctx.fillText(t, P, y);
    y += 22;
    if (draw) {
      ctx.fillStyle = th[1];
      ctx.fillRect(P, y, 64, 6);
    }
    y += 50;
  };

  const aud = [
    ['Top cities', d.a.ci],
    ['Main age group', d.a.ag],
    ['Audience split', d.a.g],
  ].filter((x): x is [string, string] => Boolean(x[1]));

  if (aud.length) {
    section('Audience');
    aud.forEach((x) => {
      ctx.font = F(600, 28, 'b');
      ctx.fillStyle = muted;
      if (draw) ctx.fillText(x[0], P, y);
      ctx.font = F(600, 32, 'b');
      ctx.fillStyle = ink;
      const ls = wrapCanvasText(ctx, x[1], inner - 300).slice(0, 2);
      ls.forEach((l, k) => {
        if (draw) ctx.fillText(l, P + 300, y + k * 44);
      });
      y += 44 * ls.length + 18;
    });
  }

  const rates = d.r.filter((r) => r[0] && (d.ro || r[1]));
  if (rates.length) {
    section('Rate card');
    rates.forEach((r) => {
      ctx.font = F(600, 32, 'b');
      ctx.fillStyle = ink;
      const firstLine = wrapCanvasText(ctx, r[0], inner - 300)[0] || '';
      if (draw) ctx.fillText(firstLine, P, y);
      ctx.font = F(800, 36);
      if (draw) {
        ctx.textAlign = 'right';
        ctx.fillText(d.ro ? 'On request' : fmtINR(r[1]), W - P, y);
        ctx.textAlign = 'left';
      }
      y += 22;
      if (draw) {
        ctx.fillStyle = '#E3EAE8';
        ctx.fillRect(P, y, inner, 2);
      }
      y += 46;
    });
  }

  if (d.br) {
    section('Brands I’ve worked with');
    ctx.font = F(500, 32, 'b');
    ctx.fillStyle = ink;
    wrapCanvasText(ctx, d.br, inner)
      .slice(0, 4)
      .forEach((l) => {
        if (draw) ctx.fillText(l, P, y);
        y += 46;
      });
  }

  const links = mkLinks(d);
  if (d.e || d.ph || links.length) {
    section('Contact');
    ctx.font = F(600, 32, 'b');
    ctx.fillStyle = ink;
    [d.e, d.ph, ...links.map((u) => u.replace(/^https?:\/\/(www\.)?/, ''))]
      .filter(Boolean)
      .forEach((t) => {
        if (draw) ctx.fillText(t.length > 52 ? `${t.slice(0, 50)}…` : t, P, y);
        y += 46;
      });
  }

  y += 40;
  if (draw) {
    ctx.fillStyle = '#E3EAE8';
    ctx.fillRect(P, y, inner, 2);
  }
  y += 64;
  if (draw) {
    if (markImg) ctx.drawImage(markImg, P, y - 40, 52, (52 * markImg.height) / markImg.width);
    ctx.font = F(600, 28, 'b');
    ctx.fillStyle = muted;
    ctx.fillText('Made free with Collabify', P + 70, y - 4);
  }
  return y + 56;
}

export async function renderMediaKitPng(d: MediaKitData): Promise<Blob> {
  const [fonts, markImg] = await Promise.all([resolveCanvasFonts(), loadLogoMarkImage()]);
  const W = 1080;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('canvas-unavailable');
  const H = Math.max(1350, Math.ceil(drawMediaKitPass(probe, d, W, false, null, fonts)));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  drawMediaKitPass(ctx, d, W, true, markImg, fonts);
  return new Promise<Blob>((resolve, reject) => {
    cv.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('png-export-failed'));
    }, 'image/png');
  });
}

