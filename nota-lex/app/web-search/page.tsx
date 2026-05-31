"use client";

/**
 * /web-search - retired in the self-hosted release.
 *
 * Originally a live SERP front-end powered by Bright Data Web Unlocker.
 * That integration cost a per-call fee and has been removed; the API
 * endpoint at /api/web-search now returns { disabled: true } and this
 * page renders a friendly notice pointing users at /search and /ask.
 *
 * The form, error state, and result rendering remain in place so that
 * if someone wires a self-hosted SearXNG (or similar free provider)
 * into /api/web-search later, the UI will light up again automatically.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface SearchResponse {
  query: string;
  provider: string;
  took_ms: number;
  count: number;
  results: SerpResult[];
  /** Set by the route when WEB_DATA_PROVIDER=disabled. */
  disabled?: boolean;
  reason?: string;
}

interface SearchError {
  error: string;
  details?: string;
  took_ms?: number;
}

const SAMPLE_QUERIES = [
  "CPLR 3211 motion to dismiss 2025",
  "New York Court of Appeals weight of evidence",
  "Labor Law section 240 recent decision",
  "NY data privacy bill 2026",
  "SDNY pro hac vice rules",
];

export default function WebSearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [err, setErr] = useState<SearchError | null>(null);

  // If the URL has ?q=..., kick off the search on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setQuery(q);
      runSearch(q);
    }
  }, []);

  async function runSearch(q: string) {
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const r = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 15 }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j as SearchError);
      } else {
        setData(j as SearchResponse);
      }
    } catch (e) {
      setErr({ error: "network error", details: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Reflect the query in the URL bar so the page is shareable
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("q", q);
      window.history.replaceState({}, "", url.toString());
    }
    runSearch(q);
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Web search - retired
          </span>
          <span className="hidden md:inline">Self-hosted release - corpus search via /search</span>
        </div>
      </div>

      {/* Sticky nav (same flex-wrap pattern as other pages) */}
        <article className="max-w-[900px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Web search
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-4 leading-tight">
          Live web search is retired.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] leading-relaxed mb-8 max-w-[640px]">
          The self-hosted release runs entirely on local infrastructure
          (Postgres + Neo4j + Ollama). Live SERP scraping cost a per-call
          fee and has been removed. For questions inside the corpus, use{" "}
          <Link href="/search" className="underline">/search</Link> or{" "}
          <Link href="/ask" className="underline">/ask</Link> instead.
        </p>

        {/* Search form */}
        <form onSubmit={onSubmit} className="mb-4">
          <div className="flex gap-3 flex-wrap items-stretch">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. CPLR 3211 motion to dismiss 2025"
              className="flex-1 min-w-[280px] px-4 py-3 text-base bg-[var(--color-paper-2)] border border-[var(--color-rule)]/50 rounded-sm focus:outline-none focus:border-[var(--color-seal-deep)]"
              maxLength={500}
              disabled={loading}
              autoFocus
            />
            <Button type="submit" size="lg" disabled={loading || !query.trim()}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mt-2">
            This endpoint now returns a graceful retired-feature notice.
          </p>
        </form>

        {/* Sample queries (only when there's no active result) */}
        {!loading && !data && !err && (
          <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-5 mb-8">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">
              Try one of these
            </div>
            <ul className="space-y-2 list-none p-0">
              {SAMPLE_QUERIES.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      runSearch(q);
                    }}
                    className="text-left w-full text-[14.5px] leading-snug text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] border-b border-[var(--color-rule)]/20 pb-2"
                  >
                    {"\u201c"}{q}{"\u201d"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-6 my-6">
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider uppercase text-[var(--color-ink-2)]">
              Fetching live web search for {"\u201c"}{query}{"\u201d"}...
            </p>
            <p className="text-sm text-[var(--color-ink-2)] mt-2">
              Typical latency: 1.5 - 3.5 seconds. Cold first-call may take longer.
            </p>
          </div>
        )}

        {/* Error state */}
        {err && (
          <div className="border border-[var(--color-seal-deep)]/30 rounded-sm bg-[var(--color-paper-2)] p-6 my-6">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              Search failed
            </div>
            <p className="text-base font-medium mb-2">{err.error}</p>
            {err.details && (
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)] mt-2 leading-relaxed">
                {err.details}
              </p>
            )}
            <p className="text-sm text-[var(--color-ink-2)] mt-3">
              The web search provider may be unavailable, or the feature is disabled in this deployment.
              Check <Link href="/stats" className="underline">/stats</Link> for
              the latest health signal.
            </p>
          </div>
        )}

        {/* Results */}
        {data && data.results.length > 0 && (
          <>
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {data.count} result{data.count === 1 ? "" : "s"}
              </h2>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">
                {data.took_ms}ms - via {data.provider}
              </span>
            </div>

            <ol className="list-none p-0 space-y-6">
              {data.results.map((r) => (
                <li key={`${r.position}-${r.link}`} className="border-b border-[var(--color-rule)]/30 pb-5">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-2)] mb-1 truncate">
                    {r.displayed_link || (() => {
                      try {
                        return new URL(r.link).hostname;
                      } catch {
                        return r.link;
                      }
                    })()}
                  </div>
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-lg font-[family-name:var(--font-display)] font-medium text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] leading-snug mb-2"
                  >
                    {r.title}
                  </a>
                  <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
                    {r.snippet}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-10 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
              Self-hosted release - all queries are counted on{" "}
              <Link href="/stats" className="underline hover:text-[var(--color-ink)]">
                /stats
              </Link>
            </p>
          </>
        )}

        {/* Self-hosted: web search retired */}
        {data && data.disabled && (
          <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-6 my-6">
            <div className="font-[family-name:var(--font-display)] text-lg mb-2">
              Live web search is retired.
            </div>
            <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
              {data.reason ?? "This feature has been retired in the self-hosted release."}
            </p>
            <p className="text-sm text-[var(--color-ink-2)] leading-relaxed mt-3">
              Try the corpus search at <a href="/search" className="underline">/search</a>{" "}
              or the citation-anchored answer engine at{" "}
              <a href="/ask" className="underline">/ask</a> — both run entirely on local
              infrastructure (Postgres + Neo4j + Ollama).
            </p>
          </div>
        )}

        {/* No results */}
        {data && !data.disabled && data.results.length === 0 && (
          <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-6 my-6">
            <p className="text-base">
              No results for {"\u201c"}{data.query}{"\u201d"}. Try rephrasing or broadening your terms.
            </p>
          </div>
        )}
      </article>
    </main>
  );
}
