/**
 * In-memory token bucket rate limiter for Lex.NY's public API endpoints.
 *
 * Why not Redis? This is a single-node deployment on one Windows workstation
 * behind a Cloudflare tunnel. Single-process state is the simplest correct
 * thing, and it gets reset on dev server restart which is fine for the
 * hackathon timeline. If/when this moves to multi-node, swap the Map for
 * Cloudflare KV or Workers Rate Limiting.
 *
 * What it protects:
 *   - /api/ask              (Bright Data + Groq calls cost real money)
 *   - /api/ask/stream       (same)
 *   - /api/search/cases     (Postgres ivfflat is CPU-heavy at 1.3M rows)
 *   - /api/cited-by/[cl_id] (Neo4j call)
 *
 * Default policy: 10 req/min per IP across all rate-limited endpoints.
 * Lower (1/min) on the streaming endpoint since each stream holds an
 * upstream Groq connection open for ~12s.
 *
 * Cloudflare strips/sets X-Forwarded-For + CF-Connecting-IP for tunneled
 * requests; we read CF-Connecting-IP first (most trustworthy through CF),
 * fall back to X-Forwarded-For, then to the socket address.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const BUCKETS = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow forever on a long-lived process.
// Triggered lazily on each call; nothing scheduled with setInterval (Next.js
// API routes don't have a persistent runtime hook for cleanup).
let lastCleanup = Date.now();
function cleanup(now: number, maxAgeMs: number) {
  if (now - lastCleanup < 60_000) return; // at most once a minute
  lastCleanup = now;
  for (const [key, bucket] of BUCKETS.entries()) {
    if (now - bucket.lastRefill > maxAgeMs) {
      BUCKETS.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Bucket key — usually the client IP. Use a fixed string for global limits. */
  key: string;
  /** Max requests allowed in the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining tokens after this request (clamped at >= 0). */
  remaining: number;
  /** UNIX ms when the bucket will be full again. */
  resetAt: number;
  /** Suggested Retry-After header value in seconds (only set when blocked). */
  retryAfterSeconds?: number;
}

/**
 * Token-bucket check. Returns whether the request is allowed AND consumes
 * one token if so.
 *
 * Algorithm: tokens refill linearly at `max / windowMs` per ms, capped at
 * `max`. A bucket starts full.
 */
export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanup(now, opts.windowMs * 4);

  let bucket = BUCKETS.get(opts.key);
  if (!bucket) {
    bucket = { tokens: opts.max, lastRefill: now };
    BUCKETS.set(opts.key, bucket);
  } else {
    const elapsed = now - bucket.lastRefill;
    const refillRate = opts.max / opts.windowMs;
    bucket.tokens = Math.min(opts.max, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetAt: now + (opts.max - bucket.tokens) * (opts.windowMs / opts.max),
    };
  }

  const msUntilOneToken = (1 - bucket.tokens) * (opts.windowMs / opts.max);
  return {
    allowed: false,
    remaining: 0,
    resetAt: now + msUntilOneToken,
    retryAfterSeconds: Math.ceil(msUntilOneToken / 1000),
  };
}

/**
 * Extract the best-effort client IP from a Next.js request.
 *
 * Trust order (most → least trustworthy on a Cloudflare-tunneled origin):
 *   1. CF-Connecting-IP (set by Cloudflare edge, can't be spoofed once
 *      we trust CF in front of us)
 *   2. X-Forwarded-For (first hop; CF preserves this from the client)
 *   3. "unknown" — fall back to a single global bucket
 */
export function clientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return "unknown";
}

/**
 * Build the JSON body + headers for a 429 response. Caller does the actual
 * Response/NextResponse construction so this module stays framework-agnostic.
 */
export function rateLimitResponse(result: RateLimitResult, message?: string) {
  return {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfterSeconds ?? 60),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    },
    body: JSON.stringify({
      error: "rate_limited",
      message:
        message ||
        "Too many requests. Lex.NY is a public research tool; please wait a moment and try again.",
      retry_after_seconds: result.retryAfterSeconds,
    }),
  };
}
