import { NextRequest, NextResponse } from "next/server";
import { isTriggerwareConfigured, triggerwarePoll } from "@nota-lawyer/shared";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Pull deltas from a Triggerware watch. Returns added/deleted rows since
 * the last call. Calling this twice in a row returns empty unless new data
 * arrived.
 *
 * GET /api/lex/watch/poll?name=ny_consumer_protection
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "?name= required" }, { status: 400 });
  }
  if (!isTriggerwareConfigured()) {
    return NextResponse.json(
      { error: "Triggerware not configured. Set TRIGGERWARE_API_KEY." },
      { status: 503 }
    );
  }
  try {
    const result = await triggerwarePoll(name);
    return NextResponse.json({
      provider: "triggerware",
      name,
      added_count: result.added?.length ?? 0,
      deleted_count: result.deleted?.length ?? 0,
      added: result.added ?? [],
      deleted: result.deleted ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
