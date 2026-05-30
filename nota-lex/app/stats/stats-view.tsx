"use client";

/**
 * StatsView - presentational component for /stats.
 *
 * Receives all data as props from the server page wrapper. No fetches
 * here; the server has already done the work. This is what makes the
 * page load with real numbers instead of '...' placeholders.
 */

import Link from "next/link";

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

export interface CorpusStats {
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

export interface StatsViewProps {
  corpus: CorpusStats | null;
  sponsors: Record<string, unknown>;
  generatedAt: string;
}

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("en-US");
}

export default function StatsView({ corpus, sponsors, generatedAt }: StatsViewProps) {
  const pg = corpus?.postgres;
  const graph = corpus?.neo4j?.stats;

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Live Corpus Telemetry · Lex.NY
          </span>
          <span>Reading local Postgres + Neo4j AuraDB in real time</span>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span> Lex.NY
          </Link>
          <ul className="flex flex-wrap gap-3 md:gap-7 items-center text-xs md:text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/web-search" className="hover:text-[var(--color-ink)]">Web</Link></li>
            <li><Link href="/corpus" className="hover:text-[var(--color-ink)]">Corpus</Link></li>
          </ul>
        </div>
      </nav>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY · System Status
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
          Every number here is live.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-10">
          Fetched the moment you loaded this page — straight from the Postgres corpus and the Neo4j
          citation graph that ground every answer Lex.NY gives.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <HeroStat label="Total legal records" value={pg?.total_legal_records} accent />
          <HeroStat label="Case decisions" value={pg?.opinions} />
          <HeroStat label="NY docket records" value={pg?.ny_cases} />
          <HeroStat label="Statute sections" value={pg?.statutes} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          <MiniStat label="Graph nodes" value={graph?.total_nodes} />
          <MiniStat label="Graph relationships" value={graph?.total_relationships} />
          <MiniStat label="Vector embeddings" value={pg?.embeddings} />
          <MiniStat label="Citation edges" value={pg?.opinion_citations} pending={pg?.opinion_citations === 0} />
        </div>

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
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]">{fmt(c.count)}</span>
                    </div>
                    <div className="h-1 bg-[var(--color-rule)]/15 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-seal)]" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                );
              }) : <div className="px-4 py-8 text-center text-sm text-[var(--color-ink-2)]">—</div>}
            </div>
            {pg?.decision_date_range?.earliest && (
              <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)]">
                Coverage: {pg.decision_date_range.earliest} → {pg.decision_date_range.latest} · {fmt(pg.distinct_courts)} courts
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
                    <span className="font-[family-name:var(--font-mono)] text-xs">{fmt(v)}</span>
                  </div>
                )) : <div className="text-sm text-[var(--color-ink-2)]">—</div>}
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">Relationships</div>
              <div className="space-y-2">
                {graph?.relationship_counts ? Object.entries(graph.relationship_counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span>{k}</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs">{fmt(v)}</span>
                  </div>
                )) : <div className="text-sm text-[var(--color-ink-2)]">—</div>}
              </div>
            </div>
          </div>
        </div>

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
          Source: {corpus?.postgres?.ok ? "local Postgres (lex) · Neo4j AuraDB" : "connecting…"} · generated {generatedAt}
        </p>
      </div>
    </main>
  );
}

function HeroStat({ label, value, accent }: { label: string; value?: number | null; accent?: boolean }) {
  return (
    <div className={"rounded-sm border p-5 " + (accent ? "border-[var(--color-seal-deep)] bg-[var(--color-seal)]/5" : "border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]")}>
      <div className={"font-[family-name:var(--font-display)] text-4xl mb-1 tabular-nums " + (accent ? "text-[var(--color-seal-deep)]" : "")}>
        {value === undefined || value === null ? <span className="text-[var(--color-ink-2)]">—</span> : fmt(value)}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, pending }: { label: string; value?: number | null; pending?: boolean }) {
  return (
    <div className="rounded-sm border border-[var(--color-rule)]/30 p-4">
      <div className="font-[family-name:var(--font-display)] text-2xl mb-0.5 tabular-nums">
        {fmt(value ?? undefined)}{pending ? <span className="text-xs text-[var(--color-ink-2)] ml-1">building…</span> : null}
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
      <span className={"shrink-0 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase px-2 py-1 rounded-full " + (ok ? "bg-green-500/10 text-green-700" : "bg-[var(--color-rule)]/15 text-[var(--color-ink-2)]")}>
        <span className={"w-1.5 h-1.5 rounded-full " + (ok ? "bg-green-500" : "bg-[var(--color-ink-2)]")} />
        {ok ? "Live" : "···"}
      </span>
    </div>
  );
}
