/**
 * Speechmatics integration for Lex.NY — voice input for legal research.
 *
 * Browser opens a Realtime WebSocket to wss://eu2.rt.speechmatics.com/v2/?jwt=<temp>
 * authenticated by a temporary JWT we mint server-side. The long-lived
 * API key never leaves the server.
 *
 * Auth flow:
 *   1. Browser hits POST /api/speechmatics/temp-key (this server)
 *   2. We call createSpeechmaticsJWT({ type: 'rt', apiKey, ttl }) which
 *      hits https://mp.speechmatics.com/v1/api_keys?type=rt with the
 *      long-lived API key, returning a short-lived JWT.
 *   3. Browser opens wss://...?jwt=<jwt>, streams 16kHz PCM audio,
 *      receives AddTranscript messages, populates question textarea.
 *
 * Hackathon: First 100 participants get $200 in free Speechmatics credits.
 *            Best Use Prize tier: partner-level rewards.
 */

import { createSpeechmaticsJWT, SpeechmaticsJWTError } from "@speechmatics/auth";

export interface SpeechmaticsConfig {
  apiKey: string;
  /** ISO 639-1 default 'en' */
  language: string;
  /** 'eu' | 'usa' | 'au' — defaults to 'eu' (cheapest for solo hackathon dev) */
  region: "eu" | "usa" | "au";
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
    region: (process.env.SPEECHMATICS_REGION as "eu" | "usa" | "au") || "eu",
  };
}

/**
 * Mint a short-lived JWT for the browser to use when opening the
 * Realtime WebSocket. Default TTL 60 seconds — the browser uses it
 * immediately to open the WS; once the WS is open the JWT is no longer
 * needed.
 */
export async function issueTemporaryRTKey(opts: {
  ttlSeconds?: number;
  clientRef?: string;
} = {}): Promise<{
  jwt: string;
  ttl: number;
  region: "eu" | "usa" | "au";
  ws_url: string;
}> {
  const cfg = getSpeechmaticsConfig();
  if (!cfg) {
    throw new Error(
      "Speechmatics not configured. Set SPEECHMATICS_API_KEY in .env.local. " +
      "First 100 hackathon participants get $200 free credits at https://www.speechmatics.com"
    );
  }
  const ttl = opts.ttlSeconds ?? 60;
  try {
    const jwt = await createSpeechmaticsJWT({
      type: "rt",
      apiKey: cfg.apiKey,
      ttl,
      region: cfg.region,
      clientRef: opts.clientRef ?? "lex-ny-browser",
    });
    // Region → WS URL. eu2 is the modern endpoint name.
    const wsByRegion: Record<typeof cfg.region, string> = {
      eu: "wss://eu2.rt.speechmatics.com/v2",
      usa: "wss://us.rt.speechmatics.com/v2",
      au: "wss://au.rt.speechmatics.com/v2",
    };
    return {
      jwt,
      ttl,
      region: cfg.region,
      ws_url: wsByRegion[cfg.region],
    };
  } catch (e) {
    if (e instanceof SpeechmaticsJWTError) {
      throw new Error(`Speechmatics JWT error (${e.type}): ${e.message}`);
    }
    throw e;
  }
}

export interface SpeechmaticsStats {
  configured: boolean;
  region?: string;
  language?: string;
  ws_endpoint?: string;
  implementation_status: "live" | "configured-but-untested" | "not-configured";
}

export function getSpeechmaticsStats(): SpeechmaticsStats {
  const cfg = getSpeechmaticsConfig();
  if (!cfg) {
    return {
      configured: false,
      implementation_status: "not-configured",
    };
  }
  const wsByRegion: Record<typeof cfg.region, string> = {
    eu: "wss://eu2.rt.speechmatics.com/v2",
    usa: "wss://us.rt.speechmatics.com/v2",
    au: "wss://au.rt.speechmatics.com/v2",
  };
  return {
    configured: true,
    region: cfg.region,
    language: cfg.language,
    ws_endpoint: wsByRegion[cfg.region],
    implementation_status: "configured-but-untested",
  };
}

export async function speechmaticsHealthCheck(): Promise<{ ok: boolean; details: string }> {
  if (!isSpeechmaticsConfigured()) {
    return {
      ok: false,
      details: "SPEECHMATICS_API_KEY not set in .env.local",
    };
  }
  // Real check: mint a 10-second JWT. If the long-lived key is bad,
  // mp.speechmatics.com returns 401 and we propagate that.
  try {
    const r = await issueTemporaryRTKey({ ttlSeconds: 10, clientRef: "lex-ny-healthcheck" });
    return {
      ok: true,
      details: `Speechmatics ${r.region} region reachable; JWT minted ttl=${r.ttl}s`,
    };
  } catch (e) {
    return {
      ok: false,
      details: e instanceof Error ? e.message : String(e),
    };
  }
}
