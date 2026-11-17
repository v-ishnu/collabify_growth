'use client';

import { useCallback, useEffect, useState } from 'react';
import { SVC_BY_NAME } from '@/content';

const STORAGE_KEY = 'cg-shortlist';
const EVENT_NAME = 'cg-shortlist-change';

function readStoredShortlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is string => {
        if (typeof n !== 'string') return false;
        const svc = SVC_BY_NAME[n];
        return Boolean(svc && !svc.tag);
      },
    );
  } catch {
    return [];
  }
}

export function useShortlist() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readStoredShortlist());
    const sync = () => setItems(readStoredShortlist());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    const cleaned = next.filter((n) => {
      const svc = SVC_BY_NAME[n];
      return Boolean(svc && !svc.tag);
    });
    setItems(cleaned);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      // Ignore storage quota errors in restricted browsing modes.
    }
  }, []);

  const has = useCallback((name: string) => items.includes(name), [items]);

  const toggle = useCallback(
    (name: string) => {
      const current = readStoredShortlist();
      const next = current.includes(name)
        ? current.filter((x) => x !== name)
        : [...current, name];
      persist(next);
    },
    [persist],
  );

  const remove = useCallback(
    (name: string) => {
      const current = readStoredShortlist();
      persist(current.filter((x) => x !== name));
    },
    [persist],
  );

  const setAll = useCallback(
    (names: string[]) => {
      persist(Array.from(new Set(names)));
    },
    [persist],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { items, has, toggle, remove, setAll, clear };
}
