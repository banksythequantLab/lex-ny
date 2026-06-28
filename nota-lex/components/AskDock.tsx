"use client";

/**
 * AskDock — a floating "Ask the corpus" panel pinned to the right edge of the
 * screen (from just under the nav down to the bottom). Streams a cited answer
 * from /api/ask/stream, reusing the same SSE protocol as the full /ask page.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWarmup } from "@/components/useWarmup";
import { useElapsed } from "@/components/useElapsed";
import { Spinner } from "@/components/Spinner";

interface Cite {
  marker: number;
  kind: "opinion" | "statute" | "live_web";
  display: string;
  bluebook?: string;
  url?: string;
  cl_id?: string | null;
  snippet?: string;
}

const SAMPLES = [
  "Standard for summary judgment under CPLR 3212?",
  "What does Labor Law § 240 (Scaffold Law) reach?",
  "Elements of common-law fraud in New York?",
];

export function AskDock() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [cites, setCites] = useState<Cite[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedAns, setCopiedAns] = useState(false);
  const [open, setOpen] = useState(true);
  const { status: warmStatus } = useWarmup();
  const elapsed = useElapsed(loading);

  useEffect(() => {
    const el = document.documentElement;
    if (open) el.classList.remove("dock-closed");
    else el.classList.add("dock-closed");
    return () => {
      el.classList.remove("dock-closed");
    };
  }, [open]);

  async function run(question: string) {
    const qq = question.trim();
    if (!qq || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    setCites([]);
    setProgress("Embedding your question…");

    const stages = [
      "Embedding your question…",
      "Searching the NY corpus in Aurora…",
      "Ranking sources by relevance…",
      "Drafting a cited answer…",
    ];
    let si = 0;
    const iv = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1);
      setProgress(stages[si]);
    }, 1600);

    let acc = "";
    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: qq, use_live_serp: false }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let sep: number;
        while ((sep = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          if (!raw || raw.startsWith(":")) continue;
          let ev = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).replace(/^ /, "");
          }
          if (!data) continue;
          let p: any;
          try {
            p = JSON.parse(data);
          } catch {
            continue;
          }
          if (ev === "meta") {
            clearInterval(iv);
            setProgress("Drafting answer with cited sources…");
          } else if (ev === "citations") {
            setCites(p.citations || []);
          } else if (ev === "delta") {
            acc += p.text || "";
            setAnswer(acc);
            setProgress(null);
          } else if (ev === "done") {
            setProgress(null);
          } else if (ev === "error") {
            throw new Error(p.message || "Stream error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      clearInterval(iv);
      setProgress(null);
      setLoading(false);
    }
  }

  const citeMap = new Map(cites.map((c) => [c.marker, c]));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Ask the corpus"
        className="hidden lg:flex items-center gap-2.5 fixed right-5 bottom-6 z-40 bg-[var(--color-navy)] text-[var(--color-gold)] rounded-full pl-4 pr-5 py-3 shadow-[0_14px_44px_rgba(11,31,58,0.28)] hover:brightness-110 transition"
      >
        <span className="seal-badge" style={{ width: 24, height: 24, fontSize: 12 }}>
          §
        </span>
        <span className="font-semibold text-sm tracking-wide">Ask the corpus</span>
      </button>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col fixed top-[72px] right-5 bottom-5 w-[360px] bg-white border border-[var(--color-line)] rounded-2xl shadow-[0_24px_70px_rgba(11,31,58,0.22)] z-40 overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--color-navy)] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[var(--color-gold)] font-semibold text-[16px] tracking-[0.16em] uppercase">
            <span className="seal-badge" style={{ width: 26, height: 26, fontSize: 13 }}>
              §
            </span>
            Ask the corpus
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-white/55 hover:text-white text-2xl leading-none -mt-1 -mr-1 shrink-0"
          >
            &times;
          </button>
        </div>
        <p className="text-white/65 text-[12.5px] mt-2 leading-snug">
          Plain-English questions, answered only from real NY opinions and statutes — every claim cited.
        </p>
      </div>

      {/* Composer */}
      <div className="px-5 pt-4 pb-3 border-b border-[var(--color-line)]">
        <div className="flex items-center gap-2 mb-2 text-[12px]">
          {warmStatus === "ready" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
              <span className="text-[var(--color-ink-2)]">Corpus live &mdash; ready to ask</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[var(--color-seal)] animate-pulse inline-block shrink-0" />
              <span className="text-[var(--color-ink-2)]">Waking the corpus &mdash; ready in a moment&hellip;</span>
            </>
          )}
        </div>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(q);
          }}
          rows={3}
          placeholder="e.g. What is the standard for summary judgment under CPLR 3212?"
          className="w-full resize-none rounded border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-[14px] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-seal)] focus:ring-2 focus:ring-[rgba(181,137,78,0.14)]"
        />
        <div className="flex items-center justify-between mt-2.5">
          <Link
            href="/ask"
            className="text-[16px] text-[var(--color-ink-2)] hover:text-[var(--color-navy)] underline underline-offset-2"
          >
            Open full page →
          </Link>
          <button
            onClick={() => run(q)}
            disabled={loading || !q.trim() || warmStatus !== "ready"}
            className="editorial-button disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            {warmStatus !== "ready" ? "Warming…" : loading ? "Researching…" : "Ask →"}
          </button>
        </div>
        {!answer && !loading && (
          <div className="mt-3 flex flex-col gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQ(s);
                  run(s);
                }}
                className="text-left text-[12.5px] text-[var(--color-ink-2)] hover:text-[var(--color-seal-deep)] leading-snug"
              >
                &ldquo;{s}&rdquo;
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Answer / sources (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && !answer && (
          <div className="mb-3 py-4 flex justify-center"><Spinner size={22} label="Drafting your answer&hellip;" /></div>
        )}
        {loading && !answer && (
          <div className="flex items-center gap-3 rounded border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3">
            <span className="inline-block w-6 h-6 rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-seal)] animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-ink)] leading-none">
                <span className="text-[21px]">{(elapsed / 1000).toFixed(1)}</span>
                <span className="text-[13px] text-[var(--color-ink-2)]"> s</span>
              </div>
              <div className="text-[12.5px] text-[var(--color-ink-2)] mt-1 truncate">{progress || "Thinking…"}</div>
            </div>
          </div>
        )}
        {error && (
          <div className="text-[13px] text-[var(--color-risk-blocking)] bg-[rgba(154,51,36,0.06)] border border-[rgba(154,51,36,0.25)] rounded px-3 py-2">
            {error}
          </div>
        )}
        {answer && (
          <div className="text-[15px] leading-[1.7] text-[var(--color-ink)] font-[family-name:var(--font-display)]">
            {(() => {
              const seenD = new Set<number>();
              return answer.split(/(\[\d+\])/g).map((part, i) => {
                const m = part.match(/\[(\d+)\]/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  const c = citeMap.get(n);
                  if (c) {
                    const full = c.bluebook || c.display;
                    const isOp = c.kind === "opinion";
                    const label = seenD.has(n)
                      ? (isOp ? full.split(/, | \(/)[0] : full.replace(/ \(McKinney\)$/, ""))
                      : full;
                    seenD.add(n);
                    return (
                      <a key={i} href={`#dock-src-${n}`} title={full} className="text-[var(--color-seal-deep)] hover:text-[var(--color-navy)] no-underline">
                        {" "}{isOp ? <em>{label}</em> : <span>{label}</span>}<sup className="text-[15px] ml-0.5">{n}</sup>
                      </a>
                    );
                  }
                }
                return <span key={i}>{part}</span>;
              });
            })()}
          </div>
        )}

        {answer && !loading && (
          <button
            onClick={async () => {
              try {
                const map = new Map(cites.map((c) => [c.marker, c]));
                const seen = new Set<number>();
                const prose = answer.replace(/\[(\d+)\]/g, (m, d) => {
                  const n = parseInt(d, 10);
                  const c = map.get(n);
                  if (!c) return m;
                  const full = c.bluebook || c.display;
                  const label = seen.has(n)
                    ? (c.kind === "opinion" ? full.split(/, | \(/)[0] : full.replace(/ \(McKinney\)$/, ""))
                    : full;
                  seen.add(n);
                  return ` ${label} [${n}]`;
                });
                const src = cites.map((c) => `[${c.marker}] ${c.bluebook || c.display}`).join("\n");
                await navigator.clipboard.writeText(
                  `${prose.replace(/[ \t]+/g, " ").trim()}\n\nSources\n${src}\n\nLex.NY is an experimental research tool and is not a substitute for a licensed attorney.`
                );
                setCopiedAns(true);
                setTimeout(() => setCopiedAns(false), 1800);
              } catch {}
            }}
            className="mt-4 w-full text-[18px] font-semibold border border-[var(--color-line)] rounded px-3 py-2 text-[var(--color-navy)] hover:border-[var(--color-seal)] transition"
          >
            {copiedAns ? "Answer copied ✓" : "Copy answer (citations inline)"}
          </button>
        )}

        {cites.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--color-line)]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-semibold tracking-[0.16em] uppercase text-[var(--color-ink-2)]">
                Sources cited
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(cites.map((c) => `[${c.marker}] ${c.bluebook || c.display}`).join("\n"));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {}
                }}
                title="Copy all citations as Bluebook text"
                className="text-[15px] font-semibold border border-[var(--color-line)] rounded px-2 py-1 text-[var(--color-navy)] hover:border-[var(--color-seal)] transition"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <div className="space-y-2.5">
              {cites.map((c) => {
                const label =
                  c.kind === "opinion" ? "CASE" : c.kind === "statute" ? "STATUTE" : "WEB";
                const inner = (
                  <>
                    <span className="font-[family-name:var(--font-sans)] text-[14px] tracking-[0.16em] uppercase text-[var(--color-ink-2)]">
                      [{c.marker}] {label}
                    </span>
                    <div className="font-[family-name:var(--font-display)] text-[13.5px] text-[var(--color-navy)] leading-snug">
                      {c.display}
                    </div>
                  </>
                );
                return (
                  <div
                    key={c.marker}
                    id={`dock-src-${c.marker}`}
                    className="rounded border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
                  >
                    {c.kind === "opinion" && c.cl_id ? (
                      <Link href={`/case/${c.cl_id}`} className="block hover:opacity-80">
                        {inner}
                      </Link>
                    ) : c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80">
                        {inner}
                      </a>
                    ) : (
                      <div>{inner}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!answer && !loading && !error && (
          <p className="text-[18px] text-[var(--color-ink-2)]/70 leading-relaxed mt-1">
            Your answer streams in here, with a numbered marker after every claim and the source it came from below.
          </p>
        )}
      </div>

      <div className="px-5 py-2.5 border-t border-[var(--color-line)] text-[15px] tracking-wider uppercase text-[var(--color-ink-2)]">
        Experimental · not a substitute for an attorney
      </div>
    </aside>
  );
}
