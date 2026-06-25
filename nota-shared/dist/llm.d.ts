/**
 * LLM abstraction for the Nota.Lawyer platform.
 *
 * Both Groq and Ollama expose OpenAI-compatible chat completions APIs,
 * so the entire app can swap between them via one environment variable.
 *
 *   LLM_PROVIDER=groq    → Groq cloud, Llama 3.3 70B Versatile (default, recommended for production)
 *   LLM_PROVIDER=ollama  → Local Ollama on Johnson, Qwen3 32B (free dev/test)
 *   LLM_PROVIDER=bedrock → AWS Bedrock OpenAI-compatible endpoint (Claude Sonnet etc.), API-key auth
 *   LLM_PROVIDER=aimlapi → AI/ML API ($5K hackathon prize partner). Unified gateway to 100+
 *                          models incl. GPT-5/5.1, Claude Opus, Gemini, Mistral, Llama.
 *                          OpenAI-compatible at https://api.aimlapi.com/v1.
 *
 * Both support tool-calling. We use OpenAI SDK as the client since it
 * works against any OpenAI-compatible endpoint.
 */
import OpenAI from "openai";
export type LLMProvider = "groq" | "ollama" | "aimlapi" | "bedrock";
interface LLMConfig {
    provider: LLMProvider;
    baseURL: string;
    apiKey: string;
    model: string;
}
/**
 * Read provider config from environment variables.
 * Falls back to ollama if LLM_PROVIDER is unset or invalid.
 */
export declare function getLLMConfig(): LLMConfig;
export declare function getLLMClient(): {
    client: OpenAI;
    config: LLMConfig;
};
/**
 * Convenience wrapper for the common pattern: call the LLM with a system
 * prompt, a user message, and (optionally) tools. Returns the assistant
 * message — including any tool_calls — so the caller can decide what to do.
 *
 * Designed to be retry-friendly: throws on transport errors so the caller
 * can implement their own backoff.
 */
export declare function chat(opts: {
    system: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    tools?: OpenAI.Chat.ChatCompletionTool[];
    tool_choice?: OpenAI.Chat.ChatCompletionToolChoiceOption;
    temperature?: number;
    max_tokens?: number;
    response_format?: {
        type: "json_object";
    } | {
        type: "text";
    };
}): Promise<OpenAI.Chat.ChatCompletionMessage>;
/**
 * Helper: ask the LLM for a JSON response, with one retry if it returns
 * malformed JSON. Both Groq's Llama 3.3 70B and Qwen3 32B are decent at
 * JSON mode but neither is perfect, so we parse and retry once.
 */
export declare function chatJSON<T>(opts: {
    system: string;
    user: string;
    schema_description?: string;
    temperature?: number;
    max_tokens?: number;
}): Promise<T>;
/**
 * Streaming version of chat() for SSE endpoints.
 *
 * Yields content deltas as the LLM produces them. The OpenAI SDK's
 * stream:true mode returns an async iterable of chunks; we forward
 * each chunk's delta.content. Tool-calls and finish_reason are not
 * exposed here — only text deltas — to keep the API surface tight
 * for the use case (Lex.NY's /api/ask/stream).
 *
 * Usage:
 *   for await (const delta of chatStream({ system, messages, ... })) {
 *     res.write(`data: ${JSON.stringify({ delta })}\n\n`);
 *   }
 */
export declare function chatStream(opts: {
    system: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    temperature?: number;
    max_tokens?: number;
}): AsyncGenerator<string, void, unknown>;
/**
 * One entry per LLM completion (or streamed completion). Recorded by
 * chat() and chatStream() with disk persistence so the /api/llm-stats
 * counters survive dev server restarts.
 */
export interface LlmUsageEntry {
    timestamp: string;
    provider: LLMProvider;
    model: string;
    /** "chat" = non-streaming, "stream" = SSE. */
    mode: "chat" | "stream";
    status: "success" | "error";
    duration_ms: number;
    /** Tokens out of the completion; only available in non-streaming mode. */
    completion_tokens?: number;
    /** Tokens in the prompt; only available in non-streaming mode. */
    prompt_tokens?: number;
    /** Total tokens; non-streaming mode only. */
    total_tokens?: number;
    /** Error message if status === "error". */
    error?: string;
}
declare class LlmUsageTracker {
    private entries;
    private maxEntries;
    private storeName;
    constructor();
    record(entry: LlmUsageEntry): void;
    getAll(): LlmUsageEntry[];
    getStats(): {
        total_requests: number;
        successful: number;
        failed: number;
        by_mode: Record<string, number>;
        by_provider: Record<string, number>;
        total_prompt_tokens: number;
        total_completion_tokens: number;
        total_tokens: number;
        avg_duration_ms: number;
        first_request_at: string;
        last_request_at: string;
    };
}
export declare const llmUsage: LlmUsageTracker;
export {};
//# sourceMappingURL=llm.d.ts.map