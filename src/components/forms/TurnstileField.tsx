'use client';

import { useEffect, useRef } from 'react';
import { publicEnv } from '@/config/env';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface TurnstileFieldProps {
  onToken: (token: string) => void;
}

export function TurnstileField({ onToken }: TurnstileFieldProps) {
  const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    const mount = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };

    if (window.turnstile) {
      mount();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile"]',
    );
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = mount;
      document.head.appendChild(s);
    } else {
      existing.addEventListener('load', mount);
      return () => existing.removeEventListener('load', mount);
    }
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return <div className="field full" ref={containerRef} style={{ marginTop: 4 }} />;
}

