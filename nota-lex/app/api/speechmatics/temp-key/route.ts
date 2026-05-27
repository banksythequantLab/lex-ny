import { NextResponse } from "next/server";
import { issueTemporaryRTKey, isSpeechmaticsConfigured } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Mint a short-lived Speechmatics Realtime JWT for the browser.
 *
 * Browser flow:
 *   const r = await fetch('/api/speechmatics/temp-key', { method: 'POST' }).then(r => r.json());
 *   const ws = new WebSocket(`${r.ws_url}/?jwt=${r.jwt}`);
 *   // … stream audio, listen for AddTranscript events
 *
 * The browser NEVER sees the long-lived SPEECHMATICS_API_KEY.
 */
export async function POST() {
  if (!isSpeechmaticsConfigured()) {
    return NextResponse.json(
      {
        error: "Speechmatics not configured",
        hint:
          "Set SPEECHMATICS_API_KEY in .env.local. " +
          "First 100 hackathon participants get $200 free credits at https://www.speechmatics.com",
      },
      { status: 503 }
    );
  }
  try {
    const r = await issueTemporaryRTKey({ ttlSeconds: 60, clientRef: "lex-ny-ask-page" });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

// Allow GET for the demo "is this thing on?" check
export async function GET() {
  return NextResponse.json({
    info: "POST this endpoint to mint a Speechmatics RT JWT. " +
          "The body is empty; the JWT is bound to SPEECHMATICS_API_KEY on the server.",
    configured: isSpeechmaticsConfigured(),
  });
}
