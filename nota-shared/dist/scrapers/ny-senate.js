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
export class NySenateClient {
    apiKey;
    rateLimitMs;
    lastRequestAt = 0;
    constructor(opts = {}) {
        const key = opts.apiKey || process.env.NY_SENATE_API_KEY;
        if (!key) {
            throw new Error("NY_SENATE_API_KEY required. Get a free key at legislation.nysenate.gov");
        }
        this.apiKey = key;
        this.rateLimitMs = opts.rateLimitMs ?? 100;
    }
    async throttle() {
        const elapsed = Date.now() - this.lastRequestAt;
        if (elapsed < this.rateLimitMs) {
            await new Promise((r) => setTimeout(r, this.rateLimitMs - elapsed));
        }
        this.lastRequestAt = Date.now();
    }
    async get(path) {
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
        const wrapped = (await res.json());
        if (!wrapped.success) {
            throw new Error(`NY Senate failure: ${wrapped.message || "unknown"}`);
        }
        return wrapped.result;
    }
    /** List all law IDs (e.g. EDN, TAX, RPL) - 134 total */
    async listLaws() {
        const result = await this.get("/laws?limit=1000");
        return result.items;
    }
    /**
     * Get the full document tree for a law, with all statute text inlined.
     * Response can be several MB for big laws (Penal Law, Tax Law etc).
     */
    async getLawTree(lawId, opts = {}) {
        const params = new URLSearchParams();
        if (opts.date)
            params.set("date", opts.date);
        if (opts.full !== false)
            params.set("full", "true"); // default: full=true
        return this.get(`/laws/${encodeURIComponent(lawId)}?${params.toString()}`);
    }
    /**
     * Flatten a law tree into a list of {parent_location_id, doc} pairs so we can
     * insert them into Postgres with proper parent FK linking.
     * The root document gets parent = null.
     */
    static flattenTree(tree) {
        const out = [];
        function walk(doc, parentLocationId) {
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
//# sourceMappingURL=ny-senate.js.map