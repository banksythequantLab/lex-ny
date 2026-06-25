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
import { algoliasearch } from "algoliasearch";
/* ------------------------------------------------------------------ */
/*  Client lifecycle                                                   */
/* ------------------------------------------------------------------ */
let cachedAdminClient = null;
let cachedSearchClient = null;
function getAdminConfig() {
    const appId = process.env.ALGOLIA_APP_ID;
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;
    if (!appId || !adminApiKey)
        return null;
    return {
        appId,
        adminApiKey,
        searchApiKey: process.env.ALGOLIA_SEARCH_API_KEY,
        indexName: process.env.ALGOLIA_INDEX_NAME || "lex_ny_statutes",
    };
}
function getSearchConfig() {
    // Search uses search-only key when available, falls back to admin
    const appId = process.env.ALGOLIA_APP_ID;
    const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY;
    if (!appId || !searchApiKey)
        return null;
    return {
        appId,
        adminApiKey: searchApiKey,
        indexName: process.env.ALGOLIA_INDEX_NAME || "lex_ny_statutes",
    };
}
export function isAlgoliaConfigured() {
    return getSearchConfig() !== null;
}
export function getAlgoliaAdminClient() {
    if (cachedAdminClient)
        return cachedAdminClient;
    const cfg = getAdminConfig();
    if (!cfg) {
        throw new Error("Algolia admin not configured. Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY in .env.local");
    }
    cachedAdminClient = algoliasearch(cfg.appId, cfg.adminApiKey);
    return cachedAdminClient;
}
export function getAlgoliaSearchClient() {
    if (cachedSearchClient)
        return cachedSearchClient;
    const cfg = getSearchConfig();
    if (!cfg) {
        throw new Error("Algolia search not configured");
    }
    cachedSearchClient = algoliasearch(cfg.appId, cfg.adminApiKey);
    return cachedSearchClient;
}
export function getIndexName() {
    return process.env.ALGOLIA_INDEX_NAME || "lex_ny_statutes";
}
/* ------------------------------------------------------------------ */
/*  Index bootstrap - set up searchable attributes and ranking         */
/* ------------------------------------------------------------------ */
export async function bootstrapIndex() {
    const client = getAlgoliaAdminClient();
    const indexName = getIndexName();
    await client.setSettings({
        indexName,
        indexSettings: {
            // Primary search field, in priority order. Citation key first so
            // typing "PEN 400" hits PEN 400.00 immediately.
            searchableAttributes: [
                "citation_key",
                "title",
                "law_name",
                "text",
            ],
            // Filterable / faceted attributes
            attributesForFaceting: [
                "law_id",
                "filterOnly(jurisdiction)",
                "filterOnly(doc_type)",
            ],
            // Custom ranking - tie-break by law_id alphabetical
            customRanking: ["asc(law_id)", "asc(location_id)"],
            // Typo tolerance
            typoTolerance: true,
            minWordSizefor1Typo: 4,
            minWordSizefor2Typos: 8,
            // Snippet for the highlighted result
            attributesToSnippet: ["text:30"],
            // Highlight the matching term
            attributesToHighlight: ["citation_key", "title", "text"],
        },
    });
}
/* ------------------------------------------------------------------ */
/*  Sync - push statutes from Postgres into Algolia                    */
/* ------------------------------------------------------------------ */
/**
 * Push a batch of statute records into Algolia. Returns the count uploaded.
 */
export async function indexStatutes(records) {
    if (records.length === 0)
        return 0;
    const client = getAlgoliaAdminClient();
    const indexName = getIndexName();
    const res = await client.saveObjects({
        indexName,
        objects: records,
    });
    // The response is an array of batch responses; sum the objectIDs
    let count = 0;
    for (const batch of res) {
        count += batch.objectIDs.length;
    }
    return count;
}
export async function clearIndex() {
    const client = getAlgoliaAdminClient();
    await client.clearObjects({ indexName: getIndexName() });
}
/**
 * Run a lexical search against the Algolia index. Returns at most `hitsPerPage`
 * (default 20) results with typo tolerance and snippets.
 */
export async function searchStatutes(query, opts = {}) {
    const client = getAlgoliaSearchClient();
    const indexName = getIndexName();
    const page = opts.page ?? 0;
    const hitsPerPage = opts.hitsPerPage ?? 20;
    const searchParams = {
        query,
        page,
        hitsPerPage,
    };
    if (opts.lawIdFilter) {
        searchParams.filters = `law_id:${opts.lawIdFilter}`;
    }
    const res = await client.searchSingleIndex({
        indexName,
        searchParams,
    });
    const hits = (res.hits || []).map((h) => {
        const highlight = h._highlightResult || {};
        const snippet = h._snippetResult || {};
        return {
            objectID: h.objectID,
            citation_key: h.citation_key,
            law_id: h.law_id,
            law_name: h.law_name,
            location_id: h.location_id,
            title: h.title,
            text_snippet: snippet.text?.value,
            source_url: h.source_url,
            highlight_html: highlight.citation_key?.value || highlight.title?.value,
        };
    });
    return {
        hits,
        query,
        total_hits: res.nbHits ?? hits.length,
        processing_time_ms: res.processingTimeMS ?? 0,
        page: res.page ?? 0,
        pages: res.nbPages ?? 1,
    };
}
export async function getAlgoliaStats() {
    if (!isAlgoliaConfigured()) {
        return { configured: false };
    }
    try {
        const client = getAlgoliaAdminClient();
        const indexName = getIndexName();
        // Use a stub search to count records; getSettings for schema details
        const [settings, sample] = await Promise.all([
            client.getSettings({ indexName }),
            client.searchSingleIndex({
                indexName,
                searchParams: { query: "", hitsPerPage: 0 },
            }),
        ]);
        return {
            configured: true,
            app_id: process.env.ALGOLIA_APP_ID,
            index_name: indexName,
            total_records: sample.nbHits ?? 0,
            last_search_ms: sample.processingTimeMS ?? 0,
            searchable_attributes: settings.searchableAttributes || [],
            facets: settings.attributesForFaceting || [],
        };
    }
    catch (e) {
        return {
            configured: true,
            app_id: process.env.ALGOLIA_APP_ID,
            index_name: getIndexName(),
        };
    }
}
/**
 * Health check for the /api/algolia-stats endpoint.
 */
export async function algoliaHealthCheck() {
    if (!isAlgoliaConfigured()) {
        return {
            ok: false,
            details: "ALGOLIA_APP_ID and ALGOLIA_SEARCH_API_KEY (or ADMIN_API_KEY) not set in .env.local",
        };
    }
    try {
        const client = getAlgoliaSearchClient();
        await client.searchSingleIndex({
            indexName: getIndexName(),
            searchParams: { query: "ping", hitsPerPage: 1 },
        });
        return {
            ok: true,
            details: `Algolia connected. Index: ${getIndexName()}`,
        };
    }
    catch (e) {
        return {
            ok: false,
            details: e instanceof Error ? e.message : String(e),
        };
    }
}
//# sourceMappingURL=algolia-client.js.map