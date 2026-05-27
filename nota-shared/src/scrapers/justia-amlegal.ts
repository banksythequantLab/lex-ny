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

import { getWebDataClient, type WebDataClient, type SerpResult } from "../bright-data.js";

/* ------------------------------------------------------------------ */
/*  NYC Administrative Code                                             */
/*                                                                      */
/*  URL pattern (American Legal Publishing's HTML viewer):              */
/*    https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-N
//*  where N is a content node ID. Top of NYC Admin is 1.                */
/*                                                                      */
/*  Strategy: walk the tree breadth-first via BD Web Unlocker, extract  */
/*  Title -> Chapter -> Section structure into our statutes table.     */
/*  Each leaf 'section' has actual law text. Internal nodes are nav.    */
/* ------------------------------------------------------------------ */

const NYC_AMLEGAL_BASE = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin";

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

export class NycAmLegalScraper {
  constructor(private readonly webClient: WebDataClient = getWebDataClient()) {}

  /**
   * Scrape a single AmLegal HTML page and extract its structure.
   * Returns the node metadata plus any child node IDs discovered.
   *
   * The HTML has a sidebar TOC and a main content area. We extract:
   *   - Page title from <h1>
   *   - Child links matching the /0-0-0-N URL pattern (TOC entries)
   *   - Body text from the main content div
   */
  async scrapeNode(nodeId: string): Promise<AmLegalNode> {
    const url = `${NYC_AMLEGAL_BASE}/0-0-0-${nodeId}`;
    const html = await this.webClient.fetchUrl(url);

    // Extract title
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : `Node ${nodeId}`;

    // Extract child node IDs from links matching the URL pattern
    const childIdSet = new Set<string>();
    const linkRegex = /href="[^"]*\/0-0-0-(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      if (m[1] !== nodeId) childIdSet.add(m[1]);
    }

    // Body text - try to grab the main content area
    // AmLegal uses class names that vary; we try several common selectors
    let text: string | undefined;
    const bodyMatch =
      html.match(/<div[^>]*id="document-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
      html.match(/<div[^>]*class="[^"]*content-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (bodyMatch) {
      text = stripTags(bodyMatch[1]).replace(/\s+/g, " ").trim();
      // Heuristic: if it's a navigation page (text is just the table-of-contents listing),
      // we'll get the same text on every page. Statute pages have substantive content
      // typically > 200 chars per section.
      if (text.length < 50) text = undefined;
    }

    // Guess level from title
    let level = "section";
    if (/^Title\s+\d/i.test(title)) level = "title";
    else if (/^Chapter\s+\d/i.test(title)) level = "chapter";
    else if (/^Subchapter/i.test(title)) level = "subchapter";
    else if (/^Article/i.test(title)) level = "article";
    else if (childIdSet.size > 5) level = "container";

    return {
      nodeId,
      title,
      level,
      sourceUrl: url,
      text,
      childNodeIds: Array.from(childIdSet),
    };
  }

  /**
   * Walk a portion of the AmLegal tree breadth-first up to maxNodes.
   * Returns all scraped nodes for batch insert.
   *
   * Use a small maxNodes (50-100) for testing; 5000+ to scrape the
   * full NYC Admin Code (it's that big).
   */
  async crawl(startNodeId: string = "1", maxNodes: number = 50): Promise<AmLegalNode[]> {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    const results: AmLegalNode[] = [];

    while (queue.length > 0 && results.length < maxNodes) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      try {
        const node = await this.scrapeNode(nodeId);
        results.push(node);
        for (const child of node.childNodeIds) {
          if (!visited.has(child)) queue.push(child);
        }
      } catch (e) {
        console.warn(`NYC AmLegal scrape failed for node ${nodeId}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return results;
  }
}


/* ------------------------------------------------------------------ */
/*  Justia NY case scraper                                              */
/*                                                                      */
/*  Used for opinions that haven't hit CourtListener yet (CL lags ~7d). */
/*  URL pattern:                                                        */
/*    https://law.justia.com/cases/new-york/court-of-appeals/2026/      */
/*    https://law.justia.com/cases/new-york/appellate-division-first/   */
/* ------------------------------------------------------------------ */

const JUSTIA_BASE = "https://law.justia.com/cases/new-york";

export type JustiaCourt =
  | "court-of-appeals"
  | "appellate-division-first-department"
  | "appellate-division-second-department"
  | "appellate-division-third-department"
  | "appellate-division-fourth-department";

export interface JustiaCaseListing {
  caseUrl: string;       // absolute
  caseName: string;
  citation?: string;
  docketNumber?: string;
  date?: string;          // ISO if parseable
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

export class JustiaNyScraper {
  constructor(private readonly webClient: WebDataClient = getWebDataClient()) {}

  /** Scrape the year-indexed listing page for a court */
  async listCasesByYear(court: JustiaCourt, year: number): Promise<JustiaCaseListing[]> {
    const url = `${JUSTIA_BASE}/${court}/${year}/`;
    const html = await this.webClient.fetchUrl(url);
    return parseJustiaListing(html);
  }

  /** Scrape an individual case page for full text */
  async getCase(caseUrl: string): Promise<JustiaCase> {
    const html = await this.webClient.fetchUrl(caseUrl);
    return parseJustiaCase(caseUrl, html);
  }
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
export function parseJustiaListing(html: string): JustiaCaseListing[] {
  const out: JustiaCaseListing[] = [];

  // Match each case block - this regex is intentionally loose because
  // Justia's HTML changes occasionally
  const linkRegex = /<a[^>]+href="(\/cases\/new-york\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const path = m[1];
    if (!path.match(/\/(court-of-appeals|appellate-division)/)) continue;

    const caseName = stripTags(m[2]).trim();
    if (!caseName || caseName.length < 3) continue;

    // Look for nearby citation/docket/date in the surrounding ~500 chars of context
    const contextStart = Math.max(0, m.index - 100);
    const contextEnd   = Math.min(html.length, m.index + m[0].length + 400);
    const context      = html.slice(contextStart, contextEnd);

    const citation     = matchField(context, "Citation");
    const docketNumber = matchField(context, "Docket Number");
    const date         = matchField(context, "Date");

    out.push({
      caseUrl: path.startsWith("http") ? path : `https://law.justia.com${path}`,
      caseName,
      citation,
      docketNumber,
      date: date ? normalizeDate(date) : undefined,
    });
  }

