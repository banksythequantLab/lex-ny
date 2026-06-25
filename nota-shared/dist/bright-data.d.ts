/**
 * bright-data.ts - Bright Data Web Unlocker + SERP integration.
 *
 * Provides a single WebDataClient interface backed by Bright Data.
 * Heavily used by Lex.NY for:
 *   - Live SERP search to surface fresh case law and statutes
 *   - Web Unlocker to fetch full opinion text from sites that
 *     block normal scrapers (Justia, AmLegal, NYCourts.gov)
 *
 * Two zones used:
 *   - mcp_unlocker (Web Unlocker zone): fetches arbitrary URLs including
 *     gated legal sites and Google SERPs. Robust to bot detection,
 *     CAPTCHAs, geo-blocks.
 *   - serp (optional SERP API zone): if present, returns JSON-parsed
 *     organic results. We fall back to HTML parsing via Web Unlocker
 *     when this zone is unavailable.
 *
 * All BD calls log via the brightDataUsage tracker for the
 * /api/bright-data-stats endpoint (proof of usage for the hackathon).
 */
export interface SerpResult {
    position: number;
    title: string;
    link: string;
    snippet: string;
    displayed_link?: string;
}
export interface WebDataClient {
    provider: string;
    fetchUrl(url: string, opts?: {
        country?: string;
    }): Promise<string>;
    searchSerp(query: string, opts?: {
        engine?: "google" | "bing" | "yandex";
        country?: string;
        limit?: number;
    }): Promise<SerpResult[]>;
    healthCheck(): Promise<{
        ok: boolean;
        fetchUrl_ok: boolean;
        serp_ok: boolean;
        provider: string;
        details: string;
    }>;
}
interface BdUsageEntry {
    timestamp: string;
    operation: "web_unlocker" | "serp";
    url: string;
    zone: string;
    status: "success" | "error";
    duration_ms: number;
    bytes?: number;
    error?: string;
}
declare class BrightDataUsageTracker {
    private entries;
    private maxEntries;
    private storeName;
    constructor();
    record(entry: BdUsageEntry): void;
    getAll(): BdUsageEntry[];
    getStats(): {
        total_requests: number;
        successful: number;
        failed: number;
        by_operation: Record<string, number>;
        total_bytes_fetched: number;
        avg_duration_ms: number;
        first_request_at: string;
        last_request_at: string;
    };
    clear(): void;
}
export declare const brightDataUsage: BrightDataUsageTracker;
export declare class BrightDataClient implements WebDataClient {
    provider: string;
    private apiToken;
    private webUnlockerZone;
    private serpZone;
    constructor(opts?: {
        apiToken?: string;
        webUnlockerZone?: string;
        serpZone?: string;
    });
    /**
     * Fetch any URL through Bright Data Web Unlocker.
     * Handles bot detection, CAPTCHAs, geo-blocks transparently.
     */
    fetchUrl(url: string, opts?: {
        country?: string;
    }): Promise<string>;
    /**
     * Search via Google SERP fetched through Bright Data.
     * Falls back to HTML parsing if the SERP-JSON zone isn't configured.
     */
    searchSerp(query: string, opts?: {
        engine?: "google" | "bing" | "yandex";
        country?: string;
        limit?: number;
    }): Promise<SerpResult[]>;
    healthCheck(): Promise<{
        ok: boolean;
        fetchUrl_ok: boolean;
        serp_ok: boolean;
        provider: string;
        details: string;
    }>;
}
/**
 * Parses Google's organic search results from raw HTML.
 * Google's DOM is volatile but the {title-h3, snippet, link} triad
 * is reliable. We use a few patterns that have been stable for years.
 */
export declare function parseGoogleHtmlResults(html: string, limit: number): SerpResult[];
export declare function getWebDataClient(): WebDataClient;
export {};
//# sourceMappingURL=bright-data.d.ts.map