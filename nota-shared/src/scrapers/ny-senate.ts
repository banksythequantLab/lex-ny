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

const NY_SENATE_BASE = "https://legislation.nysenate.gov/api/3";

export interface OpenLegLawInfo {
  lawId: string;       // 'EDN', 'TAX', etc.
  name: string;        // 'Education'
  lawType: "CONSOLIDATED" | "UNCONSOLIDATED" | "COURT_ACTS" | "RULES" | "MISC";
  chapter: string;     // '16'
}

export interface OpenLegLawDoc {
  lawId: string;
  locationId: string;        // '-CH16', 'A2', '100'
  title: string;
  docType: "CHAPTER" | "ARTICLE" | "TITLE" | "SUBARTICLE" | "PART" | "SUBPART" | "SECTION" | "INDEX" | "PREAMBLE";
  docLevelId: string;         // '16', '2', '100'
  activeDate?: string;         // ISO date
  sequenceNo: number;
  repealedDate?: string | null;
  repealed: boolean;
  text?: string | null;        // populated when ?full=true
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

export class NySenateClient {
  private readonly apiKey: string;
  private readonly rateLimitMs: number;
  private lastRequestAt = 0;

  constructor(opts: NySenateOpts = {}) {
    const key = opts.apiKey || process.env.NY_SENATE_API_KEY;
    if (!key) {
      throw new Error(
        "NY_SENATE_API_KEY required. Get a free key at legislation.nysenate.gov"
      );
    }
    this.apiKey = key;
    this.rateLimitMs = opts.rateLimitMs ?? 100;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.rateLimitMs) {
      await new Promise((r) => setTimeout(r, this.rateLimitMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async get<T>(path: string): Promise<T> {
    await this.throttle();
    const sep = path.includes("?") ? "&" : "?";
    const url = `${NY_SENATE_BASE}${path}${sep}key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "lex.nota.lawyer/0.1" },
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`NY Senate ${res.status} on ${path}: ${errBody.slice(0, 300)}`);
    }
    const wrapped = (await res.json()) as {
      success: boolean;
      message?: string;
      result: T;
    };
    if (!wrapped.success) {
      throw new Error(`NY Senate failure: ${wrapped.message || "unknown"}`);
    }
    return wrapped.result;
  }

  /** List all law IDs (e.g. EDN, TAX, RPL) - 134 total */
  async listLaws(): Promise<OpenLegLawInfo[]> {
    const result = await this.get<{ items: OpenLegLawInfo[]; size: number }>(
      "/laws?limit=1000"
    );
    return result.items;
  }

  /**
   * Get the full document tree for a law, with all statute text inlined.
   * Response can be several MB for big laws (Penal Law, Tax Law etc).
   */
  async getLawTree(lawId: string, opts: { date?: string; full?: boolean } = {}): Promise<OpenLegLawTree> {
    const params = new URLSearchParams();
    if (opts.date) params.set("date", opts.date);
    if (opts.full !== false) params.set("full", "true");  // default: full=true
    return this.get(`/laws/${encodeURIComponent(lawId)}?${params.toString()}`);
  }

  /**
   * Flatten a law tree into a list of {parent_location_id, doc} pairs so we can
   * insert them into Postgres with proper parent FK linking.
   * The root document gets parent = null.
   */
  static flattenTree(tree: OpenLegLawTree): Array<{
    parentLocationId: string | null;
    doc: OpenLegLawDoc;
  }> {
    const out: Array<{ parentLocationId: string | null; doc: OpenLegLawDoc }> = [];

    function walk(doc: OpenLegLawDoc, parentLocationId: string | null) {
      out.push({ parentLocationId, doc });
      if (doc.documents && doc.documents.items) {
        for (const child of doc.documents.items) {
          walk(child, doc.locationId);
        }
      }
    }

    walk(tree.documents, null);
    return out;
  }
}
