import Link from "next/link";

export const metadata = {
  title: "How it works — Lex.NY",
  description:
    "The five-step pipeline behind every Lex.NY answer. Embed, retrieve, expand the citation graph, fetch live web, draft under a strict-citation prompt.",
};

const STEPS = [
  {
    n: 1,
    title: "Embed the question",
    short: "mxbai-embed-large · 1024-dim · local on RTX 3090",
    body:
      "Your question goes through `mxbai-embed-large`, a 1024-dimensional embedding model running locally on the workstation via Ollama. No third-party API call, no network round-trip. The embedding takes ~50ms on the GPU.",
    micro: "Ollama embeds query → 1024-d vector",
  },
  {
    n: 2,
    title: "Search the corpus with pgvector",
    short: "ANN over 1.46M embeddings · ivfflat lists=1200",
    body:
      "The embedding becomes a Postgres query against a 1.46-million-row pgvector index. We return the top-K opinions (1.32M indexed) and top-K statutes (40K indexed) by cosine similarity. Hybrid scoring blends vector similarity with BM25-style keyword match. Typical latency: 200-800ms warm.",
    micro: "pgvector ANN → top 10 opinions + 10 statutes",
  },
  {
    n: 3,
    title: "Expand via Neo4j citation graph",
    short: "GraphRAG · 6.95M edges · CITES + APPLIES traversal",
    body:
      "Pure vector search finds documents that sound similar. The citation graph finds documents that matter. We seed the top retrieved opinions into Neo4j and traverse outward by CITES (4.94M opinion-to-opinion edges) and APPLIES (648K opinion-to-statute edges) to surface co-cited authorities. This is what catches a controlling Court of Appeals case the keyword search would have missed.",
    micro: "Neo4j Cypher → +citing + cited + co-applied",
  },
  {
    n: 4,
    title: "Fetch live web sources",
    short: "Bright Data Web Unlocker + SERP · 3 parallel calls",
    body:
      "For currency — recent amendments, new appellate decisions, breaking enforcement actions — we fire Bright Data SERP and Web Unlocker at authoritative NY publishers (nysenate.gov, courtlistener.com, law.justia.com). Five SERP hits, top two unlocked for full body text. This is what bridges the gap between the bulk corpus dump and today.",
    micro: "Bright Data → nysenate.gov + CourtListener + Justia",
  },
  {
    n: 5,
    title: "Draft under a strict-citation prompt",
    short: "Groq Llama 3.3 70B · streaming · [n] markers required",
    body:
      "Everything from steps 2-4 becomes a numbered context block. Llama 3.3 70B (via Groq) drafts the answer under a system prompt that **requires** a `[n]` marker after every factual claim, and explicitly forbids inventing case names, citations, or statute numbers. If the context didn't cover the question, the model is required to say so. The answer streams back token-by-token at ~135 tok/s.",
    micro: "Groq → strict-citation prompt → streamed answer",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            How it works · Lex.NY
          </span>
          <span>5 steps · ~7 seconds end-to-end</span>
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
            <li><Link href="/watches" className="hover:text-[var(--color-ink)]">Watches</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
            <li><Link href="/how-it-works" className="text-[var(--color-ink)] font-medium">How it works</Link></li>
          </ul>
        </div>
      </nav>

      <div className="max-w-[1180px] mx-auto px-7 py-14">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Architecture
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-4 leading-tight max-w-[820px]">
          Five steps from question to cited answer.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[760px] leading-relaxed mb-14">
          Every Lex.NY answer is the output of a five-stage pipeline. Each stage
          produces a verifiable artifact: an embedding, a list of citations, a
          graph traversal, a set of live web fetches, a streamed draft tied to
          numbered sources. No stage can hallucinate because nothing reaches
          the model that wasn&rsquo;t pulled from a real document.
        </p>

        {/* Step-by-step */}
        <div className="space-y-12 mb-20">
          {STEPS.map((s, idx) => (
            <div
              key={s.n}
              className="grid md:grid-cols-[88px_1fr] gap-6 md:gap-10 items-start"
            >
              <div className="flex flex-col items-start">
                <div className="font-[family-name:var(--font-display)] text-6xl text-[var(--color-seal-deep)] leading-none">
                  {s.n}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block w-px h-full min-h-[60px] bg-[var(--color-rule)]/40 ml-[42px] mt-4" />
                )}
              </div>
              <div className="pb-2">
                <h2 className="font-[family-name:var(--font-display)] text-3xl mb-2 leading-tight">
                  {s.title}
                </h2>
                <div className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-4">
                  {s.short}
                </div>
                <p className="leading-relaxed text-[var(--color-ink-2)] max-w-[640px] mb-3">
                  {s.body}
                </p>
                <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]/80 bg-[var(--color-paper-2)] border border-[var(--color-rule)]/30 rounded-sm px-3 py-2 inline-block">
                  {s.micro}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* The why */}
        <div className="border-t border-[var(--color-rule)]/30 pt-12 mb-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl mb-4">
            Why this pipeline and not just &ldquo;ask GPT&rdquo;
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-[var(--color-ink-2)] leading-relaxed">
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
                Retrieval before generation
              </div>
              <p className="mb-4">
                A language model trained on the internet has seen most published
                NY cases, but it has no way to know which ones still control. It
                will confidently cite a case that was reversed in 2019. Lex.NY
                retrieves the actual documents first — the model summarizes what
                we already pulled, with markers.
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
                Graph over vectors
              </div>
              <p className="mb-4">
                Vector search rewards textual similarity. Real legal research
                rewards citation centrality. The 6.95 million-edge citation
                graph in Neo4j is how Lex.NY surfaces controlling precedent
                that pure vector search would have ranked below a similar-sounding
                but rarely-cited dissent.
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
                Live web for currency
              </div>
              <p className="mb-4">
                The bulk corpus dump is current through last month. The world
                isn&rsquo;t. Bright Data Web Unlocker hits the source-of-truth
                NY publishers on every query so brand-new amendments and recent
                appellate decisions still appear in the answer.
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
                Strict-citation system prompt
              </div>
              <p className="mb-4">
                The model is told, with no wiggle room, that every factual
                claim about NY law requires a [n] marker pointing to a source
                in the context block, and that inventing a citation is forbidden.
                When the context doesn&rsquo;t cover the question, the model is
                required to say so plainly.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-[var(--color-rule)]/30 pt-12 mb-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl mb-6">
            By the numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat n="5.5M" label="Legal records" />
            <Stat n="1.3M" label="Opinions embedded" />
            <Stat n="40K" label="Statute sections" />
            <Stat n="6.95M" label="Graph relationships" />
            <Stat n="4.9M" label="Citation edges" />
            <Stat n="648K" label="APPLIES edges" />
            <Stat n="1714" label="Earliest opinion" />
            <Stat n="2026" label="Latest opinion" />
          </div>
        </div>

        {/* Performance */}
        <div className="border-t border-[var(--color-rule)]/30 pt-12 mb-14">
          <h2 className="font-[family-name:var(--font-display)] text-3xl mb-6">
            What the latency budget looks like
          </h2>
          <div className="font-[family-name:var(--font-mono)] text-sm bg-[var(--color-paper-2)] border border-[var(--color-rule)]/30 rounded-sm p-5 leading-relaxed">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
              <span className="text-[var(--color-ink-2)]">Step 1 · embed query (Ollama)</span>
              <span className="text-right tabular-nums">~50 ms</span>
              <span className="text-[var(--color-ink-2)]">Step 2 · pgvector ANN (warm cache)</span>
              <span className="text-right tabular-nums">200–800 ms</span>
              <span className="text-[var(--color-ink-2)]">Step 3 · Neo4j graph expansion</span>
              <span className="text-right tabular-nums">100–400 ms</span>
              <span className="text-[var(--color-ink-2)]">Step 4 · Bright Data live SERP + 2× Unlocker</span>
              <span className="text-right tabular-nums">1.5–3.0 s</span>
              <span className="text-[var(--color-ink-2)]">Step 5 · Groq Llama 3.3 70B drafting</span>
              <span className="text-right tabular-nums">3.0–5.0 s</span>
              <span className="border-t border-[var(--color-rule)]/40 pt-2 mt-1 text-[var(--color-ink)] font-semibold">
                Total (warm, with all sponsors firing)
              </span>
              <span className="text-right tabular-nums border-t border-[var(--color-rule)]/40 pt-2 mt-1 font-semibold">
                ~7 s
              </span>
            </div>
          </div>
        </div>

        {/* Abstain */}
        <div className="border-t border-[var(--color-rule)]/30 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl mb-4">
            When Lex.NY refuses to answer
          </h2>
          <p className="text-[var(--color-ink-2)] leading-relaxed max-w-[720px] mb-3">
            If the best vector similarity from step 2 falls below <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">0.55</code> and
            step 4 returned no live sources either, Lex.NY skips the LLM
            entirely and tells you the corpus doesn&rsquo;t cover your question.
          </p>
          <p className="text-[var(--color-ink-2)] leading-relaxed max-w-[720px] mb-3">
            This is a deliberate constraint. A model that always answers is a
            model that sometimes invents. The abstain branch is what makes the
            strict-citation guarantee real.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] mt-8">
            Open source · Apache-2.0 · github.com/banksythequantLab/lex-ny
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-5">
      <div className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-[var(--color-seal-deep)] mb-1">
        {n}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)]">
        {label}
      </div>
    </div>
  );
}
