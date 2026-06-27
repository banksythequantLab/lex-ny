"use client";

/**
 * /check — Brief citation-checker UI. Paste a brief; every case + statute
 * citation is verified against the NY corpus. Verified cites show a
 * citation-strength count (good-law signal); fabricated/unknown cites are
 * flagged in red. This is the "can't fabricate a citation" promise, live.
 */

import { useState } from "react";
import Link from "next/link";

const SAMPLE = `On a motion for summary judgment under CPLR 3212, the movant must make a prima facie showing of entitlement to judgment as a matter of law. See Zuckerman v. City of New York. Alvarez v. Prospect Hospital sets out the burden-shifting framework, and Winegrad v. New York University Medical Center is to the same effect. Defendant's reliance on Fakename v. Nonexistent Holding Corp. is misplaced. Penal Law 125.25 defines murder in the second degree.`;

interface CiteCheck {
  raw: string; kind: "case" | "statute"; status: "verified" | "weak_match" | "not_found";
  matched?: string; detail?: string; url?: string; inbound?: number; similarity?: number; cl_id?: string;
}
interface Result {
  checks: CiteCheck[];
  summary: { total: number; verified: number; weak_match: number; not_found: number };
  timing_ms?: number;
}

export default function CheckPage() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/check-brief", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Check failed");
      setResult(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Citation Checker &middot; Lex.NY
          </span>
          <span>Every cite verified against the live NY corpus</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY &middot; Brief Check
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">Paste a brief. We check every cite.</h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-8">
          Each case and statute citation is matched against the corpus. Verified cites show how
          often they&rsquo;ve been cited (a good-law signal); anything we can&rsquo;t find is flagged
          &mdash; the fabricated-citation catch that gets attorneys sanctioned.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="w-full rounded-sm border border-[var(--color-rule)]/40 bg-[var(--color-paper-2)] p-4 text-sm leading-relaxed font-[family-name:var(--font-mono)] focus:outline-none focus:border-[var(--color-seal-deep)]"
          placeholder="Paste brief text here&hellip;"
        />
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={run}
            disabled={loading || text.trim().length < 10}
            className="px-5 py-2 rounded-sm bg-[var(--color-seal-deep)] text-[var(--color-paper)] font-[family-name:var(--font-display)] text-sm disabled:opacity-40"
          >
            {loading ? "Checking…" : "Check citations"}
          </button>
          {result && (
            <span className="font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-ink-2)]">
              {result.summary.total} cites &middot; <span className="text-green-700">{result.summary.verified} verified</span>
              {result.summary.weak_match > 0 && <> &middot; <span className="text-amber-700">{result.summary.weak_match} weak</span></>}
              {result.summary.not_found > 0 && <> &middot; <span className="text-red-700">{result.summary.not_found} not found</span></>}
              {typeof result.timing_ms === "number" && <> &middot; {result.timing_ms}ms</>}
            </span>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-700 font-[family-name:var(--font-mono)]">{error}</p>}

        {result && (
          <div className="mt-8 space-y-2.5">
            {result.checks.map((c, i) => {
              const s = STATUS[c.status];
              return (
                <div key={i} className={"rounded-sm border-l-[3px] border border-[var(--color-rule)]/25 p-3.5 " + s.bar}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={"font-[family-name:var(--font-mono)] text-[9.5px] tracking-wider uppercase px-1.5 py-0.5 rounded-full " + s.chip}>{s.label}</span>
                        <span className="font-[family-name:var(--font-mono)] text-[15px] uppercase tracking-wider text-[var(--color-ink-2)]">{c.kind}</span>
                      </div>
                      <div className="font-[family-name:var(--font-display)] text-[15px]">&ldquo;{c.raw}&rdquo;</div>
                      {c.matched && (
                        <div className="text-sm text-[var(--color-ink-2)] mt-0.5">
                          → {c.matched}{c.detail ? ` · ${c.detail}` : ""}
                        </div>
                      )}
                      {!c.matched && c.detail && (
                        <div className="text-sm text-[var(--color-ink-2)] mt-0.5">{c.detail}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      {typeof c.inbound === "number" && c.status !== "not_found" && (
                        <div className="font-[family-name:var(--font-mono)] text-[16px] text-[var(--color-seal-deep)]">cited {c.inbound.toLocaleString()}×</div>
                      )}
                      {c.kind === "case" && c.cl_id && (
                        <div><Link href={`/case/${c.cl_id}`} className="font-[family-name:var(--font-mono)] text-[15px] uppercase tracking-wider text-[var(--color-seal-deep)] hover:underline">read →</Link></div>
                      )}
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-mono)] text-[15px] uppercase tracking-wider text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">source ↗</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const STATUS: Record<string, { label: string; bar: string; chip: string }> = {
  verified:   { label: "Verified",  bar: "border-l-green-600 bg-green-500/[0.04]", chip: "bg-green-500/10 text-green-700" },
  weak_match: { label: "Weak match", bar: "border-l-amber-500 bg-amber-500/[0.05]", chip: "bg-amber-500/10 text-amber-700" },
  not_found:  { label: "Not found",  bar: "border-l-red-600 bg-red-500/[0.05]",    chip: "bg-red-500/10 text-red-700" },
};
