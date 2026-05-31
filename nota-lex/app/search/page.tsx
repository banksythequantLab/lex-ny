"use client";

/**
 * /search - semantic case search UI.
 *
 * One input box. Type a natural-language question, hit Enter, and get the
 * most semantically similar NY case decisions back, ranked by vector
 * similarity and augmented with citation-graph influence ("× cites").
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { VoiceInputButton } from "../ask/VoiceInputButton";

interface Hit {
  id: string;
  cl_id: string;
  case_name: string;
  court_id: string;
  decision_date: string;
  citation: string | null;
  source_url: string;
  similarity: number;
  cited_by_count: number;
  snippet: string;
  precedential_status: string | null;
}

interface SearchResponse {
  query: string;
  results: Hit[];
  timing_ms: { embed: number; retrieve: number; total: number };
  total_candidates: number;
}

const COURT_NAMES: Record<string, string> = {
  ny: "NY CoA",
  nyappdiv: "App Div",
  nyappterm: "App Term",
  ca2: "2nd Cir",
  nysd: "SDNY",
  nyed: "EDNY",
  nynd: "NDNY",
  nywd: "WDNY",
  nysupct: "Sup Ct",
  nysurct: "Surrogate",
  nysb: "Bankr SDNY",
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [minCites, setMinCites] = useState(0);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice dictation baseline (see /ask for the same pattern). Anchors the
  // current voice segment to whatever text was in the input when the mic
  // started; reset to null when the user types manually.
  const voiceBaselineRef = useRef<string | null>(null);

  // doSearch() runs the actual API call. It takes the query as a parameter
  // so chip-click handlers can pass the chip text directly without waiting
  // for setQ() state to propagate. search() is the form-submit wrapper.
  async function doSearch(queryStr: string) {
    const queryToUse = queryStr.trim();
    if (!queryToUse) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: queryToUse, limit: "20" });
      if (minCites > 0) params.set("min_cites", String(minCites));
      const r = await fetch("/api/search/cases?" + params.toString());
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Search failed");
      setRes(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    await doSearch(q);
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Semantic case search · Lex.NY
          </span>
          <span>pgvector ANN over 1.32M NY decisions</span>
        </div>
      </div>
        <div className="max-w-[1180px] mx-auto px-7 py-12">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Lex.NY · Case search
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-3">
          Find the case, not the keyword.
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] max-w-[720px] leading-relaxed mb-8">
          Describe the issue in your own words. Lex.NY embeds your query, finds the closest
          NY decisions by semantic meaning, and ranks them by how often they&rsquo;ve been cited.
        </p>

        <form onSubmit={search} className="mb-3 flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              voiceBaselineRef.current = null;
            }}
            placeholder="e.g. summary judgment standard in negligence cases"
            className="flex-1 border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-4 py-3 text-base rounded-sm focus:outline-none focus:border-[var(--color-seal-deep)]"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="px-6 py-3 bg-[var(--color-seal-deep)] text-white text-sm font-[family-name:var(--font-sans)] rounded-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {/* Voice input row: same baseline-ref pattern as /ask so partials
            extend the current input rather than overwriting it, and finals
            commit so the next segment grows from the finalized text. */}
        <div className="mb-6">
          <VoiceInputButton
            onPartialTranscript={(t) => {
              if (voiceBaselineRef.current === null) {
                voiceBaselineRef.current = q;
              }
              const base = voiceBaselineRef.current;
              setQ(base + (base.trim() ? " " : "") + t);
            }}
            onFinalTranscript={(t) => {
              const base = voiceBaselineRef.current ?? q;
              const next = base + (base.trim() ? " " : "") + t;
              setQ(next);
              voiceBaselineRef.current = next;
            }}
            disabled={loading}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {["summary judgment standard", "landlord tenant retaliation", "weight of the evidence criminal appeal", "Article 78 statute of limitations", "wrongful termination at-will employment"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQ(s); doSearch(s); }}
              className="px-3 py-1.5 border border-[var(--color-rule)]/30 rounded-full hover:border-[var(--color-seal-deep)] text-[var(--color-ink-2)]"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Citation-influence filter row. Lets the demo zoom past the
            current 'old-bias' (the embed job started historical and is
            climbing forward) by demanding minimum graph-cited cases. */}
        <div className="flex flex-wrap items-center gap-2 mb-10 text-xs">
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] mr-1">
            Min citations
          </span>
          {[
            { label: "any", val: 0 },
            { label: "≥10", val: 10 },
            { label: "≥100", val: 100 },
            { label: "≥1k (landmarks)", val: 1000 },
          ].map((opt) => {
            const active = minCites === opt.val;
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => setMinCites(opt.val)}
                className={
                  "px-3 py-1.5 border rounded-full text-xs transition-colors " +
                  (active
                    ? "border-[var(--color-seal-deep)] bg-[var(--color-seal-deep)] text-white"
                    : "border-[var(--color-rule)]/30 text-[var(--color-ink-2)] hover:border-[var(--color-seal-deep)]")
                }
              >
                {opt.label}
              </button>
            );
          })}
          {minCites > 0 && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-seal-deep)] ml-2">
              Filtering for cases cited ≥{minCites.toLocaleString()} times
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-900 rounded-sm text-sm">
            {error}
          </div>
        )}

        {res && (
          <>
            <div className="mb-4 font-[family-name:var(--font-mono)] text-[11px] tracking-wider uppercase text-[var(--color-ink-2)]">
              {res.results.length} results · embed {res.timing_ms.embed}ms · retrieve {res.timing_ms.retrieve}ms · total {res.timing_ms.total}ms
            </div>
            <div className="space-y-3">
              {res.results.map((h) => (
                <a
                  key={h.id}
                  href={h.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-[var(--color-rule)]/30 rounded-sm p-4 bg-[var(--color-paper-2)] hover:border-[var(--color-seal-deep)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-1.5">
                    <div className="font-[family-name:var(--font-display)] text-[17px] leading-snug">
                      {h.case_name}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase text-[var(--color-ink-2)] whitespace-nowrap">
                      sim {h.similarity.toFixed(3)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-[family-name:var(--font-mono)] tracking-wider uppercase text-[var(--color-ink-2)]">
                    <span className="px-1.5 py-0.5 bg-[var(--color-rule)]/15 rounded">{COURT_NAMES[h.court_id] || h.court_id}</span>
                    <span>{h.decision_date}</span>
                    {h.cited_by_count > 0 && (
                      <span className="text-[var(--color-seal-deep)]">{h.cited_by_count.toLocaleString()} cites</span>
                    )}
                    {h.citation && <span>· {h.citation}</span>}
                    {h.precedential_status && <span>· {h.precedential_status}</span>}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {!res && !error && !loading && (
          <div className="border border-dashed border-[var(--color-rule)]/40 rounded-sm p-10 text-center">
            <p className="text-sm text-[var(--color-ink-2)]">
              Type a query above. Lex.NY currently has{" "}
              <strong className="text-[var(--color-ink)]">tens of thousands</strong>{" "}
              of opinions embedded (climbing toward 1.32M live). Citation-graph rankings come from{" "}
              <strong className="text-[var(--color-ink)]">2.2M+ NY-to-NY citations</strong> already loaded.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
