"use client";

/**
 * /corpus - landing/overview page for the Lex.NY corpus.
 *
 * Replaces an earlier 477-line server component that depended on Supabase
 * (now offline/abandoned). The corpus actually lives in local Postgres now
 * and is exposed via three live endpoints:
 *   - /api/corpus-stats     → counts, date range, courts
 *   - /api/search/cases     → semantic case search (uses pgvector + citation graph)
 *   - /api/cited-by/[cl_id] → cited-by graph traversal in Neo4j
 *
 * This page is a clean entry point that points at those endpoints rather
 * than re-implementing them.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface CorpusStats {
  postgres?: {
    ok: boolean;
    opinions: number;
    ny_cases: number;
    statutes: number;
    opinion_citations: number;
    decision_date_range?: { earliest: string; latest: string };
  };
  neo4j?: {
    ok: boolean;
    stats?: {
      total_nodes: number;
      total_relationships: number;
      top_cited_opinions?: { case_name: string; cl_id: string; times_cited: number }[];
    };
  };
}

const fmt = (n: number | undefined) =>
  n === undefined || n === null ? "—" : n.toLocaleString("en-US");

export default function CorpusPage() {
  const [data, setData] = useState<CorpusStats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/corpus-stats").then((r) => r.json()),
      fetch("/api/graph-stats").then((r) => r.json()),
    ])
      .then(([cs, gs]) => {
        setData({
          postgres: cs.postgres,
          neo4j: { ok: !!gs.stats, stats: gs.stats },
        });
      })
      .catch(() => setData({ postgres: { ok: false } as never }));
  }, []);

  const pg = data?.postgres;
  const graph = data?.neo4j?.stats;
  const top = graph?.top_cited_opinions || [];

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            The corpus · Lex.NY
          </span>
          <span>1714 → 2026 · 5.5M legal records</span>
        </div>
      </div>
        <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY · The corpus
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
          Three centuries of New York law, in one place.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-10">
          Every opinion that&rsquo;s been digitized, every docket, every section of every NY
          Consolidated Law — pulled from CourtListener&rsquo;s bulk dumps and the NY Senate
          OpenLegislation API, parsed locally, embedded with mxbai-embed-large, and wired
          into a Neo4j citation graph.
        </p>

        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat label="Case decisions" value={pg?.opinions} accent />
          <Stat label="NY dockets" value={pg?.ny_cases} />
          <Stat label="Statute sections" value={pg?.statutes} />
          <Stat label="Citation edges" value={pg?.opinion_citations} />
        </div>

        {/* What lives where */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">
          What lives where
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mb-14">
          <DataCard
            title="Postgres + pgvector"
            href="/stats"
            stat={`${fmt(pg?.opinions)} opinions · ${fmt(pg?.statutes)} statutes`}
            blurb="The source-of-truth corpus. Every row was streamed in from CourtListener bulk dumps or the NY Senate API and indexed with an ivfflat ANN index for semantic search."
          />
          <DataCard
            title="Neo4j AuraDB"
            href="/stats"
            stat={`${fmt(graph?.total_nodes)} nodes · ${fmt(graph?.total_relationships)} rels`}
            blurb="The citation graph. Every NY-to-NY opinion citation is a CITES edge. Pure vector search misses controlling precedent; graph traversal finds it."
          />
          <DataCard
            title="Algolia"
            href="/search"
            stat="40,427 statute sections indexed"
            blurb="Federated keyword search for the moment when you know the citation. Sub-100ms across all 137 NY Consolidated Laws."
          />
        </div>

        {/* Top cited */}
        {top.length > 0 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-2">
              Most-cited NY opinions in the graph
            </h2>
            <p className="text-sm text-[var(--color-ink-2)] mb-4">
              Real Cypher query, not handpicked. Click any case to traverse what cites it.
            </p>
            <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden mb-14">
              {top.slice(0, 10).map((c) => (
                <Link
                  key={c.cl_id}
                  href={`/cited-by/${c.cl_id}`}
                  className="flex items-baseline justify-between px-4 py-3 border-b border-[var(--color-rule)]/15 last:border-0 hover:bg-[var(--color-paper-2)]"
                >
                  <span className="font-[family-name:var(--font-display)]">{c.case_name}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-seal-deep)]">
                    {fmt(c.times_cited)} cites →
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA row */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">
          Three ways to use it
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <CTACard
            href="/ask"
            title="Ask a question"
            desc="Plain-English question, citation-anchored answer with live Bright Data web sources."
          />
          <CTACard
            href="/search"
            title="Search by issue"
            desc="Semantic case search. Type the legal issue, get the closest NY decisions ranked by citation influence."
          />
          <CTACard
            href="/stats"
            title="Watch it live"
            desc="Live corpus dashboard. Every counter pulls from local Postgres + Neo4j on page load."
          />
        </div>

        {pg && pg.decision_date_range && (
          <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)]">
            Coverage: {pg.decision_date_range.earliest} → {pg.decision_date_range.latest}
          </p>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value?: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-sm border p-5 " +
        (accent
          ? "border-[var(--color-seal-deep)] bg-[var(--color-seal)]/5"
          : "border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]")
      }
    >
      <div
        className={
          "font-[family-name:var(--font-display)] text-3xl mb-1 tabular-nums " +
          (accent ? "text-[var(--color-seal-deep)]" : "")
        }
      >
        {fmt(value)}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
    </div>
  );
}

function DataCard({
  title,
  href,
  stat,
  blurb,
}: {
  title: string;
  href: string;
  stat: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-[var(--color-rule)]/30 rounded-sm p-5 bg-[var(--color-paper-2)] hover:border-[var(--color-seal-deep)] transition-colors"
    >
      <div className="font-[family-name:var(--font-display)] text-[19px] mb-1">
        {title}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
        {stat}
      </div>
      <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">{blurb}</p>
    </Link>
  );
}

function CTACard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-[var(--color-rule)]/30 rounded-sm p-5 hover:border-[var(--color-seal-deep)] transition-colors"
    >
      <div className="font-[family-name:var(--font-display)] text-xl mb-1">{title} →</div>
      <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">{desc}</p>
    </Link>
  );
}
