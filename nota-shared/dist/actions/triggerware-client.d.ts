/**
 * Triggerware integration for Lex.NY — live data queries + change-detection triggers.
 *
 * Why this sponsor fits a legal-research engine:
 *
 *   1. **Live data queries** — Triggerware lets us hit external data sources
 *      ("SQL Over Everything") with natural-language queries the LLM
 *      constructs. For Lex.NY: "find news articles about NY consumer-protection
 *      enforcement in the last 30 days" → executable SQL across whatever
 *      connectors are installed (PubMed, web data, custom).
 *
 *   2. **Watch-for-change triggers** — far more valuable for attorneys.
 *      A trigger is a named, scheduled query that tracks deltas: rows
 *      added or removed since the last poll. For Lex.NY:
 *        - "new NY appellate decisions about consumer protection"
 *        - "amendments to General Business Law Article 22-A"
 *        - "newly-filed federal class actions under GBS 349"
 *      The attorney creates a watch, polls it on their schedule, and
 *      gets back only the *deltas* — the new opinions or amendments
 *      they haven't seen yet. This is real research-workflow value.
 *
 * API surface (per https://docs.triggerware.com):
 *   POST /query                       — natural-language → SQL → rows
 *   POST /triggers                    — create a watch
 *   GET  /triggers                    — list watches
 *   POST /triggers/{name}/poll        — pull deltas (clears the queue)
 *   DELETE /triggers/{name}           — delete a watch
 *   GET  /connectors/catalog          — list available connectors
 *   PUT  /connectors/installed/{name} — install one
 *
 * Auth: `Api-Key: <key>` header on every request.
 *
 * Hackathon: Partner-tier challenge rewards. Best Use TBD.
 *            Set TRIGGERWARE_API_KEY in .env.local.
 */
export interface TriggerwareConfig {
    apiKey: string;
    baseUrl: string;
}
export declare function isTriggerwareConfigured(): boolean;
export interface TWQueryResult {
    sql: string;
    signature: string[];
    rows: unknown[][];
}
/**
 * Execute a natural-language query. Triggerware translates it to SQL
 * against the installed connectors and returns rows.
 *
 * Example:
 *   await query("recent PubMed articles about CRISPR base editing")
 *   → { sql: "select title, year from pubmed where query='CRISPR base editing' limit 25",
 *       signature: ["title", "year"],
 *       rows: [["..."], ...] }
 */
export declare function query(englishOrSql: string, opts?: {
    language?: "english" | "sql";
    limit?: number;
}): Promise<TWQueryResult>;
export interface TWTrigger {
    name: string;
    query: string;
    schedule: number;
    status: "enabled" | "disabled";
}
export interface TWPollResult {
    added: unknown[][];
    deleted: unknown[][];
}
/**
 * Create a watch. The English description is converted to SQL by Triggerware
 * and the schedule is suggested if you don't provide one (otherwise pass
 * seconds - 300 = poll every 5 min, 86400 = daily).
 *
 * Payload notes (discovered by live testing against api.triggerware.com):
 *   - For natural-language form, the API expects `prompt`, not `query`.
 *     The docs example hid the body shape behind `{...}`.
 *   - For raw SQL, pass `query` + `schedule` together with language: sql.
 *   - If no connectors are installed on the account, Triggerware returns
 *     500 "Model did not produce a trigger" - the LLM has no virtual
 *     tables to plan against. We pre-flight and surface a clearer error.
 */
export declare function createTrigger(name: string, description: string, opts?: {
    scheduleSeconds?: number;
    sql?: string;
}): Promise<TWTrigger>;
export declare function listTriggers(): Promise<TWTrigger[]>;
/**
 * Pull deltas since the last poll. The Triggerware server clears the queue
 * on successful response — so calling poll twice in a row returns empty
 * the second time unless new data has arrived.
 */
export declare function pollTrigger(name: string): Promise<TWPollResult>;
export declare function deleteTrigger(name: string): Promise<{
    ok: true;
}>;
export interface TWConnector {
    name: string;
    description?: string;
    config_schema?: unknown;
    tables?: Array<{
        name: string;
        columns: Array<{
            name: string;
            type: string;
            required?: boolean;
        }>;
    }>;
}
export declare function listCatalog(): Promise<TWConnector[]>;
export declare function listInstalled(): Promise<TWConnector[]>;
export declare function installConnector(name: string): Promise<void>;
export interface TriggerwareStats {
    configured: boolean;
    base_url?: string;
    installed_connectors?: number;
    active_triggers?: number;
    implementation_status: "live" | "configured-but-no-connectors" | "not-configured";
}
export declare function getTriggerwareStats(): Promise<TriggerwareStats>;
export declare function triggerwareHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=triggerware-client.d.ts.map