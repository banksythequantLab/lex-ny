/**
 * Lex.NY judge + citation-graph analytics — pure Postgres (Aurora-ready).
 *
 * Replaces the Neo4j cited-by path with relational queries over
 * opinion_citations (case->case edges), opinion_judges (authorship), and the
 * materialized opinion_inbound_counts (cited_id -> inbound count). One engine,
 * recursive-CTE-friendly, no separate graph DB for the hackathon.
 *
 * opinion_inbound_counts is built/refreshed by scripts (rebuild-inbound-counts).
 */
import pg from "pg";
import { pgPassword } from "../aws-rds-auth.js";
let pool = null;
function getPool() {
    if (pool)
        return pool;
    const host = process.env.PGHOST || "localhost";
    const needsSSL = /\.amazonaws\.|\.supabase\.|\.googleapis\.|\.azure\./.test(host);
    pool = new pg.Pool({
        host,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || "postgres",
        password: pgPassword(host, Number(process.env.PGPORT || 5432), process.env.PGUSER || "postgres"),
        database: process.env.PGDATABASE || "lex",
        ssl: needsSSL ? { rejectUnauthorized: false } : false,
        max: 4,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
    });
    return pool;
}
function mapDecision(r) {
    return {
        opinion_id: r.opinion_id,
        cl_id: r.cl_id ?? null,
        case_name: r.case_name,
        court_id: r.court_id,
        decision_date: r.decision_date ? String(r.decision_date).slice(0, 10) : null,
        inbound: Number(r.inbound) || 0,
    };
}
/** Most-cited decisions overall, or within one court (e.g. 'ny' = Court of Appeals). */
export async function mostCitedDecisions(opts = {}) {
    const limit = Math.min(100, opts.limit ?? 20);
    const params = [limit];
    let where = "";
    if (opts.courtId) {
        params.push(opts.courtId);
        where = `WHERE o.court_id = $2`;
    }
    const { rows } = await getPool().query(`SELECT o.id opinion_id, o.source_id cl_id, o.case_name, o.court_id, o.decision_date::text decision_date, ic.inbound
       FROM opinion_inbound_counts ic
       JOIN opinions o ON o.id = ic.opinion_id
       ${where}
      ORDER BY ic.inbound DESC
      LIMIT $1`, params);
    return rows.map(mapDecision);
}
/** Judges ranked by total inbound citations across the opinions they authored. */
export async function judgeInfluenceRanking(opts = {}) {
    const limit = Math.min(100, opts.limit ?? 20);
    const minOpinions = opts.minOpinions ?? 5;
    const { rows } = await getPool().query(`SELECT j.id judge_id, j.full_name name,
            count(DISTINCT oj.opinion_id)::int authored,
            COALESCE(SUM(ic.inbound), 0)::int total_citations
       FROM judges j
       JOIN opinion_judges oj ON oj.judge_id = j.id AND oj.role = 'author'
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = oj.opinion_id
      GROUP BY j.id, j.full_name
     HAVING count(DISTINCT oj.opinion_id) >= $2
      ORDER BY total_citations DESC
      LIMIT $1`, [limit, minOpinions]);
    return rows.map((r) => ({
        judge_id: r.judge_id, name: r.name,
        authored: Number(r.authored), total_citations: Number(r.total_citations),
    }));
}
/** Search judges by name (matches any authoring judge in the corpus), ranked by
 *  citation influence. Powers the /judges search box — reaches the full judges
 *  table, not just the top-ranked leaderboard. */
