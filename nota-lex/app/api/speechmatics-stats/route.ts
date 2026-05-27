import { NextResponse } from "next/server";
import { getSpeechmaticsStats } from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function GET() {
  const stats = getSpeechmaticsStats();
  return NextResponse.json({
    integration: "Speechmatics — voice input for legal research",
    sponsor: "Bright Data UNLOCKED (first 100 participants get $200 free credits)",
    ...stats,
    note:
      "Stub status is intentional. Voice UI requires browser MediaRecorder + " +
      "a tested live demo URL, which is out of scope for this commit. The integration " +
      "module is in place; wiring the UI is next-session work.",
  });
}
