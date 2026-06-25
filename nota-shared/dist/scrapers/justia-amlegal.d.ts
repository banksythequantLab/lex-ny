/**
 * Bright Data-powered scrapers for sources without free APIs.
 *
 * This file is the primary Bright Data hackathon deliverable - it
 * demonstrates the unique value of Web Unlocker + SERP API for legal
 * data that isn't available through structured government feeds.
 *
 * Three target sources:
 *
 *   1. NYC Administrative Code via American Legal Publishing
 *      (codelibrary.amlegal.com) - 37 titles, no API, behind anti-bot.
 *
 *   2. Fresher NY decisions via Justia
 *      (law.justia.com/cases/new-york/) - CourtListener has good
 *      historical coverage but lags by 1-7 days on fresh opinions.
 *      Justia is faster, and BD Web Unlocker handles their JS-rendered
 *      pages reliably.
 *
 *   3. Live legal SERP queries
 *      - When a user asks a question that's about a current event or
 *        a topic that may not be in our static corpus, we hit BD SERP
 *        to augment the answer with current sources.
 *
 * Cost: $1.50-2.50 per 1000 Web Unlocker requests, $0.50-1.00 per 1000
 * SERP requests. With $250 in BD credits we have plenty of headroom.
 *
 * All requests go through the existing WebDataClient so the rest of the
 * system can stay provider-agnostic. The scraper-specific code lives here.
 */
import { type WebDataClient } from "../bright-data.js";
export interface AmLegalNode {
    /** Internal AmLegal node id (used in URL path) */
    nodeId: string;
    /** Human title like 'Title 1: General Provisions' */
    title: string;
    /** Doc level: top, title, chapter, subchapter, section */
    level: string;
    /** Full URL where this node was scraped from */
    sourceUrl: string;
    /** Statute text body (only meaningful for SECTION level) */
    text?: string;
    /** Sub-node IDs found on this page */
    childNodeIds: string[];
}
export declare class NycAmLegalScraper {
    private readonly webClient;
    constructor(webClient?: WebDataClient);
    /**
     * Scrape a single AmLegal HTML page and extract its structure.
     * Returns the node metadata plus any child node IDs discovered.
     *
     * The HTML has a sidebar TOC and a main content area. We extract:
     *   - Page title from <h1>
     *   - Child links matching the /0-0-0-N URL pattern (TOC entries)
     *   - Body text from the main content div
     */
    scrapeNode(nodeId: string): Promise<AmLegalNode>;
    /**
     * Walk a portion of the AmLegal tree breadth-first up to maxNodes.
     * Returns all scraped nodes for batch insert.
     *
     * Use a small maxNodes (50-100) for testing; 5000+ to scrape the
     * full NYC Admin Code (it's that big).
     */
    crawl(startNodeId?: string, maxNodes?: number): Promise<AmLegalNode[]>;
}
export type JustiaCourt = "court-of-appeals" | "appellate-division-first-department" | "appellate-division-second-department" | "appellate-division-third-department" | "appellate-division-fourth-department";
export interface JustiaCaseListing {
    caseUrl: string;
    caseName: string;
    citation?: string;
    docketNumber?: string;
    date?: string;
}
export interface JustiaCase {
    url: string;
    caseName: string;
    citation?: string;
    docketNumber?: string;
    date?: string;
    judges: string[];
    text?: string;
    summary?: string;
}
export declare class JustiaNyScraper {
    private readonly webClient;
    constructor(webClient?: WebDataClient);
    /** Scrape the year-indexed listing page for a court */
    listCasesByYear(court: JustiaCourt, year: number): Promise<JustiaCaseListing[]>;
    /** Scrape an individual case page for full text */
    getCase(caseUrl: string): Promise<JustiaCase>;
}
/**
 * Parse Justia listing HTML for case links.
 * Justia uses a fairly stable pattern:
 *   <a href="/cases/new-york/court-of-appeals/2026/no-37.html" class="case-name">
 *     Matter of Lawyers for Children
 *   </a>
 *   <strong>Citation:</strong> 2026 NY Slip Op 03218
 *   <strong>Docket Number:</strong> No. 37
 *   <strong>Date:</strong> May 21, 2026
 */
export declare function parseJustiaListing(html: string): JustiaCaseListing[];
/** Parse an individual Justia case page */
export declare function parseJustiaCase(url: string, html: string): JustiaCase;
export interface LiveLegalSource {
    title: string;
    url: string;
    snippet: string;
    scraped_at: string;
    text?: string;
}
export declare function liveSerpLegalSearch(query: string, opts?: {
    limit?: number;
    fetchBodies?: boolean;
    fetchBodiesLimit?: number;
    webClient?: WebDataClient;
}): Promise<LiveLegalSource[]>;
//# sourceMappingURL=justia-amlegal.d.ts.map