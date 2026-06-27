import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { z } from "zod";
import { Signer } from "@aws-sdk/rds-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * /api/search/cases - semantic search across NY case decisions.
 *
 * Embeds the user's query via local Ollama (mxbai-embed-large, 1024-dim),
 * runs pgvector cosine-distance ANN against `embeddings WHERE content_kind='opinion'`,
 * joins back to `opinions`, and augments each hit with `cited_by_count` from the
 * citation graph (so leading precedents naturally rank higher).
 *
 * Request:
 *   GET  /api/search/cases?q=landlord+retaliation&limit=20&court=ny
 *   POST /api/search/cases  { query, limit, court_filter, min_cites }
 *
 * Response:
 *   {
 *     query, embedding_model, results: [
 *       { id, case_name, court_id, decision_date, citation, source_url,
 *         similarity, cited_by_count, snippet }
 *     ],
 *     timing_ms: { embed, retrieve, total }, total_candidates
 *   }
 */

const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).optional(),
  court_filter: z.string().regex(/^[a-z0-9_]+$/).optional(),
  min_cites: z.number().int().min(0).max(10000).optional(),
});

function pgPassword(host: string, port: number, user: string): string | (() => Promise<string>) {
  if (/\.rds\.amazonaws\.com$/i.test(host)) {
    const accessKeyId = process.env.NOTA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NOTA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const signer = new Signer({
      region: process.env.NOTA_AWS_REGION || process.env.AWS_REGION || "us-east-1",
      hostname: host,
      port,
      username: user,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    return () => signer.getAuthToken();
  }
  return process.env.PGPASSWORD || "";
}

let _pool: pg.Pool | null = null;
function pool(): pg.Pool {
  if (!_pool) {
    const host = process.env.PGHOST || "localhost";
    const port = Number(process.env.PGPORT || 5432);
    const user = process.env.PGUSER || "postgres";
    const needsSSL = /\.amazonaws\.|\.rds\./.test(host);
    _pool = new pg.Pool({
      host,
      port,
      user,
      password: pgPassword(host, port, user),
      database: process.env.PGDATABASE || "lex",
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      max: 4,
      connectionTimeoutMillis: 30000,
    });
  }
  return _pool;
}

interface OllamaEmbedResponse {
  embeddings?: number[][];
  embedding?: number[];
}

async function embed(text: string): Promise<number[]> {
  const base = process.env.OLLAMA_EMBED_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_EMBED_MODEL || "mxbai-embed-large";
  // Use the newer batch endpoint which is faster + the only one used by the
  // bulk embed job, so vectors are produced identically (same normalization).
  const r = await fetch(`${base}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: [text.slice(0, 440)], keep_alive: "30m" }),
  });
  if (!r.ok) {
    throw new Error(`Ollama /api/embed -> ${r.status}: ${await r.text()}`);
  }
  const j = (await r.json()) as OllamaEmbedResponse;
  const v = j.embeddings?.[0] ?? j.embedding;
  if (!v || v.length !== 1024) {
    throw new Error(`Unexpected embedding shape: dims=${v?.length}`);
  }
  return v;
}

function vecLiteral(arr: number[]): string {
  // pgvector accepts the JSON-array literal form: '[0.1,0.2,...]'
  return "[" + arr.join(",") + "]";
}

// Re-ranking score: semantic similarity nudged up by citation influence, so
// leading precedents surface above near-identical but obscure matches.
// Similarity stays dominant; the log keeps landmark cases from swamping it.
const CITE_WEIGHT = 0.04;
function rankScore(h: { similarity: number; cited_by_count: number }): number {
  return h.similarity + CITE_WEIGHT * Math.log1p(h.cited_by_count);
}

async function runSearch(
  query: string,
  limit: number,
  courtFilter: string | undefined,
  minCites: number
): Promise<unknown> {
  const t0 = Date.now();
  const queryVec = await embed(query);
  const tEmbed = Date.now() - t0;
  const litVec = vecLiteral(queryVec);

  // Pull top-K candidates by vector distance, then join + filter + rank.
  // We over-fetch (limit * 4) so post-filters (court, min_cites) still
  // return a full page.
  const candidates = limit * 4;
  const p = pool();
  const t1 = Date.now();

  const params: unknown[] = [litVec, candidates];
  let courtClause = "";
  if (courtFilter) {
    params.push(courtFilter);
    courtClause = `AND o.court_id = $${params.length}`;
  }

  const sql = `
    WITH knn AS (
      SELECT e.content_id AS opinion_id,
             e.chunk_text,
             1 - (e.embedding <=> $1::vector) AS similarity
      FROM embeddings e
      WHERE e.content_kind = 'opinion'
      ORDER BY e.embedding <=> $1::vector
      LIMIT $2
    )
    SELECT o.id, o.source_id, o.case_name, o.court_id, o.decision_date::text,
           o.citation, o.source_url, o.precedential_status,
           knn.similarity, knn.chunk_text,
           COALESCE((SELECT COUNT(*) FROM opinion_citations oc WHERE oc.cited_id = o.id), 0) AS cited_by_count
    FROM knn
    JOIN opinions o ON o.id = knn.opinion_id
    WHERE TRUE ${courtClause}
    ORDER BY knn.similarity DESC
  `;
  const r = await p.query(sql, params);
  const tRetrieve = Date.now() - t1;

  const rows = r.rows
    .map((row) => ({
      id: row.id,
      cl_id: row.source_id,
      case_name: row.case_name,
      court_id: row.court_id,
      decision_date: row.decision_date,
      citation: row.citation,
      source_url: row.source_url,
      precedential_status: row.precedential_status,
      similarity: Number(row.similarity),
      cited_by_count: Number(row.cited_by_count),
      snippet: row.chunk_text,
    }))
    .filter((h) => h.cited_by_count >= minCites)
    .sort((a, b) => rankScore(b) - rankScore(a))
    .slice(0, limit);

  return {
    query,
    embedding_model: process.env.OLLAMA_EMBED_MODEL || "mxbai-embed-large",
    results: rows,
    total_candidates: r.rowCount,
    timing_ms: {
      embed: tEmbed,
      retrieve: tRetrieve,
      total: Date.now() - t0,
    },
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const query = sp.get("q") || sp.get("query") || "";
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") || "20")));
  const courtFilter = sp.get("court") || undefined;
  const minCites = Math.max(0, Number(sp.get("min_cites") || "0"));

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Missing required query parameter `q`" },
      { status: 400 }
    );
  }

  try {
    const out = await runSearch(query, limit, courtFilter, minCites);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }
  try {
    const out = await runSearch(
      parsed.data.query,
      parsed.data.limit ?? 20,
      parsed.data.court_filter,
      parsed.data.min_cites ?? 0
    );
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
