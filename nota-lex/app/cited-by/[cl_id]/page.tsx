"use client";

/**
 * /cited-by/[cl_id] — what cites this opinion, via the Neo4j citation graph.
 *
 * One Cypher hop: (citer:Opinion)-[:CITES]->(:Opinion {cl_id}). Citers are
 * ranked by their OWN inbound citation count so the most influential ones
 * float to the top — that's the GraphRAG signal in plain English.
 */

import { useEffect, useState, use } from "react";
import Link from "next/link";

const COURT_NAMES: Record<string, string> = {
  ny: "NY CoA",
  nyappdiv: "App Div",
  nyappterm: "App Term",
  ca2: "2nd Cir",
  nysd: "SDNY",
  nyed: "EDNY",
  nynd: "NDNY",
  nywd: "WDNY",
  nysupct: "Sup Ct",
  nysurct: "Surrogate",
  nysb: "Bankr SDNY",
};

interface Citer {
  cl_id: string;
  case_name: string;
  court_id: string;
  decision_date: string | null;
  cited_by_count: number;
}

interface CitedByResponse {
  seed: {
    cl_id: string;
    case_name: string;
    court_id: string;
    decision_date: string | null;
    inbound_count: number;
  } | null;
  citers: Citer[];
  total_citers: number;
  timing_ms: number;
  note?: string;
}

export default function CitedByPage({
  params,
}: {
  params: Promise<{ cl_id: string }>;
}) {
  const { cl_id } = use(params);
  const [data, setData] = useState<CitedByResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cited-by/${cl_id}?limit=50`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        setData(d);
      })
      .catch((e) => setError(String(e)));
  }, [cl_id]);

  const seed = data?.seed;
  const isLandmark = (seed?.inbound_count ?? 0) >= 1000;

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Citation graph · Lex.NY
          </span>
          <span>Live Cypher traversal in Neo4j AuraDB</span>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span> Lex.NY
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
          </ul>
        </div>
      </nav>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Cited-by traversal · cl_id {cl_id}
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-900 rounded-sm text-sm">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="text-sm text-[var(--color-ink-2)]">Loading citation graph…</div>
        )}

        {data && !seed && (
          <div className="mb-6 p-5 border border-[var(--color-rule)]/30 rounded-sm">
            <p className="text-sm">
              No opinion with cl_id <code>{cl_id}</code> in the graph yet. Either it&rsquo;s
              outside the NY scope, or the CourtListener ID isn&rsquo;t in our sync.
            </p>
          </div>
        )}

        {seed && (
          <>
            <h1 className="font-[family-name:var(--font-display)] text-4xl mb-3 leading-tight">
              {seed.case_name}
            </h1>
            <div className="flex flex-wrap gap-2 items-center mb-6 text-[11px] font-[family-name:var(--font-mono)] tracking-wider uppercase text-[var(--color-ink-2)]">
              <span className="px-2 py-1 bg-[var(--color-rule)]/15 rounded">
                {COURT_NAMES[seed.court_id] || seed.court_id}
              </span>
              {seed.decision_date && <span>{seed.decision_date}</span>}
              <span className={"font-bold " + (isLandmark ? "text-[var(--color-seal-deep)]" : "")}>
                {seed.inbound_count.toLocaleString()} citing opinions
              </span>
              {isLandmark && (
                <span className="px-2 py-0.5 bg-[var(--color-seal)]/15 text-[var(--color-seal-deep)] rounded-full">
                  Landmark precedent
                </span>
              )}
              <a
                href={`https://www.courtlistener.com/opinion/${seed.cl_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-seal-deep)] underline"
              >
                View on CourtListener →
              </a>
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">
              Top {data.citers.length} citing opinions
              <span className="text-sm font-normal text-[var(--color-ink-2)] ml-2">
                ranked by their own citation influence
              </span>
            </h2>

            <div className="space-y-3">
              {data.citers.map((c) => (
                <Link
                  key={c.cl_id}
                  href={`/cited-by/${c.cl_id}`}
                  className="block border border-[var(--color-rule)]/30 rounded-sm p-4 bg-[var(--color-paper-2)] hover:border-[var(--color-seal-deep)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <div className="font-[family-name:var(--font-display)] text-[17px] leading-snug">
                      {c.case_name}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] whitespace-nowrap">
                      {c.cited_by_count.toLocaleString()} cites
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-[family-name:var(--font-mono)] tracking-wider uppercase text-[var(--color-ink-2)]">
                    <span className="px-1.5 py-0.5 bg-[var(--color-rule)]/15 rounded">
                      {COURT_NAMES[c.court_id] || c.court_id}
                    </span>
                    {c.decision_date && <span>{c.decision_date}</span>}
                    <span className="text-[var(--color-ink-2)]">→ click to traverse</span>
                  </div>
                </Link>
              ))}
            </div>

            <p className="mt-8 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
              Cypher query ran in {data.timing_ms}ms · Neo4j AuraDB
            </p>
          </>
        )}
      </div>
    </main>
  );
}
