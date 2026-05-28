import { NextResponse } from "next/server";
import pg from "pg";
import { getGraphStats, isNeo4jConfigured, neo4jHealthCheck } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /api/corpus-stats - live corpus size from LOCAL Postgres + Neo4j.
 *
 * Ground-truth dashboard feed. Reads directly from the local Postgres `lex`
 * database (NOT Supabase, which is the abandoned cloud copy). Returns counts
 * for opinions, NY cases, statutes, embeddings, citation edges, plus Neo4j
 * graph node/relationship counts and a per-court breakdown.
 */

let _pool: pg.Pool | null = null;
function pool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || "lex",
      max: 4,
    });
  }
  return _pool;
}

export async function GET() {
  const out: Record<string, unknown> = {
    source: "local Postgres (lex) + Neo4j AuraDB",
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

  if (isNeo4jConfigured()) {
    try {
      const health = await neo4jHealthCheck();
      if (health.ok) {
        const stats = await getGraphStats();
        out.neo4j = { ok: true, health: health.details, stats };
      } else {
        out.neo4j = { ok: false, error: health.details };
      }
    } catch (e) {
      out.neo4j = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  } else {
    out.neo4j = { ok: false, error: "not configured" };
  }

  return NextResponse.json(out);
}
