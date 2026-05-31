"use client";

/**
 * Lex.NY homepage - the entrypoint everyone hits first when they click a
 * link to iam.nota.lawyer.
 *
 * Design goals (each one a fix vs. the prior version):
 *
 *  1. Live stats hero strip. The prior version claimed "5,000 opinions
 *     back to 1982" while the real corpus is 1.32M opinions back to 1714.
 *     The strip fetches /api/corpus-stats + /api/graph-stats on mount and
 *     degrades to a dash placeholder if either is unreachable.
 *  2. Real architecture in the "How it works" cards. Prior version said
 *     1536-dim vectors (wrong; we use 1024d mxbai-embed-large) and skipped
 *     the citation graph entirely.
 *  3. Sponsor strip showing all five live integrations + Groq. Prior
 *     version was Bright Data-only.
 *  4. Nav updated to include /watches, /how-it-works, /stats. Drops the
 *     stale "Browse corpus directly" CTA.
 *  5. No more duplicate footer. Layout.tsx already renders a global
 *     Footer; this page no longer emits its own.
 *  6. Updated sample questions to ones whose retrievals actually return
 *     strong NY-specific hits.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CorpusStats {
  postgres?: {
    ok?: boolean;
    total_legal_records?: number;
    opinions?: number;
    statutes?: number;
    opinion_citations?: number;
  };
}

interface GraphStats {
  stats?: {
    total_nodes?: number;
    total_relationships?: number;
  };
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function LexLandingPage() {
  const [corpus, setCorpus] = useState<CorpusStats | null>(null);
  const [graph, setGraph] = useState<GraphStats | null>(null);

  useEffect(() => {
    fetch("/api/corpus-stats")
      .then((r) => r.json())
      .then(setCorpus)
      .catch(() => setCorpus({}));
    fetch("/api/graph-stats")
      .then((r) => r.json())
      .then(setGraph)
      .catch(() => setGraph({}));
  }, []);

  const records = corpus?.postgres?.total_legal_records;
  const opinions = corpus?.postgres?.opinions;
  const statutes = corpus?.postgres?.statutes;
  const citations = corpus?.postgres?.opinion_citations;
  const graphRels = graph?.stats?.total_relationships;

  return (
    <>
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <div className="flex gap-5 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
              In session · NY-licensed attorney supervised
            </span>
            <span className="hidden md:inline">Docket no. BD-2026-LEX-NY</span>
          </div>
          <div className="flex gap-5">
            <span className="hidden sm:inline">S.D.N.Y. · E.D.N.Y.</span>
            <span>Open source · Apache-2.0</span>
          </div>
        </div>
      </div>

      {/* Sticky nav */}
        {/* Hero */}
      <header className="py-14 pb-10">
        <div className="max-w-[1180px] mx-auto px-7 grid lg:grid-cols-[1.25fr_0.85fr] gap-12 items-start">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-3">
              Lex.NY · Research engine for New York law
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[58px] md:text-[64px] leading-[0.96] font-normal tracking-tight mb-6">
              Every case.<br />
              Every statute.<br />
              <em className="italic text-[var(--color-seal-deep)]">Every cite verifiable.</em>
            </h1>
            <p className="text-xl text-[var(--color-ink-2)] mb-8 leading-relaxed max-w-[600px]">
              Ask a plain-English question about New York law. Get an answer grounded in real opinions and statutes, with every claim anchored to a source you can open and verify.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Button asChild size="lg">
                <Link href="/ask">Ask a research question →</Link>
              </Button>
              <Link
                href="/how-it-works"
                className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] underline underline-offset-4"
              >
                How it works
              </Link>
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-6 max-w-[560px]">
              Research tool, not legal advice. Supervised by Derek Soltis, Esq. (NY Bar). For binding counsel, engage a qualified NY attorney.
            </p>
          </div>

          {/* Sample questions card */}
          <aside className="rounded-sm border border-[var(--color-rule)]/40 bg-[var(--color-paper-2)] p-6">
            <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">
              Try asking
            </div>
            <ul className="space-y-2.5 list-none p-0">
              {SAMPLE_QUESTIONS.map((q) => (
                <li key={q}>
                  <Link
                    href={`/ask?q=${encodeURIComponent(q)}`}
                    className="block text-[14.5px] leading-snug text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] border-b border-[var(--color-rule)]/20 pb-2.5"
                  >
                    &ldquo;{q}&rdquo;
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      {/* LIVE STATS STRIP */}
      <section className="border-t border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]">
        <div className="max-w-[1180px] mx-auto px-7 py-10 grid grid-cols-2 md:grid-cols-5 gap-6">
          <Stat n={fmt(records)} label="Legal records" accent />
          <Stat n={fmt(opinions)} label="Opinions" sub="1714 – 2026" />
          <Stat n={fmt(statutes)} label="Statute sections" sub="all 137 NY laws" />
          <Stat n={fmt(citations)} label="Citation edges" sub="opinion → opinion" />
          <Stat n={fmt(graphRels)} label="Graph relationships" sub="Neo4j AuraDB" />
        </div>
        <div className="max-w-[1180px] mx-auto px-7 pb-6">
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
            Live · pulled from{" "}
            <Link href="/stats" className="underline hover:text-[var(--color-ink)]">/stats</Link>
            {" "}on page load
          </p>
        </div>
      </section>

      {/* The architecture */}
      <section className="border-t border-[var(--color-rule)]/30 py-14">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] mb-2">
            How Lex.NY works
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[40px] leading-tight mb-12 max-w-[820px]">
            Built so the model <em className="italic text-[var(--color-seal-deep)]">can’t</em> hallucinate.
          </h2>

          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <ArchCard
              n="§ 1"
              title="A NY-specific corpus"
              body="1.32 million indexed opinions from the NY Court of Appeals, all four Appellate Divisions, and the federal SDNY / EDNY, plus all 137 NY Consolidated Laws and 40,000 statute sections. Embedded into pgvector locally with mxbai-embed-large (1024-d)."
            />
            <ArchCard
              n="§ 2"
              title="Graph beats vectors"
              body="Pure vector search returns cases that read alike. The 6.95 million-edge citation graph in Neo4j returns cases that matter — leading precedent surfaced by traversal, not similarity. CITES + APPLIES edges seeded from every retrieved opinion."
            />
            <ArchCard
              n="§ 3"
              title="Citations are mandatory"
              body="Llama 3.3 70B drafts the answer through Groq, but the system prompt forbids any unsourced claim. Every paragraph anchors to a numbered marker pointing into the retrieval context. If the corpus doesn’t cover the question, Lex.NY abstains."
            />
          </div>
          <div className="flex items-center gap-4 mt-8 flex-wrap">
            <Link
              href="/how-it-works"
              className="text-sm font-[family-name:var(--font-mono)] tracking-wider uppercase border border-[var(--color-seal-deep)] text-[var(--color-seal-deep)] rounded px-3 py-1.5 hover:bg-[var(--color-seal-deep)] hover:text-white transition-colors"
            >
              Full architecture →
            </Link>
            <Link href="/stats" className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] underline underline-offset-4">
              Or see every number live on /stats
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsor strip */}
      <section className="border-t border-[var(--color-rule)]/30 py-14 bg-[var(--color-paper-2)]">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] mb-2">
            Built with — 5 sponsor integrations + Groq, all verified end-to-end
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[34px] leading-tight mb-10 max-w-[800px]">
            Real infrastructure. Real numbers. <em className="italic">Receipts on every page.</em>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SponsorTile
              name="Bright Data"
              role="Web Unlocker + SERP"
              detail="Three parallel calls on every /api/ask — nysenate.gov, law.justia.com, courtlistener.com — for live, current statutory and decisional text."
            />
            <SponsorTile
              name="Neo4j AuraDB"
              role="GraphRAG citation graph"
              detail="1.36M nodes, 6.95M relationships. The CITES + APPLIES traversal turns a vector hit into a controlling-precedent map."
            />
            <SponsorTile
              name="Algolia"
              role="Federated statute search"
              detail="All 40,000 NY statute sections indexed for sub-100ms keyword + facet search. Powers the search page’s instant statute lookup."
            />
            <SponsorTile
              name="Speechmatics"
              role="Voice input"
              detail="Real-time WebSocket transcription wired to the /ask page mic. JWT minted server-side, no client-side keys."
            />
            <SponsorTile
              name="Triggerware"
              role="Legislative watches"
              detail="Two active SQL-compiled watches on federal bills (consumer protection + data privacy / hemp). Live deltas on /watches."
            />
            <SponsorTile
              name="Groq"
              role="Inference"
              detail="Llama 3.3 70B drafting under a strict-citation system prompt. ~135 tok/s streaming via Server-Sent Events."
            />
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] mt-10">
            Submitted to Web Data UNLOCKED · HackerNoon Proof of Usefulness
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-rule)]/30 py-14">
        <div className="max-w-[1180px] mx-auto px-7 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[34px] leading-tight mb-5 max-w-[640px] mx-auto">
            Open the corpus. Ask a question. <em className="italic text-[var(--color-seal-deep)]">Verify every cite.</em>
          </h2>
          <p className="text-[var(--color-ink-2)] mb-7 max-w-[560px] mx-auto leading-relaxed">
            Free, public, rate-limited, attorney-supervised. The repo is on GitHub. The model can’t see anything that wasn’t retrieved first.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button asChild size="lg">
              <Link href="/ask">Ask a research question →</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="https://github.com/banksythequantLab/lex-ny" target="_blank" rel="noopener noreferrer">
                View source on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({
  n,
  label,
  sub,
  accent,
}: {
  n: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={
          "font-[family-name:var(--font-display)] text-[36px] md:text-[42px] leading-none tabular-nums mb-1.5 " +
          (accent ? "text-[var(--color-seal-deep)]" : "text-[var(--color-ink)]")
        }
      >
        {n}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-2)]/70 mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

function ArchCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-seal-deep)] mb-2">
        {n}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-2xl mb-3 leading-tight">
        {title}
      </h3>
      <p className="text-[var(--color-ink-2)] leading-relaxed">{body}</p>
    </div>
  );
}

function SponsorTile({
  name,
  role,
  detail,
}: {
  name: string;
  role: string;
  detail: string;
}) {
  return (
    <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper)] p-5">
      <div className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        {name}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-3">
        {role}
      </div>
      <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">{detail}</p>
    </div>
  );
}

const SAMPLE_QUESTIONS = [
  "What is the standard for summary judgment on a NY negligence claim?",
  "When does the statute of limitations run on a NY contract claim?",
  "What does CPLR 3211 cover for motions to dismiss?",
  "What injuries does Labor Law section 240 (the Scaffold Law) reach?",
  "What is the weight-of-evidence standard on appellate review in NY?",
];
