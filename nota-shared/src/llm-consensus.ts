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

import OpenAI from "openai";

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
export function extractMarkers(text: string): number[] {
  const matches = text.matchAll(/\[(\d+)\]/g);
  const set = new Set<number>();
  for (const m of matches) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Returns true iff AI/ML API consensus is configured (env var present).
 */
export function isConsensusConfigured(): boolean {
  return Boolean(process.env.AIMLAPI_KEY);
}

/**
 * Run N models in parallel against the same prompt via AI/ML API and
 * vote on which citation markers all of them agreed on.
 *
 * AI/ML API is OpenAI-SDK-compatible at https://api.aimlapi.com/v1,
 * Bearer auth. Pass model strings like "openai/gpt-5-chat-latest"
 * or "anthropic/claude-opus-4-5".
 */
export async function consensusDraft(opts: ConsensusOpts): Promise<ConsensusResult> {
  const apiKey = process.env.AIMLAPI_KEY;
  if (!apiKey) {
    throw new Error(
      "AIMLAPI_KEY env var required for multi-model consensus. " +
      "Sign up at https://aimlapi.com (hackathon partner, $5K prize)."
    );
  }
  if (opts.models.length === 0) {
    throw new Error("consensusDraft requires at least one model");
  }

  const client = new OpenAI({
    baseURL: "https://api.aimlapi.com/v1",
    apiKey,
    timeout: 90_000,
  });

  const start = Date.now();
  const perModelDuration: Record<string, number> = {};

  const drafts = await Promise.all(
    opts.models.map(async (model): Promise<ConsensusDraft | null> => {
      const t0 = Date.now();
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.max_tokens ?? 2048,
        });
        perModelDuration[model] = Date.now() - t0;
        const text = completion.choices[0]?.message?.content || "";
        return { model, text, markers: extractMarkers(text) };
      } catch (e) {
        perModelDuration[model] = Date.now() - t0;
        console.warn(`Consensus model ${model} failed: ${e instanceof Error ? e.message : e}`);
        return null;
      }
    })
  );

  const validDrafts = drafts.filter((d): d is ConsensusDraft => d !== null);
  if (validDrafts.length === 0) {
    throw new Error("All consensus models failed");
  }

  // Vote: a marker is "consensus" if it appears in ≥2 drafts
  const markerCounts = new Map<number, number>();
  for (const d of validDrafts) {
    for (const m of d.markers) {
      markerCounts.set(m, (markerCounts.get(m) ?? 0) + 1);
    }
  }
  const consensus_markers: number[] = [];
  const divergent_markers: number[] = [];
  for (const [marker, count] of markerCounts.entries()) {
    if (count >= 2) consensus_markers.push(marker);
    else divergent_markers.push(marker);
  }
  consensus_markers.sort((a, b) => a - b);
  divergent_markers.sort((a, b) => a - b);

  // Winner: draft with the highest count of consensus markers
  const winner = validDrafts
    .map((d) => ({
      draft: d,
      score: d.markers.filter((m) => consensus_markers.includes(m)).length,
    }))
    .sort((a, b) => b.score - a.score)[0].draft;

  return {
    drafts: validDrafts,
    consensus_markers,
    divergent_markers,
    winner,
    total_duration_ms: Date.now() - start,
    per_model_duration_ms: perModelDuration,
  };
}

/**
 * Health check — verifies AI/ML API connectivity.
 */
export async function aimlapiHealthCheck(): Promise<{ ok: boolean; details: string }> {
  if (!isConsensusConfigured()) {
    return {
      ok: false,
      details: "AIMLAPI_KEY not set in .env.local",
    };
  }
  try {
    const client = new OpenAI({
      baseURL: "https://api.aimlapi.com/v1",
      apiKey: process.env.AIMLAPI_KEY,
      timeout: 15_000,
    });
    const completion = await client.chat.completions.create({
      model: process.env.AIMLAPI_MODEL || "openai/gpt-5-chat-latest",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 8,
    });
    const text = completion.choices[0]?.message?.content || "";
    return {
      ok: true,
      details: `AI/ML API connected. Sample response: "${text.slice(0, 40)}..."`,
    };
  } catch (e) {
    return {
      ok: false,
      details: e instanceof Error ? e.message : String(e),
    };
  }
}
