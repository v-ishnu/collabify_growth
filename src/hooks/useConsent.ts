'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ConsentState {
  decided: boolean;
  analytics: boolean;
}

const STORAGE_KEY = 'cg-consent';
const EVENT_NAME = 'cg-consent-change';

function readConsent(): ConsentState {
  if (typeof window === 'undefined') return { decided: false, analytics: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { decided: false, analytics: false };
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return { decided: true, analytics: Boolean(parsed?.analytics) };
  } catch {
    return { decided: false, analytics: false };
  }
}

export function useConsent() {
  const [consent, setConsentState] = useState<ConsentState>({ decided: true, analytics: false });
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const current = readConsent();
    setConsentState(current);
    setBannerOpen(!current.decided);

    const onSync = () => {
      const updated = readConsent();
      setConsentState(updated);
      setBannerOpen(!updated.decided);
    };
    const onOpenRequest = () => setBannerOpen(true);

    window.addEventListener(EVENT_NAME, onSync);
    window.addEventListener('cg-open-cookie-banner', onOpenRequest);
    return () => {
      window.removeEventListener(EVENT_NAME, onSync);
      window.removeEventListener('cg-open-cookie-banner', onOpenRequest);
    };
  }, []);

  const saveConsent = useCallback((analytics: boolean) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ analytics, ts: Date.now() }),
      );
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      // Ignore storage quota errors.
    }
    setConsentState({ decided: true, analytics });
    setBannerOpen(false);
  }, []);

  const resetConsent = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      // Ignore storage quota errors.
    }
    setConsentState({ decided: false, analytics: false });
    setBannerOpen(true);
  }, []);

  const openBanner = useCallback(() => {
    window.dispatchEvent(new Event('cg-open-cookie-banner'));
  }, []);

  return { consent, bannerOpen, saveConsent, resetConsent, openBanner };
}

