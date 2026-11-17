'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAPS, PROGRAMMES } from '@/content';
import { siteConfig } from '@/config/site';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { useConsent } from '@/hooks/useConsent';
import { LogoSvg } from '@/components/common/Icons';
import { PlaceholderText } from '@/components/common/PlaceholderText';

export function SiteFooter({ canViewAdmin = false }: { canViewAdmin?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { openBanner } = useConsent();
  const [adminVisible, setAdminVisible] = useState(canViewAdmin);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.canViewAdmin === 'boolean') {
          setAdminVisible(data.canViewAdmin);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-grid" id="footGrid">
          <div className="foot-brand">
            <Link className="logo" href="/" aria-label="Collabify Growth home">
              <span className="logo-art" aria-hidden="true">
                <LogoSvg />
              </span>
            </Link>
            <p>An integrated growth, technology, media and events company for founders and businesses.</p>
            <p className="foot-tag">Build. Distribute. Experience.</p>
          </div>

          <div>
            <h2>Capabilities</h2>
            <ul>
              {CAPS.map((c) => (
                <li key={c.id}>
                  <Link href={`/capabilities/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2>Solutions</h2>
            <ul>
              {PROGRAMMES.map((p) => (
                <li key={p.slug}>
                  <Link href={`/solutions/${p.slug}`}>{p.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/solutions/custom">Custom Solutions</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Company</h2>
            <ul>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/community">Community</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <Link href="/services">All services</Link>
              </li>
              <li>
                <Link href="/how-we-work">How We Work</Link>
              </li>
              <li>
                <Link href="/who-we-serve">Who We Serve</Link>
              </li>
              <li>
                <Link href="/partners">Partner With Us</Link>
              </li>
              <li>
                <Link href="/start-a-project">Start a Project</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Grow with us</h2>
            <ul>
              <li>
                <Link href="/tools">Free tools</Link>
              </li>
              <li>
                <Link href="/tools/media-kit">Media kit maker</Link>
              </li>
              <li>
                <Link href="/tools/invite">Event invite maker</Link>
              </li>
              <li>
                <Link href="/tools/whatsapp">WhatsApp QR maker</Link>
              </li>
              <li>
                <Link href="/affiliates">Affiliate program</Link>
              </li>
              <li>
                <Link href="/white-label">White-label</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Contact</h2>
            <ul>
              <li>
                <PlaceholderText text={siteConfig.contact.email} />
              </li>
              <li>
                <PlaceholderText text={siteConfig.contact.phone} />
              </li>
              <li>
                <PlaceholderText text={`${siteConfig.contact.city}, India`} />
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-bottom">
          <div>
            © 2026 <PlaceholderText text={siteConfig.legalEntityName} />. All rights reserved.
          </div>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
            <button className="linkish" type="button" onClick={openBanner}>
              Cookie settings
            </button>
            <Link href="/admin" id="inboxLink" hidden={!adminVisible}>
              Enquiry inbox
            </Link>
            <label className="theme-pick">
              Theme{' '}
              <select
                id="themeSelect"
                aria-label="Colour theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemePreference)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </nav>
        </div>
      </div>
    </footer>
  );
}
