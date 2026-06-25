/**
 * Conflict Search Agent — Bright Data hackathon centerpiece.
 *
 * Given a proposed trademark + class(es), this agent queries five gov/web
 * sources in parallel via Bright Data, then asks the LLM to reason about
 * likelihood-of-confusion using the DuPont factors framework.
 *
 * Sources searched:
 *   1. USPTO TESS (federal trademarks — registered + pending)
 *   2. USCO public catalog (any prior copyright on similar visual marks)
 *   3. NY DOS business name search
 *   4. DE Division of Corporations business name search
 *   5. WY Secretary of State business name search
 *   6. Google SERP (common-law trademark usage in commerce)
 *
 * Returns a ConflictReport with risk-scored matches and plain-English reasoning.
 *
 * Bright Data product usage: Web Unlocker (for 1-5) + SERP API (for 6).
 * Both are sponsor-required for the hackathon submission.
 */
type WebDataProvider = "brightdata" | "nimble";
import type { ConflictReport, FilingKind } from "./types.js";
export interface RunConflictSearchOpts {
    mark: string;
    classes: number[];
    class_descriptions?: string[];
    filing_kind: FilingKind;
    /**
     * Override the WEB_DATA_PROVIDER env var for this single run.
     * Useful for the dual-submit demo flow where we show the same query
     * running through Bright Data and Nimble side-by-side.
     */
    provider?: WebDataProvider;
}
/**
 * Main entry point. Run all source searches in parallel, then ask the LLM
 * to score each match and produce a unified report.
 */
export declare function runConflictSearch(opts: RunConflictSearchOpts): Promise<ConflictReport>;
export {};
//# sourceMappingURL=conflict-agent.d.ts.map