import { NextRequest, NextResponse } from "next/server";
import { judgeProfile } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/judges/[id] — full judge profile: volume, date span, courts, and their
 * most-cited authored decisions. ?top=N controls the decision list length.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: "Invalid judge id (uuid expected)" }, { status: 400 });
  }
  const topN = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("top") || "10")));
  try {
    const profile = await judgeProfile(id, { topN });
    if (!profile) return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
