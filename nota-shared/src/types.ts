/**
 * Core types for the Nota.Lawyer platform.
 *
 * These are the data shapes that flow between the trademark app, the copyright
 * app, the agent backend, and the Supabase database. Keep this file as the
 * single source of truth — both apps import from here.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  User                                                                */
/* ------------------------------------------------------------------ */

export const UserRoleSchema = z.enum(["customer", "attorney", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: UserRoleSchema.default("customer"),
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

/* ------------------------------------------------------------------ */
/*  Filings — the central record. Both copyright and trademark filings  */
/*  share this base schema with a discriminated `kind` field.            */
/* ------------------------------------------------------------------ */

export const FilingKindSchema = z.enum([
  "copyright_visual_art",
  "copyright_photographs",
  "copyright_literary",
  "trademark",
]);
export type FilingKind = z.infer<typeof FilingKindSchema>;

export const FilingStatusSchema = z.enum([
  "draft",                    // user is mid-wizard
  "pending_payment",          // wizard complete, awaiting Stripe checkout for Counsel tier
  "pending_review",           // paid for Counsel, awaiting attorney review
  "reviewed",                 // attorney has reviewed, package ready
  "submission_ready",         // user can submit to gov (we don't submit for them)
  "submitted",                // user has confirmed they submitted to USCO/USPTO
  "registered",               // gov has issued registration (manually marked)
  "cancelled",
]);
export type FilingStatus = z.infer<typeof FilingStatusSchema>;

export const FilingTierSchema = z.enum(["free", "counsel"]);
export type FilingTier = z.infer<typeof FilingTierSchema>;

export const FilingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  kind: FilingKindSchema,
  tier: FilingTierSchema,
  status: FilingStatusSchema,
  // Wizard data — shape varies by kind, validated by per-kind schemas below
  wizard_data: z.record(z.unknown()),
  // Generated artifacts (PDF URLs, conflict reports, etc.)
  artifacts: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    created_at: z.string().datetime(),
  })).default([]),
  conflict_report: z.unknown().nullable().optional(),  // ConflictReport, see below
  stripe_session_id: z.string().nullable().optional(),
  attorney_notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Filing = z.infer<typeof FilingSchema>;

/* ------------------------------------------------------------------ */
/*  Per-filing wizard data shapes                                       */
/* ------------------------------------------------------------------ */

// Trademark
export const TrademarkWizardSchema = z.object({
  mark: z.string().min(1),
  mark_type: z.enum(["word", "design", "combined"]),
  classes: z.array(z.number().int().min(1).max(45)).min(1),
  goods_services_description: z.string(),
  // ID Manual mapping (avoids $200 surcharge)
  id_manual_ids: z.array(z.string()).default([]),
  filing_basis: z.enum(["1a_use_in_commerce", "1b_intent_to_use"]),
  first_use_date: z.string().nullable().optional(),
  first_use_in_commerce_date: z.string().nullable().optional(),
  specimen_url: z.string().url().nullable().optional(),
  applicant_name: z.string(),
  applicant_address: z.string(),
  applicant_entity_type: z.enum(["individual", "llc", "corporation", "partnership", "other"]),
});
export type TrademarkWizardData = z.infer<typeof TrademarkWizardSchema>;

// Copyright — Visual Art (Form VA)
export const VisualArtWizardSchema = z.object({
  title: z.string().min(1),
  year_of_creation: z.number().int(),
  year_of_first_publication: z.number().int().nullable().optional(),
  is_published: z.boolean(),
  nation_of_first_publication: z.string().nullable().optional(),
  author_name: z.string(),
  author_is_organization: z.boolean(),
  author_birth_year: z.number().int().nullable().optional(),
  author_citizenship: z.string(),
  author_anonymous: z.boolean().default(false),
  author_pseudonymous: z.boolean().default(false),
  ai_assisted: z.boolean(),
  ai_disclaimer: z.string().nullable().optional(),
  deposit_url: z.string().url().nullable().optional(),
});
export type VisualArtWizardData = z.infer<typeof VisualArtWizardSchema>;

// Copyright — Photographs (Form VA, with GRPPH group option)
export const PhotographsWizardSchema = VisualArtWizardSchema.extend({
  is_group_registration: z.boolean(),
  photo_count: z.number().int().min(1).max(750),
  photo_capture_date_range_start: z.string().nullable().optional(),
  photo_capture_date_range_end: z.string().nullable().optional(),
  deposit_urls: z.array(z.string().url()).default([]),
});
export type PhotographsWizardData = z.infer<typeof PhotographsWizardSchema>;

// Copyright — Literary Works (Form TX)
export const LiteraryWizardSchema = z.object({
  title: z.string().min(1),
  year_of_creation: z.number().int(),
  year_of_first_publication: z.number().int().nullable().optional(),
  is_published: z.boolean(),
  nation_of_first_publication: z.string().nullable().optional(),
  author_name: z.string(),
  author_is_organization: z.boolean(),
  author_birth_year: z.number().int().nullable().optional(),
  author_citizenship: z.string(),
  work_type: z.enum(["book", "screenplay", "article", "blog_post", "code", "poetry", "lyrics", "other"]),
  word_count: z.number().int().nullable().optional(),
  ai_assisted: z.boolean(),
  ai_disclaimer: z.string().nullable().optional(),
  deposit_url: z.string().url().nullable().optional(),
});
export type LiteraryWizardData = z.infer<typeof LiteraryWizardSchema>;

