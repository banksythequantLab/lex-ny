"use client";

/**
 * SiteNav — uniform navigation bar shared by every page.
 *
 * Mounted once in app/layout.tsx so every route gets the same set of
 * links in the same order, with the active route highlighted.
 *
 * Uses usePathname so the highlight stays correct on client-side
 * route transitions without a re-render of layout.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/ask", label: "Ask" },
  { href: "/search", label: "Search" },
  { href: "/check", label: "Check" },
  { href: "/stats", label: "Stats" },
  { href: "/judges", label: "Judges" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Match exact path OR any subroute (e.g., /cited-by/* is under nothing, but
  // /ask?q=... still matches "/ask" because pathname omits the query).
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
      <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight"
        >
          <span className="seal-badge">&sect;</span> Lex.NY
        </Link>
        <ul className="flex flex-wrap gap-3 md:gap-6 items-center text-xs md:text-sm text-[var(--color-ink-2)] list-none m-0 p-0">
          {NAV_ITEMS.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <li key={it.href} className="m-0 p-0">
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "transition-colors " +
                    (active
                      ? "text-[var(--color-ink)] font-medium border-b-2 border-[var(--color-seal-deep)] pb-0.5"
                      : "hover:text-[var(--color-ink)]")
                  }
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
