'use client';

import { useConsent } from '@/hooks/useConsent';

export function CookiesManageButton() {
  const { openBanner } = useConsent();

  return (
    <p style={{ marginTop: 24 }}>
      <button className="btn btn-secondary" type="button" onClick={openBanner}>
        Cookie settings
      </button>
    </p>
  );
}