/* ------------------------------------------------------------------ */
/*  Conflict Search Agent — output schema                              */
/* ------------------------------------------------------------------ */

export const ConflictRiskLevelSchema = z.enum(["clear", "low", "moderate", "high", "blocking"]);
export type ConflictRiskLevel = z.infer<typeof ConflictRiskLevelSchema>;

export const ConflictMatchSchema = z.object({
  source: z.enum(["uspto_tess", "usco_catalog", "ny_dos", "de_sos", "wy_sos", "google_serp"]),
  match_text: z.string(),
  match_url: z.string().url().nullable(),
  registration_number: z.string().nullable().optional(),
  filing_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  classes: z.array(z.number().int()).default([]),
  similarity_score: z.number().min(0).max(1),
  similarity_reasoning: z.string(),
});
export type ConflictMatch = z.infer<typeof ConflictMatchSchema>;

export const ConflictReportSchema = z.object({
  query: z.object({
    mark: z.string(),
    classes: z.array(z.number().int()),
    filing_kind: FilingKindSchema,
  }),
  overall_risk: ConflictRiskLevelSchema,
  risk_summary: z.string(),
  dupont_analysis: z.object({
    similarity_of_marks: z.string(),
    similarity_of_goods: z.string(),
    channels_of_trade: z.string(),
    strength_of_prior_mark: z.string(),
  }).nullable().optional(),
  matches: z.array(ConflictMatchSchema),
  sources_searched: z.array(z.string()),
  // Which web-data provider executed this search. Surfaces sponsor attribution
  // in the report UI so submissions to different hackathons can show which
  // sponsor product powered the demo.
  web_data_provider: z.enum(["brightdata", "nimble"]).optional(),
  search_duration_ms: z.number(),
  generated_at: z.string().datetime(),
  // Disclaimer required by NY RPC 7.1
  disclaimer: z.string(),
});
export type ConflictReport = z.infer<typeof ConflictReportSchema>;

/* ------------------------------------------------------------------ */
/*  Payment — Stripe Checkout records                                  */
/* ------------------------------------------------------------------ */

export const PaymentKindSchema = z.enum([
  "counsel_review",          // $50 attorney review tier
  "swag",                    // t-shirt, hoodie, mug, sticker, hat
]);
export type PaymentKind = z.infer<typeof PaymentKindSchema>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),  // null for guest swag purchases
  filing_id: z.string().uuid().nullable(),  // set for counsel_review
  kind: PaymentKindSchema,
  stripe_session_id: z.string(),
  stripe_payment_intent_id: z.string().nullable(),
  amount_cents: z.number().int(),
  currency: z.string().default("usd"),
  status: z.enum(["pending", "paid", "refunded", "failed"]),
  metadata: z.record(z.string()).default({}),
  created_at: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;

/* ------------------------------------------------------------------ */
/*  Review — attorney review records                                   */
/* ------------------------------------------------------------------ */

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  filing_id: z.string().uuid(),
  reviewer_user_id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  notes: z.string().nullable(),
  recommendations: z.array(z.string()).default([]),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Review = z.infer<typeof ReviewSchema>;

/* ------------------------------------------------------------------ */
/*  Government fee constants — pass-through, never marked up           */
/* ------------------------------------------------------------------ */

export const GOV_FEES = {
  // USCO (US Copyright Office) — current as of fiscal year 2026
  usco_single_application: 4500,        // $45.00 in cents
  usco_standard_application: 6500,      // $65.00
  usco_group_photographs: 5500,         // $55.00 — GRPPH
  usco_group_unpublished: 8500,         // $85.00 — GRUW

  // USPTO base trademark fees — effective Jan 18, 2025
  uspto_base_application_per_class: 35000,           // $350.00 per class
  uspto_custom_id_surcharge_per_class: 20000,        // +$200 if not in ID Manual
  uspto_long_description_surcharge_per_1k_chars: 20000, // +$200 per 1K chars
  uspto_insufficient_info_surcharge_per_class: 10000,   // +$100
  uspto_statement_of_use_per_class: 15000,           // $150 ITU follow-up
  uspto_section_8_per_class: 22500,                  // $225 at 5-6 year mark
} as const;

export const SERVICE_FEES = {
  // Our service fees
  free_tier: 0,                  // always
  counsel_review: 5000,          // $50.00 in cents

  // Swag pricing — set during Stripe setup
  swag_tshirt: 2500,             // $25.00
  swag_hoodie: 4500,             // $45.00
  swag_mug: 1500,                // $15.00
  swag_sticker_pack: 500,         // $5.00
  swag_hat: 2000,                // $20.00
} as const;

/* ------------------------------------------------------------------ */
/*  Class names for USPTO trademark filings (top 5 most common)         */
/*  Full 45-class list lives in the trademark app's ID manual mapping.  */
/* ------------------------------------------------------------------ */

export const COMMON_USPTO_CLASSES = {
  9: "Computer software, electronics, scientific apparatus",
  25: "Clothing, footwear, headwear",
  35: "Advertising, business management, retail services",
  41: "Education, entertainment, training services",
  42: "Scientific & technological services, software design",
} as const;
