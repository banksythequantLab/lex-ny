"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GOV_FEES, SERVICE_FEES } from "@nota-lawyer/shared";

interface VAState {
  title: string;
  year_of_creation: string;
  is_published: boolean;
  year_of_first_publication: string;
  nation_of_first_publication: string;
  author_name: string;
  author_is_organization: boolean;
  author_citizenship: string;
  ai_assisted: boolean;
  ai_disclaimer: string;
  deposit_url: string;
  tier: "free" | "counsel";
  email: string;
  address: string;
}

const STEPS = [
  { n: 1, label: "The work" },
  { n: 2, label: "Publication" },
  { n: 3, label: "Author" },
  { n: 4, label: "AI disclosure" },
  { n: 5, label: "Review & file" },
];

export default function VisualArtWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<VAState>({
    title: "",
    year_of_creation: String(new Date().getFullYear()),
    is_published: false,
    year_of_first_publication: "",
    nation_of_first_publication: "United States",
    author_name: "",
    author_is_organization: false,
    author_citizenship: "United States",
    ai_assisted: false,
    ai_disclaimer: "",
    deposit_url: "",
    tier: "free",
    email: "",
    address: "",
  });

  function update<K extends keyof VAState>(key: K, value: VAState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const govFee = GOV_FEES.usco_single_application / 100;
  const serviceFee = state.tier === "counsel" ? SERVICE_FEES.counsel_review / 100 : 0;

  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Visual art · Form VA</span>
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
                    <label className="editorial-label">Title of the work</label>
                    <Input value={state.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Untitled Banksy AI Logo" className="text-lg font-[family-name:var(--font-display)]" />
                  </div>
                  <div>
                    <label className="editorial-label">Year of creation</label>
                    <Input type="number" value={state.year_of_creation} onChange={(e) => update("year_of_creation", e.target.value)} />
                  </div>
                  <div>
                    <label className="editorial-label">Upload deposit copy (PNG, JPG, or PDF)</label>
                    <Input type="file" accept="image/*,application/pdf" />
                    <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                      USCO requires one identifying copy of the work. We'll upload it as part of the eCO submission.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="editorial-label">Has this work been published?</label>
                    <div className="space-y-2">
                      <label className={`block p-3 border rounded-sm cursor-pointer ${!state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="published" checked={!state.is_published} onChange={() => update("is_published", false)} className="mr-2" />
                        <strong>No — unpublished</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Most original art starts unpublished.</p>
                      </label>
                      <label className={`block p-3 border rounded-sm cursor-pointer ${state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="published" checked={state.is_published} onChange={() => update("is_published", true)} className="mr-2" />
                        <strong>Yes — published</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">"Publication" = distributed copies to the public. Posting on social media counts.</p>
                      </label>
                    </div>
                  </div>
                  {state.is_published && (
                    <>
                      <div>
                        <label className="editorial-label">Year of first publication</label>
                        <Input type="number" value={state.year_of_first_publication} onChange={(e) => update("year_of_first_publication", e.target.value)} />
                      </div>
                      <div>
                        <label className="editorial-label">Nation of first publication</label>
                        <Input value={state.nation_of_first_publication} onChange={(e) => update("nation_of_first_publication", e.target.value)} />
                      </div>
                    </>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="editorial-label">Author name</label>
                    <Input value={state.author_name} onChange={(e) => update("author_name", e.target.value)} placeholder="e.g. Derek Soltis or Banksy AI LLC" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={state.author_is_organization} onChange={(e) => update("author_is_organization", e.target.checked)} />
                      <span className="text-sm">Author is an organization (work made for hire)</span>
                    </label>
                  </div>
                  <div>
                    <label className="editorial-label">Author citizenship / domicile</label>
                    <Input value={state.author_citizenship} onChange={(e) => update("author_citizenship", e.target.value)} />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 mb-4">
                    <p className="font-[family-name:var(--font-display)] italic text-sm">
                      The US Copyright Office's March 2023 guidance: pure AI output is not copyrightable. Human selection, arrangement, and modification of AI-generated material IS copyrightable, with a proper disclaimer.
                    </p>
                  </div>
                  <div>
                    <label className="editorial-label">Did you use AI tools in creating this work?</label>
                    <div className="space-y-2">
                      <label className={`block p-3 border rounded-sm cursor-pointer ${!state.ai_assisted ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="ai" checked={!state.ai_assisted} onChange={() => update("ai_assisted", false)} className="mr-2" />
                        <strong>No AI assistance</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Hand-drawn, hand-designed, traditional tools only.</p>
                      </label>
                      <label className={`block p-3 border rounded-sm cursor-pointer ${state.ai_assisted ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="ai" checked={state.ai_assisted} onChange={() => update("ai_assisted", true)} className="mr-2" />
                        <strong>Yes, AI-assisted</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Generative AI was part of the creative process.</p>
                      </label>
                    </div>
                  </div>
                  {state.ai_assisted && (
                    <div>
                      <label className="editorial-label">Describe the human creative contribution</label>
                      <textarea
                        value={state.ai_disclaimer}
                        onChange={(e) => update("ai_disclaimer", e.target.value)}
                        rows={4}
                        className="editorial-input"
                        placeholder="e.g. Human author selected color palette, composition, and rendering style. AI tool was used to generate initial draft, which was then refined and modified by the author."
                      />
                      <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                        This text goes into the "limitation of claim" field on Form VA, following the Zarya of the Dawn (2023) model.
                      </p>
                    </div>
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  <div className="space-y-2 mb-6 text-sm">
                    <ReviewRow label="Title" value={state.title} />
                    <ReviewRow label="Year created" value={state.year_of_creation} />
                    <ReviewRow label="Published" value={state.is_published ? `Yes, ${state.year_of_first_publication}` : "No"} />
                    <ReviewRow label="Author" value={state.author_name + (state.author_is_organization ? " (organization)" : "")} />
                    <ReviewRow label="AI-assisted" value={state.ai_assisted ? "Yes, with disclaimer" : "No"} />
                  </div>

                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 space-y-2">
                    <h4 className="font-[family-name:var(--font-display)] font-semibold">Fee summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>USCO fee · Single Application (pass-through)</span>
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
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Form VA preparation, eCO submission. Pay USCO directly.</p>
                    </label>
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.tier === "counsel" ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="tier" checked={state.tier === "counsel"} onChange={() => update("tier", "counsel")} className="mr-2" />
                      <strong>Counsel tier · $50</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">15-min attorney review of AI-authorship disclosure + a t-shirt with your registered work.</p>
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
                    {state.tier === "counsel" ? `Pay $${serviceFee.toFixed(2)} & submit →` : "Generate Form VA package →"}
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
