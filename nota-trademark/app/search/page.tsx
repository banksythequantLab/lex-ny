"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ConflictReport, ConflictRiskLevel } from "@nota-lawyer/shared";

const COMMON_CLASSES = [
  { num: 9, label: "Class 9 — Software, electronics" },
  { num: 25, label: "Class 25 — Clothing" },
  { num: 35, label: "Class 35 — Advertising, business services" },
  { num: 41, label: "Class 41 — Education, entertainment" },
  { num: 42, label: "Class 42 — Tech services, software design" },
];

const RISK_COPY: Record<ConflictRiskLevel, { label: string; description: string; cls: string }> = {
  clear: {
    label: "Clear",
    description: "No meaningful conflicts found. Safe to file.",
    cls: "clear",
  },
  low: {
    label: "Low risk",
    description: "Distant matches in unrelated classes. Low refusal risk.",
    cls: "low",
  },
  moderate: {
    label: "Moderate risk",
    description: "Similar marks in adjacent classes. Recommend attorney review.",
    cls: "moderate",
  },
  high: {
    label: "High risk",
    description: "Confusingly similar marks in same/related classes. Strongly recommend revising the mark or consulting counsel before filing.",
    cls: "high",
  },
  blocking: {
    label: "Blocking",
    description: "Identical or near-identical marks in the same class. Refusal almost certain. Do not file as-is.",
    cls: "blocking",
  },
};

