export interface CiteCheck {
    raw: string;
    kind: "statute" | "case";
    status: "verified" | "weak_match" | "not_found";
    matched?: string;
    detail?: string;
    url?: string;
    inbound?: number;
    similarity?: number;
    cl_id?: string;
}
export interface BriefCheckResult {
    checks: CiteCheck[];
    summary: {
        total: number;
        verified: number;
        weak_match: number;
        not_found: number;
    };
}
/** Extract every case + statute citation from `text` and verify each against the corpus. */
export declare function checkBrief(text: string): Promise<BriefCheckResult>;
//# sourceMappingURL=citation-check.d.ts.map