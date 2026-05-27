import { NextResponse } from "next/server";
import {
  isTriggerwareConfigured,
  getTriggerwareStats,
  triggerwareHealthCheck,
} from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function GET() {
  if (!isTriggerwareConfigured()) {
    return NextResponse.json({
      integration: "Triggerware — live data + change-detection watches",
      sponsor: "Bright Data UNLOCKED partner (partner-tier challenge rewards)",
      configured: false,
      message:
        "Triggerware not configured. Set TRIGGERWARE_API_KEY in .env.local. " +
        "Sign up at https://console.triggerware.ai.",
      capabilities: [
        "Natural-language queries → SQL → rows from installed connectors",
        "Scheduled triggers that track row-level deltas (new opinions, amendments)",
        "Per-user connector catalog (no shared state between users)",
        "MCP server for agentic workflows",
      ],
      lex_use_cases: [
        "Watch: new NY appellate decisions about [topic]",
        "Watch: amendments to NY Consolidated Laws Chapter [X]",
        "Watch: newly-filed federal class actions citing [statute]",
        "Live query: news articles relevant to active research",
      ],
      endpoints: {
        create_watch: "POST /api/lex/watch with { name, description, scheduleSeconds? }",
        list_watches: "GET /api/lex/watch",
        poll_watch: "GET /api/lex/watch/poll?name=<name>",
        delete_watch: "DELETE /api/lex/watch?name=<name>",
      },
    });
  }

  try {
    const [stats, health] = await Promise.all([getTriggerwareStats(), triggerwareHealthCheck()]);
    return NextResponse.json({
      integration: "Triggerware — live data + change-detection watches",
      sponsor: "Bright Data UNLOCKED partner (partner-tier challenge rewards)",
      health,
      stats,
      endpoints: {
        create_watch: "POST /api/lex/watch",
        list_watches: "GET /api/lex/watch",
        poll_watch: "GET /api/lex/watch/poll?name=<name>",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
