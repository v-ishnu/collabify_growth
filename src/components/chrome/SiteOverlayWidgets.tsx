'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { publicEnv } from '@/config/env';
import { useShortlist } from '@/hooks/useShortlist';
import { useConsent } from '@/hooks/useConsent';

const SAFE_GA4_RE = /^G-[A-Z0-9]{4,20}$/;

export function SiteOverlayWidgets() {
  const pathname = usePathname() || '/';
  const { items } = useShortlist();
  const { consent, bannerOpen, saveConsent } = useConsent();

  const rawGaId = publicEnv.NEXT_PUBLIC_GA4_ID?.trim() || '';
  const gaId = SAFE_GA4_RE.test(rawGaId) ? rawGaId : '';

  const [showToTop, setShowToTop] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(consent.analytics);

  useEffect(() => {
    setAnalyticsChecked(consent.analytics);
  }, [consent.analytics]);

  useEffect(() => {
    const onScroll = () => setShowToTop(window.scrollY > 1200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hideShortlistPill = items.length === 0 || pathname === '/start-a-project';

  return (
    <>
      <Link
        className="shortlist-pill"
        id="slPill"
        href="/start-a-project"
        hidden={hideShortlistPill}
      >
        Your enquiry <b id="slCount">{items.length}</b>
      </Link>

      <button
        className={`totop${showToTop ? ' show' : ''}`}
        id="toTop"
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      <div
        className="cookie"
        id="cookie"
        role="region"
        aria-label="Cookie preferences"
        hidden={!bannerOpen}
      >
        <p>
          We use essential cookies to run this site. With your permission, we’d also use analytics
          cookies to understand how it’s used.
        </p>
        <div className="manage" id="cookieManage" hidden={!manageOpen}>
          <label className="check">
            <input type="checkbox" checked disabled />
            <span>
              <strong>Essential</strong>
              <br />
              <span className="muted small">Needed for the site to work. Always on.</span>
            </span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              id="ckAnalytics"
              checked={analyticsChecked}
              onChange={(e) => setAnalyticsChecked(e.target.checked)}
            />
            <span>
              <strong>Analytics</strong>
              <br />
              <span className="muted small">Helps us see which pages are useful. Off unless you turn it on.</span>
            </span>
          </label>
        </div>
        <div className="btn-row">
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={() => saveConsent(true)}
          >
            Accept all
          </button>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => saveConsent(false)}
          >
            Reject non-essential
          </button>
          <button
            className="btn-quiet"
            type="button"
            id="cookieManageBtn"
            onClick={() => {
              if (!manageOpen) {
                setManageOpen(true);
              } else {
                saveConsent(analyticsChecked);
              }
            }}
          >
            {manageOpen ? 'Save choices' : 'Manage choices'}
          </button>
        </div>
      </div>

      {gaId && consent.analytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="cg-ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}', { anonymize_ip: true });`}
          </Script>
        </>
      )}
    </>
  );
}