  return dedupeBy(out, (c) => c.caseUrl);
}

/** Parse an individual Justia case page */
export function parseJustiaCase(url: string, html: string): JustiaCase {
  const caseName = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").trim();

  const citation     = matchField(html, "Citation");
  const docketNumber = matchField(html, "Docket Number");
  const date         = matchField(html, "Date");

  // Judges - Justia sometimes lists them as "Judge:" lines
  const judges: string[] = [];
  const judgeRegex = /Judge[s]?:\s*<\/?[^>]*>([^<]+)/gi;
  let jm: RegExpExecArray | null;
  while ((jm = judgeRegex.exec(html)) !== null) {
    const list = jm[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    judges.push(...list);
  }

  // Main opinion text - look for opinion-body or main content
  const bodyMatch =
    html.match(/<div[^>]*class="[^"]*opinion-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*id="opinion-text"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const text = bodyMatch ? stripTags(bodyMatch[1]).replace(/\s+/g, " ").trim() : undefined;

  const summary = matchField(html, "Opinion Summary");

  return {
    url,
    caseName,
    citation,
    docketNumber,
    date: date ? normalizeDate(date) : undefined,
    judges: dedupeBy(judges, (s) => s.toLowerCase()),
    text,
    summary,
  };
}


/* ------------------------------------------------------------------ */
/*  Live SERP augmentation                                              */
/*                                                                      */
/*  When a question can't be answered from the static corpus, hit BD    */
/*  SERP to find recent sources and pull them via Web Unlocker.        */
/* ------------------------------------------------------------------ */

export interface LiveLegalSource {
  title: string;
  url: string;
  snippet: string;
  scraped_at: string;
  text?: string;
}

export async function liveSerpLegalSearch(
  query: string,
  opts: { limit?: number; fetchBodies?: boolean; fetchBodiesLimit?: number; webClient?: WebDataClient } = {}
): Promise<LiveLegalSource[]> {
  const client = opts.webClient || getWebDataClient();
  const limit = opts.limit || 5;

  // Constrain to legal/government sources
  const augmentedQuery = `${query} site:nycourts.gov OR site:law.justia.com OR site:nysenate.gov OR site:nycourts.gov OR site:law.cornell.edu`;
  const results: SerpResult[] = await client.searchSerp(augmentedQuery, {
    engine: "google",
    limit,
  });

  const sources: LiveLegalSource[] = results.map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    scraped_at: new Date().toISOString(),
  }));

  if (opts.fetchBodies) {
    // BD-Unlock the top N SERP results (default: 2) in parallel.
    // Each call is another Bright Data Web Unlocker request - shown in
    // /api/bright-data-stats as proof of sponsor integration depth.
    const fetchTop = opts.fetchBodiesLimit ?? 2;
    const targets = sources.slice(0, fetchTop);
    const results = await Promise.allSettled(
      targets.map(async (source) => {
        const html = await client.fetchUrl(source.url);
        return { source, text: stripTags(html).replace(/\s+/g, " ").slice(0, 12000) };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        r.value.source.text = r.value.text;
      } else {
        console.warn(`BD-Unlock failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
      }
    }
  }

  return sources;
}


/* ------------------------------------------------------------------ */
/*  HTML helpers - shared across scrapers                              */
/* ------------------------------------------------------------------ */

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find a "Label: value" field in HTML. Looks for the label string,
 * then captures the next chunk of text up to the next tag or newline.
 */
function matchField(html: string, label: string): string | undefined {
  // Try strong tag pattern first
  const strongRe = new RegExp(
    `<strong[^>]*>${label}[:]?[\\s]*</strong>([^<\\n]+)`,
    "i"
  );
  const strongMatch = html.match(strongRe);
  if (strongMatch) return strongMatch[1].trim();

  // Fall back to plain label
  const plainRe = new RegExp(`${label}[:]?[\\s]+([^<\\n]{1,200})`, "i");
  const plainMatch = html.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : undefined;
}

function normalizeDate(s: string): string | undefined {
  const date = new Date(s);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function dedupeBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}
