"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GOV_FEES, SERVICE_FEES } from "@nota-lawyer/shared";

interface LitState {
  title: string;
  work_type: "book" | "screenplay" | "article" | "blog_post" | "code" | "poetry" | "lyrics" | "other";
  word_count: string;
  year_of_creation: string;
  is_published: boolean;
  year_of_first_publication: string;
  author_name: string;
  author_is_organization: boolean;
  author_citizenship: string;
  ai_assisted: boolean;
  ai_disclaimer: string;
  tier: "free" | "counsel";
}

const STEPS = [
  { n: 1, label: "The work" },
  { n: 2, label: "Publication" },
  { n: 3, label: "Author" },
  { n: 4, label: "AI disclosure" },
  { n: 5, label: "Review & file" },
];

const WORK_TYPES = [
  { value: "book", label: "Book / novel / nonfiction" },
  { value: "screenplay", label: "Screenplay / teleplay / stage play" },
  { value: "article", label: "Article / essay" },
  { value: "blog_post", label: "Blog post / blog archive" },
  { value: "code", label: "Source code" },
  { value: "poetry", label: "Poetry / poem collection" },
  { value: "lyrics", label: "Song lyrics" },
  { value: "other", label: "Other literary work" },
] as const;

export default function LiteraryWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<LitState>({
    title: "",
    work_type: "book",
    word_count: "",
    year_of_creation: String(new Date().getFullYear()),
    is_published: false,
    year_of_first_publication: "",
    author_name: "",
    author_is_organization: false,
    author_citizenship: "United States",
    ai_assisted: false,
    ai_disclaimer: "",
    tier: "free",
  });

  function update<K extends keyof LitState>(key: K, value: LitState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const govFee = GOV_FEES.usco_single_application / 100;
  const serviceFee = state.tier === "counsel" ? SERVICE_FEES.counsel_review / 100 : 0;

  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Literary works · Form TX</span>
          <span>Step {step} of 5 · {STEPS[step - 1].label}</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">©</span> Nota.Lawyer
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Save & exit</Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-[1180px] mx-auto px-7 pt-6">
        <div className="flex items-center gap-1">
          {STEPS.map((s) => (
            <div key={s.n} className={`flex-1 h-1 rounded-full ${s.n <= step ? "bg-[var(--color-seal)]" : "bg-[var(--color-rule)]/20"}`} />
          ))}
        </div>
      </div>

      <section className="py-10">
        <div className="max-w-3xl mx-auto px-7">
          <Card>
            <CardHeader>
              <span className="editorial-eyebrow">Step {step} of 5</span>
              <CardTitle className="mt-2">{STEPS[step - 1].label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <label className="editorial-label">Title</label>
                    <Input value={state.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Chaos Under the Neon Dome" className="text-lg font-[family-name:var(--font-display)]" />
                  </div>
                  <div>
                    <label className="editorial-label">Type of literary work</label>
                    <select className="editorial-input" value={state.work_type} onChange={(e) => update("work_type", e.target.value as LitState["work_type"])}>
                      {WORK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="editorial-label">Year of creation</label>
                      <Input type="number" value={state.year_of_creation} onChange={(e) => update("year_of_creation", e.target.value)} />
                    </div>
                    <div>
                      <label className="editorial-label">Approx. word count (optional)</label>
                      <Input type="number" value={state.word_count} onChange={(e) => update("word_count", e.target.value)} placeholder="e.g. 80000" />
                    </div>
                  </div>
                  <div>
                    <label className="editorial-label">Upload deposit copy (PDF, TXT, DOCX)</label>
                    <Input type="file" accept=".pdf,.txt,.docx,.rtf,application/pdf,text/plain" />
                    <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                      USCO accepts one complete copy. For unpublished work, one electronic copy is fine.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <label className={`block p-3 border rounded-sm cursor-pointer ${!state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="published" checked={!state.is_published} onChange={() => update("is_published", false)} className="mr-2" />
                      <strong>Unpublished</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Common for manuscripts, screenplays in development, unpublished source code.</p>
                    </label>
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="published" checked={state.is_published} onChange={() => update("is_published", true)} className="mr-2" />
                      <strong>Published</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Distributed to the public (sold, given away, posted publicly online).</p>
                    </label>
                  </div>
                  {state.is_published && (
                    <div>
                      <label className="editorial-label">Year of first publication</label>
                      <Input type="number" value={state.year_of_first_publication} onChange={(e) => update("year_of_first_publication", e.target.value)} />
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="editorial-label">Author name</label>
                    <Input value={state.author_name} onChange={(e) => update("author_name", e.target.value)} />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={state.author_is_organization} onChange={(e) => update("author_is_organization", e.target.checked)} />
                      <span className="text-sm">Author is an organization (work made for hire)</span>
                    </label>
                  </div>
                  <div>
                    <label className="editorial-label">Citizenship</label>
                    <Input value={state.author_citizenship} onChange={(e) => update("author_citizenship", e.target.value)} />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 mb-4">
                    <p className="font-[family-name:var(--font-display)] italic text-sm">
                      USCO position (March 2023): material generated by ChatGPT, Claude, Llama, or other LLMs is not copyrightable on its own. Human selection, arrangement, and substantial modification of AI-generated text IS protectable, with proper disclosure.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className={`block p-3 border rounded-sm cursor-pointer ${!state.ai_assisted ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="ai" checked={!state.ai_assisted} onChange={() => update("ai_assisted", false)} className="mr-2" />
                      <strong>No AI assistance</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Written entirely by human author(s).</p>
                    </label>
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.ai_assisted ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="ai" checked={state.ai_assisted} onChange={() => update("ai_assisted", true)} className="mr-2" />
                      <strong>Yes, AI-assisted</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">LLM tools used in drafting, outlining, editing, or generating sections.</p>
                    </label>
                  </div>
                  {state.ai_assisted && (
                    <div>
                      <label className="editorial-label">Describe the human creative contribution</label>
                      <textarea
                        value={state.ai_disclaimer}
                        onChange={(e) => update("ai_disclaimer", e.target.value)}
                        rows={4}
                        className="editorial-input"
                        placeholder="e.g. Human author conceived plot, characters, themes, and dialog. Used AI tool to generate initial drafts of descriptive passages, which were then substantially revised, restructured, and edited by the author."
                      />
                      <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                        This text becomes the "limitation of claim" on Form TX. We'll review it for Counsel-tier filings.
                      </p>
                    </div>
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  <div className="space-y-2 mb-6 text-sm">
                    <ReviewRow label="Title" value={state.title} />
                    <ReviewRow label="Type" value={WORK_TYPES.find((t) => t.value === state.work_type)?.label || ""} />
                    <ReviewRow label="Year" value={state.year_of_creation} />
                    <ReviewRow label="Published" value={state.is_published ? `Yes, ${state.year_of_first_publication}` : "No"} />
                    <ReviewRow label="Author" value={state.author_name + (state.author_is_organization ? " (org)" : "")} />
                    <ReviewRow label="AI-assisted" value={state.ai_assisted ? "Yes, with disclaimer" : "No"} />
                  </div>

                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 space-y-2">
                    <h4 className="font-[family-name:var(--font-display)] font-semibold">Fee summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>USCO Single App (pass-through)</span>
                      <span className="font-[family-name:var(--font-mono)]">${govFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Our service fee · {state.tier === "counsel" ? "Counsel" : "Free"}</span>
                      <span className="font-[family-name:var(--font-mono)] text-[var(--color-seal)]">${serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-double border-[var(--color-rule)] font-semibold">
                      <span>Total today</span>
                      <span className="font-[family-name:var(--font-mono)]">${state.tier === "counsel" ? serviceFee.toFixed(2) : "0.00"}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.tier === "free" ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="tier" checked={state.tier === "free"} onChange={() => update("tier", "free")} className="mr-2" />
                      <strong>Free tier · $0</strong>
                    </label>
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.tier === "counsel" ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="tier" checked={state.tier === "counsel"} onChange={() => update("tier", "counsel")} className="mr-2" />
                      <strong>Counsel tier · $50</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Important for AI-assisted works — wrong disclaimer wording is the #1 USCO refusal reason in 2024-2025.</p>
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-6 border-t border-[var(--color-rule)]/30">
                <Button onClick={() => setStep((s) => Math.max(1, s - 1))} variant="ghost" disabled={step === 1}>← Back</Button>
                {step < 5 ? (
                  <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>Continue →</Button>
                ) : (
                  <Button variant="seal" size="lg">
                    {state.tier === "counsel" ? `Pay $${serviceFee.toFixed(2)} & submit →` : "Generate Form TX package →"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-dashed border-[var(--color-rule)]/30">
      <span className="font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase text-[var(--color-ink-2)]">{label}</span>
      <span className="text-right max-w-md">{value || <em className="text-[var(--color-ink-2)]/50">not set</em>}</span>
    </div>
  );
}
