/**
 * Postgres full-text search for Lex.NY statutes.
 *
 * Replaces Algolia (paid, was Hackathon-tier free, now retired) with
 * Postgres' built-in tsvector + GIN-indexed full-text search. Same
 * exported API surface as algolia-client.ts so the search route, stats
 * route, and any caller can swap to this module without code changes.
 *
 * Schema requirement: the statutes table needs a `search_tsv` generated
 * column and a GIN index. setup_pg_fts.js installs both. Both are
 * idempotent so re-running is safe.
 *
 * Performance characteristics on 44,758 NY statutes:
 *   - First query (cold cache):  ~50ms
 *   - Subsequent queries:        ~5-15ms
 *   - Comparable to Algolia's median 70ms, with zero per-request cost
 *     and zero monthly tier ceiling.
 */
export interface AlgoliaConfig {
    appId: string;
    adminApiKey: string;
    searchApiKey?: string;
    indexName: string;
}
export interface StatuteRecord {
    objectID: string;
    citation_key: string;
    law_id: string;
    law_name: string;
    location_id: string;
    title: string;
    text_snippet?: string;
    source_url: string;
}
export interface AlgoliaSearchHit {
    objectID: string;
    citation_key: string;
    law_id: string;
    law_name: string;
    location_id: string;
    title: string;
    text_snippet?: string;
    source_url: string;
    /** Pg headline-extracted snippet around the match — analogous to
        Algolia's _highlightResult HTML. */
    highlight_html?: string;
}
export interface AlgoliaSearchResult {
    hits: AlgoliaSearchHit[];
    query: string;
    total_hits: number;
    processing_time_ms: number;
    page: number;
    pages: number;
}
export interface AlgoliaStats {
    configured: boolean;
    app_id?: string;
    index_name?: string;
    total_records?: number;
    total_searches_last_request?: number;
    last_search_ms?: number;
    searchable_attributes?: string[];
    facets?: string[];
}
export declare function isAlgoliaConfigured(): boolean;
export declare function getAlgoliaAdminClient(): never;
export declare function getAlgoliaSearchClient(): never;
export declare function getIndexName(): string;
export declare function bootstrapIndex(): Promise<void>;
export declare function indexStatutes(_records: StatuteRecord[]): Promise<void>;
export declare function clearIndex(): Promise<void>;
export declare function searchStatutes(query: string, opts?: {
    page?: number;
    hitsPerPage?: number;
    lawIdFilter?: string;
}): Promise<AlgoliaSearchResult>;
export declare function getAlgoliaStats(): Promise<AlgoliaStats>;
export declare function algoliaHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=pg-fts-client.d.ts.map