/**
 * Postgres full-text search for Lex.NY statutes.
 *
 * Replaces Algolia (paid, was Hackathon-tier free, now retired) with
 * Postgres' built-in tsvector + GIN-indexed full-text search. Same
 * exported API surface as algolia-client.ts so the search route, stats
 * route, and any caller can swap to this module without code changes.
 *
 * Schema requirement: the statutes table needs a `search_tsv` generated
 * column and a GIN index. setup_pg_fts.js installs both. Both are
 * idempotent so re-running is safe.
 *
 * Performance characteristics on 44,758 NY statutes:
 *   - First query (cold cache):  ~50ms
 *   - Subsequent queries:        ~5-15ms
 *   - Comparable to Algolia's median 70ms, with zero per-request cost
 *     and zero monthly tier ceiling.
 */
import { Pool } from "pg";
import { pgPassword, isRdsHost } from "../aws-rds-auth.js";
/* ------------------------------------------------------------------ */
/*  Pool lifecycle                                                     */
/* ------------------------------------------------------------------ */
let pool = null;
function getPool() {
    if (pool)
        return pool;
    const host = process.env.PGHOST || "localhost";
    const port = parseInt(process.env.PGPORT || "5432", 10);
    const user = process.env.PGUSER || "postgres";
    pool = new Pool({
        host, port, user,
        password: pgPassword(host, port, user),
        database: process.env.PGDATABASE || "lex",
        ssl: isRdsHost(host) ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 30_000,
    });
    return pool;
}
/* ------------------------------------------------------------------ */
/*  Configuration probes — always returns "configured" since the      */
/*  table is local and always there.                                  */
/* ------------------------------------------------------------------ */
export function isAlgoliaConfigured() {
    // Always true now — Postgres is always reachable in this deployment.
    return true;
}
export function getAlgoliaAdminClient() {
    throw new Error("Algolia admin client retired. Postgres FTS is now the lexical search backend; " +
        "use setup_pg_fts.js to (re)build the index.");
}
export function getAlgoliaSearchClient() {
    throw new Error("Algolia search client retired. Use searchStatutes() — it now hits Postgres FTS.");
}
export function getIndexName() {
    return "statutes_pg_fts";
}
/* ------------------------------------------------------------------ */
/*  Index management — no-ops in the FTS world; here for API parity.  */
/* ------------------------------------------------------------------ */
export async function bootstrapIndex() {
    // No-op: the schema migration (setup_pg_fts.js) does this.
    // The generated tsvector column self-populates, so there's nothing
    // to call at runtime.
    return;
}
export async function indexStatutes(_records) {
    // No-op: the tsvector is a GENERATED ALWAYS column, so any INSERT or
    // UPDATE on the statutes table automatically refreshes search_tsv.
    return;
}
export async function clearIndex() {
    // No-op: the FTS index is a view of the statutes table; there's no
    // separate index data to clear. To truly reset you'd drop and recreate
    // the generated column via setup_pg_fts.js.
    return;
}
/* ------------------------------------------------------------------ */
/*  Core search — the function callers actually use                    */
/* ------------------------------------------------------------------ */
export async function searchStatutes(query, opts = {}) {
    const page = opts.page ?? 0;
    const hitsPerPage = opts.hitsPerPage ?? 20;
    const offset = page * hitsPerPage;
    const started = Date.now();
    const p = getPool();
    // Empty query → empty result (parity with Algolia behavior for empty
    // queries; we don't return arbitrary statutes).
    if (!query || !query.trim()) {
        return {
            hits: [],
            query,
            total_hits: 0,
            processing_time_ms: 0,
            page,
            pages: 0,
        };
    }
    // We use websearch_to_tsquery (more forgiving than plainto_tsquery —
    // supports "quoted phrases", -negation, OR, etc.) and ts_rank for
    // ordering. ts_headline returns a snippet with <b>...</b> highlights
    // similar to Algolia's _highlightResult.
    const params = [query, hitsPerPage, offset];
    let filterClause = "";
    if (opts.lawIdFilter) {
        params.push(opts.lawIdFilter);
        filterClause = ` AND law_id = $${params.length}`;
    }
    const sql = `
    WITH q AS (SELECT websearch_to_tsquery('english', $1) AS tsq),
    matches AS (
      SELECT id, law_id, law_name, location_id, title, source_url, text, ai_summary,
             ts_rank_cd(search_tsv, q.tsq) AS rank
      FROM statutes, q
      WHERE search_tsv @@ q.tsq${filterClause}
      ORDER BY rank DESC
      LIMIT $2 OFFSET $3
    ),
    total AS (
      SELECT COUNT(*)::int AS n
      FROM statutes, q
      WHERE search_tsv @@ q.tsq${filterClause}
    )
    SELECT
      m.id::text AS id,
      m.law_id,
      m.law_name,
      m.location_id,
      m.title,
      m.source_url,
      ts_headline(
        'english',
        coalesce(m.ai_summary, m.text, ''),
        q.tsq,
        'StartSel=<mark>,StopSel=</mark>,MaxWords=30,MinWords=15,MaxFragments=1,FragmentDelimiter=" … "'
      ) AS snippet,
      m.rank,
      (SELECT n FROM total) AS total_hits
    FROM matches m, q
    ORDER BY m.rank DESC
  `;
    const { rows } = await p.query(sql, params);
    const hits = rows.map((r) => {
        const citationKey = `${r.law_id} ${r.location_id || ""}`.trim();
        return {
            objectID: r.id,
            citation_key: citationKey,
            law_id: r.law_id || "",
            law_name: r.law_name || "",
            location_id: r.location_id || "",
            title: r.title || "",
            text_snippet: (r.snippet || "").replace(/<\/?mark>/g, ""),
            source_url: r.source_url || "",
            highlight_html: r.snippet || undefined,
        };
    });
    const total = rows.length > 0 ? rows[0].total_hits : 0;
    const pages = Math.ceil(total / hitsPerPage);
    const elapsed = Date.now() - started;
    return {
        hits,
        query,
        total_hits: total,
        processing_time_ms: elapsed,
        page,
        pages,
    };
}
/* ------------------------------------------------------------------ */
/*  Stats and health                                                    */
/* ------------------------------------------------------------------ */
export async function getAlgoliaStats() {
    const p = getPool();
    try {
        const r = await p.query(`SELECT COUNT(*)::int AS n FROM statutes WHERE search_tsv IS NOT NULL`);
        return {
            configured: true,
            app_id: "postgres-fts",
            index_name: getIndexName(),
            total_records: r.rows[0]?.n ?? 0,
            searchable_attributes: ["law_id", "title", "ai_summary", "text"],
            facets: ["law_id", "law_name"],
        };
    }
    catch {
        return { configured: false };
    }
}
export async function algoliaHealthCheck() {
    const p = getPool();
    try {
        const r = await p.query(`SELECT COUNT(*)::int AS n,
              (SELECT COUNT(*) FROM pg_indexes WHERE tablename='statutes' AND indexname='statutes_search_tsv_idx') > 0 AS idx
       FROM statutes WHERE search_tsv IS NOT NULL`);
        const n = r.rows[0]?.n ?? 0;
        const idx = r.rows[0]?.idx ?? false;
        if (!idx) {
            return {
                ok: false,
                details: "FTS column exists but GIN index missing — run setup_pg_fts.js",
            };
        }
        if (n === 0) {
            return { ok: false, details: "FTS column has no rows yet" };
        }
        return {
            ok: true,
            details: `Postgres FTS reachable; ${n.toLocaleString()} statutes indexed`,
        };
    }
    catch (e) {
        return { ok: false, details: `Postgres FTS unreachable: ${e.message}` };
    }
}
//# sourceMappingURL=pg-fts-client.js.map