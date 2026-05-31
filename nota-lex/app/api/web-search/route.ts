import { NextRequest, NextResponse } from "next/server";
import { getWebDataClient } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/web-search - live web search via Bright Data SERP.
 *
 * The corpus inside Lex.NY (1.32M opinions, 40K statute sections) is the
 * primary research surface, but some questions are about events / news /
 * commentary that don't live in case reporters. This endpoint exposes the
 * raw Bright Data SERP capability to the UI so users can do live web
 * lookups inside the same product. Every call shows up in
 * /api/bright-data-stats and /stats.
 *
 * POST body: { query: string, limit?: number }
 * Returns:   { results: SerpResult[], query, took_ms, provider }
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();

  let body: { query?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body; expected { query: string, limit?: number }" },
      { status: 400 }
    );
  }

  const query = (body.query || "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 }
    );
  }
  if (query.length > 500) {
    return NextResponse.json(
      { error: "query must be 500 chars or fewer" },
      { status: 400 }
    );
  }

  // Hard cap on result count to keep the response payload reasonable
  // and to avoid runaway Bright Data spend if someone scripts the endpoint.
  const limit = Math.min(Math.max(body.limit ?? 10, 1), 25);

  // Self-hosted era: live web search is retired. Operators can re-enable
  // by setting WEB_DATA_PROVIDER=brightdata (or wiring SearXNG / another
  // provider). When disabled we return a 200 with an empty result set
  // and a clear `disabled` flag so the UI can show a graceful message
  // rather than treating it as an error.
  if ((process.env.WEB_DATA_PROVIDER || "").toLowerCase() === "disabled") {
    return NextResponse.json({
      query,
      provider: "disabled",
      took_ms: Date.now() - t0,
      count: 0,
      results: [],
      disabled: true,
      reason:
        "Live web search retired in the self-hosted release. The corpus search at /search and the citation-anchored answers at /ask both run entirely on local infrastructure (Postgres + Neo4j + Ollama).",
    });
  }

  try {
    const client = getWebDataClient();
    const results = await client.searchSerp(query, { engine: "google", limit });
    return NextResponse.json({
      query,
      provider: client.provider,
      took_ms: Date.now() - t0,
      count: results.length,
      results,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.warn(`[web-search] "${query}" failed: ${msg}`);
    return NextResponse.json(
      {
        error: "search failed",
        provider: "brightdata",
        details: msg,
        query,
        took_ms: Date.now() - t0,
      },
      { status: 502 }
    );
  }
}

// Convenience: support GET ?q=... for cURL-style testing
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json(
      {
        error: "GET requires ?q=...; or POST { query: '...' }",
        usage: {
          GET: "/api/web-search?q=summary+judgment+CPLR",
          POST: { url: "/api/web-search", body: { query: "summary judgment CPLR", limit: 10 } },
        },
      },
      { status: 400 }
    );
  }
  // Reuse POST handler logic by constructing a NextRequest with the body
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: q }),
    })
  );
}
