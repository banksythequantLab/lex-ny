import Link from "next/link";

export const metadata = {
  title: "Terms of Use - Lex.NY",
  description:
    "Terms of Use for Lex.NY. A research tool, not legal advice. No attorney-client relationship. Apache-2.0 open source. Last updated May 2026.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Terms of Use - Lex.NY
          </span>
          <span>Last updated: May 30, 2026</span>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight"
          >
            <span className="seal-badge">§</span> Lex.NY
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/watches" className="hover:text-[var(--color-ink)]">Watches</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
            <li><Link href="/about" className="hover:text-[var(--color-ink)]">About</Link></li>
          </ul>
        </div>
      </nav>

      <article className="max-w-[760px] mx-auto px-7 py-14">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Terms of Use
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-4 leading-tight">
          Terms of Use
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] leading-relaxed mb-10">
          These terms govern your use of Lex.NY. By accessing the site or its
          APIs, you agree to them. If you don’t agree, don’t use the
          service.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          1. What Lex.NY is
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is a research engine for New York law. It indexes public
          records (opinions from CourtListener and the New York Senate
          OpenLegislation API, statute text from the New York Consolidated
          Laws) and produces summaries with mandatory citations to those
          sources. It is supervised by Derek Soltis, a New York-licensed
          attorney (SDNY/EDNY).
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          2. Not legal advice. No attorney-client relationship.
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is a <em>research tool</em>, not legal advice. Using the site
          does not create an attorney-client relationship between you and
          Derek Soltis, Nota.Lawyer, or any other person or entity affiliated
          with this project. Nothing on Lex.NY constitutes legal counsel for
          your specific situation.
        </p>
        <p className="leading-relaxed mb-4">
          If you face an actual legal matter, you should engage a qualified
          attorney who can review the facts, verify the law as currently in
          force, and advise you in confidence. Lex.NY may surface a relevant
          case or statute, but it cannot replace the judgment of counsel.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          3. Verify everything
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is designed to produce citations to real sources. The links
          it returns go to CourtListener, the New York Senate
          OpenLegislation site, and other primary publishers. You are
          responsible for clicking through, reading the source, and
          confirming that the cited authority says what Lex.NY claims it
          says. AI summarization can err, even with citation anchoring. Do
          not rely on a Lex.NY summary without checking the underlying
          source.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          4. Currency
        </h2>
        <p className="leading-relaxed mb-4">
          The Lex.NY corpus is updated periodically from bulk dumps published
          by the Free Law Project (CourtListener) and the New York State
          Senate. Live web requests via Bright Data fetch current text from
          authoritative publishers at query time, but no system is
          instantaneous. New decisions and statutory amendments may not yet
          be reflected. Treat anything time-sensitive as a starting point
          for further verification, not the final word.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          5. Acceptable use
        </h2>
        <p className="leading-relaxed mb-4">You agree not to:</p>
        <ul className="leading-relaxed mb-4 list-disc pl-6 space-y-1">
          <li>Use Lex.NY to draft or submit legal filings without independent attorney review.</li>
          <li>Attempt to circumvent rate limits, scrape the API at industrial scale, or extract the underlying corpus in bulk.</li>
          <li>Use Lex.NY for unlawful purposes or in violation of applicable rules of professional conduct.</li>
          <li>Misrepresent Lex.NY output as your own legal opinion or as advice given by an attorney.</li>
          <li>Use the site or its APIs in any way that could disable, overburden, or impair operation, or that interferes with other users.</li>
        </ul>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          6. Rate limits
        </h2>
        <p className="leading-relaxed mb-4">
          The public API is rate-limited per IP address. The current limits
          are 10 requests per minute on{" "}
          <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">
            /api/ask
          </code>{" "}
          and 5 requests per minute on{" "}
          <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">
            /api/ask/stream
          </code>
          . Exceeding the limits returns an HTTP 429 with a Retry-After
          header. Higher throughput is available by self-hosting the open
          source repository.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          7. Open source license
        </h2>
        <p className="leading-relaxed mb-4">
          The Lex.NY application code is open source under the Apache License
          2.0. The repository is at{" "}
          <a
            href="https://github.com/banksythequantLab/lex-ny"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            github.com/banksythequantLab/lex-ny
          </a>
          . You are free to copy, modify, and self-host the code subject to
          the license. The underlying legal data (case text from
          CourtListener, statute text from the New York Senate) is governed
          by its own publishers’ terms; consult those sites directly for
          their licensing.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          8. No warranty
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is provided “as is,” without warranty of any kind,
          express or implied. The operators disclaim all warranties of
          merchantability, fitness for a particular purpose, accuracy,
          completeness, currency, and non-infringement. To the maximum
          extent permitted by law, the operators are not liable for any
          claim, damage, or other liability arising from your use of the
          site or its output.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          9. Governing law
        </h2>
        <p className="leading-relaxed mb-4">
          These terms are governed by the laws of the State of New York
          without regard to conflict-of-law principles. Any dispute arising
          from or related to your use of Lex.NY is subject to the exclusive
          jurisdiction of the state and federal courts located in New York,
          New York.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          10. Changes
        </h2>
        <p className="leading-relaxed mb-4">
          We may update these terms. The “last updated” date at the
          top of this page reflects the most recent revision. Continued use
          after a change constitutes acceptance of the new terms. For
          version history, consult the public repository.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          11. Contact
        </h2>
        <p className="leading-relaxed mb-4">
          Questions about these terms or about the operation of Lex.NY can
          be directed via the contact methods listed at{" "}
          <a
            href="https://nota.lawyer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            nota.lawyer
          </a>{" "}
          or by opening an issue on the public repository.
        </p>

        <p className="mt-12 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
          See also:{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-ink)]">
            Privacy
          </Link>
          {" · "}
          <Link href="/about" className="underline hover:text-[var(--color-ink)]">
            About
          </Link>
        </p>
      </article>
    </main>
  );
}
