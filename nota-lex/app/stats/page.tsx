"use client";

/**
 * /stats - live corpus + sponsor dashboard, animated.
 *
 * Architecture:
 *   - Page paints instantly with scrambling-digit placeholders.
 *   - Three background fetches kick off in useEffect:
 *       1. /api/corpus-stats   (slow: 22s cold, <100ms warm)
 *       2. /api/graph-stats    (slow: 20s cold, <100ms warm)
 *       3. All sponsor /api/*-stats in parallel
 *   - As each fetch lands, the matching AnimatedCounter eases its
 *     scrambled digits up into the real value.
 *
 * The result: the page is interactive in <100ms, the judges see digits
 * spinning for the same ~25s the server actually needs, and the reveal
 * is dramatic instead of blank.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatedCounter } from "./AnimatedCounter";

const COURT_NAMES: Record<string, string> = {
  ny: "Court of Appeals",
  nyappdiv: "Appellate Division",
  nyappterm: "Appellate Term",
  ca2: "2nd Circuit (Federal)",
  nysd: "SDNY (Federal)",
  nyed: "EDNY (Federal)",
  nynd: "NDNY (Federal)",
  nywd: "WDNY (Federal)",
  nysupct: "Supreme Court (trial)",
  nysurct: "Surrogate's Court",
  nysb: "Bankruptcy (SDNY)",
  circtsdny: "Circuit Court (hist.)",
};

interface CorpusStats {
  postgres?: {
    ok: boolean;
    opinions?: number;
    ny_cases?: number;
    statutes?: number;
    embeddings?: number;
    opinion_citations?: number;
    distinct_courts?: number;
    total_legal_records?: number;
    decision_date_range?: { earliest: string; latest: string };
    top_courts?: { court_id: string; count: number }[];
    error?: string;
  };
  neo4j?: {
    ok: boolean;
    stats?: {
      total_nodes: number;
      total_relationships: number;
      node_counts: Record<string, number>;
      relationship_counts: Record<string, number>;
    };
    error?: string;
  };
}

export default function StatsPage() {
  const [corpus, setCorpus] = useState<CorpusStats | null>(null);
  const [sponsors, setSponsors] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;

    // Single corpus-stats call covers both Postgres counters and Neo4j graph
    // counts (corpus-stats joins them under one cached response).
    fetch("/api/corpus-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCorpus(d);
      })
      .catch(() => {
        /* leave placeholders scrambling */
      });

    // Sponsor endpoints can each respond independently and tile in.
    const eps = [
      "bright-data-stats",
      "graph-stats",
      "algolia-stats",
      "speechmatics-stats",
      "triggerware-stats",
      "llm-stats",
    ];
    eps.forEach((ep) => {
      fetch("/api/" + ep, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setSponsors((s) => ({ ...s, [ep]: d }));
        })
        .catch(() => {
          if (!cancelled) setSponsors((s) => ({ ...s, [ep]: { ok: false } }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const pg = corpus?.postgres;
  const graph = corpus?.neo4j?.stats;

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Live Corpus Telemetry &middot; Lex.NY
          </span>
          <span>Reading local Postgres + Neo4j AuraDB in real time</span>
        </div>
      </div>

      {/* Sticky nav */}
        <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY &middot; System Status
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
          Every number here is live.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-10">
          Counts are fetched the moment you load this page &mdash; straight from the local Postgres
          corpus and the Neo4j citation graph. While the server tallies them, watch the digits
          spin.
        </p>

        {/* HERO COUNTERS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <HeroStat label="Total legal records" value={pg?.total_legal_records} digits={7} accent />
          <HeroStat label="Case decisions" value={pg?.opinions} digits={7} />
          <HeroStat label="NY docket records" value={pg?.ny_cases} digits={7} />
          <HeroStat label="Statute sections" value={pg?.statutes} digits={5} />
        </div>

        {/* SECONDARY ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          <MiniStat label="Graph nodes" value={graph?.total_nodes} digits={7} />
          <MiniStat label="Graph relationships" value={graph?.total_relationships} digits={7} />
          <MiniStat label="Vector embeddings" value={pg?.embeddings} digits={7} />
          <MiniStat label="Citation edges" value={pg?.opinion_citations} digits={7} />
        </div>

        {/* TWO COLUMN: courts + graph breakdown */}
        <div className="grid md:grid-cols-2 gap-8 mb-14">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Case decisions by court</h2>
            <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden">
              {pg?.top_courts?.length ? pg.top_courts.map((c) => {
                const pct = pg.opinions ? (c.count / pg.opinions) * 100 : 0;
                return (
                  <div key={c.court_id} className="px-4 py-2.5 border-b border-[var(--color-rule)]/15 last:border-0">
                    <div className="flex justify-between items-baseline text-sm mb-1">
                      <span className="font-[family-name:var(--font-display)]">{COURT_NAMES[c.court_id] || c.court_id}</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]">
                        <AnimatedCounter target={c.count} digits={Math.max(4, Math.floor(Math.log10(c.count)) + 1)} />
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--color-rule)]/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-seal)] transition-[width] duration-1000 ease-out" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                );
              }) : (
                // Placeholder rows during scramble
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-4 py-2.5 border-b border-[var(--color-rule)]/15 last:border-0">
                    <div className="flex justify-between items-baseline text-sm mb-1">
                      <span className="font-[family-name:var(--font-display)] text-[var(--color-ink-2)]">&hellip;</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]">
                        <AnimatedCounter target={null} digits={5} />
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--color-rule)]/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-seal)]/30 animate-pulse" style={{ width: `${100 - i * 12}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
            {pg?.decision_date_range?.earliest && (
              <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)]">
                Coverage: {pg.decision_date_range.earliest} &rarr; {pg.decision_date_range.latest} &middot;{" "}
                <AnimatedCounter target={pg.distinct_courts} digits={2} /> courts
              </p>
            )}
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Knowledge graph</h2>
            <div className="border border-[var(--color-rule)]/30 rounded-sm p-5">
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">Nodes</div>
              <div className="space-y-2 mb-5">
                {graph?.node_counts ? Object.entries(graph.node_counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span>{k}</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs">
                      <AnimatedCounter target={v} digits={Math.max(2, Math.floor(Math.log10(v)) + 1)} />
                    </span>
                  </div>
                )) : (
                  ["Opinion", "Statute", "Law", "Court"].map((k) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-[var(--color-ink-2)]">{k}</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs"><AnimatedCounter target={null} digits={6} /></span>
                    </div>
                  ))
                )}
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">Relationships</div>
              <div className="space-y-2">
                {graph?.relationship_counts ? Object.entries(graph.relationship_counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span>{k}</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs">
                      <AnimatedCounter target={v} digits={Math.max(2, Math.floor(Math.log10(v)) + 1)} />
                    </span>
                  </div>
                )) : (
                  ["CITES", "DECIDED_BY", "APPLIES", "UNDER"].map((k) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-[var(--color-ink-2)]">{k}</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs"><AnimatedCounter target={null} digits={6} /></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SPONSOR HEALTH WALL */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Live integrations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SponsorCard name="Bright Data" sub="Web Unlocker + SERP" data={sponsors["bright-data-stats"]} />
          <SponsorCard name="Neo4j" sub="GraphRAG citation graph" data={sponsors["graph-stats"]} />
          <SponsorCard name="Algolia" sub="Federated statute search" data={sponsors["algolia-stats"]} />
          <SponsorCard name="Speechmatics" sub="Voice input" data={sponsors["speechmatics-stats"]} />
          <SponsorCard name="Triggerware" sub="Legislative watches" data={sponsors["triggerware-stats"]} />
          <SponsorCard name="Groq" sub="Llama 3.3 70B inference" data={sponsors["llm-stats"]} />
        </div>

        <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)]">
          Source: {corpus?.postgres?.ok ? "local Postgres (lex) \u00b7 Neo4j AuraDB" : "connecting\u2026"}
        </p>
      </div>
    </main>
  );
}

