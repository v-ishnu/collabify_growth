interface WindowEntry {
  timestamps: number[];
}

const buckets = new Map<string, WindowEntry>();
let lastCleanup = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * In-memory sliding window limiter suitable per Node isolate; pair with
 * edge/KV rate limiting in distributed deployments if needed.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (now - lastCleanup > 5 * 60_000) {
    for (const [k, v] of buckets.entries()) {
      v.timestamps = v.timestamps.filter((t) => now - t < windowMs);
      if (v.timestamps.length === 0) buckets.delete(k);
    }
    lastCleanup = now;
  }

  const entry = buckets.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, entry);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.timestamps.length),
    retryAfterSeconds: 0,
  };
}

