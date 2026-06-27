/**
 * /case/[cl_id] — source viewer. The "receipts" payoff: the real opinion text
 * from the corpus, its citation-strength, and a "cited by" panel — all served
 * from Postgres (no external dependency). Server component: calls the shared
 * data layer directly.
 */
import Link from "next/link";
import { getOpinion, citedBy } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COURT: Record<string, string> = {
  ny: "Court of Appeals", nyappdiv: "Appellate Division", nyappterm: "Appellate Term",
  nysupct: "Supreme Court", nysurct: "Surrogate's Court", nyclaimsct: "Court of Claims",
  nyfamct: "Family Court",
};
const court = (id: string) => COURT[id] || id;

export default async function CasePage({ params }: { params: Promise<{ cl_id: string }> }) {
  const { cl_id } = await params;
  const op = await getOpinion(cl_id);

  if (!op) {
    return (
      <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
        <div className="max-w-[900px] mx-auto px-7 py-16">
          <p className="text-[var(--color-ink-2)]">No opinion found for id {cl_id}.</p>
          <Link href="/judges" className="text-[var(--color-seal-deep)] underline">← Back to Judges</Link>
        </div>
      </main>
    );
  }

  const cb = await citedBy(cl_id, { limit: 12 });

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Source · Lex.NY
          </span>
          <span>Opinion text served from the local corpus</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-7 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl mb-2">{op.case_name}</h1>
        <div className="font-[family-name:var(--font-mono)] text-[18px] text-[var(--color-ink-2)] mb-1">
          {court(op.court_id)} · {op.decision_date || "date n/a"}{op.citation ? ` · ${op.citation}` : ""}
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[18px] mb-6">
          <span className="text-[var(--color-seal-deep)]">cited {op.inbound.toLocaleString()}×</span>
          {op.cl_id && <> · <a className="text-[var(--color-ink-2)] underline" href={`https://www.courtlistener.com/opinion/${op.cl_id}/`} target="_blank" rel="noopener noreferrer">CourtListener ↗</a></>}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <article className="md:col-span-2">
            {op.ai_summary && (
              <div className="mb-5 p-4 rounded-sm border border-[var(--color-rule)]/30 bg-[var(--color-paper-2)]">
                <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)] mb-1.5">AI summary</div>
                <p className="text-sm leading-relaxed m-0">{op.ai_summary}</p>
              </div>
            )}
            <div className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)] mb-2">Opinion text</div>
            {op.text
              ? <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap max-h-[70vh] overflow-auto border border-[var(--color-rule)]/20 rounded-sm p-4 bg-[var(--color-paper-2)]/40">{op.text}</div>
              : <p className="text-sm text-[var(--color-ink-2)]">Full text not yet loaded for this opinion (re-embed in progress). The citation graph + metadata above are live.</p>}
          </article>

          <aside>
            <div className="font-[family-name:var(--font-display)] text-xl mb-3">Cited by {cb.total_citers.toLocaleString()}</div>
            <div className="border border-[var(--color-rule)]/30 rounded-sm overflow-hidden">
              {cb.citers.length === 0
                ? <div className="px-4 py-3 text-sm text-[var(--color-ink-2)]">No citing cases in corpus.</div>
                : cb.citers.map((c) => (
                    <Link key={c.opinion_id} href={c.cl_id ? `/case/${c.cl_id}` : "#"}
                      className="block px-4 py-2.5 border-b border-[var(--color-rule)]/15 last:border-0 hover:bg-[var(--color-paper-2)]">
                      <div className="text-sm leading-tight">{c.case_name}</div>
                      <div className="font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-ink-2)] mt-0.5">
                        {court(c.court_id)} {c.decision_date ? `· ${c.decision_date}` : ""} · cited {c.inbound.toLocaleString()}×
                      </div>
                    </Link>
                  ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
