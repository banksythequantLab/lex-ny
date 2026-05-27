import { NextResponse } from "next/server";
import {
  isSpeechmaticsConfigured,
  getSpeechmaticsStats,
  speechmaticsHealthCheck,
} from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function GET() {
  if (!isSpeechmaticsConfigured()) {
    return NextResponse.json({
      integration: "Speechmatics — voice input for legal research",
      sponsor: "Bright Data UNLOCKED partner (first 100 participants: $200 free credits)",
      configured: false,
      message:
        "Speechmatics not configured. Set SPEECHMATICS_API_KEY in .env.local. " +
        "Sign up at https://www.speechmatics.com.",
      voice_flow: {
        step_1: "POST /api/speechmatics/temp-key → returns { jwt, ws_url, ttl }",
        step_2: "Browser opens WebSocket to ${ws_url}/?jwt=${jwt}",
        step_3: "Browser streams 16kHz PCM audio chunks; receives AddTranscript events",
        step_4: "On is_final=true, the question textarea is populated with the transcript",
      },
    });
  }

  const stats = getSpeechmaticsStats();
  const health = await speechmaticsHealthCheck();
  return NextResponse.json({
    integration: "Speechmatics — voice input for legal research",
    sponsor: "Bright Data UNLOCKED partner (first 100 participants: $200 free credits)",
    health,
    stats,
    temp_key_endpoint: "POST /api/speechmatics/temp-key",
  });
}
