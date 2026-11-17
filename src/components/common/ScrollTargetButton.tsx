'use client';

import type { ReactNode } from 'react';

interface ScrollTargetButtonProps {
  targetId: string;
  label?: string;
  children?: ReactNode;
  className?: string;
  focusTarget?: boolean;
  focusFirst?: boolean;
}

export function ScrollTargetButton({
  targetId,
  label,
  children,
  className,
  focusTarget = false,
  focusFirst = false,
}: ScrollTargetButtonProps) {
  const handleClick = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusTarget || focusFirst) {
      el.focus({ preventScroll: true });
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {label ?? children}
    </button>
  );
}
