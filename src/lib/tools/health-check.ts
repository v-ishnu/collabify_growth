import { CAPS, HC_QUESTIONS, PROGRAMMES } from '@/content';
import type { CapId, Programme } from '@/types/domain';

export interface HealthCheckState {
  ans: Array<number | undefined>;
  i: number;
  done?: boolean;
}

export interface HealthCheckResult {
  total: number;
  per: Array<{ id: CapId; pct: number }>;
}

export function matchProgramme(sel: Set<string>): Programme | null {
  let best: Programme | null = null;
  let bestScore = 0;
  for (const p of PROGRAMMES) {
    const inter = p.caps.filter((c) => sel.has(c)).length;
    const union = new Set<string>([...p.caps, ...sel]).size;
    const score = union > 0 ? inter / union : 0;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export function hcScores(ans: Array<number | undefined>): HealthCheckResult {
  const by: Record<string, { got: number; max: number }> = {};
  for (const c of CAPS) by[c.id] = { got: 0, max: 0 };

  HC_QUESTIONS.forEach((q, k) => {
    const bucket = by[q[0]];
    if (!bucket) return;
    bucket.max += 3;
    if (typeof ans[k] === 'number') {
      bucket.got += ans[k] as number;
    }
  });

  const per = CAPS.map((c) => {
    const b = by[c.id] || { got: 0, max: 1 };
    return {
      id: c.id,
      pct: b.max > 0 ? Math.round((b.got / b.max) * 100) : 0,
    };
  });

  const sum = ans.reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const total = Math.round((sum / (HC_QUESTIONS.length * 3)) * 100);
  return { total, per };
}

export function hcBand(total: number): [string, string] {
  if (total >= 70) {
    return [
      'Strong growth engine',
      'Your foundations are working. The gains now come from measuring, refining and scaling what already works.',
    ];
  }
  if (total >= 40) {
    return [
      'Growing, with gaps',
      'Some parts of your growth engine work well, and a few gaps are holding the rest back. Fix those first.',
    ];
  }
  return [
    'Foundations needed',
    'Growth is relying on effort rather than systems. A few basics, done well, will make everything else easier.',
  ];
}
