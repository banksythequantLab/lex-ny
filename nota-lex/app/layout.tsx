import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL = "https://iam.nota.lawyer";
const SITE_TITLE = "Lex.NY — New York legal research, citation-anchored";
const SITE_DESCRIPTION =
  "A research engine for New York law. 5.5 million records, a 6.95 million-edge citation graph, every claim tied to a real source. Supervised by a NY-licensed attorney. Not legal advice.";

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
    "GraphRAG",
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
        alt: "Lex.NY — Every case. Every statute. Every cite verifiable. 5.5M records, 6.95M graph edges, 1714 to 2026.",
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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--color-paper)] text-[var(--color-ink)]">
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
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
            Open source · Apache-2.0
          </p>
        </div>

        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink)] mb-3">
            Pages
          </div>
          <ul className="space-y-1.5 list-none p-0">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask</Link></li>
            <li><Link href="/search" className="hover:text-[var(--color-ink)]">Search</Link></li>
            <li><Link href="/watches" className="hover:text-[var(--color-ink)]">Watches</Link></li>
            <li><Link href="/stats" className="hover:text-[var(--color-ink)]">Stats</Link></li>
            <li><Link href="/about" className="hover:text-[var(--color-ink)]">About</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink)] mb-3">
            This is not legal advice
          </div>
          <p className="mb-3">
            Lex.NY is a research tool. Using it does not create an attorney-client
            relationship. For binding advice on a specific situation, engage a
            qualified NY attorney.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
            NY RPC 7.1 · Supervised
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-4 flex flex-wrap justify-between items-center gap-3 text-xs text-[var(--color-ink-2)]">
          <span>© 2026 Lex.NY · Built by a NY attorney for the bar</span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
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
