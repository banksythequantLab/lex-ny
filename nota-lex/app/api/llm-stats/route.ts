import { NextResponse } from "next/server";
import { llmUsage } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * /api/llm-stats - Groq / LLM provider usage stats.
 *
 * Lifetime counters (survive dev server restarts via disk persistence).
 * Returns:
 *   - total/successful/failed request counts
 *   - by_mode: chat vs stream breakdown
 *   - by_provider: groq vs ollama vs aimlapi breakdown
 *   - prompt + completion + total token sums
 *   - avg duration
 *   - recent 20 entries
 */
export async function GET() {
  const stats = llmUsage.getStats();
  const recent = llmUsage.getAll().slice(-20).reverse();

  return NextResponse.json({
    integration: "Groq / OpenAI-compatible chat completions",
    provider: "groq",
    stats,
    recent_requests: recent.map((r) => ({
      timestamp: r.timestamp,
      provider: r.provider,
      model: r.model,
      mode: r.mode,
      status: r.status,
      duration_ms: r.duration_ms,
      prompt_tokens: r.prompt_tokens,
      completion_tokens: r.completion_tokens,
      total_tokens: r.total_tokens,
      error: r.error,
    })),
    documentation: {
      groq_docs: "https://console.groq.com/docs/quickstart",
      models: "https://console.groq.com/docs/models",
    },
  });
}
