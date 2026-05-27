import { NextResponse } from "next/server";
import { aimlapiHealthCheck, isConsensusConfigured } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * AI/ML API integration stats - proof of Bright Data UNLOCKED sponsor integration.
 *
 * AI/ML API gives Lex.NY access to 100+ leading models behind one OpenAI-compatible
 * endpoint, enabling multi-model consensus voting for hallucination detection.
 *
 * Hackathon prize: $5K cash (Best Use of AI/ML API).
 */
export async function GET() {
  if (!isConsensusConfigured()) {
    return NextResponse.json({
      integration: "AI/ML API — multi-model consensus",
      configured: false,
      message:
        "AI/ML API not configured. Set AIMLAPI_KEY in .env.local. " +
        "Sign up at https://aimlapi.com — Bright Data UNLOCKED partner, $5K cash prize for best use.",
      use_case:
        "Per-question multi-model voting (e.g., GPT-5 + Claude Opus + Llama 3.3 70B) " +
        "across the same retrieval context. Citation markers appearing in ≥2 drafts " +
        "are treated as high-confidence; markers appearing in only 1 are flagged for " +
        "attorney review. Defensible hallucination detection under NY RPC 7.1.",
    });
  }

  try {
    const health = await aimlapiHealthCheck();
    return NextResponse.json({
      integration: "AI/ML API — multi-model consensus",
      configured: true,
      ok: health.ok,
      details: health.details,
      default_model: process.env.AIMLAPI_MODEL || "openai/gpt-5-chat-latest",
      consensus_endpoint:
        "POST /api/ask?consensus=true with optional consensus_models in body",
      sample_models: [
        "openai/gpt-5-chat-latest",
        "anthropic/claude-opus-4-5",
        "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",
        "google/gemini-2.5-pro",
        "mistralai/mistral-large-2411",
      ],
      catalog: "https://docs.aimlapi.com/api-references/service-endpoints/complete-model-list",
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
