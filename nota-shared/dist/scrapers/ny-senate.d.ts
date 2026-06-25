/**
 * NY Senate OpenLegislation scraper - fetches all NY Consolidated Laws.
 *
 * The NY Senate runs a free, official, public JSON API for the
 * Consolidated Laws and bills at https://legislation.nysenate.gov/api/3/
 *
 * Auth: free API key as ?key= query param (sign up at the website).
 *
 * Hierarchy: a "law" (e.g. EDN = Education) contains chapters, which
 * contain articles or titles, which contain sections. Section-level
 * documents have the actual statute text. We flatten this into a
 * self-referencing statutes table with parent_id linking.
 *
 * Cost: $0 - this is a free government API. No BD credits used.
 *
 * Rate limit: NY Senate allows 5K req/day on the free tier. We sleep
 * 100ms between requests (10/sec). Pulling all 134 laws with full
 * text takes ~5-10 minutes total.
 */
export interface OpenLegLawInfo {
    lawId: string;
    name: string;
    lawType: "CONSOLIDATED" | "UNCONSOLIDATED" | "COURT_ACTS" | "RULES" | "MISC";
    chapter: string;
}
export interface OpenLegLawDoc {
    lawId: string;
    locationId: string;
    title: string;
    docType: "CHAPTER" | "ARTICLE" | "TITLE" | "SUBARTICLE" | "PART" | "SUBPART" | "SECTION" | "INDEX" | "PREAMBLE";
    docLevelId: string;
    activeDate?: string;
    sequenceNo: number;
    repealedDate?: string | null;
    repealed: boolean;
    text?: string | null;
    documents?: {
        items: OpenLegLawDoc[];
        size: number;
    };
}
export interface OpenLegLawTree {
    lawVersion: {
        lawId: string;
        activeDate: string;
    };
    info: OpenLegLawInfo;
    documents: OpenLegLawDoc;
}
export interface NySenateOpts {
    apiKey?: string;
    rateLimitMs?: number;
}
export declare class NySenateClient {
    private readonly apiKey;
    private readonly rateLimitMs;
    private lastRequestAt;
    constructor(opts?: NySenateOpts);
    private throttle;
    private get;
    /** List all law IDs (e.g. EDN, TAX, RPL) - 134 total */
    listLaws(): Promise<OpenLegLawInfo[]>;
    /**
     * Get the full document tree for a law, with all statute text inlined.
     * Response can be several MB for big laws (Penal Law, Tax Law etc).
     */
    getLawTree(lawId: string, opts?: {
        date?: string;
        full?: boolean;
    }): Promise<OpenLegLawTree>;
    /**
     * Flatten a law tree into a list of {parent_location_id, doc} pairs so we can
     * insert them into Postgres with proper parent FK linking.
     * The root document gets parent = null.
     */
    static flattenTree(tree: OpenLegLawTree): Array<{
        parentLocationId: string | null;
        doc: OpenLegLawDoc;
    }>;
}
//# sourceMappingURL=ny-senate.d.ts.map