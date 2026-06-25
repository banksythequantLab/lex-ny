/**
 * Core types for the Nota.Lawyer platform.
 *
 * These are the data shapes that flow between the trademark app, the copyright
 * app, the agent backend, and the Supabase database. Keep this file as the
 * single source of truth — both apps import from here.
 */
import { z } from "zod";
export declare const UserRoleSchema: z.ZodEnum<["customer", "attorney", "admin"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    full_name: z.ZodNullable<z.ZodString>;
    role: z.ZodDefault<z.ZodEnum<["customer", "attorney", "admin"]>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    full_name: string | null;
    role: "customer" | "attorney" | "admin";
    created_at: string;
}, {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    role?: "customer" | "attorney" | "admin" | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const FilingKindSchema: z.ZodEnum<["copyright_visual_art", "copyright_photographs", "copyright_literary", "trademark"]>;
export type FilingKind = z.infer<typeof FilingKindSchema>;
export declare const FilingStatusSchema: z.ZodEnum<["draft", "pending_payment", "pending_review", "reviewed", "submission_ready", "submitted", "registered", "cancelled"]>;
export type FilingStatus = z.infer<typeof FilingStatusSchema>;
export declare const FilingTierSchema: z.ZodEnum<["free", "counsel"]>;
export type FilingTier = z.infer<typeof FilingTierSchema>;
export declare const FilingSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    kind: z.ZodEnum<["copyright_visual_art", "copyright_photographs", "copyright_literary", "trademark"]>;
    tier: z.ZodEnum<["free", "counsel"]>;
    status: z.ZodEnum<["draft", "pending_payment", "pending_review", "reviewed", "submission_ready", "submitted", "registered", "cancelled"]>;
    wizard_data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    artifacts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        url: z.ZodString;
        created_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        created_at: string;
        url: string;
    }, {
        type: string;
        created_at: string;
        url: string;
    }>, "many">>;
    conflict_report: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    stripe_session_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    attorney_notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "pending_payment" | "pending_review" | "reviewed" | "submission_ready" | "submitted" | "registered" | "cancelled";
    id: string;
    created_at: string;
    user_id: string;
    kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    tier: "free" | "counsel";
    wizard_data: Record<string, unknown>;
    artifacts: {
        type: string;
        created_at: string;
        url: string;
    }[];
    updated_at: string;
    conflict_report?: unknown;
    stripe_session_id?: string | null | undefined;
    attorney_notes?: string | null | undefined;
}, {
    status: "draft" | "pending_payment" | "pending_review" | "reviewed" | "submission_ready" | "submitted" | "registered" | "cancelled";
    id: string;
    created_at: string;
    user_id: string;
    kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    tier: "free" | "counsel";
    wizard_data: Record<string, unknown>;
    updated_at: string;
    artifacts?: {
        type: string;
        created_at: string;
        url: string;
    }[] | undefined;
    conflict_report?: unknown;
    stripe_session_id?: string | null | undefined;
    attorney_notes?: string | null | undefined;
}>;
export type Filing = z.infer<typeof FilingSchema>;
export declare const TrademarkWizardSchema: z.ZodObject<{
    mark: z.ZodString;
    mark_type: z.ZodEnum<["word", "design", "combined"]>;
    classes: z.ZodArray<z.ZodNumber, "many">;
    goods_services_description: z.ZodString;
    id_manual_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    filing_basis: z.ZodEnum<["1a_use_in_commerce", "1b_intent_to_use"]>;
    first_use_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    first_use_in_commerce_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specimen_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    applicant_name: z.ZodString;
    applicant_address: z.ZodString;
    applicant_entity_type: z.ZodEnum<["individual", "llc", "corporation", "partnership", "other"]>;
}, "strip", z.ZodTypeAny, {
    mark: string;
    mark_type: "word" | "design" | "combined";
    classes: number[];
    goods_services_description: string;
    id_manual_ids: string[];
    filing_basis: "1a_use_in_commerce" | "1b_intent_to_use";
    applicant_name: string;
    applicant_address: string;
    applicant_entity_type: "individual" | "llc" | "corporation" | "partnership" | "other";
    first_use_date?: string | null | undefined;
    first_use_in_commerce_date?: string | null | undefined;
    specimen_url?: string | null | undefined;
}, {
    mark: string;
    mark_type: "word" | "design" | "combined";
    classes: number[];
    goods_services_description: string;
    filing_basis: "1a_use_in_commerce" | "1b_intent_to_use";
    applicant_name: string;
    applicant_address: string;
    applicant_entity_type: "individual" | "llc" | "corporation" | "partnership" | "other";
    id_manual_ids?: string[] | undefined;
    first_use_date?: string | null | undefined;
    first_use_in_commerce_date?: string | null | undefined;
    specimen_url?: string | null | undefined;
}>;
export type TrademarkWizardData = z.infer<typeof TrademarkWizardSchema>;
export declare const VisualArtWizardSchema: z.ZodObject<{
    title: z.ZodString;
    year_of_creation: z.ZodNumber;
    year_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    is_published: z.ZodBoolean;
    nation_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    author_name: z.ZodString;
    author_is_organization: z.ZodBoolean;
    author_birth_year: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    author_citizenship: z.ZodString;
    author_anonymous: z.ZodDefault<z.ZodBoolean>;
    author_pseudonymous: z.ZodDefault<z.ZodBoolean>;
    ai_assisted: z.ZodBoolean;
    ai_disclaimer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deposit_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    author_anonymous: boolean;
    author_pseudonymous: boolean;
    ai_assisted: boolean;
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
}, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    ai_assisted: boolean;
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    author_anonymous?: boolean | undefined;
    author_pseudonymous?: boolean | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
}>;
export type VisualArtWizardData = z.infer<typeof VisualArtWizardSchema>;
export declare const PhotographsWizardSchema: z.ZodObject<{
    title: z.ZodString;
    year_of_creation: z.ZodNumber;
    year_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    is_published: z.ZodBoolean;
    nation_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    author_name: z.ZodString;
    author_is_organization: z.ZodBoolean;
    author_birth_year: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    author_citizenship: z.ZodString;
    author_anonymous: z.ZodDefault<z.ZodBoolean>;
    author_pseudonymous: z.ZodDefault<z.ZodBoolean>;
    ai_assisted: z.ZodBoolean;
    ai_disclaimer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deposit_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    is_group_registration: z.ZodBoolean;
    photo_count: z.ZodNumber;
    photo_capture_date_range_start: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    photo_capture_date_range_end: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deposit_urls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    author_anonymous: boolean;
    author_pseudonymous: boolean;
    ai_assisted: boolean;
    is_group_registration: boolean;
    photo_count: number;
    deposit_urls: string[];
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
    photo_capture_date_range_start?: string | null | undefined;
    photo_capture_date_range_end?: string | null | undefined;
}, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    ai_assisted: boolean;
    is_group_registration: boolean;
    photo_count: number;
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    author_anonymous?: boolean | undefined;
    author_pseudonymous?: boolean | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
    photo_capture_date_range_start?: string | null | undefined;
    photo_capture_date_range_end?: string | null | undefined;
    deposit_urls?: string[] | undefined;
}>;
export type PhotographsWizardData = z.infer<typeof PhotographsWizardSchema>;
export declare const LiteraryWizardSchema: z.ZodObject<{
    title: z.ZodString;
    year_of_creation: z.ZodNumber;
    year_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    is_published: z.ZodBoolean;
    nation_of_first_publication: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    author_name: z.ZodString;
    author_is_organization: z.ZodBoolean;
    author_birth_year: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    author_citizenship: z.ZodString;
    work_type: z.ZodEnum<["book", "screenplay", "article", "blog_post", "code", "poetry", "lyrics", "other"]>;
    word_count: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    ai_assisted: z.ZodBoolean;
    ai_disclaimer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deposit_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    ai_assisted: boolean;
    work_type: "code" | "other" | "book" | "screenplay" | "article" | "blog_post" | "poetry" | "lyrics";
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
    word_count?: number | null | undefined;
}, {
    title: string;
    year_of_creation: number;
    is_published: boolean;
    author_name: string;
    author_is_organization: boolean;
    author_citizenship: string;
    ai_assisted: boolean;
    work_type: "code" | "other" | "book" | "screenplay" | "article" | "blog_post" | "poetry" | "lyrics";
    year_of_first_publication?: number | null | undefined;
    nation_of_first_publication?: string | null | undefined;
    author_birth_year?: number | null | undefined;
    ai_disclaimer?: string | null | undefined;
    deposit_url?: string | null | undefined;
    word_count?: number | null | undefined;
}>;
export type LiteraryWizardData = z.infer<typeof LiteraryWizardSchema>;
export declare const ConflictRiskLevelSchema: z.ZodEnum<["clear", "low", "moderate", "high", "blocking"]>;
export type ConflictRiskLevel = z.infer<typeof ConflictRiskLevelSchema>;
export declare const ConflictMatchSchema: z.ZodObject<{
    source: z.ZodEnum<["uspto_tess", "usco_catalog", "ny_dos", "de_sos", "wy_sos", "google_serp"]>;
    match_text: z.ZodString;
    match_url: z.ZodNullable<z.ZodString>;
    registration_number: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    filing_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    classes: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    similarity_score: z.ZodNumber;
    similarity_reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    classes: number[];
    source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
    match_text: string;
    match_url: string | null;
    similarity_score: number;
    similarity_reasoning: string;
    status?: string | null | undefined;
    registration_number?: string | null | undefined;
    filing_date?: string | null | undefined;
}, {
    source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
    match_text: string;
    match_url: string | null;
    similarity_score: number;
    similarity_reasoning: string;
    status?: string | null | undefined;
    classes?: number[] | undefined;
    registration_number?: string | null | undefined;
    filing_date?: string | null | undefined;
}>;
export type ConflictMatch = z.infer<typeof ConflictMatchSchema>;
export declare const ConflictReportSchema: z.ZodObject<{
    query: z.ZodObject<{
        mark: z.ZodString;
        classes: z.ZodArray<z.ZodNumber, "many">;
        filing_kind: z.ZodEnum<["copyright_visual_art", "copyright_photographs", "copyright_literary", "trademark"]>;
    }, "strip", z.ZodTypeAny, {
        mark: string;
        classes: number[];
        filing_kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    }, {
        mark: string;
        classes: number[];
        filing_kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    }>;
    overall_risk: z.ZodEnum<["clear", "low", "moderate", "high", "blocking"]>;
    risk_summary: z.ZodString;
    dupont_analysis: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        similarity_of_marks: z.ZodString;
        similarity_of_goods: z.ZodString;
        channels_of_trade: z.ZodString;
        strength_of_prior_mark: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        similarity_of_marks: string;
        similarity_of_goods: string;
        channels_of_trade: string;
        strength_of_prior_mark: string;
    }, {
        similarity_of_marks: string;
        similarity_of_goods: string;
        channels_of_trade: string;
        strength_of_prior_mark: string;
    }>>>;
    matches: z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<["uspto_tess", "usco_catalog", "ny_dos", "de_sos", "wy_sos", "google_serp"]>;
        match_text: z.ZodString;
        match_url: z.ZodNullable<z.ZodString>;
        registration_number: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        filing_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        classes: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        similarity_score: z.ZodNumber;
        similarity_reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        classes: number[];
        source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
        match_text: string;
        match_url: string | null;
        similarity_score: number;
        similarity_reasoning: string;
        status?: string | null | undefined;
        registration_number?: string | null | undefined;
        filing_date?: string | null | undefined;
    }, {
        source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
        match_text: string;
        match_url: string | null;
        similarity_score: number;
        similarity_reasoning: string;
        status?: string | null | undefined;
        classes?: number[] | undefined;
        registration_number?: string | null | undefined;
        filing_date?: string | null | undefined;
    }>, "many">;
    sources_searched: z.ZodArray<z.ZodString, "many">;
    web_data_provider: z.ZodOptional<z.ZodEnum<["brightdata", "nimble"]>>;
    search_duration_ms: z.ZodNumber;
    generated_at: z.ZodString;
    disclaimer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: {
        mark: string;
        classes: number[];
        filing_kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    };
    overall_risk: "clear" | "low" | "moderate" | "high" | "blocking";
    risk_summary: string;
    matches: {
        classes: number[];
        source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
        match_text: string;
        match_url: string | null;
        similarity_score: number;
        similarity_reasoning: string;
        status?: string | null | undefined;
        registration_number?: string | null | undefined;
        filing_date?: string | null | undefined;
    }[];
    sources_searched: string[];
    search_duration_ms: number;
    generated_at: string;
    disclaimer: string;
    dupont_analysis?: {
        similarity_of_marks: string;
        similarity_of_goods: string;
        channels_of_trade: string;
        strength_of_prior_mark: string;
    } | null | undefined;
    web_data_provider?: "brightdata" | "nimble" | undefined;
}, {
    query: {
        mark: string;
        classes: number[];
        filing_kind: "copyright_visual_art" | "copyright_photographs" | "copyright_literary" | "trademark";
    };
    overall_risk: "clear" | "low" | "moderate" | "high" | "blocking";
    risk_summary: string;
    matches: {
        source: "uspto_tess" | "usco_catalog" | "ny_dos" | "de_sos" | "wy_sos" | "google_serp";
        match_text: string;
        match_url: string | null;
        similarity_score: number;
        similarity_reasoning: string;
        status?: string | null | undefined;
        classes?: number[] | undefined;
        registration_number?: string | null | undefined;
        filing_date?: string | null | undefined;
    }[];
    sources_searched: string[];
    search_duration_ms: number;
    generated_at: string;
    disclaimer: string;
    dupont_analysis?: {
        similarity_of_marks: string;
        similarity_of_goods: string;
        channels_of_trade: string;
        strength_of_prior_mark: string;
    } | null | undefined;
    web_data_provider?: "brightdata" | "nimble" | undefined;
}>;
export type ConflictReport = z.infer<typeof ConflictReportSchema>;
export declare const PaymentKindSchema: z.ZodEnum<["counsel_review", "swag"]>;
export type PaymentKind = z.infer<typeof PaymentKindSchema>;
export declare const PaymentSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodNullable<z.ZodString>;
    filing_id: z.ZodNullable<z.ZodString>;
    kind: z.ZodEnum<["counsel_review", "swag"]>;
    stripe_session_id: z.ZodString;
    stripe_payment_intent_id: z.ZodNullable<z.ZodString>;
    amount_cents: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    status: z.ZodEnum<["pending", "paid", "refunded", "failed"]>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "paid" | "refunded" | "failed";
    id: string;
    created_at: string;
    user_id: string | null;
    kind: "counsel_review" | "swag";
    stripe_session_id: string;
    filing_id: string | null;
    stripe_payment_intent_id: string | null;
    amount_cents: number;
    currency: string;
    metadata: Record<string, string>;
}, {
    status: "pending" | "paid" | "refunded" | "failed";
    id: string;
    created_at: string;
    user_id: string | null;
    kind: "counsel_review" | "swag";
    stripe_session_id: string;
    filing_id: string | null;
    stripe_payment_intent_id: string | null;
    amount_cents: number;
    currency?: string | undefined;
    metadata?: Record<string, string> | undefined;
}>;
export type Payment = z.infer<typeof PaymentSchema>;
export declare const ReviewSchema: z.ZodObject<{
    id: z.ZodString;
    filing_id: z.ZodString;
    reviewer_user_id: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "completed", "needs_revision"]>;
    notes: z.ZodNullable<z.ZodString>;
    recommendations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    started_at: z.ZodNullable<z.ZodString>;
    completed_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "in_progress" | "completed" | "needs_revision";
    id: string;
    created_at: string;
    filing_id: string;
    reviewer_user_id: string;
    notes: string | null;
    recommendations: string[];
    started_at: string | null;
    completed_at: string | null;
}, {
    status: "pending" | "in_progress" | "completed" | "needs_revision";
    id: string;
    created_at: string;
    filing_id: string;
    reviewer_user_id: string;
    notes: string | null;
    started_at: string | null;
    completed_at: string | null;
    recommendations?: string[] | undefined;
}>;
export type Review = z.infer<typeof ReviewSchema>;
export declare const GOV_FEES: {
    readonly usco_single_application: 4500;
    readonly usco_standard_application: 6500;
    readonly usco_group_photographs: 5500;
    readonly usco_group_unpublished: 8500;
    readonly uspto_base_application_per_class: 35000;
    readonly uspto_custom_id_surcharge_per_class: 20000;
    readonly uspto_long_description_surcharge_per_1k_chars: 20000;
    readonly uspto_insufficient_info_surcharge_per_class: 10000;
    readonly uspto_statement_of_use_per_class: 15000;
    readonly uspto_section_8_per_class: 22500;
};
export declare const SERVICE_FEES: {
    readonly free_tier: 0;
    readonly counsel_review: 5000;
    readonly swag_tshirt: 2500;
    readonly swag_hoodie: 4500;
    readonly swag_mug: 1500;
    readonly swag_sticker_pack: 500;
    readonly swag_hat: 2000;
};
export declare const COMMON_USPTO_CLASSES: {
    readonly 9: "Computer software, electronics, scientific apparatus";
    readonly 25: "Clothing, footwear, headwear";
    readonly 35: "Advertising, business management, retail services";
    readonly 41: "Education, entertainment, training services";
    readonly 42: "Scientific & technological services, software design";
};
//# sourceMappingURL=types.d.ts.map