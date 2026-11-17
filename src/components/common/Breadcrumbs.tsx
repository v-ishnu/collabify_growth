import { Fragment } from 'react';
import Link from 'next/link';
import { SepIcon } from './Icons';

export interface CrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: CrumbItem[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <Fragment key={`${item.label}-${idx}`}>
          {idx > 0 && <SepIcon />}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

