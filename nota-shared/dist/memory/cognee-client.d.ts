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
export interface CogneeConfig {
    baseUrl: string;
    /** Either an API key (managed cloud) or set username+password for JWT */
    apiKey?: string;
    username?: string;
    password?: string;
    /** Default dataset to scope memory to */
    dataset: string;
}
export declare function isCogneeConfigured(): boolean;
export interface CogneeMemoryEntry {
    /** Free text — the "fact" or research note to remember */
    content: string;
    /** Optional session ID — scopes memory to a single research session */
    session_id?: string;
    /** Optional metadata tags */
    tags?: string[];
}
/**
 * Remember a piece of context. Combines Cognee's add + cognify in one call.
 *
 * For Lex.NY: call after each /api/ask returns, so the next question can
 * recall what was already established. content typically looks like:
 *   "User asked: <question>\nKey citations established: GBS 349 [1], 349-A [2]\nSummary: ..."
 */
export declare function remember(entry: CogneeMemoryEntry): Promise<{
    ok: boolean;
    details?: string;
}>;
export interface CogneeRecallHit {
    text: string;
    score?: number;
    metadata?: Record<string, unknown>;
}
/**
 * Recall relevant prior context for a new question. Uses Cognee's
 * GRAPH_COMPLETION search type which traverses the knowledge graph
 * rather than just doing vector similarity.
 *
 * Returns at most `topK` hits. Returns empty array (not error) when
 * Cognee is not configured — caller can safely await this unconditionally.
 */
export declare function recall(query: string, opts?: {
    session_id?: string;
    topK?: number;
}): Promise<CogneeRecallHit[]>;
export declare function cogneeHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
export interface CogneeStats {
    configured: boolean;
    base_url?: string;
    auth_mode?: "api_key" | "jwt";
    dataset?: string;
}
export declare function getCogneeStats(): CogneeStats;
//# sourceMappingURL=cognee-client.d.ts.map