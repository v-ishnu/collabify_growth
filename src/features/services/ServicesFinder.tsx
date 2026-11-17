'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_SERVICES, CAP_BY_ID, CAPS } from '@/content';
import { SearchIcon } from '@/components/common/Icons';
import { ServiceRow } from '@/components/common/ServiceRow';
import type { CapId } from '@/types/domain';

type FilterId = 'all' | CapId | 'custom';

export function ServicesFinder() {
  const searchParams = useSearchParams();
  const focusFlag = searchParams.get('focus');

  const [query, setQuery] = useState('');
  const [activeCap, setActiveCap] = useState<FilterId>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusFlag === '1') {
      inputRef.current?.focus();
    }
  }, [focusFlag]);

  const filterButtons: Array<[FilterId, string]> = [
    ['all', 'All'],
    ...CAPS.map((c): [FilterId, string] => [c.id, c.name]),
    ['custom', 'Across capabilities'],
  ];

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const matches = ALL_SERVICES.filter((x) => {
    if (activeCap !== 'all' && x.cap !== activeCap) return false;
    if (words.length === 0) return true;
    const capName = x.cap === 'custom' ? 'custom integrated bespoke' : CAP_BY_ID[x.cap].name;
    const hay = `${x.name} ${x.copy} ${x.group} ${capName}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  const total =
    activeCap === 'all'
      ? ALL_SERVICES.length
      : ALL_SERVICES.filter((x) => x.cap === activeCap).length;

  const groupIds: Array<CapId | 'custom'> = [...CAPS.map((c) => c.id), 'custom'];

  return (
    <>
      <div className="finder">
        <div className="wrap">
          <div className="search">
            <label className="sr-only" htmlFor="svcSearch">
              Search services
            </label>
            <SearchIcon />
            <input
              ref={inputRef}
              type="search"
              id="svcSearch"
              placeholder="Search, for example podcast, CRM or ticketing"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.stopPropagation();
                  setQuery('');
                }
              }}
            />
          </div>
          <div className="filters" role="group" aria-label="Filter by capability">
            {filterButtons.map(([id, label]) => {
              const count =
                id === 'all'
                  ? ALL_SERVICES.length
                  : ALL_SERVICES.filter((x) => x.cap === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeCap === id}
                  onClick={() => setActiveCap(id)}
                >
                  {label}
                  <span className="c">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="result-count" id="svcCount" aria-live="polite">
            {matches.length === total
              ? `Showing all ${total} services${activeCap === 'all' ? '' : ' in this filter'}`
              : `Showing ${matches.length} of ${total} services`}
          </p>
        </div>
      </div>

      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap" id="svcResults">
          {matches.length === 0 ? (
            <div className="empty-state">
              <h2>No services match “{query.trim()}”.</h2>
              <p className="muted">
                Try a broader word, or show every capability. Can’t find it? Describe what you need
                and we’ll scope it.
              </p>
              <div className="btn-row" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuery('');
                    setActiveCap('all');
                  }}
                >
                  Show all services
                </button>
                <Link className="btn btn-primary" href="/start-a-project">
                  Start a Project
                </Link>
              </div>
            </div>
          ) : (
            groupIds.map((id) => {
              const list = matches.filter((x) => x.cap === id);
              if (list.length === 0) return null;
              const cap = id === 'custom' ? null : CAP_BY_ID[id];
              return (
                <div className="svc-group" key={id}>
                  <h2>
                    {cap ? cap.name : 'Across capabilities'}
                    <span className="gcount">
                      {list.length} {list.length === 1 ? 'service' : 'services'}
                    </span>
                    {cap && (
                      <Link
                        className="tlink small"
                        style={{
                          display: 'inline-block',
                          marginTop: 10,
                          fontFamily: 'var(--font-body)',
                          letterSpacing: 0,
                        }}
                        href={`/capabilities/${cap.slug}`}
                      >
                        Open capability page
                      </Link>
                    )}
                  </h2>
                  <dl className="svc-list">
                    {list.map((svc) => (
                      <ServiceRow key={svc.name} service={svc} />
                    ))}
                  </dl>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

