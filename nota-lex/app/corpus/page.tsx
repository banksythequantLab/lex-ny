/**
 * /corpus - browse the Lex.NY corpus.
 *
 * Two tabs: Cases (opinions table) and Statutes. Server component, all data
 * fetched at request time from Supabase via the anon key (read-only via RLS).
 *
 * Filters arrive as searchParams so the URL is shareable / bookmarkable.
 *
 * NOTE: This page assumes the schema from migration 0002 is applied. Before
 * the seed scripts run it will render empty states with helpful copy.
 */

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  tab?: string;
  q?: string;
  court?: string;
  law?: string;
  page?: string;
}

const PAGE_SIZE = 25;

// ============================================================
//  Layout shell - shared by both tabs
// ============================================================

export default async function CorpusPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tab = params.tab === "statutes" ? "statutes" : "cases";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  return (
    <>
      {/* Court caption */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Corpus Index · Lex.NY
          </span>
          <span>Read-only · sources link to original publishers</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span>
            Lex.NY
          </Link>
          <ul className="hidden md:flex gap-7 items-center text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><Link href="/ask" className="hover:text-[var(--color-ink)]">Ask a question</Link></li>
            <li>
              <Button asChild size="sm">
                <Link href="/ask">Ask Lex.NY →</Link>
              </Button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Header + tab selector */}
      <header className="py-12 pb-6">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
            Lex.NY · Corpus Index
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
            Browse the corpus.
          </h1>
          <p className="text-lg text-[var(--color-ink-2)] max-w-[700px] leading-relaxed">
            Every case and statute Lex.NY indexes is listed here, with a direct link back to the underlying source.
            This is the same data that grounds the answers on the <Link href="/ask" className="underline underline-offset-4 hover:text-[var(--color-seal-deep)]">/ask</Link> page.
          </p>

          {/* Tabs */}
          <div className="mt-8 flex gap-2 border-b border-[var(--color-rule)]/30">
            <TabLink active={tab === "cases"} href={makeUrl(params, { tab: "cases", page: undefined })}>
              Cases
            </TabLink>
            <TabLink active={tab === "statutes"} href={makeUrl(params, { tab: "statutes", page: undefined })}>
              Statutes
            </TabLink>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <section className="pb-20">
        <div className="max-w-[1180px] mx-auto px-7">
          {tab === "cases" ? (
            <CasesTab params={params} page={page} />
          ) : (
            <StatutesTab params={params} page={page} />
          )}
        </div>
      </section>
    </>
  );
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "px-5 py-3 text-sm font-[family-name:var(--font-sans)] -mb-px border-b-2 transition-colors " +
        (active
          ? "border-[var(--color-seal-deep)] text-[var(--color-ink)] font-medium"
          : "border-transparent text-[var(--color-ink-2)] hover:text-[var(--color-ink)]")
      }
    >
      {children}
    </Link>
  );
}

// ============================================================
//  Cases tab
// ============================================================

