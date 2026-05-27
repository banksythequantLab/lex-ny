import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LexLandingPage() {
  return (
    <>
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <div className="flex gap-5 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
              In session · hackathon beta
            </span>
            <span>Docket no. BD-2026-LEX-NY</span>
          </div>
          <div className="flex gap-5">
            <span>S.D.N.Y. · E.D.N.Y.</span>
            <span>v0.1 · Powered by Bright Data</span>
          </div>
        </div>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span>
            Lex.NY
            <small className="font-[family-name:var(--font-sans)] text-xs text-[var(--color-ink-2)] uppercase tracking-wider font-normal ml-1">
              · by Nota.Lawyer
            </small>
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask a question</Link></li>
            <li><Link href="/corpus" className="hover:text-[var(--color-ink)]">Browse corpus</Link></li>
            <li><a href="https://nota.lawyer" className="hover:text-[var(--color-ink)]">Nota.Lawyer</a></li>
            <li>
              <Button asChild>
                <Link href="/ask">Start research →</Link>
              </Button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-16 pb-12">
        <div className="max-w-[1180px] mx-auto px-7 grid lg:grid-cols-[1.25fr_0.85fr] gap-16 items-start">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-3">
              Lex.NY · Research Engine for New York Law
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[64px] leading-[0.96] font-normal tracking-tight mb-6">
              Every case.<br/>
              Every statute.<br/>
              <em className="italic text-[var(--color-seal-deep)]">Every cite verifiable.</em>
            </h1>
            <p className="text-xl text-[var(--color-ink-2)] mb-8 leading-relaxed max-w-[600px]">
              Ask a plain-English question about New York law. Get an answer grounded in real opinions and statutes, with every claim anchored to a source you can open and verify yourself.
            </p>
            <div className="flex gap-4 items-center">
              <Button asChild size="lg">
                <Link href="/ask">Ask a research question →</Link>
              </Button>
              <Link href="/corpus" className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] underline underline-offset-4">
                Or browse the corpus directly
              </Link>
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-6 max-w-[560px]">
              Research tool, not legal advice. Supervised by Derek Soltis, Esq. (NY Bar). For binding counsel, engage Nota.Lawyer's Counsel tier or another NY attorney.
            </p>
          </div>

          {/* Sample questions card */}
          <aside className="rounded-sm border border-[var(--color-rule)]/40 bg-[var(--color-paper-2)] p-7">
            <div className="editorial-label mb-3">Try asking</div>
            <ul className="space-y-3 list-none">
              {SAMPLE_QUESTIONS.map((q) => (
                <li key={q}>
                  <Link
                    href={`/ask?q=${encodeURIComponent(q)}`}
                    className="block text-[15px] leading-snug text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] border-b border-[var(--color-rule)]/20 pb-2.5"
                  >
                    "{q}"
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      {/* The stack */}
      <section className="border-t border-[var(--color-rule)]/30 py-14">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="editorial-label mb-2">How Lex.NY works</div>
          <h2 className="font-[family-name:var(--font-display)] text-[42px] leading-tight mb-12 max-w-[800px]">
            Real sources, real citations, no hallucinated cases.
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-seal-deep)] mb-2">§ 1</div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl mb-3">A NY-specific corpus</h3>
              <p className="text-[var(--color-ink-2)] leading-relaxed">
                NY Court of Appeals, all four Appellate Divisions, the Consolidated Laws of New York (134 laws), and the NYC Administrative Code. Continuously updated by a Bright Data-powered scraper.
              </p>
            </div>

            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-seal-deep)] mb-2">§ 2</div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl mb-3">Hybrid semantic retrieval</h3>
              <p className="text-[var(--color-ink-2)] leading-relaxed">
                Your question is embedded into a 1536-dimensional vector and matched against the corpus with pgvector. Keyword and semantic scores combine to surface the most relevant cases and statutes.
              </p>
            </div>

            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-seal-deep)] mb-2">§ 3</div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl mb-3">Citations are mandatory</h3>
              <p className="text-[var(--color-ink-2)] leading-relaxed">
                Llama 3.3 70B drafts the answer, but the system prompt forbids any unsourced claim. Every paragraph anchors to a numbered marker. If the corpus doesn't have it, Lex.NY tells you instead of guessing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsor section */}
      <section className="border-t border-[var(--color-rule)]/30 py-14 bg-[var(--color-paper-2)]">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="editorial-label mb-2">Built with</div>
          <h2 className="font-[family-name:var(--font-display)] text-[38px] leading-tight mb-8 max-w-[800px]">
            Bright Data + open-source legal data.
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl mb-3">Bright Data Web Unlocker + SERP</h3>
              <p className="text-[var(--color-ink-2)] leading-relaxed mb-3">
                Anti-bot bypass for the sources that don't have free APIs - American Legal Publishing's NYC Admin Code viewer, Justia's most-recent decisions, and live SERP for current-events questions the static corpus doesn't cover.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)]">
                Web Unlocker + SERP API · Submitted to Web Data UNLOCKED + HackerNoon Proof of Usefulness
              </p>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl mb-3">Free legal-data sources</h3>
              <p className="text-[var(--color-ink-2)] leading-relaxed mb-3">
                CourtListener (Free Law Project) for 5,000+ NY appellate opinions back to 1982. NY Senate OpenLegislation for all 134 Consolidated Laws. NYC Council Legistar for local legislation. Free APIs, used because they should be.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)]">
                courtlistener.com · legislation.nysenate.gov · council.nyc.gov
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-rule)]/30 py-10 mt-4">
        <div className="max-w-[1180px] mx-auto px-7 text-sm text-[var(--color-ink-2)]">
          <p className="mb-2">
            Lex.NY · by Nota.Lawyer · Supervised by Derek Soltis, Esq. (NY Bar, SDNY · EDNY)
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider">
            Research tool, not legal advice. No attorney-client relationship is created by use of this site.
            Always verify citations against the underlying source before relying on them.
          </p>
        </div>
      </footer>
    </>
  );
}

const SAMPLE_QUESTIONS = [
  "What are the elements of fraud under NY law?",
  "When does the statute of limitations run on a NY contract claim?",
  "Can a NY non-compete be enforced against a low-wage worker?",
  "What is the standard for piercing the corporate veil in NY?",
  "How does CPLR 7503 govern motions to compel arbitration?",
];
