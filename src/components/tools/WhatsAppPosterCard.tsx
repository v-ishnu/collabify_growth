import type { CSSProperties } from 'react';
import { LOGO, MK_THEMES } from '@/content';
import { waNumber } from '@/lib/tools/shared';
import {
  type WhatsAppQrData,
  buildQrMatrix,
  formatWaDisplayNumber,
  qrSvgPath,
  waLink,
} from '@/lib/tools/whatsapp';

export function WhatsAppPosterCard({ d }: { d: WhatsAppQrData }) {
  const th = MK_THEMES[d.th] || MK_THEMES.ocean || ['Ocean', '#35AFA0', '#41448F'];
  const link = waLink(d);
  const matrix = buildQrMatrix(link);
  const num = waNumber(d.num);
  const style = { '--mk1': th[1], '--mk2': th[2] } as CSSProperties;

  return (
    <article className="mk-card wa-poster" style={style}>
      <header className="wa-head">
        <p className="iv-title">{d.n || 'Your business name'}</p>
      </header>
      <div className="wa-qr">
        {matrix ? (
          <svg
            className="qr"
            viewBox={`0 0 ${matrix.n + 8} ${matrix.n + 8}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label="QR code that opens a WhatsApp chat"
          >
            <rect width="100%" height="100%" fill="#FFFFFF" />
            <path d={qrSvgPath(matrix)} fill="#13201F" />
          </svg>
        ) : (
          <div className="qr-empty">
            {link ? 'Loading QR…' : 'Add your WhatsApp number to see your QR code'}
          </div>
        )}
      </div>
      <p className="wa-tag">{d.tag || 'Scan to chat with us on WhatsApp'}</p>
      {num && <p className="wa-num">{formatWaDisplayNumber(num)}</p>}
      <footer className="mk-foot">
        <img src={LOGO.mark} alt="" />
        QR made free with Collabify
      </footer>
    </article>
  );
}

