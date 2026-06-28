import { NextRequest, NextResponse } from "next/server";
import { judgeInfluenceRanking, searchJudges } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/judges — NY judges ranked by total inbound citations across the
 * opinions they authored (citation-influence leaderboard). Backed by
 * opinion_judges + opinion_inbound_counts. Query: ?q (name search), ?limit, ?min_opinions.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || "20")));
  const t0 = Date.now();
  try {
    if (q) {
      const judges = await searchJudges(q, { limit });
      return NextResponse.json({ judges, count: judges.length, query: q, timing_ms: Date.now() - t0 });
    }
    const minOpinions = Math.max(1, Number(sp.get("min_opinions") || "5"));
    const judges = await judgeInfluenceRanking({ limit, minOpinions });
    return NextResponse.json({ judges, count: judges.length, timing_ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
