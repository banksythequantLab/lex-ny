import { NextResponse } from "next/server";
import pg from "pg";
import { Signer } from "@aws-sdk/rds-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /api/corpus-stats — live corpus size from AWS Aurora PostgreSQL (lex).
 *
 * Reads opinions, NY cases, statutes, embeddings, and citation-edge counts
 * directly from Aurora. IAM-authenticated (passwordless) over SSL — the same
 * auth path as the retrieval pipeline.
 */

const CACHE_TTL_MS = 60_000;
let _cache: { at: number; data: Record<string, unknown> } | null = null;

// Aurora IAM auth: a fresh 15-min token per connection, signed with our
// NOTA_AWS_* creds (Vercel/Lambda reserves the AWS_* names for its own role).
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

export async function GET() {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    const age = Math.floor((Date.now() - _cache.at) / 1000);
    return NextResponse.json(_cache.data, {
      headers: {
        "X-Cache": "HIT",
        "X-Cache-Age-Seconds": String(age),
        "Cache-Control": `public, max-age=${Math.max(1, 60 - age)}`,
      },
    });
  }

  const out: Record<string, unknown> = {
    source: "AWS Aurora PostgreSQL (lex)",
    generated_at: new Date().toISOString(),
  };

  try {
    const p = pool();
    const [opinions, cases, statutes, embeds, cites, courts, byCourt, dateRange] =
      await Promise.all([
        p.query("SELECT COUNT(*)::bigint AS c FROM opinions"),
        p.query("SELECT COUNT(*)::bigint AS c FROM ny_cases"),
        p.query("SELECT COUNT(*)::bigint AS c FROM statutes WHERE doc_type='SECTION'"),
        p.query("SELECT COUNT(*)::bigint AS c FROM embeddings"),
        p.query("SELECT COUNT(*)::bigint AS c FROM opinion_citations"),
        p.query("SELECT COUNT(DISTINCT court_id)::bigint AS c FROM opinions"),
        p.query(
          `SELECT court_id, COUNT(*)::bigint AS c FROM opinions
           GROUP BY court_id ORDER BY c DESC LIMIT 12`
        ),
        p.query(
          `SELECT MIN(decision_date)::text AS min_d, MAX(decision_date)::text AS max_d
           FROM opinions WHERE decision_date IS NOT NULL`
        ),
      ]);

    const n = (r: pg.QueryResult) => Number(r.rows[0].c);
    out.postgres = {
      ok: true,
      opinions: n(opinions),
      ny_cases: n(cases),
      statutes: n(statutes),
      embeddings: n(embeds),
      opinion_citations: n(cites),
      distinct_courts: n(courts),
      total_legal_records: n(opinions) + n(cases) + n(statutes),
      decision_date_range: {
        earliest: dateRange.rows[0].min_d,
        latest: dateRange.rows[0].max_d,
      },
      top_courts: byCourt.rows.map((r) => ({
        court_id: r.court_id,
        count: Number(r.c),
      })),
    };
  } catch (e) {
    out.postgres = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const pgOk = (out.postgres as { ok?: boolean } | undefined)?.ok === true;
  if (pgOk) {
    _cache = { at: Date.now(), data: out };
  }

  return NextResponse.json(out, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=60" },
  });
}
