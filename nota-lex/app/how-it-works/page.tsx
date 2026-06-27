import Link from "next/link";
import { AskDock } from "@/components/AskDock";

export const metadata = {
  title: "How it works — Lex.NY",
  description:
    "The pipeline behind every Lex.NY answer: embed the question, search the corpus with pgvector on AWS Aurora, expand the citation graph with recursive CTEs, and draft under a strict-citation prompt.",
};

const STEPS = [
  {
    n: 1,
    title: "Embed the question",
    short: "mxbai-embed-large · 1024-dimensional",
    body:
      "Your question is converted into a 1024-dimensional vector by mxbai-embed-large — the same model used to embed every document in the corpus. Embedding the question the identical way is what lets retrieval match on meaning instead of keywords.",
    micro: "question → 1024-d vector",
  },
  {
    n: 2,
    title: "Search the corpus with pgvector on Aurora",
    short: "ANN over 3.5M embeddings · IVFFlat",
    body:
      "The vector becomes an approximate-nearest-neighbor query against a 3.5-million-row pgvector index living in AWS Aurora PostgreSQL. It returns the closest opinions (1.32M indexed) and statute sections (~40K indexed) by cosine distance, blended with a keyword score so an exact section number still ranks. Pre-warmed into memory, this is sub-second.",
    micro: "pgvector ANN → top opinions + statutes",
  },
  {
    n: 3,
    title: "Expand the citation graph — in the same database",
    short: "Recursive CTEs · 4.9M CITES + 648K APPLIES edges",
    body:
      "Pure vector search finds documents that read alike. The citation graph finds the ones that control. Every opinion's CITES (4.9M opinion-to-opinion) and APPLIES (648K opinion-to-statute) edges are stored as relational tables in the same Aurora database and traversed with recursive CTEs — surfacing a controlling Court of Appeals case that keyword similarity would have buried. No separate graph database to drift out of sync.",
    micro: "recursive CTE → controlling + co-cited authority",
  },
  {
    n: 4,
    title: "Draft under a strict-citation prompt",
    short: "Hosted LLM · streaming · [n] markers required",
    body:
      "Everything retrieved becomes a numbered context block. A fast hosted model drafts the answer under a system prompt that requires a [n] marker after every factual claim and forbids inventing a case name, citation, or statute number. If the context didn't cover the question, the model must say so. The answer streams back token-by-token.",
    micro: "strict-citation prompt → streamed, cited answer",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <AskDock />

      {/* Status strip */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2 lg:pr-[412px]">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] inline-block" />
            How it works · Lex.NY
          </span>
          <span className="text-white/60">4 steps · question to cited answer</span>
        </div>
      </div>

      {/* Content area, inset from the floating dock on large screens */}
      <div className="lg:mr-[392px]">
        <div className="max-w-[880px] mx-auto px-7 py-14">
          <div className="font-[family-name:var(--font-sans)] text-[16px] font-semibold tracking-[0.18em] uppercase text-[var(--color-seal-deep)] mb-3">
            The pipeline
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[44px] md:text-5xl mb-5 leading-[1.05]">
            From a plain question to a cited answer.
          </h1>
          <p className="text-lg text-[var(--color-ink-2)] leading-relaxed mb-14">
            Every Lex.NY answer is the output of a four-stage pipeline, and each stage
            produces a verifiable artifact: an embedding, a ranked list of real sources,
            a citation-graph traversal, and a streamed draft tied to numbered authorities.
            No stage can hallucinate, because nothing reaches the model that wasn&rsquo;t
            pulled from a real document first. Try it on the right →
          </p>

          {/* Steps */}
          <div className="space-y-10 mb-20">
            {STEPS.map((s, idx) => (
              <div key={s.n} className="grid grid-cols-[64px_1fr] gap-5 md:gap-8 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] grid place-items-center font-[family-name:var(--font-display)] text-2xl font-bold">
                    {s.n}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="w-px flex-1 min-h-[40px] bg-[var(--color-line)] mt-3" />
                  )}
                </div>
                <div className="pb-2">
                  <h2 className="font-[family-name:var(--font-display)] text-[26px] mb-1.5 leading-tight">
                    {s.title}
                  </h2>
                  <div className="font-[family-name:var(--font-sans)] text-[16px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-3">
                    {s.short}
                  </div>
                  <p className="leading-relaxed text-[var(--color-ink-2)] mb-3">{s.body}</p>
                  <div className="font-[family-name:var(--font-sans)] text-xs text-[var(--color-ink-2)] bg-[var(--color-paper-3)] border border-[var(--color-line)] rounded px-3 py-1.5 inline-block">
                    {s.micro}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Why */}
          <div className="border-t border-[var(--color-line)] pt-12 mb-14">
            <h2 className="font-[family-name:var(--font-display)] text-[30px] mb-6">
              Why this pipeline, not just &ldquo;ask a chatbot&rdquo;
            </h2>
            <div className="grid md:grid-cols-2 gap-8 text-[var(--color-ink-2)] leading-relaxed">
              {WHY.map((w) => (
                <div key={w.h}>
                  <div className="font-[family-name:var(--font-sans)] text-[15px] font-semibold tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
                    {w.h}
                  </div>
                  <p>{w.p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By the numbers */}
          <div className="border-t border-[var(--color-line)] pt-12 mb-14">
            <h2 className="font-[family-name:var(--font-display)] text-[30px] mb-6">By the numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat n="1.32M" label="Opinions indexed" />
              <Stat n="40K" label="Statute sections" />
              <Stat n="3.5M" label="Vector embeddings" />
              <Stat n="4.9M" label="Citation edges" />
              <Stat n="648K" label="APPLIES edges" />
              <Stat n="9.4K" label="Judges profiled" />
              <Stat n="1714" label="Earliest opinion" />
              <Stat n="2026" label="Latest opinion" />
            </div>
          </div>

          {/* Latency */}
          <div className="border-t border-[var(--color-line)] pt-12 mb-14">
            <h2 className="font-[family-name:var(--font-display)] text-[30px] mb-6">
              The latency budget
            </h2>
            <div className="font-[family-name:var(--font-sans)] text-sm bg-white border border-[var(--color-line)] rounded-lg p-5 leading-relaxed">
              <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
                <span className="text-[var(--color-ink-2)]">Step 1 · embed query (mxbai)</span>
                <span className="text-right tabular-nums">~0.4 s</span>
                <span className="text-[var(--color-ink-2)]">Step 2 · pgvector ANN on Aurora (warm)</span>
                <span className="text-right tabular-nums">0.1 – 1.0 s</span>
                <span className="text-[var(--color-ink-2)]">Step 3 · citation-graph CTE expansion</span>
                <span className="text-right tabular-nums">0.1 – 0.5 s</span>
                <span className="text-[var(--color-ink-2)]">Step 4 · strict-citation drafting (streamed)</span>
                <span className="text-right tabular-nums">3 – 6 s</span>
                <span className="border-t border-[var(--color-line)] pt-2 mt-1 text-[var(--color-ink)] font-semibold">
                  Total, warm
                </span>
                <span className="text-right tabular-nums border-t border-[var(--color-line)] pt-2 mt-1 font-semibold text-[var(--color-navy)]">
                  ~5 – 10 s
                </span>
              </div>
            </div>
          </div>

          {/* Abstain */}
          <div className="border-t border-[var(--color-line)] pt-12">
            <h2 className="font-[family-name:var(--font-display)] text-[30px] mb-4">
              When Lex.NY refuses to answer
            </h2>
            <p className="text-[var(--color-ink-2)] leading-relaxed mb-3">
              If the best vector similarity in step 2 falls below threshold and the citation
              graph surfaces nothing on point, Lex.NY skips the model entirely and tells you the
              corpus doesn&rsquo;t cover your question.
            </p>
            <p className="text-[var(--color-ink-2)] leading-relaxed mb-3">
              That&rsquo;s deliberate. A model that always answers is a model that sometimes
              invents. The abstain branch is what makes the strict-citation guarantee real.
            </p>
            <p className="font-[family-name:var(--font-sans)] text-[10.5px] font-medium tracking-wider uppercase text-[var(--color-ink-2)] mt-8">
              Built on AWS Aurora PostgreSQL · Deployed on Vercel ·{" "}
              <a
                href="https://github.com/banksythequantLab/lex-ny"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--color-navy)]"
              >
                github.com/banksythequantLab/lex-ny
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const WHY = [
  {
    h: "Retrieval before generation",
    p: "A general chatbot has read most published NY cases but has no way to know which still control — it will confidently cite a decision reversed in 2019. Lex.NY retrieves the actual documents first; the model only summarizes what was already pulled, with markers.",
  },
  {
    h: "Graph over vectors",
    p: "Vector search rewards textual similarity. Real research rewards citation centrality. Traversing the CITES / APPLIES edges in Aurora is how Lex.NY surfaces controlling precedent that pure similarity would rank below a similar-sounding but rarely-cited dissent.",
  },
  {
    h: "One database, not a stack of services",
    p: "Embeddings, the relational citation graph, and full-text search all live in a single AWS Aurora cluster. Fewer moving parts means nothing falls out of sync, and the whole retrieval path is one IAM-authenticated connection.",
  },
  {
    h: "Strict-citation system prompt",
    p: "The model is told, with no wiggle room, that every factual claim about NY law needs a [n] marker pointing into the context block, and that inventing a citation is forbidden. When the context doesn't cover the question, it must say so plainly.",
  },
];

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg bg-white p-5">
      <div className="font-[family-name:var(--font-display)] text-[28px] tabular-nums font-bold text-[var(--color-seal-deep)] mb-1">
        {n}
      </div>
      <div className="font-[family-name:var(--font-sans)] text-[15px] font-semibold tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
    </div>
  );
}
