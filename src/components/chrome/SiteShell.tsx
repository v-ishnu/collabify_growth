'use client';

import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { SiteOverlayWidgets } from './SiteOverlayWidgets';
import { AskCollabify } from '@/components/assistant/AskCollabify';

interface SiteShellProps {
  children: ReactNode;
  canViewAdmin?: boolean;
}

export function SiteShell({ children, canViewAdmin = false }: SiteShellProps) {
  const skipToMain = () => {
    const el = document.getElementById('main');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <button className="skip" type="button" onClick={skipToMain}>
        Skip to content
      </button>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter canViewAdmin={canViewAdmin} />
      <SiteOverlayWidgets />
      <AskCollabify />
    </>
  );
}
