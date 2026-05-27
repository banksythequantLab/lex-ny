"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GOV_FEES, SERVICE_FEES } from "@nota-lawyer/shared";

interface PhotoState {
  title: string;
  year_of_creation: string;
  is_group_registration: boolean;
  photo_count: number;
  capture_date_start: string;
  capture_date_end: string;
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
  { n: 1, label: "Single or group?" },
  { n: 2, label: "The work(s)" },
  { n: 3, label: "Publication" },
  { n: 4, label: "Author" },
  { n: 5, label: "Review & file" },
];

export default function PhotographsWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<PhotoState>({
    title: "",
    year_of_creation: String(new Date().getFullYear()),
    is_group_registration: false,
    photo_count: 1,
    capture_date_start: "",
    capture_date_end: "",
    is_published: false,
    year_of_first_publication: "",
    author_name: "",
    author_is_organization: false,
    author_citizenship: "United States",
    ai_assisted: false,
    ai_disclaimer: "",
    tier: "free",
  });

  function update<K extends keyof PhotoState>(key: K, value: PhotoState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // GRPPH (Group Registration of Published Photographs) is $55,
  // single application is $45. GRPPH lets you register up to 750 photos
  // by a single author taken within one calendar year in a single filing.
  const govFee = state.is_group_registration
    ? GOV_FEES.usco_group_photographs / 100
    : GOV_FEES.usco_single_application / 100;
  const serviceFee = state.tier === "counsel" ? SERVICE_FEES.counsel_review / 100 : 0;
  const perPhotoCost = state.is_group_registration && state.photo_count > 0
    ? govFee / state.photo_count
    : govFee;

  return (
    <>
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Photographs · Form VA{state.is_group_registration ? " · GRPPH" : ""}</span>
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
                  <p className="text-sm text-[var(--color-ink-2)]">
                    Filing one photograph or a body of work? USCO offers a special Group Registration of Published Photographs (GRPPH) that lets you register up to 750 photos in a single application.
                  </p>
                  <div className="space-y-2">
                    <label className={`block p-4 border rounded-sm cursor-pointer transition-all ${!state.is_group_registration ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"}`}>
                      <input type="radio" name="grouping" checked={!state.is_group_registration} onChange={() => update("is_group_registration", false)} className="mr-2" />
                      <strong>Single photograph · $45</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">One photo, one filing. Standard Single Application.</p>
                    </label>
                    <label className={`block p-4 border rounded-sm cursor-pointer transition-all ${state.is_group_registration ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"}`}>
                      <input type="radio" name="grouping" checked={state.is_group_registration} onChange={() => update("is_group_registration", true)} className="mr-2" />
                      <strong>Group registration (GRPPH) · $55</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">
                        Up to 750 photographs, single author, taken within one calendar year, all published or all unpublished. Best deal in copyright registration — pennies per photo.
                      </p>
                    </label>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="editorial-label">{state.is_group_registration ? "Group title" : "Photo title"}</label>
                    <Input value={state.title} onChange={(e) => update("title", e.target.value)} placeholder={state.is_group_registration ? "e.g. Banksy AI 2026 Studio Portraits" : "e.g. Banksy AI Self-Portrait No. 1"} className="text-lg font-[family-name:var(--font-display)]" />
                  </div>
                  {state.is_group_registration && (
                    <>
                      <div>
                        <label className="editorial-label">How many photos in this group?</label>
                        <Input type="number" min={1} max={750} value={state.photo_count} onChange={(e) => update("photo_count", parseInt(e.target.value) || 1)} />
                        <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                          That's ${perPhotoCost.toFixed(3)} per photo. Max 750 per filing.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="editorial-label">Earliest capture date</label>
                          <Input type="date" value={state.capture_date_start} onChange={(e) => update("capture_date_start", e.target.value)} />
                        </div>
                        <div>
                          <label className="editorial-label">Latest capture date</label>
                          <Input type="date" value={state.capture_date_end} onChange={(e) => update("capture_date_end", e.target.value)} />
                        </div>
                      </div>
                      <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)]">
                        GRPPH requires all photos taken within one calendar year. Range cannot span Jan 1.
                      </p>
                    </>
                  )}
                  <div>
                    <label className="editorial-label">Upload {state.is_group_registration ? "deposit copies (ZIP up to 500MB)" : "deposit copy"}</label>
                    <Input type="file" accept={state.is_group_registration ? ".zip,image/*" : "image/*"} multiple={state.is_group_registration} />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <label className={`block p-3 border rounded-sm cursor-pointer ${!state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="published" checked={!state.is_published} onChange={() => update("is_published", false)} className="mr-2" />
                      <strong>Unpublished</strong>
                    </label>
                    <label className={`block p-3 border rounded-sm cursor-pointer ${state.is_published ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                      <input type="radio" name="published" checked={state.is_published} onChange={() => update("is_published", true)} className="mr-2" />
                      <strong>Published</strong>
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Distributed copies to the public. Posting on Instagram counts.</p>
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

              {step === 4 && (
                <>
                  <p className="text-sm text-[var(--color-ink-2)]">
                    {state.is_group_registration ? "GRPPH requires all photos by the same author." : "Who took the photo?"}
                  </p>
                  <div>
                    <label className="editorial-label">Author/Photographer name</label>
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

              {step === 5 && (
                <>
                  <div className="space-y-2 mb-6 text-sm">
                    <ReviewRow label="Type" value={state.is_group_registration ? `Group (${state.photo_count} photos)` : "Single photograph"} />
                    <ReviewRow label="Title" value={state.title} />
                    <ReviewRow label="Year" value={state.year_of_creation} />
                    <ReviewRow label="Published" value={state.is_published ? `Yes, ${state.year_of_first_publication}` : "No"} />
                    <ReviewRow label="Author" value={state.author_name + (state.author_is_organization ? " (org)" : "")} />
                  </div>

                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 space-y-2">
                    <h4 className="font-[family-name:var(--font-display)] font-semibold">Fee summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>USCO {state.is_group_registration ? "GRPPH" : "Single App"} (pass-through)</span>
                      <span className="font-[family-name:var(--font-mono)]">${govFee.toFixed(2)}</span>
                    </div>
                    {state.is_group_registration && (
                      <div className="flex justify-between text-xs text-[var(--color-ink-2)]">
                        <span>Per-photo cost</span>
                        <span className="font-[family-name:var(--font-mono)]">${perPhotoCost.toFixed(3)}</span>
                      </div>
                    )}
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
                      <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Attorney review + t-shirt with your work.</p>
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
                    {state.tier === "counsel" ? `Pay $${serviceFee.toFixed(2)} & submit →` : "Generate filing package →"}
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
