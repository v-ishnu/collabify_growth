'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CAP_BY_ID, CAPS, PROGRAMMES } from '@/content';
import { buildStartProjectUrl, listJoin } from '@/lib/format';
import type { CapId, Programme } from '@/types/domain';

function matchProgramme(sel: Set<CapId>): Programme | null {
  let best: Programme | null = null;
  let bestScore = 0;

  for (const p of PROGRAMMES) {
    const inter = p.caps.filter((c) => sel.has(c as CapId)).length;
    const union = new Set([...p.caps, ...sel]).size;
    const score = union > 0 ? inter / union : 0;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export function ProgrammeComposer() {
  const [selected, setSelected] = useState<Set<CapId>>(() => new Set());
  const n = CAPS.length;
  const R = 34;

  const toggle = (id: CapId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ids = CAPS.filter((c) => selected.has(c.id)).map((c) => c.id);
  const names = ids.map((id) => CAP_BY_ID[id].name);
  const matched = ids.length > 1 ? matchProgramme(selected) : null;

  return (
    <div className="composer">
      <div className="composer-head">
        <div>
          <h2 id="cmpTitle">What do you need?</h2>
          <p>Pick every capability that applies.</p>
        </div>
        <button
          type="button"
          className="btn-quiet"
          id="cmpClear"
          hidden={selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear
        </button>
      </div>

      <div className="ring" role="group" aria-labelledby="cmpTitle">
        <svg className="links" viewBox="0 0 440 440" aria-hidden="true">
          {CAPS.map((c, i) => {
            const a = (((i * 360) / n - 90) * Math.PI) / 180;
            const x = 50 + R * Math.cos(a);
            const y = 50 + R * Math.sin(a);
            const X = (x * 4.4).toFixed(1);
            const Y = (y * 4.4).toFixed(1);
            return (
              <g key={`lines-${c.id}`}>
                <line className="base" x1="220" y1="220" x2={X} y2={Y} />
                <line
                  className={`live${selected.has(c.id) ? ' on' : ''}`}
                  pathLength={1}
                  x1="220"
                  y1="220"
                  x2={X}
                  y2={Y}
                />
              </g>
            );
          })}
        </svg>

        <div className={`hub${selected.size > 0 ? ' on' : ''}`} id="hub" aria-hidden="true">
          {selected.size ? (
            <>
              {selected.size} {selected.size === 1 ? 'capability' : 'capabilities'}
              <small>one Collabify lead</small>
            </>
          ) : (
            'One Collabify lead'
          )}
        </div>

        {CAPS.map((c, i) => {
          const a = (((i * 360) / n - 90) * Math.PI) / 180;
          const x = 50 + R * Math.cos(a);
          const y = 50 + R * Math.sin(a);
          const pressed = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className="node"
              aria-pressed={pressed}
              style={{ left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` }}
              onClick={() => toggle(c.id)}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="composer-result" id="cmpResult" aria-live="polite">
        {ids.length === 0 ? (
          <p className="muted">
            Pick the capabilities you need and we’ll suggest the closest programme. Whatever you
            choose, one Collabify project lead coordinates it.
          </p>
        ) : ids.length === 1 && ids[0] ? (
          (() => {
            const c = CAP_BY_ID[ids[0]];
            return (
              <>
                <p>
                  <strong>{c.name}</strong> on its own: {c.count} services, including{' '}
                  {listJoin(c.examples.map((e) => e.toLowerCase()))}.
                </p>
                <div className="btn-row">
                  <Link
                    className="btn btn-primary btn-sm"
                    href={buildStartProjectUrl({ caps: ids })}
                  >
                    Start a Project
                  </Link>
                  <Link className="btn btn-secondary btn-sm" href={`/capabilities/${c.slug}`}>
                    View services
                  </Link>
                </div>
              </>
            );
          })()
        ) : matched ? (
          <>
            <p>
              Closest match: <strong>{matched.name}</strong>. {matched.line}
            </p>
            <p className="covers">
              This programme brings together{' '}
              {listJoin(matched.caps.map((id) => CAP_BY_ID[id as CapId].name))}.
            </p>
            <div className="btn-row">
              <Link
                className="btn btn-primary btn-sm"
                href={buildStartProjectUrl({ caps: ids, programme: matched.name })}
              >
                Start with {matched.name}
              </Link>
              <Link className="btn btn-secondary btn-sm" href={`/solutions/${matched.slug}`}>
                See the programme
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>
              That’s a custom combination of {listJoin(names)}. We’ll design a programme around it
              and scope it in writing.
            </p>
            <div className="btn-row">
              <Link
                className="btn btn-primary btn-sm"
                href={buildStartProjectUrl({ caps: ids, programme: 'Custom Solutions' })}
              >
                Start a custom project
              </Link>
              <Link className="btn btn-secondary btn-sm" href="/solutions">
                Compare programmes
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

