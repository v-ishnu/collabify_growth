'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CAP_BY_ID, SCENES, SHOWCASE } from '@/content';
import { CapIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from '@/components/common/Icons';

const SLIDE_DURATION_MS = 6500;

export function ShowcaseCarousel() {
  const n = SHOWCASE.length;
  const [active, setActive] = useState(0);
  const [byUser, setByUser] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const visibleRef = useRef(true);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const activeRef = useRef(0);
  const pointerXRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pausedRef.current = true;
      setPaused(true);
      document.getElementById('main')?.classList.add('motion-paused');
    }
  }, []);

  const showSlide = useCallback(
    (nextIndex: number, userTriggered: boolean) => {
      const idx = ((nextIndex % n) + n) % n;
      activeRef.current = idx;
      elapsedRef.current = 0;
      setProgress(0);
      setByUser(userTriggered);
      setActive(idx);
    },
    [n],
  );

  const togglePaused = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    document.getElementById('main')?.classList.toggle('motion-paused', next);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          visibleRef.current = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.25 },
      );
      io.observe(root);
    }

    let rafId = 0;
    let last = 0;
    const frame = (t: number) => {
      const dt = last ? Math.min(t - last, 100) : 0;
      last = t;
      const isPlaying =
        !pausedRef.current &&
        !hoverRef.current &&
        !focusRef.current &&
        visibleRef.current &&
        !document.hidden;

      if (isPlaying) {
        elapsedRef.current += dt;
        if (elapsedRef.current >= SLIDE_DURATION_MS) {
          const next = (activeRef.current + 1) % n;
          activeRef.current = next;
          elapsedRef.current = 0;
          setByUser(false);
          setActive(next);
        }
        setProgress(Math.min(1, elapsedRef.current / SLIDE_DURATION_MS));
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      io?.disconnect();
    };
  }, [n]);

  const currentItem = SHOWCASE[active] ?? SHOWCASE[0]!;
  const currentCap = CAP_BY_ID[currentItem.cap];

  return (
    <section
      ref={rootRef}
      className={`showcase${paused ? ' paused' : ''}`}
      id="showcase"
      aria-roledescription="carousel"
      aria-label="What we do"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
      onFocus={() => {
        focusRef.current = true;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          focusRef.current = false;
        }
      }}
    >
      <div
        ref={stageRef}
        className="sc-stage"
        id="scStage"
        onPointerDown={(e) => {
          pointerXRef.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (pointerXRef.current === null) return;
          const dx = e.clientX - pointerXRef.current;
          pointerXRef.current = null;
          if (Math.abs(dx) > 45) {
            showSlide(activeRef.current + (dx < 0 ? 1 : -1), true);
          }
        }}
      >
        {SHOWCASE.map((s, k) => {
          const on = k === active;
          return (
            <div
              key={s.cap}
              className={`sc-slide tint-${s.tint}${on ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${k + 1} of ${n}: ${CAP_BY_ID[s.cap].name}`}
              aria-hidden={on ? 'false' : 'true'}
              inert={!on ? true : undefined}
            >
              <svg
                className="ill"
                viewBox="0 0 480 340"
                aria-hidden="true"
                focusable="false"
                dangerouslySetInnerHTML={{ __html: SCENES[s.cap] }}
              />
            </div>
          );
        })}
      </div>

      <div className="sc-caption" id="scCaption" aria-live={byUser ? 'polite' : 'off'}>
        <div className="sc-cap-top">
          <span>What we do</span>
          <span>
            {active + 1} of {n}
          </span>
        </div>
        <h2 className="sc-title">
          <CapIcon id={currentItem.cap} />
          {currentCap.name}
        </h2>
        <p>{currentItem.line}</p>
        <div className="sc-ex">
          {currentCap.examples.map((ex) => (
            <span key={ex}>{ex}</span>
          ))}
        </div>
        <Link className="tlink" href={`/capabilities/${currentCap.slug}`}>
          Explore {currentCap.name}
        </Link>
      </div>

      <div className="sc-controls">
        <button
          type="button"
          className="sc-btn"
          aria-label="Previous slide"
          onClick={() => showSlide(active - 1, true)}
        >
          <PrevIcon />
        </button>

        <div
          className="sc-dots"
          role="group"
          aria-label="Choose a capability"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const targetIdx = (active + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
            showSlide(targetIdx, true);
            const dotBtns = e.currentTarget.querySelectorAll<HTMLButtonElement>('.sc-dot');
            dotBtns[targetIdx]?.focus();
          }}
        >
          {SHOWCASE.map((s, k) => {
            const scale = k < active ? 1 : k === active ? progress : 0;
            return (
              <button
                key={s.cap}
                type="button"
                className="sc-dot"
                aria-label={CAP_BY_ID[s.cap].name}
                aria-current={k === active ? 'true' : 'false'}
                onClick={() => showSlide(k, true)}
              >
                <span>
                  <i style={{ transform: `scaleX(${scale})` }} />
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="sc-btn"
          aria-label="Next slide"
          onClick={() => showSlide(active + 1, true)}
        >
          <NextIcon />
        </button>

        <button
          type="button"
          className="sc-btn"
          aria-pressed={paused}
          aria-label={paused ? 'Play animations' : 'Pause animations'}
          onClick={togglePaused}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>
    </section>
  );
}