function HeroStat({ label, value, digits, accent }: { label: string; value?: number | null; digits: number; accent?: boolean }) {
  return (
    <div className={"rounded-sm border p-5 " + (accent ? "border-[var(--color-seal-deep)] bg-[var(--color-seal)]/5" : "border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]")}>
      <div className={"font-[family-name:var(--font-display)] text-4xl mb-1 tabular-nums " + (accent ? "text-[var(--color-seal-deep)]" : "")}>
        <AnimatedCounter target={value ?? null} digits={digits} />
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, digits }: { label: string; value?: number | null; digits: number }) {
  return (
    <div className="rounded-sm border border-[var(--color-rule)]/30 p-4">
      <div className="font-[family-name:var(--font-display)] text-2xl mb-0.5 tabular-nums">
        <AnimatedCounter target={value ?? null} digits={digits} />
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}

function SponsorCard({ name, sub, data }: { name: string; sub: string; data: unknown }) {
  const d = data as
    | {
        health?: unknown;
        ok?: boolean;
        stats?: { implementation_status?: string; total_requests?: number; configured?: boolean };
      }
    | undefined;
  const loading = data === undefined;
  let ok = false;
  if (d) {
    if (typeof d.health === "string" && d.health.length > 0) ok = true;
    else if (d.health && typeof d.health === "object" && (d.health as { ok?: boolean }).ok) ok = true;
    else if (d.ok === true) ok = true;
    else if (d.stats?.implementation_status === "live") ok = true;
    else if (typeof d.stats?.total_requests === "number" && d.stats.total_requests > 0) ok = true;
    else if (d.stats?.configured === true) ok = true;
  }
  return (
    <div className="rounded-sm border border-[var(--color-rule)]/30 p-4 flex items-start justify-between gap-3">
      <div>
        <div className="font-[family-name:var(--font-display)] text-[17px] leading-tight">{name}</div>
        <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wide uppercase text-[var(--color-ink-2)] mt-0.5">{sub}</div>
      </div>
      <span
        className={
          "shrink-0 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase px-2 py-1 rounded-full " +
          (loading
            ? "bg-[var(--color-rule)]/15 text-[var(--color-ink-2)]"
            : ok
            ? "bg-green-500/10 text-green-700"
            : "bg-[var(--color-rule)]/15 text-[var(--color-ink-2)]")
        }
      >
        <span
          className={
            "w-1.5 h-1.5 rounded-full " +
            (loading ? "bg-[var(--color-ink-2)] animate-pulse" : ok ? "bg-green-500" : "bg-[var(--color-ink-2)]")
          }
        />
        {loading ? "checking\u2026" : ok ? "Live" : "\u00b7\u00b7\u00b7"}
      </span>
    </div>
  );
}
