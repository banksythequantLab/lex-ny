import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GOV_FEES } from "@nota-lawyer/shared";

export default function TrademarkLandingPage() {
  return (
    <>
      {/* Court caption header */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <div className="flex gap-5 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
              In session · public beta
            </span>
            <span>Docket no. DWNY-2026-NL-TM</span>
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
            <span className="seal-badge">™</span>
            Nota.Lawyer
            <small className="font-[family-name:var(--font-sans)] text-xs text-[var(--color-ink-2)] uppercase tracking-wider font-normal ml-1">
              · Trademark in a Box
            </small>
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">AI conflict search</Link></li>
            <li><Link href="/wizard" className="hover:text-[var(--color-ink)]">File a trademark</Link></li>
            <li><Link href="/dashboard" className="hover:text-[var(--color-ink)]">My filings</Link></li>
            <li>
              <Button asChild>
                <Link href="/search">Start free search →</Link>
              </Button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-16 pb-12">
        <div className="max-w-[1180px] mx-auto px-7 grid lg:grid-cols-[1.25fr_0.85fr] gap-16 items-start">
          <div>
            <span className="editorial-eyebrow">Federal IP · USPTO filings · Nota.Lawyer</span>
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,6.6vw,92px)] leading-[.96] tracking-tight font-medium mt-5 mb-7">
              Trademark a brand.{" "}
              <br />
              <span className="underline decoration-2 underline-offset-8 decoration-[var(--color-gold)]">
                Three fifty.
              </span>
              <br />
              <span className="italic text-[var(--color-seal)]">No service fee.</span>
            </h1>
            <p className="text-[19px] leading-snug max-w-[560px] text-[var(--color-ink-2)]">
              Federal trademark registration at the USPTO for exactly what the government charges &mdash; $350 per class. No "service fee" markup, no $649 LegalZoom upcharge. Free AI-powered conflict search before you file, powered by Bright Data. Optional attorney review for $50.
            </p>
            <div className="mt-8 flex gap-3.5 flex-wrap">
              <Button asChild size="lg">
                <Link href="/search">Run a free AI conflict search →</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/wizard">Start a filing</Link>
              </Button>
            </div>

            {/* Proof row */}
            <div className="mt-10 flex gap-8 flex-wrap items-center">
              <div className="flex flex-col">
                <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">$0</div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">Our service fee</div>
              </div>
              <div className="flex flex-col">
                <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">${GOV_FEES.uspto_base_application_per_class / 100}</div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">USPTO · per class · pass-through</div>
              </div>
              <div className="flex flex-col">
                <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">$999</div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">LegalZoom · all-in</div>
              </div>
              <div className="flex flex-col">
                <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">60%</div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">Approval rate w/ attorney</div>
              </div>
            </div>
          </div>

          {/* AI Conflict Search card on the right */}
          <aside className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] p-6 relative">
            <div className="absolute inset-1.5 border border-[var(--color-rule)]/30 pointer-events-none" />
            <div className="flex justify-between items-baseline font-[family-name:var(--font-mono)] text-[10.5px] tracking-[.18em] uppercase text-[var(--color-ink-2)] border-b border-[var(--color-rule)] pb-2.5 mb-3.5">
              <span>AI conflict search</span>
              <span>$0 · powered by Bright Data</span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight mb-1.5">
              Is your mark available?
            </h3>
            <p className="text-sm text-[var(--color-ink-2)] mb-4">
              Our AI agent searches USPTO TESS, state business registries, and common-law usage in 8 seconds. Catches the ~30% of marks that would have been refused.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/search">Start free AI search →</Link>
            </Button>
            <p className="mt-4 pt-3.5 border-t border-dashed border-[var(--color-rule)]/30 font-[family-name:var(--font-mono)] text-[10.5px] leading-relaxed text-[var(--color-ink-2)]">
              Powered by Bright Data MCP + Llama 3.3 70B. Live USPTO data, NY/DE/WY business registries, and Google common-law search — all in one report.
            </p>
          </aside>
        </div>
      </header>

      {/* Final CTA */}
      <section className="bg-[var(--color-ink)] text-[var(--color-paper)] py-20">
        <div className="max-w-[1180px] mx-auto px-7 grid lg:grid-cols-[1.3fr_0.7fr] gap-12 items-end">
          <div>
            <span className="editorial-eyebrow text-[var(--color-gold)]">Motion to commence</span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(38px,4.6vw,60px)] leading-tight tracking-tight mt-3.5 mb-4">
              Search a mark. <em className="text-[var(--color-gold)] not-italic font-medium">Then file it. The USPTO is the only fee.</em>
            </h2>
            <p className="text-[var(--color-paper)]/70 max-w-xl">
              Start with the free AI conflict search. If your mark is clear, the wizard walks you through the application. We prepare the TEAS package; you submit through USPTO. We charge zero.
            </p>
          </div>
          <div className="flex flex-col gap-3.5 items-start lg:items-end">
            <Button asChild variant="seal" size="lg">
              <Link href="/search">Start free AI search →</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="border-[var(--color-paper)] text-[var(--color-paper)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]">
              <Link href="/wizard">Start a filing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-ink)] text-[var(--color-paper)]/70 text-sm py-9 border-t border-[var(--color-paper)]/10">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="flex justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--color-paper)]">
                <span className="seal-badge">™</span> Nota.Lawyer
              </div>
              <div className="mt-2 text-xs">A Banksy AI property.</div>
            </div>
            <div className="flex gap-9 flex-wrap text-sm">
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">Free legal forms</div>
                <div><Link href="https://copyright.nota.lawyer">Copyright in a Box</Link></div>
                <div><Link href="https://trademark.nota.lawyer">Trademark in a Box</Link></div>
                <div><Link href="https://llc.nota.lawyer">LLC in a Box</Link></div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">This site</div>
                <div><Link href="/search">AI conflict search</Link></div>
                <div><Link href="/wizard">Start a filing</Link></div>
                <div><Link href="/dashboard">My filings</Link></div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">Legal</div>
                <div><Link href="/terms">Terms</Link></div>
                <div><Link href="/privacy">Privacy</Link></div>
              </div>
            </div>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase opacity-50 max-w-3xl leading-loose mt-5">
            Attorney advertising. Prior results do not guarantee a similar outcome. The information on this site is not legal advice and does not create an attorney-client relationship. Counsel-tier engagements are governed by a separate limited-scope engagement letter. FTC affiliate disclosure: Nota.Lawyer earns a commission on partner referrals; pricing is identical to signing up direct. USPTO fees are pass-through and never marked up. AI conflict search powered by Bright Data and Llama 3.3 70B. Nota.Lawyer is a service mark of Banksy AI. © 2026.
          </div>
        </div>
      </footer>
    </>
  );
}
