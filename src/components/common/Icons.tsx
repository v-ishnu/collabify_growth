import type { CSSProperties } from 'react';
import { CAP_ICON_COLOR, CAP_ICON_PATHS, LOGO, TOOL_ICONS } from '@/content';
import type { CapId } from '@/types/domain';

export function LogoSvg() {
  return (
    <svg viewBox={`0 0 ${LOGO.vw} ${LOGO.vh}`} focusable="false" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={LOGO.path} />
      <image href={LOGO.mark} x={LOGO.mx} y={LOGO.my} width={LOGO.mw} height={LOGO.mh} />
    </svg>
  );
}

export function ChevIcon() {
  return (
    <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function SepIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function PlusMinusIcon() {
  return (
    <span className="pm" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.5 7.3l3 3L11.5 4" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="9.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 22c1.2-4.2 4.5-6.5 8.5-6.5s7.3 2.3 8.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
    </svg>
  );
}

export function PrevIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M10 3L5 8l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M6 3l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CapIcon({ id }: { id: CapId }) {
  const style = { '--c': CAP_ICON_COLOR[id] } as CSSProperties;
  return (
    <span className="capico" style={style} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: CAP_ICON_PATHS[id] }}
      />
    </span>
  );
}

export function ToolIcon({ k, color }: { k: string; color: string }) {
  const style = { '--c': color } as CSSProperties;
  return (
    <span className="capico" style={style} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: TOOL_ICONS[k] || '' }}
      />
    </span>
  );
}

