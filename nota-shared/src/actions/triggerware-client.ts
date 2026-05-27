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

function getConfig(): TriggerwareConfig | null {
  const apiKey = process.env.TRIGGERWARE_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.TRIGGERWARE_BASE_URL || "https://api.triggerware.com").replace(/\/$/, ""),
  };
}

export function isTriggerwareConfigured(): boolean {
  return getConfig() !== null;
}

async function tw<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Triggerware not configured");
  const r = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "Api-Key": cfg.apiKey,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Triggerware ${path} → ${r.status}: ${body.slice(0, 300)}`);
  }
  return r.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Queries — natural language → SQL → rows                            */
/* ------------------------------------------------------------------ */

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
export async function query(
  englishOrSql: string,
  opts: { language?: "english" | "sql"; limit?: number } = {}
): Promise<TWQueryResult> {
  return tw<TWQueryResult>("/query", {
    method: "POST",
    body: JSON.stringify({
      query: englishOrSql,
      language: opts.language ?? "english",
      ...(opts.limit && { limit: opts.limit }),
    }),
  });
}

/* ------------------------------------------------------------------ */
/*  Triggers — named watches that track deltas                          */
/* ------------------------------------------------------------------ */

export interface TWTrigger {
  name: string;
  query: string;
  schedule: number; // seconds
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
export async function createTrigger(
  name: string,
  description: string,
  opts: { scheduleSeconds?: number; sql?: string } = {}
): Promise<TWTrigger> {
  // Pre-flight: 0 connectors -> trigger planning will fail confusingly
  try {
    const installed = await listInstalled();
    if (installed.length === 0) {
      throw new Error(
        "Triggerware account has 0 connectors installed. The trigger-planning " +
        "LLM has no virtual tables to query. Install at least one connector at " +
        "https://console.triggerware.ai/connector-catalog before creating a watch."
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("0 connectors installed")) throw e;
    // Otherwise fall through and let the create attempt surface the real error
  }

  const body = opts.sql
    ? { name, query: opts.sql, language: "sql" as const, ...(opts.scheduleSeconds && { schedule: opts.scheduleSeconds }) }
    : { name, prompt: description, ...(opts.scheduleSeconds && { schedule: opts.scheduleSeconds }) };

  return tw<TWTrigger>("/triggers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listTriggers(): Promise<TWTrigger[]> {
  const r = await tw<{ triggers?: TWTrigger[] } | TWTrigger[]>("/triggers", { method: "GET" });
  if (Array.isArray(r)) return r;
  return r.triggers ?? [];
}

/**
 * Pull deltas since the last poll. The Triggerware server clears the queue
 * on successful response — so calling poll twice in a row returns empty
 * the second time unless new data has arrived.
 */
export async function pollTrigger(name: string): Promise<TWPollResult> {
  return tw<TWPollResult>(`/triggers/${encodeURIComponent(name)}/poll`, { method: "POST" });
}

export async function deleteTrigger(name: string): Promise<{ ok: true }> {
  await tw(`/triggers/${encodeURIComponent(name)}`, { method: "DELETE" });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Connectors                                                          */
/* ------------------------------------------------------------------ */

export interface TWConnector {
  name: string;
  description?: string;
  config_schema?: unknown;
  tables?: Array<{ name: string; columns: Array<{ name: string; type: string; required?: boolean }> }>;
}

export async function listCatalog(): Promise<TWConnector[]> {
  const r = await tw<{ connectors?: TWConnector[] } | TWConnector[]>("/connectors/catalog", { method: "GET" });
  if (Array.isArray(r)) return r;
  return r.connectors ?? [];
}

export async function listInstalled(): Promise<TWConnector[]> {
  const r = await tw<{ connectors?: TWConnector[] } | TWConnector[]>("/connectors/installed", { method: "GET" });
  if (Array.isArray(r)) return r;
  return r.connectors ?? [];
}

export async function installConnector(name: string): Promise<void> {
  await tw(`/connectors/installed/${encodeURIComponent(name)}`, { method: "PUT" });
}

/* ------------------------------------------------------------------ */
/*  Health / stats                                                      */
/* ------------------------------------------------------------------ */

export interface TriggerwareStats {
  configured: boolean;
  base_url?: string;
  installed_connectors?: number;
  active_triggers?: number;
  implementation_status: "live" | "configured-but-no-connectors" | "not-configured";
}

export async function getTriggerwareStats(): Promise<TriggerwareStats> {
  const cfg = getConfig();
  if (!cfg) {
    return { configured: false, implementation_status: "not-configured" };
  }
  try {
    const [installed, triggers] = await Promise.all([listInstalled(), listTriggers()]);
    return {
      configured: true,
      base_url: cfg.baseUrl,
      installed_connectors: installed.length,
      active_triggers: triggers.length,
      implementation_status: installed.length > 0 ? "live" : "configured-but-no-connectors",
    };
  } catch {
    return {
      configured: true,
      base_url: cfg.baseUrl,
      implementation_status: "configured-but-no-connectors",
    };
  }
}

export async function triggerwareHealthCheck(): Promise<{ ok: boolean; details: string }> {
  if (!isTriggerwareConfigured()) {
    return { ok: false, details: "TRIGGERWARE_API_KEY not set in .env.local" };
  }
  try {
    const installed = await listInstalled();
    return {
      ok: true,
      details: `Triggerware reachable. Installed connectors: ${installed.length}`,
    };
  } catch (e) {
    return {
      ok: false,
      details: e instanceof Error ? e.message : String(e),
    };
  }
}
