import { NextRequest, NextResponse } from "next/server";
import { mostCitedDecisions } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/most-cited — most-cited NY decisions overall, or within one court
 * (?court=ny for Court of Appeals). Backed by opinion_inbound_counts.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || "20")));
  const courtId = sp.get("court") || undefined;
  const t0 = Date.now();
  try {
    const decisions = await mostCitedDecisions({ limit, courtId });
    return NextResponse.json({ decisions, count: decisions.length, timing_ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
