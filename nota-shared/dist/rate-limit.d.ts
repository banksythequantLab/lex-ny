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
export declare function rateLimit(opts: RateLimitOptions): RateLimitResult;
/**
 * Extract the best-effort client IP from a Next.js request.
 *
 * Trust order (most → least trustworthy on a Cloudflare-tunneled origin):
 *   1. CF-Connecting-IP (set by Cloudflare edge, can't be spoofed once
 *      we trust CF in front of us)
 *   2. X-Forwarded-For (first hop; CF preserves this from the client)
 *   3. "unknown" — fall back to a single global bucket
 */
export declare function clientIp(req: {
    headers: {
        get(name: string): string | null;
    };
}): string;
/**
 * Build the JSON body + headers for a 429 response. Caller does the actual
 * Response/NextResponse construction so this module stays framework-agnostic.
 */
export declare function rateLimitResponse(result: RateLimitResult, message?: string): {
    status: number;
    headers: {
        "Content-Type": string;
        "Retry-After": string;
        "X-RateLimit-Remaining": string;
        "X-RateLimit-Reset": string;
    };
    body: string;
};
//# sourceMappingURL=rate-limit.d.ts.map