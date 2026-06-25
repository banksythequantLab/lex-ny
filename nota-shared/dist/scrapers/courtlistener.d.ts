/**
 * CourtListener scraper - bulk seed NY case law from Free Law Project.
 *
 * CL provides 8M+ opinions across 3350+ jurisdictions, fully indexed,
 * via free REST API at https://www.courtlistener.com/api/rest/v4/
 *
 * Auth: free API token (sign up at courtlistener.com, copy from /profile/api/)
 *
 * Hierarchy: docket -> cluster -> opinion. We fetch clusters for NY courts
 * and inline-fetch their opinions. CL groups multiple opinions per case
 * (majority + dissents + concurrences) into one cluster.
 *
 * Cost: $0 - CL is non-profit, no scraping, no BD credits used.
 * This is our primary case-law seed source.
 *
 * Rate limit: be polite. CL throttles aggressive clients. We sleep 250ms
 * between requests (~4 req/s, well under their published limits).
 */
export interface CLOpinion {
    resource_uri: string;
    id: number;
    cluster_id: number;
    type: string;
    author_id?: number;
    author_str?: string;
    joined_by_str?: string;
    per_curiam: boolean;
    html_with_citations?: string;
    plain_text?: string;
    page_count?: number;
    download_url?: string;
}
export interface CLCluster {
    resource_uri: string;
    id: number;
    docket: string;
    judges?: string;
    panel: number[];
    non_participating_judges: number[];
    citations: Array<{
        volume: number;
        reporter: string;
        page: string;
        type: number;
    }>;
    case_name: string;
    case_name_short?: string;
    case_name_full?: string;
    scdb_id?: string;
    date_filed: string;
    date_argued?: string;
    precedential_status: string;
    slug: string;
    sub_opinions: string[];
    absolute_url: string;
}
export interface CLDocket {
    resource_uri: string;
    id: number;
    court: string;
    court_id: string;
    case_name: string;
    docket_number?: string;
    date_filed?: string;
    date_terminated?: string;
}
export interface CLPerson {
    id: number;
    name_first?: string;
    name_middle?: string;
    name_last?: string;
    name_suffix?: string;
    date_dob?: string;
    date_dod?: string;
    positions?: string[];
}
export interface CourtListenerOpts {
    apiToken?: string;
    /** Sleep this long between requests in ms. Default 250. */
    rateLimitMs?: number;
}
export declare class CourtListenerClient {
    private readonly authHeader;
    private readonly rateLimitMs;
    private lastRequestAt;
    constructor(opts?: CourtListenerOpts);
    private throttle;
    /** Generic GET with auth + throttle. Per-request 25s timeout to prevent stalls. */
    /**
     * Generic GET with auth + throttle + 25s timeout + 429 backoff.
     *
     * CourtListener has a 5 req/min rate limit on opinion endpoints (free tier).
     * When we hit 429, the response body tells us how long to wait. We honor it,
     * retry up to 3 times, then give up.
     */
    private get;
    /**
     * List clusters for a NY court, ordered by filing date descending.
     * Use cursor pagination via the `next` field in the response.
     *
     * Court IDs we use:
     *   ny          - New York Court of Appeals
     *   nyappdiv1   - Appellate Division, First Department
     *   nyappdiv2   - Second Department
     *   nyappdiv3   - Third Department
     *   nyappdiv4   - Fourth Department
     */
    listClusters(opts: {
        court: string;
        dateFiledAfter?: string;
        dateFiledBefore?: string;
        cursor?: string;
        pageSize?: number;
    }): Promise<{
        results: CLCluster[];
        next: string | null;
        previous: string | null;
        count?: number;
    }>;
    /** Fetch a full opinion (the actual text) by its URI */
    getOpinion(uri: string): Promise<CLOpinion>;
    /** Fetch all opinions for a cluster, sequentially with throttling */
    getClusterOpinions(cluster: CLCluster): Promise<CLOpinion[]>;
    /** Fetch judge info by CL person ID */
    getPerson(personId: number): Promise<CLPerson>;
    /** Get docket by URI - useful for getting docket_number */
    getDocket(uri: string): Promise<CLDocket>;
    /**
     * Strip HTML tags to plain text, preserving paragraph breaks.
     * CL's html_with_citations is mostly clean HTML with span citation tags.
     * For pgvector indexing we want plain text without markup noise.
     */
    static htmlToPlain(html: string | undefined): string;
    /**
     * Build a parallel-citation string from the citations array.
     * Returns 'N.Y.3d 555' style strings.
     */
    static formatCitations(citations: CLCluster["citations"]): string[];
    /**
     * Pick the "primary" citation - prefer official NY reporters over slip opinions.
     * Returns the best citation string or undefined.
     */
    static primaryCitation(citations: CLCluster["citations"]): string | undefined;
}
//# sourceMappingURL=courtlistener.d.ts.map