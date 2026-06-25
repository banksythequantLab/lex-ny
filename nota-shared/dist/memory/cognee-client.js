/**
 * Cognee integration for Lex.NY — agent memory layer.
 *
 * Why Cognee?
 *   Legal research is iterative. A user asks one question, then a follow-up,
 *   then a clarification, then "tie that back to the earlier point." Each
 *   isolated /api/ask call has no memory of the prior conversation, so the
 *   user re-explains every time.
 *
 *   Cognee provides persistent, graph-backed memory: every question and
 *   the corpus context retrieved for it become nodes in a knowledge graph
 *   the next question can traverse.
 *
 *   For an attorney supervising the tool, this matters because legal
 *   research has natural state: "we already established that GBS 349 is
 *   the consumer-protection hook — now apply that to the facts of this
 *   specific case." Memory turns Lex.NY from a stateless search engine
 *   into something closer to a research session with a clerk.
 *
 * Hackathon angle:
 *   Cognee is a Bright Data UNLOCKED partner.
 *   Best Use Prize: 1 Year Team Access (worth $2,400) + $500 Amazon Gift Card.
 *
 *   Cognee's REST API uses JWT bearer authentication and exposes:
 *     - POST /api/v1/auth/login            → returns access_token
 *     - POST /api/v1/add                   → ingest a document
 *     - POST /api/v1/cognify               → build the knowledge graph
 *     - POST /api/v1/search                → query (GRAPH_COMPLETION mode)
 *     - DELETE /api/v1/delete              → forget
 *
 * Deployment options:
 *   - Self-host: `pip install cognee && cognee server --http` on port 8000
 *   - Managed cloud: https://tenant-xxx.aws.cognee.ai (ck_... API key)
 *
 *   Set COGNEE_BASE_URL + COGNEE_API_KEY in .env.local (managed)
 *   OR COGNEE_BASE_URL + COGNEE_USERNAME + COGNEE_PASSWORD (self-hosted JWT)
 *
 *   When unset, all Cognee-backed features degrade gracefully — the
 *   per-session memory layer is simply skipped.
 */
