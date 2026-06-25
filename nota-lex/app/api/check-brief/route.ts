import { NextRequest, NextResponse } from "next/server";
import { checkBrief } from "@nota-lawyer/shared";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Schema = z.object({ text: z.string().min(10).max(50000) });

/**
 * POST /api/check-brief  { text }
 * Extracts every case + statute citation in the brief and verifies each against
 * the NY corpus. Returns per-citation status (verified / weak_match / not_found)
 * — the "catch the hallucinated cite" feature. not_found = likely fabricated.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide { text } (10-50000 chars)" }, { status: 400 });
    }
    const t0 = Date.now();
    const result = await checkBrief(parsed.data.text);
    return NextResponse.json({ ...result, timing_ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
