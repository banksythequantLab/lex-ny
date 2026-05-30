"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { LexAnswer, AnswerCitation } from "@nota-lawyer/shared";
import { VoiceInputButton } from "./VoiceInputButton";

function AskPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [question, setQuestion] = useState(initialQ);
  const [useLiveSerp, setUseLiveSerp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LexAnswer | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

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
      useLiveSerp ? "Fetching live web sources via Bright Data…" : "Ranking sources by relevance…",
      "Asking Llama 3.3 70B to draft an answer with citations…",
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
        body: JSON.stringify({ question: q, use_live_serp: useLiveSerp }),
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
                "Lex.NY is a research tool, not legal advice. Always verify citations against the underlying source before relying on them.",
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
            <span>Powered by Bright Data + CourtListener + NY Senate</span>
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between px-7 py-3.5">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px] tracking-tight">
            <span className="seal-badge">§</span>
            Lex.NY
          </Link>
          <ul className="flex flex-wrap gap-3 md:gap-7 items-center text-xs md:text-sm text-[var(--color-ink-2)] list-none">
            <li><Link href="/" className="hover:text-[var(--color-ink)]">Home</Link></li>
            <li><a href="https://nota.lawyer" className="hover:text-[var(--color-ink)]">Nota.Lawyer</a></li>
          </ul>
        </div>
      </nav>

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
                    onPartialTranscript={(t) => setQuestion(t)}
                    onFinalTranscript={(t) => setQuestion((prev) => (prev && !prev.endsWith(t) ? prev + " " + t : t))}
                    disabled={loading}
                  />
                </div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are the elements of fraud under NY law?"
                  rows={3}
                  className="w-full rounded-sm border border-[var(--color-rule)]/40 p-3 text-base bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-seal-deep)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLiveSerp}
                    onChange={(e) => setUseLiveSerp(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Augment with live web sources (Bright Data SERP)
                </label>
                <Button onClick={onSubmit} disabled={loading} size="lg">
                  {loading ? "Researching…" : "Ask Lex.NY →"}
                </Button>
              </div>

              {progressMsg && (
                <div className="mt-3 font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-ink-2)] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--color-seal)] rounded-full animate-pulse" />
                  {progressMsg}
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
                <CardTitle>Answer</CardTitle>
                <CardDescription>
                  {(result.total_duration_ms / 1000).toFixed(1)}s · {result.citations.length} sources cited
                  {result.web_data_provider && (
                    <> · Live web data via <strong>Bright Data</strong></>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnswerBody answer={result.answer} citations={result.citations} />
              </CardContent>
            </Card>

            {/* Sources */}
            {result.citations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sources cited</CardTitle>
                  <CardDescription>
                    Click any source to verify the citation directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.citations.map((c) => (
                    <SourceCard key={c.marker} citation={c} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] max-w-[900px] leading-relaxed">
              {result.disclaimer}
            </p>
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
function AnswerBody({ answer, citations }: { answer: string; citations: AnswerCitation[] }) {
  const citationMap = new Map(citations.map((c) => [c.marker, c]));
  // Split on [n] markers and interpolate links
  const parts = answer.split(/(\[\d+\])/g);
  return (
    <div className="prose prose-stone max-w-none font-[family-name:var(--font-serif)] text-[17px] leading-[1.7]">
      {parts.map((part, idx) => {
        const markerMatch = part.match(/\[(\d+)\]/);
        if (markerMatch) {
          const marker = parseInt(markerMatch[1], 10);
          const cite = citationMap.get(marker);
          if (cite) {
            return (
              <a
                key={idx}
                href={`#source-${marker}`}
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 mx-0.5 text-[11px] font-[family-name:var(--font-mono)] font-medium bg-[var(--color-seal)]/15 text-[var(--color-seal-deep)] rounded-sm hover:bg-[var(--color-seal)]/30 no-underline"
                title={cite.display}
              >
                {marker}
              </a>
            );
          }
        }
        // Render plain text with paragraph breaks
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
      <div className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider text-[var(--color-seal-deep)] font-medium min-w-[40px]">
        [{citation.marker}]
      </div>
      <div className="flex-1">
        <div className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-1">
          {kindLabel}
        </div>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)] hover:text-[var(--color-seal-deep)] underline underline-offset-4"
        >
          {citation.display}
        </a>
        {citation.snippet && (
          <p className="text-sm text-[var(--color-ink-2)] mt-2 leading-snug">{citation.snippet}</p>
        )}
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-ink-2)]">Loading…</div>}>
      <AskPageInner />
    </Suspense>
  );
}
