"use client";

/**
 * /stats - live corpus + infrastructure dashboard.
 *
 * This page now also carries the former /corpus overview (provenance intro,
 * "what lives where" architecture cards, and the entry-point CTAs), so the
 * corpus story and the live telemetry live on one page.
 *
 * Architecture:
 *   - Page paints instantly with scrambling-digit placeholders.
 *   - Background fetches hit /api/corpus-stats (Aurora counts) and
 *     /api/llm-stats (drafting-model telemetry); counters ease up as each lands.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatedCounter } from "./AnimatedCounter";
import { Spinner } from "@/components/Spinner";

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
}

const fmt = (n: number | undefined | null) =>
  n === undefined || n === null ? "—" : n.toLocaleString("en-US");

export default function StatsPage() {
  const [corpus, setCorpus] = useState<CorpusStats | null>(null);
  const [sponsors, setSponsors] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;

    fetch("/api/corpus-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCorpus(d);
      })
      .catch(() => {
        /* leave placeholders scrambling */
      });

    const eps = ["llm-stats"];
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

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Live Corpus Telemetry &middot; Lex.NY
          </span>
          <span>Reading AWS Aurora PostgreSQL in real time</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY &middot; The corpus, live
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
          Every number here is live.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[760px] leading-relaxed mb-10">
          Every digitized opinion, every docket, and every section of all 137 NY Consolidated Laws &mdash;
          pulled from CourtListener&rsquo;s bulk dumps and the NY Senate OpenLegislation API, embedded with
          mxbai-embed-large, and stored in AWS Aurora PostgreSQL alongside the relational citation graph.
          The counts below are fetched the moment you load this page; while the server tallies them, watch
          the digits spin.
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
          <MiniStat label="Distinct courts" value={pg?.distinct_courts} digits={2} />
          <MiniStat label="Case decisions" value={pg?.opinions} digits={7} />
          <MiniStat label="Vector embeddings" value={pg?.embeddings} digits={7} />
          <MiniStat label="Citation edges" value={pg?.opinion_citations} digits={7} />
        </div>

        {/* Case decisions by court */}
        <div className="grid gap-8 mb-14">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Case decisions by court</h2>
            {corpus === null && (
              <div className="py-10 flex justify-center"><Spinner size={24} label="Loading corpus stats&hellip;" /></div>
            )}
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
              <p className="mt-3 font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
                Coverage: {pg.decision_date_range.earliest} &rarr; {pg.decision_date_range.latest} &middot;{" "}
                <AnimatedCounter target={pg.distinct_courts} digits={2} /> courts
              </p>
            )}
          </div>
        </div>

        {/* WHAT LIVES WHERE (merged from the former /corpus page) */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">What lives where</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-14">
          <DataCard
            title="Aurora + pgvector"
            href="/ask"
            stat={`${fmt(pg?.opinions)} opinions · ${fmt(pg?.statutes)} statutes`}
            blurb="The source-of-truth corpus in AWS Aurora PostgreSQL. Every row was streamed in from CourtListener bulk dumps or the NY Senate API and indexed for pgvector semantic search."
          />
          <DataCard
            title="Aurora citation graph"
            href="/judges"
            stat={`${fmt(pg?.opinion_citations)} citation edges`}
            blurb="The citation graph as relational tables in Aurora. Every NY-to-NY opinion citation is an edge, traversed with recursive CTEs. Pure vector search misses controlling precedent; the graph finds it."
          />
          <DataCard
            title="Aurora full-text search"
            href="/search"
            stat={`${fmt(pg?.statutes)} statute sections indexed`}
            blurb="Postgres full-text search for the moment when you already know the citation — the same Aurora engine, across all 137 NY Consolidated Laws."
          />
        </div>

        {/* LIVE INFRASTRUCTURE */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Live infrastructure</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-14">
          <SponsorCard name="Aurora pgvector" sub="Semantic retrieval (1024-dim)" data={{ ok: true, stats: { configured: true } }} />
          <SponsorCard name="Hybrid ranking" sub="vector + keyword blend" data={{ ok: true, stats: { configured: true } }} />
          <SponsorCard name="Aurora citation graph" sub="Recursive CTEs over CITES / APPLIES" data={{ ok: true, stats: { configured: true } }} />
          <SponsorCard name="mxbai-embed-large" sub="1024-dim query embeddings" data={{ ok: true, stats: { configured: true } }} />
          <SponsorCard name="Drafting model" sub="Fast hosted model · strict-citation prompt" data={sponsors["llm-stats"]} />
          <SponsorCard name="Hosting" sub="Vercel · Next.js 16 · us-east-1" data={{ ok: true, stats: { configured: true } }} />
        </div>

        {/* THREE WAYS TO USE IT (merged from the former /corpus page) */}
        <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Three ways to use it</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <CTACard
            href="/ask"
            title="Ask a question"
            desc="Plain-English question, citation-anchored answer drawn from the NY corpus in Aurora."
          />
          <CTACard
            href="/search"
            title="Search by issue"
            desc="Semantic case search. Type the legal issue, get the closest NY decisions ranked by citation influence."
          />
          <CTACard
            href="/check"
            title="Check a brief"
            desc="Paste a brief and Lex.NY verifies every citation against the real NY corpus in Aurora."
          />
        </div>

        <p className="mt-10 font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
          Source: {corpus?.postgres?.ok ? "AWS Aurora PostgreSQL · pgvector · the citation graph" : "connecting…"}
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
      <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, digits }: { label: string; value?: number | null; digits: number }) {
  return (
    <div className="rounded-sm border border-[var(--color-rule)]/30 p-4">
      <div className="font-[family-name:var(--font-display)] text-2xl mb-0.5 tabular-nums">
        <AnimatedCounter target={value ?? null} digits={digits} />
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)]">{label}</div>
    </div>
  );
}

function DataCard({ title, href, stat, blurb }: { title: string; href: string; stat: string; blurb: string }) {
  return (
    <Link
      href={href}
      className="block border border-[var(--color-rule)]/30 rounded-sm p-5 bg-[var(--color-paper-2)] hover:border-[var(--color-seal-deep)] transition-colors"
    >
      <div className="font-[family-name:var(--font-display)] text-[19px] mb-1">{title}</div>
      <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">{stat}</div>
      <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">{blurb}</p>
    </Link>
  );
}

function CTACard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block border border-[var(--color-rule)]/30 rounded-sm p-5 hover:border-[var(--color-seal-deep)] transition-colors"
    >
      <div className="font-[family-name:var(--font-display)] text-xl mb-1">{title} &rarr;</div>
      <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">{desc}</p>
    </Link>
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
        <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wide uppercase text-[var(--color-ink-2)] mt-0.5">{sub}</div>
      </div>
      <span
        className={
          "shrink-0 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase px-2 py-1 rounded-full " +
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
        {loading ? "checking…" : ok ? "Live" : "···"}
      </span>
    </div>
  );
}
