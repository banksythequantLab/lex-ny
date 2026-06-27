"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { LexAnswer, AnswerCitation } from "@nota-lawyer/shared";
import { VoiceInputButton } from "./VoiceInputButton";
import { useWarmup } from "@/components/useWarmup";
import { useElapsed } from "@/components/useElapsed";

function AskPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [question, setQuestion] = useState(initialQ);
  // Live web retrieval retired — retrieval is corpus-only from Aurora.
  // use_live_serp is always sent as false; the toggle was removed from the UI.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LexAnswer | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const { status: warmStatus } = useWarmup();
  const elapsed = useElapsed(loading);

  // Voice-dictation baseline: the value of `question` AT THE TIME a voice
  // session began (or just after the most recent finalized segment).
  // Partial transcripts grow from this baseline; final transcripts advance
  // it. When the user types manually, we reset it to null so the next mic
  // activation re-anchors to the new text.
  const voiceBaselineRef = useRef<string | null>(null);

  // Auto-fire if landed via ?q= link
  useEffect(() => {
    if (initialQ && !result && !loading) {
      void runAsk(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAsk(q: string) {
    setError(null);
    setResult(null);
    setLoading(true);
    setProgressMsg("Embedding your question…");

    // Streaming SSE pipeline. Citations arrive ~12s in; deltas stream after.
    // Stages drive the progress message until citations land.
    const stages = [
      "Embedding your question…",
      "Searching the NY appellate corpus…",
      "Searching the Consolidated Laws…",
      "Ranking sources by relevance…",
      "Drafting a cited answer from the retrieved sources…",
    ];
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setProgressMsg(stages[stageIdx]);
    }, 1800);

    // Progressive answer state — built up from streamed events.
    let acc = "";
    let citations: AnswerCitation[] = [];
    let retrievalMs = 0;
    let llmMs = 0;
    let totalMs = 0;
    let webProvider: string | undefined;
    let graphProvider: string | undefined;

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify({ question: q, use_live_serp: false }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Stream open failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank lines.
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (!raw || raw.startsWith(":")) continue;

          let event = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).replace(/^ /, "");
          }
          if (!data) continue;
          let payload: any;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }

          if (event === "meta") {
            retrievalMs = payload.retrieval_ms ?? 0;
            webProvider = payload.web_data_provider;
            graphProvider = payload.graph_provider;
            clearInterval(stageInterval);
            setProgressMsg("Drafting answer with cited sources…");
          } else if (event === "citations") {
            citations = payload.citations || [];
            // Render the citation strip immediately, even before any text.
            setResult({
              question: q,
              answer: "",
              citations,
              retrieval_duration_ms: retrievalMs,
              llm_duration_ms: 0,
              total_duration_ms: 0,
              web_data_provider: webProvider,
              graph_provider: graphProvider,
              disclaimer: "",
            } as LexAnswer);
          } else if (event === "delta") {
            acc += payload.text || "";
            setResult({
              question: q,
              answer: acc,
              citations,
              retrieval_duration_ms: retrievalMs,
              llm_duration_ms: 0,
              total_duration_ms: 0,
              web_data_provider: webProvider,
              graph_provider: graphProvider,
              disclaimer: "",
            } as LexAnswer);
          } else if (event === "done") {
            llmMs = payload.llm_ms ?? 0;
            totalMs = payload.total_ms ?? 0;
            setResult({
              question: q,
              answer: acc,
              citations,
              retrieval_duration_ms: retrievalMs,
              llm_duration_ms: llmMs,
              total_duration_ms: totalMs,
              web_data_provider: webProvider,
              graph_provider: graphProvider,
              disclaimer:
                "Lex.NY is an experimental research tool, not legal advice. Every citation comes from a real New York opinion or statute, but the legal interpretation is not guaranteed correct — consult a licensed NY attorney before relying on it.",
            } as LexAnswer);
          } else if (event === "error") {
            throw new Error(payload.message || "stream error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      clearInterval(stageInterval);
      setProgressMsg(null);
      setLoading(false);
    }
  }

  function onSubmit() {
    if (!question.trim()) {
      setError("Enter a question to research.");
      return;
    }
    void runAsk(question.trim());
  }

  return (
    <>
      {/* Top nav */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <div className="flex gap-5 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
              Lex.NY research session
            </span>
          </div>
          <div className="flex gap-5">
            <span>Powered by AWS Aurora · pgvector retrieval</span>
          </div>
        </div>
      </div>
        {/* Search panel */}
      <section className="py-12 pb-8">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="editorial-label mb-2">Ask Lex.NY</div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl mb-8 max-w-[800px]">
            What does New York law say about{result?.question ? "…" : "…"}?
          </h1>

          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="editorial-label">Your question (plain English)</label>
                  <VoiceInputButton
                    onPartialTranscript={(t) => {
                      // Capture the baseline (text the user already had, or the
                      // committed-so-far text after a prior final) exactly once
                      // at the start of each segment. While the segment is in
                      // progress, every partial replaces only the segment's
                      // suffix — it never wipes the baseline.
                      if (voiceBaselineRef.current === null) {
                        voiceBaselineRef.current = question;
                      }
                      const base = voiceBaselineRef.current;
                      setQuestion(base + (base.trim() ? " " : "") + t);
                    }}
                    onFinalTranscript={(t) => {
                      // Commit the segment: append to the baseline and advance
                      // it so the NEXT segment grows from this finalized text
                      // instead of overwriting it.
                      const base = voiceBaselineRef.current ?? question;
                      const next = base + (base.trim() ? " " : "") + t;
                      setQuestion(next);
                      voiceBaselineRef.current = next;
                    }}
                    disabled={loading}
                  />
                </div>
                <textarea
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    // User took manual control of the textarea — clear the
                    // voice baseline so the next mic activation re-anchors
                    // to whatever they typed.
                    voiceBaselineRef.current = null;
                  }}
                  placeholder="e.g. What are the elements of fraud under NY law?"
                  rows={3}
                  className="w-full rounded-sm border border-[var(--color-rule)]/40 p-3 text-base bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-seal-deep)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
                  {warmStatus === "ready" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
                      Corpus live &mdash; ready to ask
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[var(--color-seal)] animate-pulse inline-block shrink-0" />
                      Waking the corpus &mdash; ready in a moment&hellip;
                    </>
                  )}
                </span>
                <Button onClick={onSubmit} disabled={loading || warmStatus !== "ready"} size="lg">
                  {warmStatus !== "ready" ? "Warming…" : loading ? "Researching…" : "Ask Lex.NY →"}
                </Button>
              </div>

              {loading && !(result?.answer) && (
                <div className="mt-4 flex items-center gap-3 rounded-sm border border-[var(--color-rule)]/40 bg-[var(--color-paper)] px-4 py-3">
                  <span className="inline-block w-7 h-7 rounded-full border-2 border-[var(--color-rule)]/30 border-t-[var(--color-seal-deep)] animate-spin shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-ink)] leading-none">
                      <span className="text-2xl">{(elapsed / 1000).toFixed(1)}</span>
                      <span className="text-sm text-[var(--color-ink-2)]"> s</span>
                    </div>
                    <div className="text-sm text-[var(--color-ink-2)] mt-1">{progressMsg || "Thinking…"}</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-[var(--color-seal)]/10 border border-[var(--color-seal)] text-[var(--color-seal-deep)] p-3 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Answer */}
      {result && (
        <section className="pb-20">
          <div className="max-w-[1180px] mx-auto px-7 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Answer</CardTitle>
                    <CardDescription>
                      {(result.total_duration_ms / 1000).toFixed(1)}s · {result.citations.length} sources cited · citations inline
                    </CardDescription>
                  </div>
                  <CopyAnswerButton answer={result.answer} citations={result.citations} />
                </div>
              </CardHeader>
              <CardContent>
                <AnswerBody answer={result.answer} citations={result.citations} />
              </CardContent>
            </Card>

            {/* Sources */}
            {result.citations.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Sources cited</CardTitle>
                      <CardDescription>
                        New York Bluebook citations — click any source to open it.
                      </CardDescription>
                    </div>
                    <CopyCitesButton citations={result.citations} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.citations.map((c) => (
                    <SourceCard key={c.marker} citation={c} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="rounded border border-[var(--color-seal)]/40 bg-[var(--color-seal)]/[0.06] p-4 max-w-[900px]">
              <p className="text-[13.5px] text-[var(--color-ink)] leading-relaxed">
                <strong className="text-[var(--color-seal-deep)]">Experimental — not legal advice.</strong>{" "}
                Lex.NY is an experimental research tool. Every citation it shows is drawn from a real New York opinion or statute, but the legal analysis and interpretation are <strong>not guaranteed to be correct</strong>. It does not provide legal advice and is <strong>not a substitute for a licensed attorney</strong> — consult a qualified New York attorney before relying on it.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[15px] tracking-wider text-[var(--color-ink-2)] mt-2 leading-relaxed">
                {result.disclaimer}
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Render the answer markdown with citation markers converted to
 * inline superscript-style links that scroll to the matching source card.
 */
function inlineCiteLabel(cite: AnswerCitation, seen: boolean): string {
  const full = cite.bluebook || cite.display;
  if (seen) {
    return cite.kind === "opinion"
      ? full.split(/, | \(/)[0]
      : full.replace(/ \(McKinney\)$/, "");
  }
  return full;
}

function AnswerBody({ answer, citations }: { answer: string; citations: AnswerCitation[] }) {
  const citationMap = new Map(citations.map((c) => [c.marker, c]));
  const seen = new Set<number>();
  const parts = answer.split(/(\[\d+\])/g);
  return (
    <div className="font-[family-name:var(--font-display)] text-[18px] leading-[1.75] text-[var(--color-ink)]">
      {parts.map((part, idx) => {
        const markerMatch = part.match(/\[(\d+)\]/);
        if (markerMatch) {
          const marker = parseInt(markerMatch[1], 10);
          const cite = citationMap.get(marker);
          if (cite) {
            const label = inlineCiteLabel(cite, seen.has(marker));
            seen.add(marker);
            const isOp = cite.kind === "opinion";
            return (
              <a
                key={idx}
                href={`#source-${marker}`}
                title={cite.bluebook || cite.display}
                className="text-[var(--color-seal-deep)] hover:text-[var(--color-navy)] no-underline"
              >
                {" "}
                {isOp ? <em className="font-medium">{label}</em> : <span className="font-medium">{label}</span>}
                <sup className="ml-0.5 text-[16px]">{marker}</sup>
              </a>
            );
          }
        }
        return part.split(/\n\n+/).map((p, i, arr) => (
          <span key={`${idx}-${i}`}>
            {p}
            {i < arr.length - 1 && <span className="block h-4" />}
          </span>
        ));
      })}
    </div>
  );
}

function SourceCard({ citation }: { citation: AnswerCitation }) {
  const kindLabel = {
    opinion: "CASE",
    statute: "STATUTE",
    live_web: "LIVE WEB",
  }[citation.kind];
  return (
    <div
      id={`source-${citation.marker}`}
      className="flex gap-4 p-4 border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)]"
    >
      <div className="font-[family-name:var(--font-mono)] text-[16px] tracking-wider text-[var(--color-seal-deep)] font-medium min-w-[40px]">
        [{citation.marker}]
      </div>
      <div className="flex-1">
        <div className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-1">
          {kindLabel}
        </div>
        {citation.kind === "opinion" && citation.cl_id ? (
          <Link
            href={`/case/${citation.cl_id}`}
            className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] underline underline-offset-4"
          >
            {citation.display}
          </Link>
        ) : (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] underline underline-offset-4"
          >
            {citation.display}
          </a>
        )}
        {citation.snippet && (
          <p className="text-sm text-[var(--color-ink-2)] mt-2 leading-snug">{citation.snippet}</p>
        )}
      </div>
    </div>
  );
}

function answerToText(answer: string, citations: AnswerCitation[]): string {
  const map = new Map(citations.map((c) => [c.marker, c]));
  const seen = new Set<number>();
  const prose = answer.replace(/\[(\d+)\]/g, (m, d) => {
    const n = parseInt(d, 10);
    const c = map.get(n);
    if (!c) return m;
    const label = inlineCiteLabel(c, seen.has(n));
    seen.add(n);
    return ` ${label} [${n}]`;
  });
  const sources = citations.map((c) => `[${c.marker}] ${c.bluebook || c.display}`).join("\n");
  return (
    `${prose.replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").trim()}\n\n` +
    `Sources\n${sources}\n\n` +
    `Lex.NY is an experimental research tool and is not a substitute for a licensed attorney. Every citation is from a real NY source, but the legal interpretation is not guaranteed correct.`
  );
}

function CopyAnswerButton({ answer, citations }: { answer: string; citations: AnswerCitation[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(answerToText(answer, citations));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
      title="Copy the full answer with citations inline"
      className="shrink-0 inline-flex items-center gap-1.5 text-[18px] font-semibold border border-[var(--color-rule)]/40 rounded px-3 py-1.5 text-[var(--color-seal-deep)] hover:border-[var(--color-seal)] transition"
    >
      {copied ? "Copied ✓" : "Copy answer"}
    </button>
  );
}

function CopyCitesButton({ citations }: { citations: AnswerCitation[] }) {
  const [copied, setCopied] = useState(false);
  const text = citations.map((c) => `[${c.marker}] ${c.bluebook || c.display}`).join("\n");
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
      title="Copy all citations as Bluebook text"
      className="shrink-0 inline-flex items-center gap-1.5 text-[18px] font-semibold border border-[var(--color-rule)]/40 rounded px-3 py-1.5 text-[var(--color-seal-deep)] hover:border-[var(--color-seal)] transition"
    >
      {copied ? "Copied ✓" : "Copy citations"}
    </button>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-ink-2)]">Loading…</div>}>
      <AskPageInner />
    </Suspense>
  );
}
