import qrcode from 'qrcode-generator';
import { MK_THEMES } from '@/content';
import {
  loadLogoMarkImage,
  resolveCanvasFonts,
  waNumber,
  wrapCanvasText,
} from './shared';

export interface WhatsAppQrData {
  v: 1;
  n: string;
  num: string;
  msg: string;
  tag: string;
  th: string;
}

export const WA_EMPTY: WhatsAppQrData = {
  v: 1,
  n: '',
  num: '',
  msg: 'Hi! I found you through your QR code.',
  tag: 'Scan to chat with us on WhatsApp',
  th: 'ocean',
};

export interface QrMatrix {
  n: number;
  dark: (r: number, c: number) => boolean;
}

export function waLink(d: WhatsAppQrData): string {
  const n = waNumber(d.num);
  return n ? `https://wa.me/${n}${d.msg ? `?text=${encodeURIComponent(d.msg)}` : ''}` : '';
}

export function formatWaDisplayNumber(num: string): string {
  return num ? `+${num.replace(/^(\d{2})(\d{5})(\d{5})$/, '$1 $2 $3')}` : '';
}

export function buildQrMatrix(text: string): QrMatrix | null {
  if (!text) return null;
  try {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    return { n, dark: (r, c) => q.isDark(r, c) };
  } catch {
    return null;
  }
}

export function qrSvgPath(m: QrMatrix): string {
  let p = '';
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      if (m.dark(r, c)) p += `M${c + 4} ${r + 4}h1v1h-1z`;
    }
  }
  return p;
}

function drawQrOnCanvas(
  ctx: CanvasRenderingContext2D,
  m: QrMatrix,
  x: number,
  y: number,
  size: number,
  color = '#13201F'
): void {
  const q = 4;
  const cell = size / (m.n + q * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = color;
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      if (m.dark(r, c)) {
        ctx.fillRect(
          Math.floor(x + (c + q) * cell),
          Math.floor(y + (r + q) * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
}

export async function renderWhatsAppPosterPng(
  d: WhatsAppQrData,
  qrOnly = false
): Promise<Blob> {
  const m = buildQrMatrix(waLink(d));
  if (!m) throw new Error('no-qr');

  const [fonts, mark] = await Promise.all([
    resolveCanvasFonts(),
    qrOnly ? Promise.resolve(null) : loadLogoMarkImage(),
  ]);
  const th = MK_THEMES[d.th] || MK_THEMES.ocean || ['Ocean', '#35AFA0', '#41448F'];
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');

  if (qrOnly) {
    cv.width = 1000;
    cv.height = 1000;
    drawQrOnCanvas(ctx, m, 0, 0, 1000);
    return new Promise<Blob>((resolve, reject) => {
      cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png-export-failed'))), 'image/png');
    });
  }

  const W = 1240;
  const H = 1754;
  cv.width = W;
  cv.height = H;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, W, 420);
  g.addColorStop(0, th[1]);
  g.addColorStop(1, th[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 420);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = `800 92px ${fonts.display}`;
  const lines = wrapCanvasText(ctx, d.n || 'Your business', W - 160).slice(0, 2);
  lines.forEach((l, k) => {
    ctx.fillText(l, W / 2, (lines.length > 1 ? 190 : 250) + k * 104);
  });

  drawQrOnCanvas(ctx, m, (W - 820) / 2, 500, 820);
  ctx.strokeStyle = '#E3EAE8';
  ctx.lineWidth = 4;
  ctx.strokeRect((W - 820) / 2, 500, 820, 820);

  ctx.fillStyle = '#13201F';
  ctx.font = `700 58px ${fonts.display}`;
  wrapCanvasText(ctx, d.tag || 'Scan to chat with us on WhatsApp', W - 180)
    .slice(0, 2)
    .forEach((l, k) => {
      ctx.fillText(l, W / 2, 1420 + k * 70);
    });

  const num = waNumber(d.num);
  ctx.fillStyle = '#55666A';
  ctx.font = `600 44px ${fonts.body}`;
  if (num) ctx.fillText(formatWaDisplayNumber(num), W / 2, 1560);

  ctx.font = `600 30px ${fonts.body}`;
  ctx.fillStyle = '#7A8B8A';
  const credit = 'QR made free with Collabify';
  const cw = ctx.measureText(credit).width;
  if (mark) ctx.drawImage(mark, W / 2 - cw / 2 - 52, 1650, 40, (40 * mark.height) / mark.width);
  ctx.fillText(credit, W / 2 + 4, 1682);

  return new Promise<Blob>((resolve, reject) => {
    cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png-export-failed'))), 'image/png');
  });
}

