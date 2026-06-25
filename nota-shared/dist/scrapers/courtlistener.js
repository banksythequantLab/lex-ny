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
const CL_BASE = "https://www.courtlistener.com/api/rest/v4";
export class CourtListenerClient {
    authHeader;
    rateLimitMs;
    lastRequestAt = 0;
    constructor(opts = {}) {
        const token = opts.apiToken || process.env.COURTLISTENER_API_TOKEN;
        if (!token) {
            throw new Error("COURTLISTENER_API_TOKEN required. Get free token at courtlistener.com/profile/api/");
        }
        this.authHeader = `Token ${token}`;
        this.rateLimitMs = opts.rateLimitMs ?? 12500;
    }
    async throttle() {
        const elapsed = Date.now() - this.lastRequestAt;
        if (elapsed < this.rateLimitMs) {
            await new Promise((r) => setTimeout(r, this.rateLimitMs - elapsed));
        }
        this.lastRequestAt = Date.now();
    }
    /** Generic GET with auth + throttle. Per-request 25s timeout to prevent stalls. */
    /**
     * Generic GET with auth + throttle + 25s timeout + 429 backoff.
     *
     * CourtListener has a 5 req/min rate limit on opinion endpoints (free tier).
     * When we hit 429, the response body tells us how long to wait. We honor it,
     * retry up to 3 times, then give up.
     */
    async get(path, retries = 3) {
        const url = path.startsWith("http") ? path : `${CL_BASE}${path}`;
        for (let attempt = 0; attempt <= retries; attempt++) {
            await this.throttle();
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            try {
                const res = await fetch(url, {
                    headers: { Authorization: this.authHeader, "User-Agent": "lex.nota.lawyer/0.1" },
                    signal: controller.signal,
                });
                clearTimeout(timer);
                // Handle rate limit: parse retry hint from body, sleep, retry
                if (res.status === 429) {
                    const errBody = await res.text();
                    // Body format: {"detail":"Request was throttled. Expected available in 54 seconds."}
                    const m = errBody.match(/available in (\d+) seconds?/i);
                    const waitSec = m ? parseInt(m[1], 10) : 60;
                    if (attempt < retries) {
                        // Add a small buffer to avoid landing right on the boundary
                        const sleepMs = (waitSec + 2) * 1000;
                        console.warn(`  CL 429: sleeping ${waitSec + 2}s before retry ${attempt + 1}/${retries}`);
                        await new Promise((r) => setTimeout(r, sleepMs));
                        continue;
                    }
                    throw new Error(`CourtListener 429 (exhausted retries) on ${url}: ${errBody.slice(0, 200)}`);
                }
                if (!res.ok) {
                    const errBody = await res.text();
                    throw new Error(`CourtListener ${res.status} on ${url}: ${errBody.slice(0, 300)}`);
                }
                return (await res.json());
            }
            catch (e) {
                clearTimeout(timer);
                if (e.name === "AbortError") {
                    if (attempt < retries) {
                        console.warn(`  CL timeout: retrying ${attempt + 1}/${retries}`);
                        continue;
                    }
                    throw new Error(`CourtListener timeout (25s, exhausted retries) on ${url}`);
                }
                throw e;
            }
        }
        throw new Error(`CourtListener: unreachable`);
    }
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
    async listClusters(opts) {
        const params = new URLSearchParams({
            "docket__court": opts.court,
            "page_size": String(opts.pageSize || 100),
            "order_by": "-date_filed",
        });
        if (opts.dateFiledAfter)
            params.set("date_filed__gte", opts.dateFiledAfter);
        if (opts.dateFiledBefore)
            params.set("date_filed__lte", opts.dateFiledBefore);
        if (opts.cursor)
            params.set("cursor", opts.cursor);
        return this.get(`/clusters/?${params.toString()}`);
    }
    /** Fetch a full opinion (the actual text) by its URI */
    async getOpinion(uri) {
        return this.get(uri);
    }
    /** Fetch all opinions for a cluster, sequentially with throttling */
    async getClusterOpinions(cluster) {
        const opinions = [];
        for (const uri of cluster.sub_opinions) {
            try {
                opinions.push(await this.getOpinion(uri));
            }
            catch (e) {
                console.warn(`Failed to fetch opinion ${uri}: ${e instanceof Error ? e.message : e}`);
            }
        }
        return opinions;
    }
    /** Fetch judge info by CL person ID */
    async getPerson(personId) {
        return this.get(`/people/${personId}/`);
    }
    /** Get docket by URI - useful for getting docket_number */
    async getDocket(uri) {
        return this.get(uri);
    }
    /**
     * Strip HTML tags to plain text, preserving paragraph breaks.
     * CL's html_with_citations is mostly clean HTML with span citation tags.
     * For pgvector indexing we want plain text without markup noise.
     */
    static htmlToPlain(html) {
        if (!html)
            return "";
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<\/?(?:p|div|br|li|h[1-6])[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ \t]+/g, " ")
            .trim();
    }
    /**
     * Build a parallel-citation string from the citations array.
     * Returns 'N.Y.3d 555' style strings.
     */
    static formatCitations(citations) {
        return (citations || []).map((c) => `${c.volume} ${c.reporter} ${c.page}`);
    }
    /**
     * Pick the "primary" citation - prefer official NY reporters over slip opinions.
     * Returns the best citation string or undefined.
     */
    static primaryCitation(citations) {
        if (!citations || citations.length === 0)
            return undefined;
        // CL citation types: 1 = federal, 2 = state, 3 = state regional, 6 = neutral, 8 = lexis, 9 = westlaw
        // Prefer state official (type 2) then state regional (type 3)
        const preferred = citations.find((c) => c.type === 2)
            || citations.find((c) => c.type === 3)
            || citations[0];
        return `${preferred.volume} ${preferred.reporter} ${preferred.page}`;
    }
}
//# sourceMappingURL=courtlistener.js.map