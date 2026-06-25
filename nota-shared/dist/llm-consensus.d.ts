/**
 * Multi-model consensus for Lex.NY — hallucination detection via voting.
 *
 * Why this matters for legal research:
 *   When three independent models all produce a citation referring to the
 *   same statute marker, our confidence is high. When one model invents
 *   a marker the other two don't produce, that's a hallucination signal.
 *
 *   Under NY Rules of Professional Conduct 7.1, an attorney supervising
 *   an AI tool that produces output the attorney has to vouch for needs
 *   a defensible hallucination-detection layer. Multi-model voting is
 *   one of the strongest available signals.
 *
 * How this fits the hackathon:
 *   AI/ML API gives us a single billing relationship and a single
 *   OpenAI-compatible endpoint that routes to 100+ models from OpenAI,
 *   Anthropic, Google, Mistral, Meta, etc. That makes a multi-model
 *   consensus implementation feasible — without AI/ML API we'd need
 *   3 different API keys, 3 different SDKs, 3 different rate-limit
 *   buckets.
 *
 *   $5K cash prize for best use of AI/ML API.
 *
 * Usage:
 *   await consensusDraft({
 *     system: SYSTEM_PROMPT,
 *     user: userPrompt,
 *     models: ["openai/gpt-5-chat-latest", "claude-opus-4-7", "meta-llama/Llama-3.3-70B-Instruct-Turbo"],
 *   });
 *
 * Returns the highest-confidence draft (passes citation-overlap test) plus
 * a per-marker overlap score so the UI can highlight low-confidence claims.
 */
export interface ConsensusOpts {
    system: string;
    user: string;
    /** AI/ML API model IDs. See docs.aimlapi.com for full list. */
    models: string[];
    temperature?: number;
    max_tokens?: number;
}
export interface ConsensusDraft {
    /** The model that produced this draft */
    model: string;
    /** Raw answer text */
    text: string;
    /** Citation markers used in this draft, e.g. [1, 2, 3, 7] */
    markers: number[];
}
export interface ConsensusResult {
    /** All drafts, in the order they were generated */
    drafts: ConsensusDraft[];
    /** Markers that appear in ≥2 drafts — these are the "high-confidence" citations */
    consensus_markers: number[];
    /** Markers that appear in only 1 draft — review candidates */
    divergent_markers: number[];
    /** The recommended winning draft (highest consensus marker count) */
    winner: ConsensusDraft;
    /** Time stats */
    total_duration_ms: number;
    per_model_duration_ms: Record<string, number>;
}
/**
 * Extract `[1]`, `[2]`, `[12]`-style citation markers from an answer body.
 */
export declare function extractMarkers(text: string): number[];
/**
 * Returns true iff AI/ML API consensus is configured (env var present).
 */
export declare function isConsensusConfigured(): boolean;
/**
 * Run N models in parallel against the same prompt via AI/ML API and
 * vote on which citation markers all of them agreed on.
 *
 * AI/ML API is OpenAI-SDK-compatible at https://api.aimlapi.com/v1,
 * Bearer auth. Pass model strings like "openai/gpt-5-chat-latest"
 * or "anthropic/claude-opus-4-5".
 */
export declare function consensusDraft(opts: ConsensusOpts): Promise<ConsensusResult>;
/**
 * Health check — verifies AI/ML API connectivity.
 */
export declare function aimlapiHealthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=llm-consensus.d.ts.map