import { NextResponse } from "next/server";
import { isCogneeConfigured, cogneeHealthCheck, getCogneeStats } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Cognee agent memory stats - proof of Bright Data UNLOCKED sponsor integration.
 *
 * Hackathon prize: 1 Year Team Access (worth $2,400) + $500 Amazon Gift Card.
 */
export async function GET() {
  if (!isCogneeConfigured()) {
    return NextResponse.json({
      integration: "Cognee — agent memory & knowledge graph",
      configured: false,
      message:
        "Cognee not configured. Set COGNEE_BASE_URL + (COGNEE_API_KEY for managed cloud, " +
        "or COGNEE_USERNAME + COGNEE_PASSWORD for self-hosted JWT) in .env.local. " +
        "Bright Data UNLOCKED partner — 1yr Team Access ($2,400) + $500 Amazon GC.",
      use_case:
        "Per-session memory for legal research. When a session_id is passed to /api/ask, " +
        "prior questions and citations from that session are recalled via Cognee's " +
        "GRAPH_COMPLETION search and prepended to the LLM context. Each answer is " +
        "remembered post-draft so the next question in the session has continuity.",
      docs: "https://docs.cognee.ai",
    });
  }

  try {
    const stats = getCogneeStats();
    const health = await cogneeHealthCheck();
    return NextResponse.json({
      integration: "Cognee — agent memory & knowledge graph",
      configured: true,
      ok: health.ok,
      details: health.details,
      stats,
      session_endpoint:
        "POST /api/ask with body.session_id set — recall + remember fire automatically",
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
