import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { WarmupBanner } from "@/components/WarmupBanner";
import "./globals.css";

const SITE_URL = "https://iam.nota.lawyer";
const SITE_TITLE = "Lex.NY — New York legal research, citation-anchored";
const SITE_DESCRIPTION =
  "A research engine for New York law, built on AWS. 1.32M opinions and all 137 NY Consolidated Laws in Aurora PostgreSQL, answered by a fast hosted model under a strict-citation prompt with every claim tied to a real source. Supervised by a NY-licensed attorney. Not legal advice.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Lex.NY",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "New York law",
    "legal research",
    "citation graph",
    "NY case law",
    "NY statutes",
    "Court of Appeals",
    "CPLR",
    "Penal Law",
    "open source legal tech",
  ],
  authors: [{ name: "Derek Soltis", url: "https://nota.lawyer" }],
  creator: "Derek Soltis (SDNY/EDNY)",
  publisher: "Lex.NY",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Lex.NY",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Lex.NY — Every case. Every statute. Every cite verifiable. 1.32M NY opinions on AWS Aurora PostgreSQL, 1714 to 2026.",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.svg"],
    creator: "@BanksyAI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--color-paper)] text-[var(--color-ink)]">
        <SiteNav />
        <WarmupBanner />
        {children}
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-rule)]/30 bg-[var(--color-paper-2)] mt-16">
      <div className="max-w-[1180px] mx-auto px-7 py-10 grid md:grid-cols-3 gap-10 text-sm text-[var(--color-ink-2)] leading-relaxed">
        <div>
          <div className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-ink)] text-lg mb-2">
            Lex.NY
          </div>
          <p className="mb-3">
            New York legal research engine. Every case, every statute, every cite
            verifiable. Supervised by a NY-licensed attorney.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase">
            Open source · Apache-2.0
          </p>
        </div>

        <div>
          <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink)] mb-3">
            Pages
          </div>
          <ul className="space-y-1.5 list-none p-0">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
            <li><Link href="/about" className="hover:text-[var(--color-ink)]">About</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink)] mb-3">
            Experimental — not legal advice
          </div>
          <p className="mb-3">
            Lex.NY is an <strong>experimental</strong> research tool and is <strong>not a
            substitute for a licensed attorney</strong>. Using it does not create an
            attorney-client relationship. Do not rely on it for legal decisions — consult a
            qualified NY attorney. Every citation is from a real source, but the legal
            interpretation is not guaranteed correct.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase mb-3">
            NY RPC 7.1 · Supervised
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase">
            <Link href="/terms" className="hover:text-[var(--color-ink)] underline underline-offset-2">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-[var(--color-ink)] underline underline-offset-2">Privacy</Link>
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-4 flex flex-wrap justify-between items-center gap-3 text-xs text-[var(--color-ink-2)]">
          <span></span>
          <span className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase">
            <a
              href="https://github.com/banksythequantLab/lex-ny"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-ink)]"
            >
              github.com/banksythequantLab/lex-ny
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
