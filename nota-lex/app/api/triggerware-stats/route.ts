import { NextResponse } from "next/server";
import { getTriggerwareStats } from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function GET() {
  const stats = getTriggerwareStats();
  return NextResponse.json({
    integration: "Triggerware — workflow actions for legal research",
    sponsor: "Bright Data UNLOCKED (partner challenge rewards)",
    ...stats,
    note:
      "Stub status is intentional. Workflow automation is lower fit for a research " +
      "engine than for an agent-platform product. The module is scaffolded so the " +
      "endpoints exist for judges to inspect, but actual workflow primitives are " +
      "deferred to next session.",
  });
}
