/**
 * Algolia integration for Lex.NY - federated full-text search across the NY statute corpus.
 *
 * Why Algolia in addition to pgvector?
 *   pgvector is great for semantic queries ("what does the law say about X"),
 *   but terrible for exact-string lookups ("PEN 400.00", "Section 349-A").
 *   Algolia handles both: typo-tolerant search with millisecond latency,
 *   handling the part of the workload where embedding-based ANN is the wrong tool.
 *
 *   The two systems are complementary:
 *     - pgvector → "what does NY law say about X?"  (semantic)
 *     - Algolia  → "where is GBS 349-A?"            (lexical)
 *
 *   In production we'd run both and merge results. For the hackathon, Algolia
 *   powers the /corpus browse UI and an /api/search endpoint.
 *
 * Hackathon angle:
 *   - Algolia is a Proof of Usefulness sponsor (HackerNoon prize)
 *   - Hits PoU tags: #ai-search, #search-api, #semantic-search
 *   - Build tier (free): 10K search req/mo, 1M records, 10K AI recommendation calls
 *
 * Deployment:
 *   - Sign up at https://www.algolia.com (HackerNoon partner)
 *   - Create an app, get APP_ID + ADMIN_API_KEY + SEARCH_API_KEY
 *   - Set ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_SEARCH_API_KEY in .env.local
 *   - Run: npx tsx scripts/sync-algolia.ts
 *
 *   When credentials aren't set, all Algolia-backed features degrade gracefully
 *   (no crash, just no federated search alongside pgvector).
 */
import { type SearchClient } from "algoliasearch";
export interface AlgoliaConfig {
    appId: string;
    adminApiKey: string;
    searchApiKey?: string;
    indexName: string;
}
export declare function isAlgoliaConfigured(): boolean;
export declare function getAlgoliaAdminClient(): SearchClient;
export declare function getAlgoliaSearchClient(): SearchClient;
export declare function getIndexName(): string;
/**
 * One Algolia record per SECTION-level statute. Optimized for typo-
 * tolerant lookups by citation, title, and free text search of body.
 */
export interface StatuteRecord {
    /** Algolia primary key */
    objectID: string;
    /** Stable cite key used by the rest of Lex.NY */
    citation_key: string;
    /** Searchable */
    law_id: string;
    law_name: string;
    location_id: string;
    title: string;
    text: string;
    /** Filterable / faceted */
    doc_type: string;
    jurisdiction: string;
    /** Convenience URL */
    source_url: string;
}
export declare function bootstrapIndex(): Promise<void>;
/**
 * Push a batch of statute records into Algolia. Returns the count uploaded.
 */
export declare function indexStatutes(records: StatuteRecord[]): Promise<number>;
export declare function clearIndex(): Promise<void>;
export interface AlgoliaSearchHit {
    objectID: string;
    citation_key: string;
    law_id: string;
    law_name: string;
    location_id: string;
    title: string;
    text_snippet?: string;
    source_url: string;
    /** Algolia's _highlightResult for the citation_key, if any */
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
/**
 * Run a lexical search against the Algolia index. Returns at most `hitsPerPage`
 * (default 20) results with typo tolerance and snippets.
 */
export declare function searchStatutes(query: string, opts?: {
    page?: number;
    hitsPerPage?: number;
    lawIdFilter?: string;
}): Promise<AlgoliaSearchResult>;
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
export declare function getAlgoliaStats(): Promise<AlgoliaStats>;
/**
 * Health check for the /api/algolia-stats endpoint.
 */
export declare function algoliaHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=algolia-client.d.ts.map