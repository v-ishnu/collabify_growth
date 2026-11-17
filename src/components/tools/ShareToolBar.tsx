'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/config/site';
import { copyToClipboard, waShareUrl } from '@/lib/tools/shared';

interface ShareToolBarProps {
  path: string;
  line: string;
}

export function ShareToolBar({ path, line }: ShareToolBarProps) {
  const [origin, setOrigin] = useState(siteConfig.url);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const url = `${origin}${path}`;

  async function handleCopy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } else if (typeof window !== 'undefined') {
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <div className="share-bar">
      <p>
        <strong>Know someone who needs this?</strong>{' '}
        <span className="muted">Share it. It’s free for them too.</span>
      </p>
      <div className="btn-row">
        <a
          className="btn btn-secondary btn-sm"
          href={waShareUrl(`${line} ${url}`)}
          target="_blank"
          rel="noopener"
        >
          Share on WhatsApp
        </a>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
