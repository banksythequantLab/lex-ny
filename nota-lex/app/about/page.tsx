import Link from "next/link";

export const metadata = {
  title: "About — Lex.NY",
  description:
    "Lex.NY is a citation-anchored research engine for New York law. Built by a NY-licensed attorney to be physically incapable of fabricating case citations.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            About · Lex.NY
          </span>
          <span>Research tool · not legal advice</span>
        </div>
      </div>
        <article className="max-w-[760px] mx-auto px-7 py-14">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          About · Lex.NY
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-4 leading-tight">
          Built so it can&rsquo;t hallucinate.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] leading-relaxed mb-10">
          Lex.NY is a research engine for New York law. It is supervised by a
          New York–licensed attorney (SDNY/EDNY). Its architecture makes it
          physically incapable of citing a case that doesn&rsquo;t exist.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          The problem this solves
        </h2>
        <p className="leading-relaxed mb-4">
          Modern general-purpose AI tools confidently produce legal text. They
          will name cases, quote holdings, and cite section numbers. The text
          sounds correct because the model is trained to produce plausible text.
          That isn&rsquo;t the same as truth.
        </p>
        <p className="leading-relaxed mb-4">
          The first time I asked a major commercial AI a question I would have
          billed a client three hundred dollars to research, it cited a case
          that does not exist. Not a misquote — a fictional opinion with a
          confident citation, supposedly from the New York Court of Appeals.
        </p>
        <p className="leading-relaxed mb-4">
          Under{" "}
          <a
            href="https://www.nycbar.org/for-attorneys/professional-ethics/rule/rule-7-1/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            New York Rule of Professional Conduct 7.1
          </a>
          , I cannot ship a tool to clients that confidently invents law. So I
          built one that can&rsquo;t.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          The architecture
        </h2>
        <p className="leading-relaxed mb-4">
          Every claim Lex.NY produces is tied to a source that exists in the
          corpus: 1.3M+ NY opinions and statute sections stored in AWS Aurora
          PostgreSQL, alongside the citation graph (4.9M citation edges in
          Aurora, traversed with recursive CTEs over CITES / APPLIES edges).
          Retrieval is corpus-only — pgvector semantic search and Postgres
          full-text search run against the same Aurora engine.
        </p>
        <p className="leading-relaxed mb-4">
          The retrieval pipeline runs before the language model ever sees the
          question. The model&rsquo;s job is to summarize what was retrieved, in
          context, with a numbered citation after every factual claim. If the
          retrieval layer didn&rsquo;t find a source, the model has nothing to
          cite — and the system prompt requires it to say so rather than invent
          one.
        </p>
        <p className="leading-relaxed mb-4">
          Full architecture and code:{" "}
          <a
            href="https://github.com/banksythequantLab/lex-ny"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            github.com/banksythequantLab/lex-ny
          </a>{" "}
          (Apache-2.0).
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          What this is — and isn&rsquo;t
        </h2>
        <div className="border border-[var(--color-rule)]/30 rounded-sm p-6 mb-4 bg-[var(--color-paper-2)]">
          <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-seal-deep)] mb-2">
            This is
          </div>
          <ul className="leading-relaxed space-y-1 mb-5">
            <li>A research tool for finding NY case law and statutes</li>
            <li>A citation-anchored summary engine — every claim is sourced</li>
            <li>A way to navigate the citation graph (cited-by, citing)</li>
            <li>Open-source, attorney-supervised, free to use</li>
          </ul>
          <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)] mb-2">
            This is not
          </div>
          <ul className="leading-relaxed space-y-1">
            <li>Legal advice on your specific situation</li>
            <li>An attorney-client relationship</li>
            <li>A substitute for a qualified NY attorney</li>
            <li>Comprehensive — the corpus has gaps and the model can be wrong</li>
          </ul>
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Using Lex.NY responsibly
        </h2>
        <p className="leading-relaxed mb-4">
          Every citation Lex.NY shows is drawn from a real New York opinion or
          statute — the links go to CourtListener, the NY Senate&rsquo;s
          OpenLegislation site, and other primary sources, so you can open the
          actual case. The whole point of citation-anchored AI is that the
          citations are real and traceable. What is <em>not</em> guaranteed is the
          legal interpretation: the analysis may be wrong, so do not rely on it to
          make legal decisions.
        </p>
        <p className="leading-relaxed mb-4">
          If you&rsquo;re facing an actual legal problem,{" "}
          <a
            href="https://nota.lawyer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            engage a qualified NY attorney
          </a>{" "}
          rather than relying on this or any other AI tool. Lex.NY is what an
          attorney uses to start a research question, not what a non-attorney
          uses to finish a case.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          About the author
        </h2>
        <p className="leading-relaxed mb-4">
          Derek Soltis is a New York attorney (SDNY/EDNY), recognized as a
          Super Lawyers Rising Star. JD Rutgers, MBA/MS Fordham. He operates{" "}
          <a
            href="https://28usc1782.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            28usc1782.com
          </a>{" "}
          (international discovery practice) and{" "}
          <a
            href="https://nota.lawyer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            Nota.Lawyer
          </a>{" "}
          (LLC formation platform). Lex.NY is one front of a broader research
          and infrastructure project.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Rate limits + fair use
        </h2>
        <p className="leading-relaxed mb-4">
          The Lex.NY public API is rate-limited at 10 requests per minute per
          IP address, with the streaming endpoint at 5/min. Each call runs
          pgvector retrieval against AWS Aurora and a fast hosted model under a
          strict-citation prompt, and capacity is finite. If you need higher
          throughput, fork the repo — the architecture is reproducible.
        </p>

        <p className="mt-12 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
          Every case. Every statute. Every cite verifiable.
        </p>
      </article>
    </main>
  );
}
