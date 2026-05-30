/**
 * /stats - server-rendered live corpus dashboard.
 *
 * This page is a Server Component. It fetches the 7 stats endpoints in
 * parallel server-side and renders the actual numbers in the initial
 * HTML. No client-side loading state, no '...' placeholders, no blank
 * skeleton period during demo recording.
 *
 * Cache strategy:
 *   - Server component re-fetches on every request (revalidate=0).
 *   - The underlying /api/corpus-stats and /api/graph-stats endpoints
 *     have 60s in-memory caches, so warm requests cost <100ms.
 *   - First request after a server restart hits the slow Postgres path
 *     once (~22s), but every subsequent request inside the 60s window
 *     is instant.
 *
 * If any endpoint fails, we still render the page. Failed endpoints
 * show '-' for their values and the sponsor card shows the dot dot dot
 * status, but the page renders.
 */

import StatsView from "./stats-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchJson(url: string, timeoutMs: number = 30000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function StatsPage() {
  // Pick the right base URL. On the workstation, hitting our own /api
  // through localhost avoids the Cloudflare tunnel round-trip entirely.
  const base = process.env.INTERNAL_BASE_URL || "http://127.0.0.1:3000";

  const endpoints = [
    "/api/corpus-stats",
    "/api/bright-data-stats",
    "/api/graph-stats",
    "/api/algolia-stats",
    "/api/speechmatics-stats",
    "/api/triggerware-stats",
    "/api/llm-stats",
  ];

  const results = await Promise.allSettled(
    endpoints.map((ep) => fetchJson(base + ep, ep === "/api/corpus-stats" ? 35000 : 15000))
  );

  const valueAt = (i: number): unknown =>
    results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<unknown>).value : null;

  const corpus = valueAt(0) as Parameters<typeof StatsView>[0]["corpus"];
  const sponsors: Record<string, unknown> = {
    "bright-data-stats": valueAt(1),
    "graph-stats": valueAt(2),
    "algolia-stats": valueAt(3),
    "speechmatics-stats": valueAt(4),
    "triggerware-stats": valueAt(5),
    "llm-stats": valueAt(6),
  };

  return (
    <StatsView
      corpus={corpus}
      sponsors={sponsors}
      generatedAt={new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"}
    />
  );
}