export async function searchJudges(q, opts = {}) {
    const term = (q || "").trim();
    if (term.length < 2)
        return [];
    const limit = Math.min(50, opts.limit ?? 20);
    // Escape LIKE wildcards in the user term, then wrap for a contains-match.
    const like = `%${term.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
    const { rows } = await getPool().query(`SELECT j.id judge_id, j.full_name name,
            count(DISTINCT oj.opinion_id)::int authored,
            COALESCE(SUM(ic.inbound), 0)::int total_citations
       FROM judges j
       JOIN opinion_judges oj ON oj.judge_id = j.id AND oj.role = 'author'
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = oj.opinion_id
      WHERE j.full_name ILIKE $1 ESCAPE '\\' OR j.normalized_name ILIKE $1 ESCAPE '\\'
      GROUP BY j.id, j.full_name
      ORDER BY total_citations DESC, authored DESC
      LIMIT $2`, [like, limit]);
    return rows.map((r) => ({
        judge_id: r.judge_id, name: r.name,
        authored: Number(r.authored), total_citations: Number(r.total_citations),
    }));
}
/** Full profile for one judge: volume, span, courts, and their most-cited decisions. */
export async function judgeProfile(judgeId, opts = {}) {
    const topN = Math.min(50, opts.topN ?? 10);
    const p = getPool();
    const meta = await p.query(`SELECT j.id, j.full_name, j.cl_person_id,
            count(DISTINCT oj.opinion_id)::int authored,
            min(o.decision_date)::text first_decision,
            max(o.decision_date)::text last_decision,
            array_agg(DISTINCT o.court_id) courts
       FROM judges j
       JOIN opinion_judges oj ON oj.judge_id = j.id AND oj.role = 'author'
       JOIN opinions o ON o.id = oj.opinion_id
      WHERE j.id = $1::uuid
      GROUP BY j.id, j.full_name, j.cl_person_id`, [judgeId]);
    if (meta.rows.length === 0)
        return null;
    const m = meta.rows[0];
    const top = await p.query(`SELECT o.id opinion_id, o.source_id cl_id, o.case_name, o.court_id, o.decision_date::text decision_date,
            COALESCE(ic.inbound, 0) inbound
       FROM opinion_judges oj
       JOIN opinions o ON o.id = oj.opinion_id
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = oj.opinion_id
      WHERE oj.judge_id = $1::uuid AND oj.role = 'author'
      ORDER BY COALESCE(ic.inbound, 0) DESC
      LIMIT $2`, [judgeId, topN]);
    return {
        judge_id: m.id, name: m.full_name, cl_person_id: m.cl_person_id,
        authored: Number(m.authored), courts: m.courts,
        first_decision: m.first_decision ? String(m.first_decision).slice(0, 10) : null,
        last_decision: m.last_decision ? String(m.last_decision).slice(0, 10) : null,
        top_decisions: top.rows.map(mapDecision),
    };
}
/** "What cases cite this one?" — SQL replacement for the Neo4j cited-by route.
 *  Keyed by CourtListener cluster id (opinions.source_id); citers ranked by
 *  their own inbound count (most-authoritative citers first). */
export async function citedBy(clId, opts = {}) {
    const limit = Math.min(100, opts.limit ?? 50);
    const p = getPool();
    const seedRes = await p.query(`SELECT o.id opinion_id, o.source_id cl_id, o.case_name, o.court_id, o.decision_date::text decision_date,
            COALESCE(ic.inbound, 0) inbound
       FROM opinions o
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = o.id
      WHERE o.source_id = $1`, [clId]);
    if (seedRes.rows.length === 0)
        return { seed: null, citers: [], total_citers: 0 };
    const seed = mapDecision(seedRes.rows[0]);
    const citers = await p.query(`SELECT o.id opinion_id, o.source_id cl_id, o.case_name, o.court_id, o.decision_date::text decision_date,
            COALESCE(ic.inbound, 0) inbound
       FROM opinion_citations oc
       JOIN opinions o ON o.id = oc.citing_id
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = o.id
      WHERE oc.cited_id = $1::uuid
      ORDER BY COALESCE(ic.inbound, 0) DESC
      LIMIT $2`, [seed.opinion_id, limit]);
    return { seed, citers: citers.rows.map(mapDecision), total_citers: seed.inbound };
}
/** Full opinion (by CourtListener cluster id) for the source viewer: metadata,
 *  body text (capped), and inbound citation count. */
export async function getOpinion(clId) {
    const r = await getPool().query(`SELECT o.id, o.source_id, o.case_name, o.court_id, o.decision_date::text dt,
            o.citation, o.ai_summary, left(o.text_plain, 40000) AS text,
            COALESCE(ic.inbound, 0) inbound
       FROM opinions o
       LEFT JOIN opinion_inbound_counts ic ON ic.opinion_id = o.id
      WHERE o.source_id = $1 LIMIT 1`, [clId]);
    if (!r.rows.length)
        return null;
    const x = r.rows[0];
    return {
        opinion_id: x.id, cl_id: x.source_id, case_name: x.case_name, court_id: x.court_id,
        decision_date: x.dt ? String(x.dt).slice(0, 10) : null, citation: x.citation,
        ai_summary: x.ai_summary, text: x.text, inbound: Number(x.inbound),
    };
}
//# sourceMappingURL=analytics.js.map