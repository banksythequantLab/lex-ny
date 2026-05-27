import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GOV_FEES } from "@nota-lawyer/shared";

const WORK_TYPES = [
  {
    slug: "visual-art",
    glyph: "◭",
    title: "Visual art",
    form: "Form VA",
    desc: "Logos, illustrations, designs, graphic art, fine art prints, jewelry designs, tattoo flash, packaging artwork.",
    examples: "Company logos · book covers · NFT base art · packaging",
    fee: GOV_FEES.usco_single_application / 100,
    featured: true,
  },
  {
    slug: "photographs",
    glyph: "⬚",
    title: "Photographs",
    form: "Form VA · GRPPH",
    desc: "Photographs — single image, or up to 750 unpublished photos by a single author in one Group Registration.",
    examples: "Stock photo libraries · wedding portfolios · journalism · product catalogs",
    fee: GOV_FEES.usco_single_application / 100,
    feeAlt: GOV_FEES.usco_group_photographs / 100,
    featured: false,
  },
  {
    slug: "literary",
    glyph: "¶",
    title: "Literary works",
    form: "Form TX",
    desc: "Novels, screenplays, blog archives, technical documentation, source code, poetry, song lyrics, marketing copy.",
    examples: "Novels · screenplays · open-source code · blog archives · poetry",
    fee: GOV_FEES.usco_single_application / 100,
    featured: false,
  },
];

