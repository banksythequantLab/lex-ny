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
export interface SpeechmaticsConfig {
    apiKey: string;
    /** ISO 639-1 default 'en' */
    language: string;
    /** 'eu' | 'usa' | 'au' — defaults to 'eu' (cheapest for solo hackathon dev) */
    region: "eu" | "usa" | "au";
}
export declare function isSpeechmaticsConfigured(): boolean;
export declare function getSpeechmaticsConfig(): SpeechmaticsConfig | null;
/**
 * Mint a short-lived JWT for the browser to use when opening the
 * Realtime WebSocket. Default TTL 60 seconds — the browser uses it
 * immediately to open the WS; once the WS is open the JWT is no longer
 * needed.
 */
export declare function issueTemporaryRTKey(opts?: {
    ttlSeconds?: number;
    clientRef?: string;
}): Promise<{
    jwt: string;
    ttl: number;
    region: "eu" | "usa" | "au";
    ws_url: string;
}>;
export interface SpeechmaticsStats {
    configured: boolean;
    region?: string;
    language?: string;
    ws_endpoint?: string;
    implementation_status: "live" | "configured-but-untested" | "not-configured";
    /**
     * Timestamp of the last successful end-to-end test:
     *   JWT mint -> WebSocket connect to wss://eu2.rt.speechmatics.com/v2
     *   -> StartRecognition -> RecognitionStarted + AudioAdded + AddTranscript
     *   + EndOfTranscript round trip.
     *
     * If this drifts more than 24h out of date, re-run cl-bulk/test_speechmatics_e2e.py
     * before claiming "live" on /stats.
     */
    last_e2e_validated_at?: string;
    surface?: string;
}
export declare function getSpeechmaticsStats(): SpeechmaticsStats;
export declare function speechmaticsHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=speechmatics-client.d.ts.map