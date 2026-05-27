"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GOV_FEES, SERVICE_FEES, COMMON_USPTO_CLASSES } from "@nota-lawyer/shared";

interface WizardState {
  mark: string;
  mark_type: "word" | "design" | "combined";
  classes: number[];
  goods_services_description: string;
  filing_basis: "1a_use_in_commerce" | "1b_intent_to_use";
  first_use_date: string;
  applicant_name: string;
  applicant_email: string;
  applicant_address: string;
  applicant_entity_type: "individual" | "llc" | "corporation" | "partnership" | "other";
  specimen_url: string | null;
  tier: "free" | "counsel";
}

const STEPS = [
  { n: 1, label: "The mark" },
  { n: 2, label: "Goods & services" },
  { n: 3, label: "USPTO classes" },
  { n: 4, label: "Filing basis" },
  { n: 5, label: "Applicant info" },
  { n: 6, label: "Review & submit" },
];

export default function TrademarkWizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    mark: params.get("mark") || "",
    mark_type: "word",
    classes: (params.get("classes") || "")
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n)),
    goods_services_description: "",
    filing_basis: "1a_use_in_commerce",
    first_use_date: "",
    applicant_name: "",
    applicant_email: "",
    applicant_address: "",
    applicant_entity_type: "individual",
    specimen_url: null,
    tier: (params.get("tier") as "free" | "counsel") || "free",
  });

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function next() { setStep((s) => Math.min(6, s + 1)); }
  function prev() { setStep((s) => Math.max(1, s - 1)); }

  const govFee =
    state.classes.length * (GOV_FEES.uspto_base_application_per_class / 100);
  const serviceFee = state.tier === "counsel" ? SERVICE_FEES.counsel_review / 100 : 0;
  const total = govFee + serviceFee;

  return (
    <>
      {/* Caption + nav */}
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto px-7 py-2.5 flex justify-between">
          <span>Trademark filing wizard</span>
          <span>Step {step} of 6 · {STEPS[step - 1].label}</span>
        </div>
      </div>
      <nav className="sticky top-0 z-50 bg-[var(--color-paper)]/85 backdrop-blur border-b border-[var(--color-rule)]/30">
        <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 font-[family-name:var(--font-display)] font-semibold text-[22px]">
            <span className="seal-badge">™</span> Nota.Lawyer
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Save & exit</Link>
          </Button>
        </div>
      </nav>

      {/* Progress bar */}
      <div className="max-w-[1180px] mx-auto px-7 pt-6">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={`flex-1 h-1 rounded-full ${
                s.n <= step ? "bg-[var(--color-seal)]" : "bg-[var(--color-rule)]/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <section className="py-10">
        <div className="max-w-3xl mx-auto px-7">
          <Card>
            <CardHeader>
              <span className="editorial-eyebrow">Step {step} of 6</span>
              <CardTitle className="mt-2">{STEPS[step - 1].label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* === STEP 1: The mark === */}
              {step === 1 && (
                <>
                  <div>
                    <label className="editorial-label">The mark (word, phrase, or slogan)</label>
                    <Input
                      value={state.mark}
                      onChange={(e) => update("mark", e.target.value)}
                      placeholder="e.g. BANKSY AI"
                      className="text-lg font-[family-name:var(--font-display)]"
                    />
                  </div>
                  <div>
                    <label className="editorial-label">Mark type</label>
                    <div className="space-y-2">
                      {[
                        { value: "word", label: "Standard character (word mark)", desc: "Just the words, in any font. Most flexible." },
                        { value: "design", label: "Design mark (logo)", desc: "The visual design itself. Upload specimen in step 5." },
                        { value: "combined", label: "Combined (words + design)", desc: "Both elements protected together." },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`block p-3 border rounded-sm cursor-pointer transition-all ${
                            state.mark_type === opt.value
                              ? "bg-[var(--color-paper)] border-[var(--color-seal)]"
                              : "border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="mark_type"
                            checked={state.mark_type === opt.value}
                            onChange={() => update("mark_type", opt.value as "word" | "design" | "combined")}
                            className="mr-2"
                          />
                          <strong>{opt.label}</strong>
                          <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">{opt.desc}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === STEP 2: Goods & services === */}
              {step === 2 && (
                <>
                  <p className="text-sm text-[var(--color-ink-2)]">
                    Describe the goods and services your mark will be used with. Be specific —
                    "clothing" is too broad, "t-shirts and hooded sweatshirts" is right.
                  </p>
                  <div>
                    <label className="editorial-label">Goods/services description</label>
                    <textarea
                      value={state.goods_services_description}
                      onChange={(e) => update("goods_services_description", e.target.value)}
                      rows={6}
                      placeholder="e.g. Downloadable computer software for managing intellectual property filings and conducting trademark searches."
                      className="editorial-input"
                    />
                    <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                      We'll map this to USPTO ID Manual entries automatically to avoid the $200/class custom-ID surcharge.
                    </p>
                  </div>
                </>
              )}

              {/* === STEP 3: USPTO Classes === */}
              {step === 3 && (
                <>
                  <p className="text-sm text-[var(--color-ink-2)]">
                    USPTO organizes goods and services into 45 international classes. Pick the
                    ones that match your description. Each class is a separate ${GOV_FEES.uspto_base_application_per_class / 100} USPTO fee.
                  </p>
                  <div className="space-y-2">
                    {Object.entries(COMMON_USPTO_CLASSES).map(([num, desc]) => {
                      const n = parseInt(num);
                      return (
                        <label
                          key={num}
                          className={`block p-3 border rounded-sm cursor-pointer transition-all ${
                            state.classes.includes(n)
                              ? "bg-[var(--color-paper)] border-[var(--color-seal)]"
                              : "border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={state.classes.includes(n)}
                            onChange={(e) =>
                              update(
                                "classes",
                                e.target.checked
                                  ? [...state.classes, n]
                                  : state.classes.filter((c) => c !== n)
                              )
                            }
                            className="mr-2"
                          />
                          <strong>Class {num}</strong> — {desc}
                        </label>
                      );
                    })}
                  </div>
                  <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)]">
                    All 45 classes available in full filing flow. Most filings use 1–3.
                  </p>
                </>
              )}

              {/* === STEP 4: Filing basis === */}
              {step === 4 && (
                <>
                  <p className="text-sm text-[var(--color-ink-2)]">
                    Are you already using the mark in commerce, or planning to?
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        value: "1a_use_in_commerce",
                        label: "Section 1(a) — Already using in commerce",
                        desc: "Faster registration. Requires a specimen of use (a photo of the mark in actual commercial use) in step 5.",
                      },
                      {
                        value: "1b_intent_to_use",
                        label: "Section 1(b) — Intent to use (ITU)",
                        desc: "Secures priority date now. Requires a Statement of Use later ($150/class to USPTO) when you start using the mark.",
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`block p-3 border rounded-sm cursor-pointer transition-all ${
                          state.filing_basis === opt.value
                            ? "bg-[var(--color-paper)] border-[var(--color-seal)]"
                            : "border-[var(--color-rule)]/30 hover:border-[var(--color-rule)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="filing_basis"
                          checked={state.filing_basis === opt.value}
                          onChange={() => update("filing_basis", opt.value as WizardState["filing_basis"])}
                          className="mr-2"
                        />
                        <strong>{opt.label}</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">{opt.desc}</p>
                      </label>
                    ))}
                  </div>
                  {state.filing_basis === "1a_use_in_commerce" && (
                    <div>
                      <label className="editorial-label">First use in commerce date</label>
                      <Input
                        type="date"
                        value={state.first_use_date}
                        onChange={(e) => update("first_use_date", e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* === STEP 5: Applicant === */}
              {step === 5 && (
                <>
                  <div>
                    <label className="editorial-label">Applicant name (or business name)</label>
                    <Input
                      value={state.applicant_name}
                      onChange={(e) => update("applicant_name", e.target.value)}
                      placeholder="e.g. Banksy AI LLC or Derek Soltis"
                    />
                  </div>
                  <div>
                    <label className="editorial-label">Email (for filing confirmations)</label>
                    <Input
                      type="email"
                      value={state.applicant_email}
                      onChange={(e) => update("applicant_email", e.target.value)}
                      placeholder="derek@nota.lawyer"
                    />
                  </div>
                  <div>
                    <label className="editorial-label">Address</label>
                    <textarea
                      value={state.applicant_address}
                      onChange={(e) => update("applicant_address", e.target.value)}
                      rows={3}
                      className="editorial-input"
                      placeholder="Street, City, State, ZIP"
                    />
                  </div>
                  <div>
                    <label className="editorial-label">Entity type</label>
                    <select
                      value={state.applicant_entity_type}
                      onChange={(e) => update("applicant_entity_type", e.target.value as WizardState["applicant_entity_type"])}
                      className="editorial-input"
                    >
                      <option value="individual">Individual</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              {/* === STEP 6: Review === */}
              {step === 6 && (
                <>
                  <div className="space-y-3 mb-6">
                    <ReviewRow label="Mark" value={state.mark} />
                    <ReviewRow label="Type" value={state.mark_type} />
                    <ReviewRow label="Classes" value={state.classes.join(", ")} />
                    <ReviewRow label="Goods/Services" value={state.goods_services_description.slice(0, 80) + (state.goods_services_description.length > 80 ? "..." : "")} />
                    <ReviewRow label="Filing basis" value={state.filing_basis === "1a_use_in_commerce" ? "Use in commerce" : "Intent to use"} />
                    <ReviewRow label="Applicant" value={`${state.applicant_name} (${state.applicant_entity_type})`} />
                  </div>

                  <div className="bg-[var(--color-paper)] border border-[var(--color-rule)] p-4 space-y-2">
                    <h4 className="font-[family-name:var(--font-display)] font-semibold">Fee summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>USPTO fee · {state.classes.length} × $350 (pass-through)</span>
                      <span className="font-[family-name:var(--font-mono)]">${govFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>
                        Our service fee · {state.tier === "counsel" ? "Counsel review" : "Free tier"}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[var(--color-seal)]">
                        ${serviceFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-double border-[var(--color-rule)] font-semibold">
                      <span>Total today</span>
                      <span className="font-[family-name:var(--font-mono)]">
                        ${state.tier === "counsel" ? serviceFee.toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider text-[var(--color-ink-2)] mt-2">
                      USPTO fee is paid at the gov filing step, not through us. We charge zero for the free tier.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="editorial-label">Tier</label>
                    <div className="space-y-2">
                      <label className={`block p-3 border rounded-sm cursor-pointer transition-all ${state.tier === "free" ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="tier" checked={state.tier === "free"} onChange={() => update("tier", "free")} className="mr-2" />
                        <strong>Free tier · $0</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">TEAS package preparation, ID Manual mapping. Pay USPTO directly.</p>
                      </label>
                      <label className={`block p-3 border rounded-sm cursor-pointer transition-all ${state.tier === "counsel" ? "bg-[var(--color-paper)] border-[var(--color-seal)]" : "border-[var(--color-rule)]/30"}`}>
                        <input type="radio" name="tier" checked={state.tier === "counsel"} onChange={() => update("tier", "counsel")} className="mr-2" />
                        <strong>Counsel tier · $50</strong>
                        <p className="text-sm text-[var(--color-ink-2)] mt-1 ml-5">Everything in free + 15-min attorney consultation, likelihood-of-confusion review, t-shirt with your mark.</p>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-[var(--color-rule)]/30">
                <Button onClick={prev} variant="ghost" disabled={step === 1}>
                  ← Back
                </Button>
                {step < 6 ? (
                  <Button onClick={next}>Continue →</Button>
                ) : (
                  <Button variant="seal" size="lg">
                    {state.tier === "counsel"
                      ? `Pay $${serviceFee.toFixed(2)} & submit →`
                      : "Generate TEAS package →"}
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
    <div className="flex justify-between py-2 border-b border-dashed border-[var(--color-rule)]/30 text-sm">
      <span className="font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase text-[var(--color-ink-2)]">{label}</span>
      <span className="text-right max-w-md">{value || <em className="text-[var(--color-ink-2)]/50">not set</em>}</span>
    </div>
  );
}