async function CasesTab({ params, page }: { params: SearchParams; page: number }) {
  const supabase = await createSupabaseServerClient();
  const q = (params.q || "").trim();
  const court = (params.court || "").trim();

  // Filter set + pagination
  let query = supabase
    .from("opinions")
    .select(
      "id, case_name, citation, court_id, decision_date, precedential_status, source_url, ai_holding",
      { count: "exact" }
    )
    .order("decision_date", { ascending: false });

  if (court) query = query.eq("court_id", court);
  if (q) query = query.ilike("case_name", `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;

  if (error) {
    return <CorpusEmptyState reason={`Could not load opinions: ${error.message}`} />;
  }
  if (!data || data.length === 0) {
    if (count === 0 || count === null) {
      return <CorpusEmptyState reason="No cases match these filters yet." />;
    }
    return <CorpusEmptyState reason="The opinions table is empty. Run the seed-cases script to populate it." />;
  }

  return (
    <>
      <FilterBar tab="cases" params={params}>
        <select
          name="court"
          defaultValue={court}
          className="border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-3 py-2 text-sm rounded-sm"
        >
          <option value="">All courts</option>
          <option value="ny">NY Court of Appeals</option>
          <option value="nyappdiv1">1st Department (AD1)</option>
          <option value="nyappdiv2">2nd Department (AD2)</option>
          <option value="nyappdiv3">3rd Department (AD3)</option>
          <option value="nyappdiv4">4th Department (AD4)</option>
        </select>
        <input
          name="q"
          type="text"
          placeholder="Case name contains…"
          defaultValue={q}
          className="border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-3 py-2 text-sm rounded-sm flex-1 min-w-[200px]"
        />
      </FilterBar>

      {/* Cases table */}
      <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-paper-2)] border-b border-[var(--color-rule)]/30">
            <tr>
              <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] font-normal w-[140px]">Date</th>
              <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] font-normal w-[100px]">Court</th>
              <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] font-normal">Case</th>
              <th className="text-left px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] font-normal w-[200px]">Citation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id as string} className="border-b border-[var(--color-rule)]/15 hover:bg-[var(--color-paper-2)]">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]">
                  {formatDate(c.decision_date as string)}
                </td>
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[11px] tracking-wider uppercase">
                  {courtShort(c.court_id as string)}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={c.source_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] font-[family-name:var(--font-display)] text-[15px] leading-snug"
                  >
                    {c.case_name as string}
                  </a>
                  {c.ai_holding ? (
                    <div className="text-xs text-[var(--color-ink-2)] mt-1 leading-snug">
                      {(c.ai_holding as string).slice(0, 160)}
                      {(c.ai_holding as string).length > 160 ? "…" : ""}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-2)]">
                  {(c.citation as string) || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={count || 0} page={page} params={params} />
    </>
  );
}

// ============================================================
//  Statutes tab
// ============================================================

async function StatutesTab({ params, page }: { params: SearchParams; page: number }) {
  const supabase = await createSupabaseServerClient();
  const q = (params.q || "").trim();
  const law = (params.law || "").trim();

  let query = supabase
    .from("statutes")
    .select(
      "id, law_id, law_name, location_id, doc_type, title, jurisdiction, source_url, text",
      { count: "exact" }
    )
    .eq("doc_type", "SECTION")
    .eq("repealed", false)
    .order("law_id", { ascending: true })
    .order("location_id", { ascending: true });

  if (law) query = query.eq("law_id", law);
  if (q) query = query.or(`title.ilike.%${q}%,text.ilike.%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;

  // Distinct law options for the dropdown
  const { data: lawOptions } = await supabase
    .from("statutes")
    .select("law_id, law_name")
    .order("law_id", { ascending: true });
  const uniqueLaws = dedupeByLawId(lawOptions || []);

  if (error) {
    return <CorpusEmptyState reason={`Could not load statutes: ${error.message}`} />;
  }
  if (!data || data.length === 0) {
    if (count === 0 || count === null) {
      return <CorpusEmptyState reason="No statutes match these filters yet." />;
    }
    return <CorpusEmptyState reason="The statutes table is empty. Run the seed-statutes script to populate it." />;
  }

  return (
    <>
      <FilterBar tab="statutes" params={params}>
        <select
          name="law"
          defaultValue={law}
          className="border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-3 py-2 text-sm rounded-sm"
        >
          <option value="">All NY laws</option>
          {uniqueLaws.map((l) => (
            <option key={l.law_id} value={l.law_id}>
              {l.law_id} · {l.law_name}
            </option>
          ))}
        </select>
        <input
          name="q"
          type="text"
          placeholder="Section title or text contains…"
          defaultValue={q}
          className="border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-3 py-2 text-sm rounded-sm flex-1 min-w-[200px]"
        />
      </FilterBar>

      <div className="space-y-3">
        {data.map((s) => (
          <a
            key={s.id as string}
            href={s.source_url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-[var(--color-rule)]/30 rounded-sm p-4 bg-[var(--color-paper-2)] hover:border-[var(--color-seal-deep)] transition-colors"
          >
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <div className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider text-[var(--color-seal-deep)] font-medium">
                {s.law_id as string} {s.location_id as string}
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)]">
                {s.jurisdiction as string} · {s.law_name as string}
              </div>
            </div>
            {s.title ? (
              <div className="font-[family-name:var(--font-display)] text-[17px] text-[var(--color-ink)] leading-snug">
                {s.title as string}
              </div>
            ) : null}
            {s.text ? (
              <div className="text-sm text-[var(--color-ink-2)] mt-2 leading-snug line-clamp-2">
                {(s.text as string).slice(0, 280)}
                {(s.text as string).length > 280 ? "…" : ""}
              </div>
            ) : null}
          </a>
        ))}
      </div>

      <Pagination total={count || 0} page={page} params={params} />
    </>
  );
}