export default function CopyrightLandingPage() {
  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <div className="flex gap-5 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
              In session · public beta
            </span>
            <span>Docket no. DWNY-2026-NL-CR</span>
          </div>
          <div className="flex gap-5">
            <span>S.D.N.Y. · E.D.N.Y.</span>
            <span>v0.1</span>
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">©</span>
            Nota.Lawyer
            <small className="font-[family-name:var(--font-sans)] text-xs text-[var(--color-ink-2)] uppercase tracking-wider font-normal ml-1">
              · Copyright in a Box
            </small>
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="#works" className="hover:text-[var(--color-ink)]">Work types</Link></li>
            <li><Link href="/dashboard" className="hover:text-[var(--color-ink)]">My filings</Link></li>
            <li>
              <Button asChild>
                <Link href="#works">Register a work →</Link>
              </Button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-16">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="grid lg:grid-cols-[1.25fr_0.85fr] gap-16 items-start">
            <div>
              <span className="editorial-eyebrow">Filed under Counsel · Banksy AI · Nota.Lawyer</span>
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(48px,6.6vw,92px)] leading-[.96] tracking-tight font-medium mt-5 mb-7">
                Copyright your work.
                <br />
                <span className="underline decoration-2 underline-offset-8 decoration-[var(--color-gold)]">
                  Forty-five dollars.
                </span>
                <br />
                <span className="italic text-[var(--color-seal)]">No markup.</span>
              </h1>
              <p className="text-[19px] leading-snug max-w-[560px] text-[var(--color-ink-2)]">
                Register a copyright with the US Copyright Office for exactly what the government charges — not a penny more. Visual art, photographs, literary works. Optional attorney review for $50, t-shirt included.
              </p>
              <div className="mt-8 flex gap-3.5 flex-wrap">
                <Button asChild size="lg">
                  <Link href="#works">Pick your work type →</Link>
                </Button>
              </div>

              {/* Proof row */}
              <div className="mt-10 flex gap-8 flex-wrap items-center">
                <div className="flex flex-col">
                  <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">$0</div>
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">Our service fee</div>
                </div>
                <div className="flex flex-col">
                  <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">$45</div>
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">USCO fee · pass-through</div>
                </div>
                <div className="flex flex-col">
                  <div className="font-[family-name:var(--font-display)] font-semibold text-3xl leading-none tracking-tight">$179</div>
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[.18em] uppercase text-[var(--color-ink-2)] mt-1.5">LegalZoom · all-in</div>
                </div>
              </div>
            </div>

            <aside className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] p-6 relative">
              <div className="absolute inset-1.5 border border-[var(--color-rule)]/30 pointer-events-none" />
              <div className="flex justify-between items-baseline font-[family-name:var(--font-mono)] text-[10.5px] tracking-[.18em] uppercase text-[var(--color-ink-2)] border-b border-[var(--color-rule)] pb-2.5 mb-3.5">
                <span>Pick a work type</span>
                <span>$45 each</span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight mb-3.5">
                What are you registering?
              </h3>
              <ul className="list-none p-0 m-0">
                {WORK_TYPES.map((w) => (
                  <li key={w.slug}>
                    <Link
                      href={`/wizard/${w.slug}`}
                      className="grid grid-cols-[46px_1fr_auto] gap-3.5 items-center py-3.5 border-b border-dashed border-[var(--color-rule)]/30 last:border-0 hover:bg-[var(--color-seal)]/5 transition-colors"
                    >
                      <div className="w-10 h-10 border border-[var(--color-ink)] grid place-items-center font-[family-name:var(--font-display)] font-semibold text-xl">
                        {w.glyph}
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-sans)] font-medium text-[15px]">
                          {w.title}
                        </div>
                        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-0.5">
                          {w.form}
                        </div>
                      </div>
                      <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-seal)] font-medium">
                        ${w.fee}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </header>

      {/* Work types section */}
      <section id="works" className="bg-[var(--color-paper-2)] border-y border-[var(--color-rule)]/30 py-20">
        <div className="max-w-[1180px] mx-auto px-7">
          <span className="editorial-eyebrow">Categories of work</span>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(36px,4.6vw,60px)] leading-tight tracking-tight font-medium mt-3.5 mb-4">
            Three kinds of work. <em className="italic text-[var(--color-seal)] not-italic font-medium">One flat fee.</em>
          </h2>
          <p className="text-lg text-[var(--color-ink-2)] max-w-2xl mb-14">
            The US Copyright Office accepts dozens of work types. We support the three that matter most. Each one files under a different form, but the price is the same: $45 to the government, zero to us.
          </p>

          <div className="grid lg:grid-cols-3 gap-0 border border-[var(--color-rule)] bg-[var(--color-paper)]">
            {WORK_TYPES.map((w) => (
              <Link
                key={w.slug}
                href={`/wizard/${w.slug}`}
                className={`p-8 pb-7 border-r border-[var(--color-rule)] last:border-r-0 flex flex-col relative ${w.featured ? "bg-[var(--color-paper-2)]" : ""}`}
              >
                {w.featured && (
                  <span className="absolute top-0 left-0 bg-[var(--color-seal)] text-[var(--color-paper)] font-[family-name:var(--font-mono)] text-[9px] tracking-widest uppercase px-3 py-1.5">
                    Live demo
                  </span>
                )}
                <div className="w-14 h-14 border-2 border-[var(--color-ink)] grid place-items-center font-[family-name:var(--font-display)] font-semibold text-3xl mb-6">
                  {w.glyph}
                </div>
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-3xl tracking-tight mb-1">
                  {w.title}
                </h3>
                <div className="font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase text-[var(--color-seal-deep)] mb-4">
                  {w.form}
                </div>
                <p className="text-sm text-[var(--color-ink-2)] leading-relaxed mb-5">{w.desc}</p>
                <div className="border-t border-dashed border-[var(--color-rule)]/30 pt-3.5 mb-4">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase mb-1">Examples</div>
                  <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-2)] leading-relaxed">
                    {w.examples}
                  </div>
                </div>
                <div className="flex justify-between items-baseline mt-auto pt-4 border-t-2 border-double border-[var(--color-rule)]">
                  <span className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
                    USCO fee · pass-through
                  </span>
                  <span className="font-[family-name:var(--font-display)] font-semibold text-xl">
                    ${w.fee}
                    {w.feeAlt && <small className="font-[family-name:var(--font-mono)] font-normal text-xs text-[var(--color-seal)] ml-1">or ${w.feeAlt}</small>}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--color-ink)] text-[var(--color-paper)] py-20">
        <div className="max-w-[1180px] mx-auto px-7 grid lg:grid-cols-[1.3fr_0.7fr] gap-12 items-end">
          <div>
            <span className="editorial-eyebrow text-[var(--color-gold)]">Motion to commence</span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(38px,4.6vw,60px)] leading-tight tracking-tight mt-3.5 mb-4">
              Register your work. <em className="text-[var(--color-gold)] not-italic font-medium">Pay the government, not the middleman.</em>
            </h2>
            <p className="text-[var(--color-paper)]/70 max-w-xl">
              The wizard runs in your browser. Pick a work type, describe what you made, upload the deposit copy. We file via eCO. Your registration number arrives when USCO completes processing.
            </p>
          </div>
          <Button asChild variant="seal" size="lg">
            <Link href="#works">Start a registration →</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-ink)] text-[var(--color-paper)]/70 text-sm py-9 border-t border-[var(--color-paper)]/10">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="flex justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-lg text-[var(--color-paper)]">
                <span className="seal-badge">©</span> Nota.Lawyer
              </div>
              <div className="mt-2 text-xs">A Banksy AI property.</div>
            </div>
            <div className="flex gap-9 flex-wrap">
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">Free legal forms</div>
                <div><Link href="https://copyright.nota.lawyer">Copyright in a Box</Link></div>
                <div><Link href="https://trademark.nota.lawyer">Trademark in a Box</Link></div>
                <div><Link href="https://llc.nota.lawyer">LLC in a Box</Link></div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">This site</div>
                <div><Link href="/wizard/visual-art">Visual art</Link></div>
                <div><Link href="/wizard/photographs">Photographs</Link></div>
                <div><Link href="/wizard/literary">Literary works</Link></div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase opacity-60 mb-2.5">Legal</div>
                <div><Link href="/terms">Terms</Link></div>
                <div><Link href="/privacy">Privacy</Link></div>
              </div>
            </div>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase opacity-50 max-w-3xl leading-loose mt-5">
            Attorney advertising. Prior results do not guarantee a similar outcome. The information on this site is not legal advice and does not create an attorney-client relationship. The $45 government fee is pass-through to the US Copyright Office. Nota.Lawyer is a service mark of Banksy AI. © 2026.
          </div>
        </div>
      </footer>
    </>
  );
}
