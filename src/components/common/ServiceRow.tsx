'use client';

import Link from 'next/link';
import { useShortlist } from '@/hooks/useShortlist';
import { CheckIcon, PlusIcon } from './Icons';
import { PlaceholderText } from './PlaceholderText';
import type { ServiceItem } from '@/types/domain';

interface ShortlistToggleProps {
  serviceName: string;
}

export function ShortlistToggleButton({ serviceName }: ShortlistToggleProps) {
  const { has, toggle } = useShortlist();
  const pressed = has(serviceName);
  const label = `${pressed ? 'Remove ' : 'Add '}${serviceName}${pressed ? ' from' : ' to'} your enquiry`;

  return (
    <button
      type="button"
      className="add"
      aria-pressed={pressed}
      aria-label={label}
      onClick={() => toggle(serviceName)}
    >
      {pressed ? (
        <>
          <CheckIcon />
          Added
        </>
      ) : (
        <>
          <PlusIcon />
          Add
        </>
      )}
    </button>
  );
}

export function ServiceRow({ service }: { service: ServiceItem }) {
  return (
    <div className="svc">
      <dt>
        <PlaceholderText text={service.name} />
        {service.tag && <span className="tag">{service.tag}</span>}
      </dt>
      <dd>
        <PlaceholderText text={service.copy} />
        {service.link && (
          <>
            <br />
            <Link className="tlink" href={service.link}>
              {service.cap === 'custom' ? 'How custom projects work' : 'What’s included'}
            </Link>
          </>
        )}
      </dd>
      <dd className="act">{service.tag ? null : <ShortlistToggleButton serviceName={service.name} />}</dd>
    </div>
  );
}

