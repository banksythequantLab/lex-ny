/**
 * Speechmatics integration for Lex.NY — voice input for legal research.
 *
 * STATUS: STUB — NOT YET IMPLEMENTED.
 *
 * Why this sponsor matters:
 *   - First 100 hackathon participants get $200 in FREE API credits
 *   - Voice input ("Hey Lex, what does Penal Law 400.00 say?") is genuinely
 *     accessible for pro se litigants who struggle with typed legal jargon
 *   - Real-time transcription would be useful for client-intake calls
 *     that feed the research engine
 *
 * What's needed to ship:
 *   1. Sign up at https://www.speechmatics.com and grab API key
 *   2. Add a microphone button to /ask page (browser MediaRecorder API)
 *   3. Stream audio via WebSocket to Speechmatics Real-Time STT
 *      (wss://eu2.rt.speechmatics.com/v2/ — see docs.speechmatics.com)
 *   4. On final transcript, populate the question textarea
 *   5. Optional: TTS the answer back via Speechmatics or Web Speech API
 *
 * Why this is a stub:
 *   Voice input is a UI change requiring real browser testing on the
 *   live demo URL (Cloudflare Tunnel needed first). Per user prefs:
 *   "It is helpful to admit jobs are incomplete. It is not acceptable
 *   to say something was done when it has not been tested." Skeleton
 *   below + the /api/speechmatics-stats endpoint return "stub" honestly
 *   so the judges see what's planned without a faked demo.
 *
 * Best Use Prize: Partner-tier rewards available (amount TBD).
 */

export interface SpeechmaticsConfig {
  apiKey: string;
  language?: string; // ISO 639-1, default "en"
}

export function isSpeechmaticsConfigured(): boolean {
  return Boolean(process.env.SPEECHMATICS_API_KEY);
}

export function getSpeechmaticsConfig(): SpeechmaticsConfig | null {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    language: process.env.SPEECHMATICS_LANGUAGE || "en",
  };
}

/**
 * Generate a temporary JWT for the browser to use when opening a
 * Speechmatics Real-Time websocket. The browser cannot use the long-lived
 * API key directly — it requests a short-lived temporary key from our
 * backend, which is what this helper produces.
 *
 * NOT YET IMPLEMENTED. Per Speechmatics docs, POST to
 * https://mp.speechmatics.com/v1/api_keys?type=rt with the long-lived
 * API key in the Authorization header, body { "ttl": 3600 }.
 *
 * Returns null until implemented + Speechmatics key is provisioned.
 */
export async function issueTemporaryRTKey(opts: { ttlSeconds?: number } = {}): Promise<{
  key: string | null;
  expires_at: number | null;
  stub: boolean;
}> {
  const cfg = getSpeechmaticsConfig();
  if (!cfg) {
    return { key: null, expires_at: null, stub: true };
  }
  void opts; // suppress unused warning until implemented
  // TODO: real implementation — POST to mp.speechmatics.com/v1/api_keys?type=rt
  // with `Authorization: Bearer ${cfg.apiKey}`, body `{ "ttl": opts.ttlSeconds || 3600 }`.
  // Response shape: { key_value: "ey...", project_id: "...", id: "..." }
  return { key: null, expires_at: null, stub: true };
}

export interface SpeechmaticsStats {
  configured: boolean;
  implementation_status: "stub" | "partial" | "live";
  next_steps?: string[];
}

export function getSpeechmaticsStats(): SpeechmaticsStats {
  if (!isSpeechmaticsConfigured()) {
    return {
      configured: false,
      implementation_status: "stub",
      next_steps: [
        "Sign up at https://www.speechmatics.com (first 100 participants get $200 free credits)",
        "Set SPEECHMATICS_API_KEY in .env.local",
        "Wire microphone button into /ask page (browser MediaRecorder)",
        "Open WebSocket to wss://eu2.rt.speechmatics.com/v2/ from browser",
      ],
    };
  }
  return {
    configured: true,
    implementation_status: "stub",
    next_steps: [
      "Implement issueTemporaryRTKey() with real HTTP call to mp.speechmatics.com",
      "Add microphone UI to /ask page",
      "Wire transcript-final event to populate question textarea",
    ],
  };
}
