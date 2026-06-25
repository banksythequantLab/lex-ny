import { NextRequest, NextResponse } from "next/server";
import { citedBy } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * /api/cited-by/[cl_id] — "what cases cite this opinion?" via the Postgres
 * citation graph (opinion_citations). Replaces the old Neo4j path; Aurora-ready.
 * Citers are ranked by their own inbound citation count (most-authoritative first).
 */
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
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50")));
  const t0 = Date.now();
  try {
    const r = await citedBy(cl_id, { limit });
    if (!r.seed) {
      return NextResponse.json({
        seed: null, citers: [], total_citers: 0,
        timing_ms: Date.now() - t0, note: `No opinion with cl_id=${cl_id}`,
      });
    }
    return NextResponse.json({ ...r, timing_ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
