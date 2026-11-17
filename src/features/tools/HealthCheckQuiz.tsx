'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CAP_BY_ID, HC_ADVICE, HC_QUESTIONS, SVC_BY_NAME } from '@/content';
import { siteConfig } from '@/config/site';
import { buildStartProjectUrl } from '@/lib/format';
import { CapIcon } from '@/components/common/Icons';
import { ShortlistToggleButton } from '@/components/common/ServiceRow';
import {
  type HealthCheckState,
  hcBand,
  hcScores,
  matchProgramme,
} from '@/lib/tools/health-check';
import { waShareUrl } from '@/lib/tools/shared';

const STORAGE_KEY = 'cg-health';

export function HealthCheckQuiz() {
  const [st, setSt] = useState<HealthCheckState>({ ans: [], i: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [animatedNum, setAnimatedNum] = useState(0);
  const [barsOn, setBarsOn] = useState(false);

  const qHeadingRef = useRef<HTMLLegendElement>(null);
  const scoreHeadingRef = useRef<HTMLHeadingElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HealthCheckState>;
        if (parsed && Array.isArray(parsed.ans)) {
          setSt({
            ans: parsed.ans,
            i: typeof parsed.i === 'number' ? parsed.i : 0,
            done: Boolean(parsed.done),
          });
        }
      }
    } catch {
      // ignore invalid stored progress
    } finally {
      setHydrated(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function saveState(next: HealthCheckState) {
    setSt(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const n = HC_QUESTIONS.length;
  const isComplete =
    Boolean(st.done) &&
    st.ans.length >= n &&
    st.ans.slice(0, n).every((v) => typeof v === 'number');

  useEffect(() => {
    if (!hydrated) return;
    if (shouldFocusRef.current) {
      shouldFocusRef.current = false;
      requestAnimationFrame(() => {
        if (isComplete) scoreHeadingRef.current?.focus();
        else qHeadingRef.current?.focus();
      });
    }
  }, [st.i, isComplete, hydrated]);

  useEffect(() => {
    if (!isComplete) {
      setAnimatedNum(0);
      setBarsOn(false);
      return;
    }

    const target = hcScores(st.ans).total;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      const eased = reduce ? 1 : 1 - Math.pow(1 - k, 3);
      setAnimatedNum(Math.round(target * eased));
      if (k < 1 && !reduce) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
    const barRaf = requestAnimationFrame(() => setBarsOn(true));

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(barRaf);
    };
  }, [isComplete, st.ans]);

  function go(step: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const idx = st.i || 0;
    if (step > 0 && typeof st.ans[idx] !== 'number') return;
    shouldFocusRef.current = true;
    if (step > 0 && idx === n - 1) {
      saveState({ ...st, done: true });
      return;
    }
    saveState({
      ...st,
      i: Math.max(0, Math.min(n - 1, idx + step)),
    });
  }

  function handleAnswer(optionIndex: number) {
    const idx = Math.min(st.i || 0, n - 1);
    const nextAns = [...st.ans];
    nextAns[idx] = optionIndex;
    const nextState: HealthCheckState = { ...st, ans: nextAns, i: idx };
    saveState(nextState);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      shouldFocusRef.current = true;
      if (idx === n - 1) {
        saveState({ ...nextState, done: true });
      } else {
        saveState({ ...nextState, i: Math.min(n - 1, idx + 1) });
      }
    }, 380);
  }

  function handleRetake() {
    if (timerRef.current) clearTimeout(timerRef.current);
    shouldFocusRef.current = true;
    saveState({ ans: [], i: 0, done: false });
  }

  if (isComplete) {
    const sc = hcScores(st.ans);
    const band = hcBand(sc.total);
    const weak = sc.per.slice().sort((a, b) => a.pct - b.pct).slice(0, 3);
    const prog = matchProgramme(new Set(weak.map((w) => w.id)));
    const ringStyle = { '--p': sc.total } as CSSProperties;
    const shareOrigin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : siteConfig.url;
    const discussHref = buildStartProjectUrl({
      caps: weak.map((w) => w.id),
      programme: prog?.name || '',
      note: `My Growth Health Check score is ${sc.total}/100. Weakest areas: ${weak
        .map((w) => `${CAP_BY_ID[w.id]?.name || w.id} (${w.pct}%)`)
        .join(', ')}.`,
    });

    return (
      <div id="hcRoot">
        <div className="hc-result">
          <div className="hc-score">
            <div className="hc-ring" style={ringStyle}>
              <b id="hcNum">{animatedNum}</b>
              <span>out of 100</span>
            </div>
            <div>
              <h2 id="hcScoreH" tabIndex={-1} ref={scoreHeadingRef}>
                {band[0]}
              </h2>
              <p className="lede" style={{ marginTop: 10 }}>
                {band[1]}
              </p>
              <p className="sr-only">Your overall score is {sc.total} out of 100.</p>
              <div className="btn-row" style={{ marginTop: 22 }}>
                <Link className="btn btn-primary" href={discussHref}>
                  Discuss my results with Collabify
                </Link>
                <a
                  className="btn btn-secondary"
                  href={waShareUrl(
                    `I scored ${sc.total}/100 on the free Growth Health Check. Try it: ${shareOrigin}/health-check`
                  )}
                  target="_blank"
                  rel="noopener"
                >
                  Share my score
                </a>
              </div>
            </div>
          </div>

          <h3 className="hc-h">Score by area</h3>
          <div className="hc-bars">
            {sc.per.map((p) => {
              const cap = CAP_BY_ID[p.id];
              const isWeak = weak.some((w) => w.id === p.id);
              const barStyle = { '--w': `${p.pct}%` } as CSSProperties;
              return (
                <div key={p.id} className={`hc-bar${isWeak ? ' weak' : ''}`}>
                  <span className="hc-label">
                    <CapIcon id={p.id} />
                    {cap?.name || p.id}
                  </span>
                  <span className="hc-track">
                    <i style={barStyle} className={barsOn ? 'on' : undefined} />
                  </span>
                  <b>{p.pct}%</b>
                </div>
              );
            })}
          </div>

          <h3 className="hc-h">Your three priorities</h3>
          <ol className="hc-prio">
            {weak.map((w) => {
              const cap = CAP_BY_ID[w.id];
              const adv = HC_ADVICE[w.id];
              if (!cap || !adv) return null;
              const firstSvc = adv[1][0];
              return (
                <li key={w.id}>
                  <div>
                    <h4>
                      {cap.name} <span className="muted small">{w.pct}%</span>
                    </h4>
                    <p>{adv[0]}</p>
                    <p className="small" style={{ marginTop: 8 }}>
                      <span className="muted">Services that help:</span>{' '}
                      {adv[1].map((nm, idx) => (
                        <span key={nm}>
                          {idx > 0 ? ', ' : ''}
                          <Link className="tlink" href={`/capabilities/${cap.slug}`}>
                            {nm}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                  {firstSvc && SVC_BY_NAME[firstSvc] && (
                    <ShortlistToggleButton serviceName={firstSvc} />
                  )}
                </li>
              );
            })}
          </ol>

          {prog && (
            <div className="callout" style={{ marginTop: 28 }}>
              <p className="small muted">Closest programme for your gaps</p>
              <h3 style={{ marginTop: 4 }}>{prog.name}</h3>
              <p className="muted" style={{ marginTop: 6 }}>
                {prog.line}
              </p>
              <p style={{ marginTop: 12 }}>
                <Link className="tlink" href={`/solutions/${prog.slug}`}>
                  See the programme
                </Link>
              </p>
            </div>
          )}

          <p className="small muted" style={{ marginTop: 24 }}>
            This is a self-assessment based on your answers, not an audit. A conversation with our
            team will give you a fuller picture.{' '}
            <button type="button" className="btn-quiet small" onClick={handleRetake}>
              Retake the check
            </button>
          </p>
        </div>
      </div>
    );
  }

  const idx = Math.min(st.i || 0, n - 1);
  const q = HC_QUESTIONS[idx]!;
  const cap = CAP_BY_ID[q[0]];
  const currentVal = st.ans[idx];

  return (
    <div id="hcRoot">
      <div className="hc-card">
        <div className="hc-top">
          <span>
            <CapIcon id={q[0]} />
            {cap?.name || q[0]}
          </span>
          <span>
            Question {idx + 1} of {n}
          </span>
        </div>

        <div
          className="hc-progress"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={n}
          aria-valuenow={idx}
        >
          <i style={{ width: `${(idx / n) * 100}%` }} />
        </div>

        <fieldset>
          <legend className="hc-q" tabIndex={-1} id="hcQ" ref={qHeadingRef}>
            {q[1]}
          </legend>
          <div className="hc-opts">
            {q[2].map((optionText, optIdx) => (
              <label className="hc-opt" key={optIdx}>
                <input
                  type="radio"
                  name="hc"
                  value={optIdx}
                  checked={currentVal === optIdx}
                  onChange={() => handleAnswer(optIdx)}
                />
                <span>{optionText}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="hc-nav">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={idx === 0}
            onClick={() => go(-1)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={typeof currentVal !== 'number'}
            onClick={() => go(1)}
          >
            {idx === n - 1 ? 'See my results' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