function getConfig() {
    const baseUrl = process.env.COGNEE_BASE_URL;
    if (!baseUrl)
        return null;
    const apiKey = process.env.COGNEE_API_KEY;
    const username = process.env.COGNEE_USERNAME;
    const password = process.env.COGNEE_PASSWORD;
    if (!apiKey && !(username && password))
        return null;
    return {
        baseUrl: baseUrl.replace(/\/$/, ""),
        apiKey,
        username,
        password,
        dataset: process.env.COGNEE_DATASET || "lex_ny",
    };
}
export function isCogneeConfigured() {
    return getConfig() !== null;
}
/* ------------------------------------------------------------------ */
/*  JWT cache (for self-hosted login flow)                              */
/* ------------------------------------------------------------------ */
let cachedToken = null;
async function getAuthHeader() {
    const cfg = getConfig();
    if (!cfg)
        throw new Error("Cognee not configured");
    // Managed cloud — single API key
    if (cfg.apiKey) {
        return { Authorization: `Bearer ${cfg.apiKey}` };
    }
    // Self-hosted JWT — cache for 50 minutes (tokens typically valid 1 hour)
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return { Authorization: `Bearer ${cachedToken.token}` };
    }
    const form = new URLSearchParams();
    form.set("username", cfg.username);
    form.set("password", cfg.password);
    const r = await fetch(`${cfg.baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    });
    if (!r.ok) {
        throw new Error(`Cognee login failed: ${r.status} ${await r.text()}`);
    }
    const data = (await r.json());
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return { Authorization: `Bearer ${data.access_token}` };
}
/**
 * Remember a piece of context. Combines Cognee's add + cognify in one call.
 *
 * For Lex.NY: call after each /api/ask returns, so the next question can
 * recall what was already established. content typically looks like:
 *   "User asked: <question>\nKey citations established: GBS 349 [1], 349-A [2]\nSummary: ..."
 */
export async function remember(entry) {
    const cfg = getConfig();
    if (!cfg)
        return { ok: false, details: "Cognee not configured" };
    const auth = await getAuthHeader();
    // Step 1: /api/v1/add — ingest the text
    const addRes = await fetch(`${cfg.baseUrl}/api/v1/add`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
            data: entry.content,
            datasetName: cfg.dataset,
            ...(entry.session_id && { session_id: entry.session_id }),
            ...(entry.tags && { node_set: entry.tags }),
        }),
    });
    if (!addRes.ok) {
        return { ok: false, details: `add failed: ${addRes.status} ${await addRes.text()}` };
    }
    // Step 2: /api/v1/cognify — build the graph (async on Cognee's side)
    const cognifyRes = await fetch(`${cfg.baseUrl}/api/v1/cognify`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ datasets: [cfg.dataset] }),
    });
    if (!cognifyRes.ok) {
        return { ok: false, details: `cognify failed: ${cognifyRes.status} ${await cognifyRes.text()}` };
    }
    return { ok: true };
}
/**
 * Recall relevant prior context for a new question. Uses Cognee's
 * GRAPH_COMPLETION search type which traverses the knowledge graph
 * rather than just doing vector similarity.
 *
 * Returns at most `topK` hits. Returns empty array (not error) when
 * Cognee is not configured — caller can safely await this unconditionally.
 */
export async function recall(query, opts = {}) {
    const cfg = getConfig();
    if (!cfg)
        return [];
    const topK = opts.topK ?? 5;
    try {
        const auth = await getAuthHeader();
        const r = await fetch(`${cfg.baseUrl}/api/v1/search`, {
            method: "POST",
            headers: { ...auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                searchType: "GRAPH_COMPLETION",
                query,
                datasets: [cfg.dataset],
                topK,
                ...(opts.session_id && { session_id: opts.session_id }),
            }),
        });
        if (!r.ok) {
            console.warn(`Cognee recall failed: ${r.status} ${await r.text()}`);
            return [];
        }
        const data = (await r.json());
        const results = Array.isArray(data) ? data : data.results || [];
        return results.slice(0, topK);
    }
    catch (e) {
        console.warn(`Cognee recall threw: ${e instanceof Error ? e.message : e}`);
        return [];
    }
}
/* ------------------------------------------------------------------ */
/*  Health / stats                                                      */
/* ------------------------------------------------------------------ */
export async function cogneeHealthCheck() {
    if (!isCogneeConfigured()) {
        return {
            ok: false,
            details: "Cognee not configured. Set COGNEE_BASE_URL + (COGNEE_API_KEY OR COGNEE_USERNAME/PASSWORD)",
        };
    }
    try {
        const auth = await getAuthHeader();
        const cfg = getConfig();
        // Lightweight check — list datasets
        const r = await fetch(`${cfg.baseUrl}/api/v1/datasets`, {
            method: "GET",
            headers: auth,
        });
        if (r.status === 404) {
            // /datasets isn't always exposed; try a no-op search instead
            return { ok: true, details: `Cognee reachable at ${cfg.baseUrl} (auth ok)` };
        }
        if (!r.ok) {
            return { ok: false, details: `Cognee responded ${r.status}` };
        }
        return { ok: true, details: `Cognee connected at ${cfg.baseUrl}` };
    }
    catch (e) {
        return {
            ok: false,
            details: e instanceof Error ? e.message : String(e),
        };
    }
}
export function getCogneeStats() {
    const cfg = getConfig();
    if (!cfg)
        return { configured: false };
    return {
        configured: true,
        base_url: cfg.baseUrl,
        auth_mode: cfg.apiKey ? "api_key" : "jwt",
        dataset: cfg.dataset,
    };
}
//# sourceMappingURL=cognee-client.js.map