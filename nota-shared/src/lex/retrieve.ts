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

let cachedPgPool: pg.Pool | null = null;

function getPgPool(): pg.Pool {
  if (cachedPgPool) return cachedPgPool;
  const host = process.env.PGHOST || "localhost";
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER || "postgres";
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE || "lex";
  if (!password) {
    throw new Error("PGPASSWORD required for direct pg retrieval");
  }
  // SSL only for hosted providers (Supabase/RDS/etc) - detect by hostname
  const needsSSL = /\.supabase\.|\.amazonaws\.|\.googleapis\.|\.azure\./.test(host);
  cachedPgPool = new pg.Pool({
    host, port, user, password, database,
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
  return cachedPgPool;
}

export interface OpinionHit {
  opinion_id: string;
  case_name: string;
  citation: string | null;
  court_id: string;
  decision_date: string;
  ai_summary: string | null;
  ai_holding: string | null;
  vector_score: number;
  keyword_score: number;
  combined_score: number;
}

export interface StatuteHit {
  statute_id: string;
  law_id: string;
  law_name: string;
  location_id: string;
  doc_type: string;
  title: string;
  text: string;
  jurisdiction: string;
  vector_score: number;
  keyword_score: number;
  combined_score: number;
}

export interface RetrievalResult {
  opinions: OpinionHit[];
  statutes: StatuteHit[];
  queryEmbedding: number[];
  durationMs: number;
}

function vectorLiteral(arr: number[]): string {
  return "[" + arr.join(",") + "]";
}

/**
 * pgvector ANN search returning top-K distinct content_ids.
 */
async function annSearch(
  pool: pg.Pool,
  contentKind: "opinion" | "statute",
  embedding: number[],
  limit: number
): Promise<Array<{ content_id: string; similarity: number }>> {
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
      content_id: r.content_id as string,
      similarity: 1 - Number(r.best_distance),
    }));
  } catch (e) {
    console.error(`annSearch(${contentKind}) failed:`, (e as Error).message);
    return [];
  }
}

function keywordScore(text: string, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0 || !text) return 0;
  const lower = text.toLowerCase();
  let matches = 0;
  for (const t of terms) {
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const hits = lower.match(re);
    if (hits) matches += hits.length;
  }
  return Math.min(1, matches / (terms.length * 3));
}

const QUERY_EXPANSIONS: Array<{ trigger: RegExp; add: string }> = [
  { trigger: /\bfraud\b/i, add: " false statement misrepresentation reliance damages deceit" },
  { trigger: /\bdeceptive\b/i, add: " misleading unfair consumer protection trade practice" },
  { trigger: /\bnegligence\b/i, add: " duty breach causation damages reasonable care" },
  { trigger: /\bbreach of contract\b/i, add: " agreement performance damages remedies" },
  { trigger: /\bGBS\b|\bGBL\b|\bgeneral business\b/i, add: " consumer protection deceptive practice" },
  { trigger: /\bCPLR\b|\bCVP\b/i, add: " civil practice law rules procedure" },
  { trigger: /\bpenal\b/i, add: " criminal offense punishment" },
];

function expandQuery(question: string): string {
  let expanded = question;
  for (const exp of QUERY_EXPANSIONS) {
    if (exp.trigger.test(question)) {
      expanded += exp.add;
    }
  }
  return expanded;
}

export async function retrieve(
  question: string,
  opts: { limit?: number } = {}
): Promise<RetrievalResult> {
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
      ? Promise.resolve({ rows: [] as any[] })
      : pool.query(
          `SELECT id, case_name, citation, court_id, decision_date, ai_summary, ai_holding, text_plain
           FROM opinions WHERE id = ANY($1::uuid[])`,
          [opIds]
        ),
    stIds.length === 0
      ? Promise.resolve({ rows: [] as any[] })
      : pool.query(
          `SELECT id, law_id, law_name, location_id, doc_type, title, text, jurisdiction
           FROM statutes WHERE id = ANY($1::uuid[]) AND doc_type = 'SECTION'`,
          [stIds]
        ),
  ]);

  const opByVec = new Map(opAnn.map((a) => [a.content_id, a.similarity]));
  const opinions: OpinionHit[] = opRowsRes.rows.map((row: any) => {
    const vec = opByVec.get(row.id as string) ?? 0;
    const kw = keywordScore((row.case_name || "") + " " + (row.text_plain || ""), question);
    return {
      opinion_id: row.id,
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
  const statutes: StatuteHit[] = stRowsRes.rows.map((row: any) => {
    const vec = stByVec.get(row.id as string) ?? 0;
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
