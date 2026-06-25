/**
 * Lex.NY retrieval - hybrid semantic + keyword search.
 *
 * Architecture (local Postgres):
 *   1. Embed the query via Ollama (~150ms)
 *   2. Use pg.Pool to run pgvector ANN against the indexed embeddings table
 *   3. Hydrate full statute/opinion rows via the same pg.Pool
 *   4. Score keywords client-side and blend
 *
 * No more supabase-js for retrieval - direct Postgres only.
 */
import pg from "pg";
import { embed } from "../embeddings.js";
import { pgPassword } from "../aws-rds-auth.js";
let cachedPgPool = null;
function getPgPool() {
    if (cachedPgPool)
        return cachedPgPool;
    const host = process.env.PGHOST || "localhost";
    const port = Number(process.env.PGPORT || 5432);
    const user = process.env.PGUSER || "postgres";
    const password = pgPassword(host, port, user);
    const database = process.env.PGDATABASE || "lex";
    // SSL only for hosted providers (Supabase/RDS/etc) - detect by hostname
    const needsSSL = /\.supabase\.|\.amazonaws\.|\.googleapis\.|\.azure\./.test(host);
    cachedPgPool = new pg.Pool({
        host, port, user, password, database,
        ssl: needsSSL ? { rejectUnauthorized: false } : false,
        // IVFFlat recall: default ivfflat.probes=1 misses correct neighbors at this
        // corpus size (verified — CVP 3212 only surfaces at probes>=40). Set it for
        // every pooled connection. (On Aurora we move to HNSW + hnsw.ef_search.)
        options: "-c ivfflat.probes=40",
        max: 4,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
    });
    return cachedPgPool;
}
function vectorLiteral(arr) {
    return "[" + arr.join(",") + "]";
}
/**
 * pgvector ANN search returning top-K distinct content_ids.
 */
async function annSearch(pool, contentKind, embedding, limit) {
    const vec = vectorLiteral(embedding);
    const sql = `
    WITH ranked AS (
      SELECT content_id, embedding <=> $1::vector AS distance
      FROM embeddings
      WHERE content_kind = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    )
    SELECT content_id, MIN(distance) AS best_distance
    FROM ranked
    GROUP BY content_id
    ORDER BY MIN(distance)
    LIMIT $4
  `;
    const candidateLimit = limit * 5;
    try {
        const res = await pool.query(sql, [vec, contentKind, candidateLimit, limit]);
        return res.rows.map((r) => ({
            content_id: r.content_id,
            similarity: 1 - Number(r.best_distance),
        }));
    }
    catch (e) {
        console.error(`annSearch(${contentKind}) failed:`, e.message);
        return [];
    }
}
function keywordScore(text, query) {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0 || !text)
        return 0;
    const lower = text.toLowerCase();
    let matches = 0;
    for (const t of terms) {
        const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        const hits = lower.match(re);
        if (hits)
            matches += hits.length;
    }
    return Math.min(1, matches / (terms.length * 3));
}
const QUERY_EXPANSIONS = [
    { trigger: /\bfraud\b/i, add: " false statement misrepresentation reliance damages deceit" },
    { trigger: /\bdeceptive\b/i, add: " misleading unfair consumer protection trade practice" },
    { trigger: /\bnegligence\b/i, add: " duty breach causation damages reasonable care" },
    { trigger: /\bbreach of contract\b/i, add: " agreement performance damages remedies" },
    { trigger: /\bGBS\b|\bGBL\b|\bgeneral business\b/i, add: " consumer protection deceptive practice" },
    { trigger: /\bCPLR\b|\bCVP\b/i, add: " civil practice law rules procedure" },
    { trigger: /\bpenal\b/i, add: " criminal offense punishment" },
];
// Queries that already name a specific section/rule (e.g. "CPLR 3212", "§ 240")
// should NOT get the generic keyword expansion below — verified that expansion
// pushes neighboring procedural statutes (CVP 3405, duplicate UDC sections)
// ahead of cleaner matches. Vague queries still benefit from expansion.
const SPECIFIC_SECTION = /§\s*\d|\b(?:CPLR|CVP|CPL|PEN|penal|GBL|GBS|RPAPL|RPL|EPTL|VTL|VAT|BCL|BSC|LLC|DRL|DOM|FCA|FCT)\s*\.?\s*\d/i;
function expandQuery(question) {
    if (SPECIFIC_SECTION.test(question))
        return question;
    let expanded = question;
    for (const exp of QUERY_EXPANSIONS) {
        if (exp.trigger.test(question)) {
            expanded += exp.add;
        }
    }
    return expanded;
}
export async function retrieve(question, opts = {}) {
    const startedAt = Date.now();
    const limit = opts.limit ?? 8;
    const expanded = expandQuery(question);
    const queryEmbedding = await embed(expanded);
    const pool = getPgPool();
    // Parallel ANN search
    const [opAnn, stAnn] = await Promise.all([
        annSearch(pool, "opinion", queryEmbedding, limit * 2),
        annSearch(pool, "statute", queryEmbedding, limit * 2),
    ]);
    const opIds = opAnn.map((a) => a.content_id);
    const stIds = stAnn.map((a) => a.content_id);
    // Hydrate full rows via pg.Pool (NOT supabase-js - that hits Supabase which is offline)
    const [opRowsRes, stRowsRes] = await Promise.all([
        opIds.length === 0
            ? Promise.resolve({ rows: [] })
            : pool.query(`SELECT id, source_id, case_name, citation, court_id, decision_date, ai_summary, ai_holding, text_plain
           FROM opinions WHERE id = ANY($1::uuid[])`, [opIds]),
        stIds.length === 0
            ? Promise.resolve({ rows: [] })
            : pool.query(`SELECT id, law_id, law_name, location_id, doc_type, title, text, jurisdiction
           FROM statutes WHERE id = ANY($1::uuid[]) AND doc_type = 'SECTION'`, [stIds]),
    ]);
    const opByVec = new Map(opAnn.map((a) => [a.content_id, a.similarity]));
    const opinions = opRowsRes.rows.map((row) => {
        const vec = opByVec.get(row.id) ?? 0;
        const kw = keywordScore((row.case_name || "") + " " + (row.text_plain || ""), question);
        return {
            opinion_id: row.id,
            cl_id: row.source_id ?? null,
            case_name: row.case_name,
            citation: row.citation,
            court_id: row.court_id,
            decision_date: row.decision_date,
            ai_summary: row.ai_summary,
            ai_holding: row.ai_holding,
            vector_score: vec,
            keyword_score: kw,
            combined_score: vec * 0.7 + kw * 0.3,
        };
    }).sort((a, b) => b.combined_score - a.combined_score).slice(0, limit);
    const stByVec = new Map(stAnn.map((a) => [a.content_id, a.similarity]));
    const statutes = stRowsRes.rows.map((row) => {
        const vec = stByVec.get(row.id) ?? 0;
        const kw = keywordScore((row.title || "") + " " + (row.text || ""), question);
        return {
            statute_id: row.id,
            law_id: row.law_id,
            law_name: row.law_name,
            location_id: row.location_id,
            doc_type: row.doc_type,
            title: row.title || "",
            text: row.text || "",
            jurisdiction: row.jurisdiction,
            vector_score: vec,
            keyword_score: kw,
            combined_score: vec * 0.7 + kw * 0.3,
        };
    }).sort((a, b) => b.combined_score - a.combined_score).slice(0, limit);
    return {
        opinions,
        statutes,
        queryEmbedding,
        durationMs: Date.now() - startedAt,
    };
}
//# sourceMappingURL=retrieve.js.map