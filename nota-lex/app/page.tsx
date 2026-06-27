"use client";

/**
 * Lex.NY homepage — law-office cover (navy + gold, Source Serif 4 + Inter)
 * with the floating "Ask the corpus" dock pinned to the right edge. Page
 * content is inset left of the dock on large screens.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AskDock } from "@/components/AskDock";

interface CorpusStats {
  postgres?: {
    ok?: boolean;
    total_legal_records?: number;
    opinions?: number;
    statutes?: number;
    opinion_citations?: number;
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

  useEffect(() => {
    fetch("/api/corpus-stats")
      .then((r) => r.json())
      .then(setCorpus)
      .catch(() => setCorpus({}));
  }, []);

  const records = corpus?.postgres?.total_legal_records;
  const opinions = corpus?.postgres?.opinions;
  const statutes = corpus?.postgres?.statutes;
  const citations = corpus?.postgres?.opinion_citations;

  return (
    <>
      <AskDock />

      {/* Status strip */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2 lg:pr-[412px]">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] inline-block" />
            New York legal research · attorney-supervised
          </span>
          <span className="hidden sm:inline text-white/60">Research tool · not legal advice</span>
        </div>
      </div>

      {/* Everything inset left of the floating dock on large screens */}
      <div className="lg:mr-[392px]">
        {/* HERO — navy block */}
        <header className="bg-[var(--color-navy)]">
          <div className="max-w-[1180px] mx-auto px-7 py-16 md:py-24">
            <div className="max-w-[720px]">
              <div className="font-[family-name:var(--font-sans)] text-[18px] font-semibold tracking-[0.18em] uppercase text-[var(--color-gold)] mb-4">
                Lex.NY · Research engine for New York law
              </div>
              <h1 className="text-white font-[family-name:var(--font-display)] text-[48px] md:text-[62px] leading-[1.04] font-bold mb-6">
                Every case. Every statute.<br />
                <span className="text-[var(--color-gold)]">Every cite verifiable.</span>
              </h1>
              <p className="text-xl md:text-[22px] text-white/75 mb-8 leading-relaxed">
                Ask a plain-English question about New York law. Get an answer grounded in real opinions and statutes — every claim anchored to a source you can open and read for yourself.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Link
                  href="/ask"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold text-[15px] hover:brightness-105 transition"
                >
                  Ask a research question →
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center px-6 py-3.5 rounded border border-white/25 text-white text-[15px] hover:bg-white/10 transition"
                >
                  How it works
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 mt-9">
                {STACK_CHIPS.map((c) => (
                  <span
                    key={c}
                    className="font-[family-name:var(--font-sans)] text-[16px] font-medium tracking-wider uppercase text-white/65 border border-white/15 rounded-full px-3 py-1"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <p className="text-[13px] text-white/45 mt-8 max-w-[560px] leading-relaxed">
                Ask the corpus from the panel on the right — or open the full page. Research tool, not legal advice; supervised by Derek Soltis, Esq. (NY Bar).
              </p>
            </div>
          </div>
        </header>

        {/* LIVE STATS STRIP */}
        <section className="bg-[var(--color-paper-2)] border-b border-[var(--color-line)]">
          <div className="max-w-[1180px] mx-auto px-7 py-10 grid grid-cols-2 md:grid-cols-5 gap-6">
            <Stat n={fmt(records)} label="Legal records" accent />
            <Stat n={fmt(opinions)} label="Opinions" sub="1714 – 2026" />
            <Stat n={fmt(statutes)} label="Statute sections" sub="all 137 NY laws" />
            <Stat n={fmt(citations)} label="Citation edges" sub="opinion → opinion" />
            <Stat n="3.5M" label="Vector embeddings" sub="mxbai · 1024-d" />
          </div>
          <div className="max-w-[1180px] mx-auto px-7 pb-6">
            <p className="font-[family-name:var(--font-sans)] text-[16px] font-medium tracking-wider uppercase text-[var(--color-ink-2)]">
              Live · pulled from Aurora via{" "}
              <Link href="/stats" className="underline hover:text-[var(--color-seal-deep)]">/stats</Link>
              {" "}on page load
            </p>
          </div>
        </section>

        {/* SEE IT IN ACTION — demo video */}
        <section className="border-t border-[var(--color-line)] py-16 bg-[var(--color-paper-2)]">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="font-[family-name:var(--font-sans)] text-[18px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              See it in action
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[32px] md:text-[36px] leading-tight mb-8 max-w-[820px]">
              Watch Lex.NY answer a question &mdash; with the receipts.
            </h2>
            <div className="grid lg:grid-cols-[1.7fr_1fr] gap-8 items-start">
              <div
                className="relative w-full rounded-sm overflow-hidden border border-[var(--color-line)] bg-black shadow-[0_12px_44px_rgba(11,31,58,0.12)]"
                style={{ aspectRatio: "16 / 9" }}
              >
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube-nocookie.com/embed/WmfIAZEIziE"
                  title="Lex.NY demo"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div>
                <p className="text-[17px] text-[var(--color-ink-2)] leading-relaxed mb-4">
                  Lex.NY answers plain-English questions about New York law with the receipts attached &mdash; every
                  claim anchored inline to a real opinion or statute you can click straight through to. Search by issue,
                  check a brief&rsquo;s citations, or explore judge analytics, all drawn from 1.32M NY opinions and the
                  full statutes in AWS Aurora.
                </p>
                <p className="text-[17px] text-[var(--color-ink-2)] leading-relaxed mb-6">
                  It retrieves real documents first and abstains when the corpus doesn&rsquo;t cover you &mdash; so it
                  can&rsquo;t invent a case.
                </p>
                <Link href="/ask" className="editorial-button">
                  Try it yourself &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="py-16">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="font-[family-name:var(--font-sans)] text-[18px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              How Lex.NY works
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[38px] md:text-[42px] leading-tight mb-12 max-w-[820px]">
              Built so the model can&rsquo;t hallucinate.
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <ArchCard
                n="§ 1"
                title="A New York–only corpus"
                body="1.32 million indexed opinions — the NY Court of Appeals, all four Appellate Divisions, and the federal SDNY / EDNY — plus all 137 NY Consolidated Laws and ~40,000 statute sections. Embedded with mxbai-embed-large (1024-d) into pgvector on AWS Aurora."
              />
              <ArchCard
                n="§ 2"
                title="The citation graph, in one database"
                body="Every opinion's CITES and APPLIES edges live as relational tables in Aurora and are traversed with recursive CTEs — most-cited decisions, judge influence, good-law signals — all in the same engine as the vectors."
              />
              <ArchCard
                n="§ 3"
                title="Citations are mandatory"
                body="The drafting model works under a system prompt that forbids any unsourced claim. Every paragraph anchors to a numbered marker pointing into the retrieved context. If the corpus doesn't cover the question, Lex.NY abstains."
              />
            </div>

            <div className="flex items-center gap-4 mt-10 flex-wrap">
              <Link
                href="/how-it-works"
                className="text-[15px] font-[family-name:var(--font-sans)] font-semibold tracking-wide uppercase border border-[var(--color-navy)] text-[var(--color-navy)] rounded px-4 py-2 hover:bg-[var(--color-navy)] hover:text-white transition-colors"
              >
                Full architecture →
              </Link>
              <Link href="/stats" className="text-[15px] text-[var(--color-ink-2)] hover:text-[var(--color-navy)] underline underline-offset-4">
                Or see every number live on /stats
              </Link>
            </div>
          </div>
        </section>

        {/* Stack strip */}
        <section className="border-t border-[var(--color-line)] py-16 bg-[var(--color-paper-3)]">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="font-[family-name:var(--font-sans)] text-[18px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
              The stack — AWS-native, verified end-to-end
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[32px] md:text-[36px] leading-tight mb-10 max-w-[800px]">
              Real infrastructure. Real numbers. Receipts on every page.
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {STACK.map((s) => (
                <StackTile key={s.name} {...s} />
              ))}
            </div>
            <p className="font-[family-name:var(--font-sans)] text-[16px] font-medium tracking-wider uppercase text-[var(--color-ink-2)] mt-10">
              Built on AWS · Aurora PostgreSQL Serverless v2 · Deployed on Vercel
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[var(--color-line)] py-16">
          <div className="max-w-[1180px] mx-auto px-7 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-[32px] md:text-[36px] leading-tight mb-5 max-w-[640px] mx-auto">
              Open the corpus. Ask a question. Verify every cite.
            </h2>
            <p className="text-[17px] text-[var(--color-ink-2)] mb-7 max-w-[560px] mx-auto leading-relaxed">
              Free, public, rate-limited, attorney-supervised. The model can&rsquo;t see anything that wasn&rsquo;t retrieved from the corpus first.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/ask" className="editorial-button">
                Ask a research question →
              </Link>
              <a
                href="https://github.com/banksythequantLab/lex-ny"
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-button ghost"
              >
                View source on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>
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
          "font-[family-name:var(--font-display)] text-[38px] md:text-[44px] leading-none tabular-nums mb-1.5 font-bold " +
          (accent ? "text-[var(--color-seal-deep)]" : "text-[var(--color-navy)]")
        }
      >
        {n}
      </div>
      <div className="font-[family-name:var(--font-sans)] text-[16px] font-semibold tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-sans)] text-[16px] text-[var(--color-ink-2)]/70 mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

function ArchCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="lib-card p-6">
      <div className="font-[family-name:var(--font-sans)] text-[18px] font-semibold tracking-wider text-[var(--color-seal-deep)] mb-2">
        {n}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-[26px] mb-3 leading-tight">
        {title}
      </h3>
      <p className="text-[var(--color-ink-2)] leading-relaxed text-[16px]">{body}</p>
    </div>
  );
}

