import type { ReactNode } from 'react';
import { Breadcrumbs, type CrumbItem } from './Breadcrumbs';
import { PlaceholderText } from './PlaceholderText';

interface PageHeroProps {
  crumbs?: CrumbItem[];
  h1: string;
  lede?: string;
  buttons?: ReactNode;
  extra?: ReactNode;
}

export function PageHero({ crumbs, h1, lede, buttons, extra }: PageHeroProps) {
  return (
    <section className="pagehero">
      <div className="wrap">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        <h1>
          <PlaceholderText text={h1} />
        </h1>
        {lede && (
          <p className="lede">
            <PlaceholderText text={lede} />
          </p>
        )}
        {buttons && <div className="btn-row">{buttons}</div>}
        {extra}
      </div>
    </section>
  );
}

