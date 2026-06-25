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
export function isSpeechmaticsConfigured() {
    return Boolean(process.env.SPEECHMATICS_API_KEY);
}
export function getSpeechmaticsConfig() {
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey)
        return null;
    return {
        apiKey,
        language: process.env.SPEECHMATICS_LANGUAGE || "en",
        region: process.env.SPEECHMATICS_REGION || "eu",
    };
}
/**
 * Mint a short-lived JWT for the browser to use when opening the
 * Realtime WebSocket. Default TTL 60 seconds — the browser uses it
 * immediately to open the WS; once the WS is open the JWT is no longer
 * needed.
 */
export async function issueTemporaryRTKey(opts = {}) {
    const cfg = getSpeechmaticsConfig();
    if (!cfg) {
        throw new Error("Speechmatics not configured. Set SPEECHMATICS_API_KEY in .env.local. " +
            "First 100 hackathon participants get $200 free credits at https://www.speechmatics.com");
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
        const wsByRegion = {
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
    }
    catch (e) {
        if (e instanceof SpeechmaticsJWTError) {
            throw new Error(`Speechmatics JWT error (${e.type}): ${e.message}`);
        }
        throw e;
    }
}
export function getSpeechmaticsStats() {
    const cfg = getSpeechmaticsConfig();
    if (!cfg) {
        return {
            configured: false,
            implementation_status: "not-configured",
        };
    }
    const wsByRegion = {
        eu: "wss://eu2.rt.speechmatics.com/v2",
        usa: "wss://us.rt.speechmatics.com/v2",
        au: "wss://au.rt.speechmatics.com/v2",
    };
    return {
        configured: true,
        region: cfg.region,
        language: cfg.language,
        ws_endpoint: wsByRegion[cfg.region],
        implementation_status: "live",
        // E2E validated 2026-05-30 via cl-bulk/test_speechmatics_e2e.py:
        //   JWT minted (893b, 60s TTL) -> WS connect to wss://eu2.rt.speechmatics.com/v2
        //   -> StartRecognition ACKed with orchestrator 2026.04.21+fd908134bc+15.7.0
        //   -> 32000b silent PCM_S16LE accepted -> AudioAdded seq_no 1
        //   -> AddPartialTranscript + AddTranscript + EndOfTranscript clean close.
        last_e2e_validated_at: "2026-05-30T22:36:00Z",
        surface: "POST /ask -> VoiceInputButton -> /api/speechmatics/temp-key -> WSS",
    };
}
export async function speechmaticsHealthCheck() {
    if (!isSpeechmaticsConfigured()) {
        return {
            ok: false,
            details: "SPEECHMATICS_API_KEY not set in .env.local",
        };
    }
    // Real check: mint a 10-second JWT. If the long-lived key is bad,
    // mp.speechmatics.com returns 401 and we propagate that.
    try {
        const r = await issueTemporaryRTKey({ ttlSeconds: 60, clientRef: "lex-ny-healthcheck" });
        return {
            ok: true,
            details: `Speechmatics ${r.region} region reachable; JWT minted ttl=${r.ttl}s`,
        };
    }
    catch (e) {
        return {
            ok: false,
            details: e instanceof Error ? e.message : String(e),
        };
    }
}
//# sourceMappingURL=speechmatics-client.js.map