function StackTile({
  name,
  role,
  detail,
}: {
  name: string;
  role: string;
  detail: string;
}) {
  return (
    <div className="lib-card p-5">
      <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold mb-1 text-[var(--color-navy)]">
        {name}
      </div>
      <div className="font-[family-name:var(--font-sans)] text-[16px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-3">
        {role}
      </div>
      <p className="text-[15px] text-[var(--color-ink-2)] leading-relaxed">{detail}</p>
    </div>
  );
}

const STACK_CHIPS = [
  "AWS Aurora",
  "pgvector",
  "mxbai-embed-large",
  "Next.js 16",
  "Vercel",
];

const STACK = [
  {
    name: "AWS Aurora PostgreSQL",
    role: "Serverless v2 · one engine",
    detail:
      "pgvector ANN, the relational citation graph, and full-text search in a single database. IAM-authenticated — passwordless, with a fresh signed token per connection.",
  },
  {
    name: "Answer generation",
    role: "Strict-citation drafting",
    detail:
      "Every answer is drafted under a no-unsourced-claims system prompt. The model only sees what was retrieved from the corpus first — no outside knowledge bleeds in.",
  },
  {
    name: "mxbai-embed-large",
    role: "1024-d embeddings",
    detail:
      "The shared vector space for 3.5M indexed passages. Query and corpus are embedded identically, so retrieval matches on meaning, not keywords.",
  },
  {
    name: "pgvector · IVFFlat",
    role: "Approximate nearest neighbor",
    detail:
      "Sub-second vector search across the embeddings table, tuned for recall on NY-specific retrieval and pre-warmed into memory for the demo.",
  },
  {
    name: "Citation graph",
    role: "Recursive CTEs in Aurora",
    detail:
      "Most-cited decisions, judge influence, and case-to-case treatment — computed by traversing CITES / APPLIES edges, no separate graph store.",
  },
  {
    name: "Vercel",
    role: "Next.js 16 · us-east-1",
    detail:
      "Serverless functions colocated with Aurora for low-latency retrieval. Streaming answers over Server-Sent Events, deployed from GitHub.",
  },
];
