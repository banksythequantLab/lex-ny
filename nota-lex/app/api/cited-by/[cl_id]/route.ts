import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver, isNeo4jConfigured } from "@nota-lawyer/shared";
import neo4j from "neo4j-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * /api/cited-by/[cl_id] - "what cases cite this opinion?" via Neo4j.
 *
 * Two Cypher queries, run serially (sessions are NOT thread-safe — see
 * neo4j-client.ts comments):
 *   1. The seed opinion's own metadata
 *   2. All Opinions that have a [:CITES] -> seed edge, sorted by their own
 *      inbound CITES count (= most-cited citers float to the top)
 *
 * Why this matters for the demo: traditional case-law tools (Westlaw, Lexis)
 * sell "cited-by" as a paid premium feature. Lex.NY exposes it from the
 * citation graph as a free, real-time JSON endpoint.
 */

interface CiterRow {
  cl_id: string;
  case_name: string;
  court_id: string;
  decision_date: string | null;
  cited_by_count: number;
}

interface CitedByResponse {
  seed: {
    cl_id: string;
    case_name: string;
    court_id: string;
    decision_date: string | null;
    inbound_count: number;
  } | null;
  citers: CiterRow[];
  total_citers: number;
  timing_ms: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cl_id: string }> }
) {
  const { cl_id } = await params;
  if (!cl_id || !/^[0-9]+$/.test(cl_id)) {
    return NextResponse.json(
      { error: "Invalid cl_id (must be numeric CourtListener cluster id)" },
      { status: 400 }
    );
  }

  if (!isNeo4jConfigured()) {
    return NextResponse.json({ error: "Neo4j not configured" }, { status: 503 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50"))
  );

  const t0 = Date.now();
  const driver = getNeo4jDriver();
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });

  try {
    // 1. Seed lookup + inbound count
    const seedResult = await session.run(
      `
      MATCH (seed:Opinion {cl_id: $cl_id})
      OPTIONAL MATCH (seed)<-[r:CITES]-()
      RETURN seed.cl_id AS cl_id,
             seed.case_name AS case_name,
             seed.court_id AS court_id,
             seed.decision_date AS decision_date,
             count(r) AS inbound_count
      `,
      { cl_id }
    );

    let seed: CitedByResponse["seed"] = null;
    if (seedResult.records.length > 0) {
      const r = seedResult.records[0];
      seed = {
        cl_id: r.get("cl_id"),
        case_name: r.get("case_name"),
        court_id: r.get("court_id"),
        decision_date: r.get("decision_date") || null,
        inbound_count: r.get("inbound_count")?.toNumber?.() ?? Number(r.get("inbound_count")) ?? 0,
      };
    }

    if (!seed) {
      return NextResponse.json({
        seed: null,
        citers: [],
        total_citers: 0,
        timing_ms: Date.now() - t0,
        note: `No Opinion with cl_id=${cl_id} in graph`,
      });
    }

    // 2. Citers, ranked by THEIR OWN inbound CITES count (importance proxy)
    const citersResult = await session.run(
      `
      MATCH (citer:Opinion)-[:CITES]->(:Opinion {cl_id: $cl_id})
      WITH DISTINCT citer
      OPTIONAL MATCH (citer)<-[r:CITES]-()
      WITH citer, count(r) AS cited_by_count
      RETURN citer.cl_id AS cl_id,
             citer.case_name AS case_name,
             citer.court_id AS court_id,
             citer.decision_date AS decision_date,
             cited_by_count
      ORDER BY cited_by_count DESC
      LIMIT $lim
      `,
      { cl_id, lim: neo4j.int(limit) }
    );

    const citers: CiterRow[] = citersResult.records.map((r) => ({
      cl_id: r.get("cl_id"),
      case_name: r.get("case_name"),
      court_id: r.get("court_id"),
      decision_date: r.get("decision_date") || null,
      cited_by_count:
        r.get("cited_by_count")?.toNumber?.() ??
        Number(r.get("cited_by_count")) ??
        0,
    }));

    return NextResponse.json({
      seed,
      citers,
      total_citers: seed.inbound_count,
      timing_ms: Date.now() - t0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
