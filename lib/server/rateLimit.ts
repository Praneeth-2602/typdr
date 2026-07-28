/**
 * Simple in-memory IP-keyed rate limiter for API routes.
 * Suitable for single-instance / serverless warm instances.
 * Documented alternative: Redis (Upstash) for multi-instance production.
 *
 * Rate-limit response headers:
 *   X-RateLimit-Limit
 *   X-RateLimit-Remaining
 *   X-RateLimit-Reset
 */

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded growth in long-lived processes. */
const MAX_BUCKETS = 10_000;

function pruneIfNeeded() {
  if (buckets.size < MAX_BUCKETS) return;
  const now = Date.now();
  const keys = Array.from(buckets.keys());
  for (const key of keys) {
    const bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= now) buckets.delete(key);
  }
  // If still oversized, drop oldest half
  if (buckets.size >= MAX_BUCKETS) {
    const remaining = Array.from(buckets.keys());
    for (let i = 0; i < remaining.length; i++) {
      if (i % 2 === 0) buckets.delete(remaining[i]);
    }
  }
}

/**
 * Consume one request against the rate limit.
 * @param key     usually IP or `ip:route`
 * @param limit   max requests per window
 * @param windowMs window length in ms (default 60s)
 */
export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  pruneIfNeeded();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

/** Extract a stable client key from a request (IP preferred). */
export function clientKeyFromRequest(req: Request, suffix = ""): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return suffix ? `${ip}:${suffix}` : ip;
}