export default function ConflictSearchPage() {
  const [mark, setMark] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<number[]>([9]);
  // Provider override: undefined uses server's WEB_DATA_PROVIDER env var.
  // The toggle is only shown if the user holds Shift while loading the page
  // — keeps it out of the way for normal customer flows, available for demos.
  const [providerOverride, setProviderOverride] = useState<"brightdata" | "nimble" | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ConflictReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  async function runSearch() {
    if (!mark.trim()) {
      setError("Enter a mark to search.");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("Pick at least one USPTO class.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    setProgressMsg("Initializing AI agent...");

    try {
      // Simulate progress messages for UX. Real progress comes from streaming
      // the agent response server-side; for the hackathon a stepped fake is fine.
      const msgs = [
        "Querying USPTO TESS via Bright Data...",
        "Searching USCO public catalog...",
        "Checking NY, DE, WY business registries in parallel...",
        "Running common-law search on Google...",
        "Synthesizing with Llama 3.3 70B via Groq...",
        "Computing DuPont factor analysis...",
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < msgs.length) {
          setProgressMsg(msgs[i++]);
        }
      }, 1500);

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mark: mark.trim(),
          classes: selectedClasses,
          filing_kind: "trademark",
          ...(providerOverride && { provider: providerOverride }),
        }),
      });

      clearInterval(interval);
      setProgressMsg(null);

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Search failed (${res.status}): ${errBody.slice(0, 200)}`);
      }

      const data: ConflictReport = await res.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleClass(n: number) {
    setSelectedClasses((cur) =>
      cur.includes(n) ? cur.filter((c) => c !== n) : [...cur, n]
    );
  }

  return (
    <>
      {/* Caption */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>AI conflict search · powered by Bright Data MCP</span>
          <span>Llama 3.3 70B · DuPont factors</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">™</span> Nota.Lawyer
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">← Back to landing</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12">
        <div className="max-w-[1180px] mx-auto px-7">
          <span className="editorial-eyebrow">Free · No account required</span>
          <h1 className="font-[family-name:var(--font-display)] text-5xl lg:text-6xl tracking-tight font-medium mt-3 mb-4">
            AI conflict search.
          </h1>
          <p className="text-lg text-[var(--color-ink-2)] max-w-2xl">
            Enter your proposed mark and the USPTO classes you'd file in. Our AI agent searches USPTO TESS, the US Copyright Office, NY/DE/WY business registries, and Google for common-law usage — all in parallel — then produces a DuPont factors risk analysis. About 30% of trademark applications get refused for likelihood-of-confusion. We catch most of them.
          </p>
        </div>
      </section>

      {/* Search form */}
      <section className="pb-12">
        <div className="max-w-[1180px] mx-auto px-7">
          <Card>
            <CardHeader>
              <CardTitle>Search a proposed mark</CardTitle>
              <CardDescription>
                Bright Data + Llama 3.3 70B · ~8 seconds · $0
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="mark" className="editorial-label">
                  The mark (word, phrase, or slogan)
                </label>
                <Input
                  id="mark"
                  placeholder="e.g. BANKSY AI"
                  value={mark}
                  onChange={(e) => setMark(e.target.value)}
                  className="text-lg font-[family-name:var(--font-display)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="editorial-label">USPTO classes</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CLASSES.map((c) => (
                    <button
                      key={c.num}
                      onClick={() => toggleClass(c.num)}
                      className={`px-3 py-2 text-sm border rounded-sm transition-all ${
                        selectedClasses.includes(c.num)
                          ? "bg-[var(--color-seal)] text-[var(--color-paper)] border-[var(--color-seal)]"
                          : "bg-[var(--color-paper)] text-[var(--color-ink-2)] border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                  Most filings use 1-3 classes. Full 45-class list available in the wizard.
                </p>
              </div>

              {/* Demo-only provider picker. Visible when URL contains ?demo=1.
                  Lets us toggle Bright Data vs Nimble for hackathon judges. */}
              {typeof window !== "undefined" && window.location.search.includes("demo=1") && (
                <div>
                  <label className="editorial-label">Web data provider (demo mode)</label>
                  <div className="flex gap-2">
                    {([
                      { v: undefined, l: "Server default" },
                      { v: "brightdata" as const, l: "Bright Data" },
                      { v: "nimble" as const, l: "Nimble" },
                    ]).map((opt) => (
                      <button
                        key={String(opt.v)}
                        onClick={() => setProviderOverride(opt.v)}
                        className={`px-3 py-2 text-sm border rounded-sm transition-all ${
                          providerOverride === opt.v
                            ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                            : "bg-[var(--color-paper)] text-[var(--color-ink-2)] border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-[var(--color-seal)]/10 border border-[var(--color-seal)] text-[var(--color-seal-deep)] p-3 text-sm">
                  {error}
                </div>
              )}

              <Button onClick={runSearch} disabled={loading} size="lg">
                {loading ? "Searching…" : "Run AI conflict search →"}
              </Button>

              {loading && progressMsg && (
                <div className="mt-4 font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-ink-2)] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[var(--color-seal)] rounded-full animate-pulse" />
                  {progressMsg}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results */}
      {report && (
        <section className="pb-20">
          <div className="max-w-[1180px] mx-auto px-7 space-y-6">
            {/* Overall risk */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Conflict report — {report.query.mark}</CardTitle>
                    <CardDescription>
                      Classes {report.query.classes.join(", ")} · {report.matches.length} matches · {(report.search_duration_ms / 1000).toFixed(1)}s
                      {report.web_data_provider && (
                        <> · Powered by <strong>{report.web_data_provider === "nimble" ? "Nimble" : "Bright Data"}</strong></>
                      )}
                    </CardDescription>
                  </div>
                  <span className={`risk-badge ${RISK_COPY[report.overall_risk].cls}`}>
                    {RISK_COPY[report.overall_risk].label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-[family-name:var(--font-display)] text-lg italic text-[var(--color-ink)] mb-3">
                  {RISK_COPY[report.overall_risk].description}
                </p>
                <p className="text-[var(--color-ink-2)]">{report.risk_summary}</p>
              </CardContent>
            </Card>

            {/* DuPont analysis */}
            {report.dupont_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>DuPont factors analysis</CardTitle>
                  <CardDescription>
                    In re E.I. DuPont DeNemours & Co., 476 F.2d 1357 (CCPA 1973)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase text-[var(--color-seal-deep)] mb-1">
                      Similarity of marks
                    </h4>
                    <p className="text-[var(--color-ink-2)]">{report.dupont_analysis.similarity_of_marks}</p>
                  </div>
                  <div>
                    <h4 className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase text-[var(--color-seal-deep)] mb-1">
                      Similarity of goods/services
                    </h4>
                    <p className="text-[var(--color-ink-2)]">{report.dupont_analysis.similarity_of_goods}</p>
                  </div>
                  <div>
                    <h4 className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase text-[var(--color-seal-deep)] mb-1">
                      Channels of trade
                    </h4>
                    <p className="text-[var(--color-ink-2)]">{report.dupont_analysis.channels_of_trade}</p>
                  </div>
                  <div>
                    <h4 className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase text-[var(--color-seal-deep)] mb-1">
                      Strength of prior mark
                    </h4>
                    <p className="text-[var(--color-ink-2)]">{report.dupont_analysis.strength_of_prior_mark}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Matches */}
            {report.matches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Matches ({report.matches.length})</CardTitle>
                  <CardDescription>
                    Sorted by similarity score. Sources: {report.sources_searched.join(", ")}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.matches.map((m, i) => (
                    <div key={i} className="border-b border-dashed border-[var(--color-rule)]/30 pb-3 last:border-b-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="font-[family-name:var(--font-display)] font-semibold text-base">
                            {m.match_text}
                          </div>
                          <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-1">
                            {m.source.replace(/_/g, " ").toUpperCase()}
                            {m.registration_number && ` · ${m.registration_number}`}
                            {m.status && ` · ${m.status}`}
                            {m.filing_date && ` · ${m.filing_date}`}
                          </div>
                          <p className="text-sm text-[var(--color-ink-2)] mt-2">
                            {m.similarity_reasoning}
                          </p>
                          {m.match_url && (
                            <a
                              href={m.match_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--color-seal)] hover:underline mt-1 inline-block"
                            >
                              View source →
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-[family-name:var(--font-display)] font-semibold text-2xl">
                            {(m.similarity_score * 100).toFixed(0)}%
                          </div>
                          <div className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest uppercase text-[var(--color-ink-2)]">
                            similarity
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Next steps */}
            <Card>
              <CardHeader>
                <CardTitle>What's next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.overall_risk === "clear" || report.overall_risk === "low" ? (
                  <>
                    <p className="text-[var(--color-ink-2)]">
                      Mark looks clear. You can proceed to file the trademark via our wizard.
                    </p>
                    <Button asChild>
                      <Link href={`/wizard?mark=${encodeURIComponent(report.query.mark)}&classes=${report.query.classes.join(",")}`}>
                        File this trademark →
                      </Link>
                    </Button>
                  </>
                ) : report.overall_risk === "moderate" ? (
                  <>
                    <p className="text-[var(--color-ink-2)]">
                      Some risk. We recommend attorney review before you file — Counsel tier is $50 and includes a 15-minute consultation.
                    </p>
                    <div className="flex gap-3">
                      <Button asChild>
                        <Link href={`/wizard?mark=${encodeURIComponent(report.query.mark)}&classes=${report.query.classes.join(",")}&tier=counsel`}>
                          File with Counsel review ($50) →
                        </Link>
                      </Button>
                      <Button asChild variant="ghost">
                        <Link href="/wizard">File free anyway</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[var(--color-ink-2)]">
                      Substantial conflict risk. Strongly recommend either revising the mark or engaging Counsel-tier review before spending the USPTO fee.
                    </p>
                    <Button asChild variant="seal">
                      <Link href={`/wizard?mark=${encodeURIComponent(report.query.mark)}&classes=${report.query.classes.join(",")}&tier=counsel`}>
                        Get Counsel review ($50) →
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)] leading-loose pt-4">
              {report.disclaimer}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