// ============================================================
//  Shared bits
// ============================================================

function FilterBar({
  tab,
  params,
  children,
}: {
  tab: string;
  params: SearchParams;
  children: React.ReactNode;
}) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-center gap-3 p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)]/30 rounded-sm">
      <input type="hidden" name="tab" value={tab} />
      {children}
      <Button type="submit" size="sm">Apply</Button>
      {(params.q || params.court || params.law) && (
        <Link
          href={`/corpus?tab=${tab}`}
          className="text-xs text-[var(--color-ink-2)] hover:text-[var(--color-ink)] underline underline-offset-2"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}

function Pagination({ total, page, params }: { total: number; page: number; params: SearchParams }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) {
    return (
      <p className="mt-6 text-sm text-[var(--color-ink-2)]">
        {total.toLocaleString()} result{total === 1 ? "" : "s"}
      </p>
    );
  }

  const prevUrl = page > 1 ? makeUrl(params, { page: String(page - 1) }) : null;
  const nextUrl = page < totalPages ? makeUrl(params, { page: String(page + 1) }) : null;

  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      <p className="text-[var(--color-ink-2)] font-[family-name:var(--font-mono)] text-xs">
        Page {page} of {totalPages.toLocaleString()} · {total.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        {prevUrl ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={prevUrl}>← Previous</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>← Previous</Button>
        )}
        {nextUrl ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={nextUrl}>Next →</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>Next →</Button>
        )}
      </div>
    </div>
  );
}

function CorpusEmptyState({ reason }: { reason: string }) {
  return (
    <div className="border border-[var(--color-rule)]/30 rounded-sm p-12 text-center bg-[var(--color-paper-2)]">
      <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] mb-3">
        Empty index
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-2xl mb-2">{reason}</h3>
      <p className="text-sm text-[var(--color-ink-2)] max-w-[500px] mx-auto leading-relaxed">
        The corpus is populated by running <code className="font-[family-name:var(--font-mono)] text-xs bg-[var(--color-paper)] px-1.5 py-0.5 rounded">seed-cases.ts</code>
        {" "}and <code className="font-[family-name:var(--font-mono)] text-xs bg-[var(--color-paper)] px-1.5 py-0.5 rounded">seed-statutes.ts</code> against a Supabase project with migration 0002 applied.
        Once data is in, this page will list everything.
      </p>
      <div className="mt-6">
        <Button asChild size="sm">
          <Link href="/ask">Try the Ask page anyway →</Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
//  helpers
// ============================================================

function makeUrl(current: SearchParams, overrides: Partial<SearchParams>): string {
  const merged: Record<string, string | undefined> = { ...current, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/corpus?${qs}` : "/corpus";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function courtShort(courtId: string): string {
  return ({
    ny: "NY CoA",
    nyappdiv1: "AD1",
    nyappdiv2: "AD2",
    nyappdiv3: "AD3",
    nyappdiv4: "AD4",
  } as Record<string, string>)[courtId] || courtId;
}

function dedupeByLawId(rows: Array<{ law_id: unknown; law_name: unknown }>): Array<{ law_id: string; law_name: string }> {
  const seen = new Set<string>();
  const out: Array<{ law_id: string; law_name: string }> = [];
  for (const r of rows) {
    const id = String(r.law_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ law_id: id, law_name: String(r.law_name || "") });
  }
  return out;
}
