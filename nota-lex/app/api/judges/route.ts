import { NextRequest, NextResponse } from "next/server";
import { judgeInfluenceRanking } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/judges — NY judges ranked by total inbound citations across the
 * opinions they authored (citation-influence leaderboard). Backed by
 * opinion_judges + opinion_inbound_counts. Query: ?limit, ?min_opinions.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || "20")));
  const minOpinions = Math.max(1, Number(sp.get("min_opinions") || "5"));
  const t0 = Date.now();
  try {
    const judges = await judgeInfluenceRanking({ limit, minOpinions });
    return NextResponse.json({ judges, count: judges.length, timing_ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
