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
import { loadFromDisk, appendToDisk } from "./usage-store.js";
import { bedrockChat, bedrockChatStream } from "./bedrock-converse.js";
/**
 * Read provider config from environment variables.
 * Falls back to ollama if LLM_PROVIDER is unset or invalid.
 */
export function getLLMConfig() {
    const provider = (process.env.LLM_PROVIDER || "ollama");
    if (provider === "groq") {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY environment variable is required when LLM_PROVIDER=groq. " +
                "Get a key at https://console.groq.com/keys");
        }
        return {
            provider: "groq",
            baseURL: "https://api.groq.com/openai/v1",
            apiKey,
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        };
    }
    if (provider === "aimlapi") {
        const apiKey = process.env.AIMLAPI_KEY;
        if (!apiKey) {
            throw new Error("AIMLAPI_KEY environment variable is required when LLM_PROVIDER=aimlapi. " +
                "Sign up at https://aimlapi.com — $5K hackathon prize for best use.");
        }
        return {
            provider: "aimlapi",
            baseURL: "https://api.aimlapi.com/v1",
            apiKey,
            // Default to a strong general-purpose model. Override with AIMLAPI_MODEL.
            // Catalog: https://docs.aimlapi.com/api-references/service-endpoints/complete-model-list
            model: process.env.AIMLAPI_MODEL || "openai/gpt-5-chat-latest",
        };
    }
    if (provider === "bedrock") {
        // Native Bedrock Converse API for Claude (the OpenAI-compatible /openai/v1
        // endpoint only serves openai.gpt-oss). Auth is SigV4 via the AWS credential
        // chain; baseURL/apiKey below are unused for this provider.
        return {
            provider: "bedrock",
            baseURL: "",
            apiKey: "bedrock",
            model: process.env.BEDROCK_MODEL || "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        };
    }
    // Ollama default — local Johnson box
    return {
        provider: "ollama",
        baseURL: process.env.OLLAMA_BASE_URL || "http://192.168.1.161:11434/v1",
        apiKey: "ollama", // Ollama ignores this but OpenAI SDK requires a non-empty string
        model: process.env.OLLAMA_MODEL || "qwen3:32b",
    };
}
/**
 * Get a configured OpenAI SDK client pointed at the right provider.
 * Caches the client per-config to avoid repeatedly constructing it.
 */
let cachedClient = null;
export function getLLMClient() {
    const config = getLLMConfig();
    if (cachedClient && cachedClient.config.provider === config.provider) {
        return { client: cachedClient.client, config: cachedClient.config };
    }
    const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        // Groq rate-limits aggressively; raise default timeout
        timeout: 90_000,
    });
    cachedClient = { config, client };
    return { client, config };
}
/**
 * Convenience wrapper for the common pattern: call the LLM with a system
 * prompt, a user message, and (optionally) tools. Returns the assistant
 * message — including any tool_calls — so the caller can decide what to do.
 *
 * Designed to be retry-friendly: throws on transport errors so the caller
 * can implement their own backoff.
 */
export async function chat(opts) {
    const config = getLLMConfig();
    const started = Date.now();
    if (config.provider === "bedrock") {
        try {
            const content = await bedrockChat({
                system: opts.system,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.2,
                max_tokens: opts.max_tokens ?? 1500,
                model: config.model,
            });
            llmUsage.record({
                timestamp: new Date().toISOString(), provider: config.provider, model: config.model,
                mode: "chat", status: "success", duration_ms: Date.now() - started,
            });
            return { role: "assistant", content, refusal: null };
        }
        catch (e) {
            llmUsage.record({
                timestamp: new Date().toISOString(), provider: config.provider, model: config.model,
                mode: "chat", status: "error", duration_ms: Date.now() - started, error: e.message,
            });
            throw e;
        }
    }
    const { client } = getLLMClient();
    try {
        const completion = await client.chat.completions.create({
            model: config.model,
            messages: [
                { role: "system", content: opts.system },
                ...opts.messages,
            ],
            tools: opts.tools,
            tool_choice: opts.tool_choice,
            temperature: opts.temperature ?? 0.2,
            max_tokens: opts.max_tokens ?? 1500,
            response_format: opts.response_format,
        });
        const message = completion.choices[0]?.message;
        if (!message) {
            llmUsage.record({
                timestamp: new Date().toISOString(),
                provider: config.provider,
                model: config.model,
                mode: "chat",
                status: "error",
                duration_ms: Date.now() - started,
                error: "LLM returned no message",
            });
            throw new Error("LLM returned no message");
        }
        llmUsage.record({
            timestamp: new Date().toISOString(),
            provider: config.provider,
            model: config.model,
            mode: "chat",
            status: "success",
            duration_ms: Date.now() - started,
            prompt_tokens: completion.usage?.prompt_tokens,
            completion_tokens: completion.usage?.completion_tokens,
            total_tokens: completion.usage?.total_tokens,
        });
        return message;
    }
    catch (e) {
        llmUsage.record({
            timestamp: new Date().toISOString(),
            provider: config.provider,
            model: config.model,
            mode: "chat",
            status: "error",
            duration_ms: Date.now() - started,
            error: e.message,
        });
        throw e;
    }
}
/**
 * Helper: ask the LLM for a JSON response, with one retry if it returns
 * malformed JSON. Both Groq's Llama 3.3 70B and Qwen3 32B are decent at
 * JSON mode but neither is perfect, so we parse and retry once.
 */
export async function chatJSON(opts) {
    const systemWithJSON = opts.system + (opts.schema_description ?
        `\n\nYou must respond with valid JSON matching this schema:\n${opts.schema_description}` :
        "\n\nYou must respond with valid JSON only. No prose, no markdown fences, just JSON.");
    // First attempt
    let message = await chat({
        system: systemWithJSON,
        messages: [{ role: "user", content: opts.user }],
        temperature: opts.temperature,
        max_tokens: opts.max_tokens,
        response_format: { type: "json_object" },
    });
    try {
        return JSON.parse(message.content || "{}");
    }
    catch (firstError) {
        // Retry with explicit correction
        message = await chat({
            system: systemWithJSON,
            messages: [
                { role: "user", content: opts.user },
                { role: "assistant", content: message.content || "" },
                { role: "user", content: "Your previous response was not valid JSON. Respond again with valid JSON only." },
            ],
            temperature: 0,
            max_tokens: opts.max_tokens,
            response_format: { type: "json_object" },
        });
        try {
            return JSON.parse(message.content || "{}");
        }
        catch (secondError) {
            throw new Error(`LLM failed to produce valid JSON after retry. Last response: ${message.content?.slice(0, 200)}`);
        }
    }
}
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
export async function* chatStream(opts) {
    const config = getLLMConfig();
    const started = Date.now();
    let charsOut = 0;
    if (config.provider === "bedrock") {
        try {
            for await (const delta of bedrockChatStream({
                system: opts.system,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.2,
                max_tokens: opts.max_tokens ?? 1500,
                model: config.model,
            })) {
                charsOut += delta.length;
                yield delta;
            }
            llmUsage.record({
                timestamp: new Date().toISOString(), provider: config.provider, model: config.model,
                mode: "stream", status: "success", duration_ms: Date.now() - started,
                completion_tokens: Math.round(charsOut / 4),
            });
        }
        catch (e) {
            llmUsage.record({
                timestamp: new Date().toISOString(), provider: config.provider, model: config.model,
                mode: "stream", status: "error", duration_ms: Date.now() - started, error: e.message,
            });
            throw e;
        }
        return;
    }
    const { client } = getLLMClient();
    try {
        const stream = await client.chat.completions.create({
            model: config.model,
            messages: [
                { role: "system", content: opts.system },
                ...opts.messages,
            ],
            temperature: opts.temperature ?? 0.2,
            max_tokens: opts.max_tokens ?? 1500,
            stream: true,
        });
        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
                charsOut += delta.length;
                yield delta;
            }
        }
        llmUsage.record({
            timestamp: new Date().toISOString(),
            provider: config.provider,
            model: config.model,
            mode: "stream",
            status: "success",
            duration_ms: Date.now() - started,
            // Streaming doesn't return token counts in the chunks; approximate
            // completion_tokens from output chars (1 token ~= 4 chars for English).
            completion_tokens: Math.round(charsOut / 4),
        });
    }
    catch (e) {
        llmUsage.record({
            timestamp: new Date().toISOString(),
            provider: config.provider,
            model: config.model,
            mode: "stream",
            status: "error",
            duration_ms: Date.now() - started,
            error: e.message,
        });
        throw e;
    }
}
class LlmUsageTracker {
    entries = [];
    maxEntries = 500;
    storeName = "llm";
    constructor() {
        try {
            this.entries = loadFromDisk(this.storeName, this.maxEntries);
        }
        catch (e) {
            console.warn("[llm] usage tracker disk load failed:", e.message);
        }
    }
    record(entry) {
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
        try {
            appendToDisk(this.storeName, entry);
        }
        catch {
            // Best-effort persistence
        }
    }
    getAll() {
        return [...this.entries];
    }
    getStats() {
        const total = this.entries.length;
        const success = this.entries.filter((e) => e.status === "success").length;
        const byMode = this.entries.reduce((acc, e) => {
            acc[e.mode] = (acc[e.mode] || 0) + 1;
            return acc;
        }, {});
        const byProvider = this.entries.reduce((acc, e) => {
            acc[e.provider] = (acc[e.provider] || 0) + 1;
            return acc;
        }, {});
        const totalCompletionTokens = this.entries.reduce((s, e) => s + (e.completion_tokens || 0), 0);
        const totalPromptTokens = this.entries.reduce((s, e) => s + (e.prompt_tokens || 0), 0);
        const avgDuration = total > 0
            ? Math.round(this.entries.reduce((s, e) => s + e.duration_ms, 0) / total)
            : 0;
        return {
            total_requests: total,
            successful: success,
            failed: total - success,
            by_mode: byMode,
            by_provider: byProvider,
            total_prompt_tokens: totalPromptTokens,
            total_completion_tokens: totalCompletionTokens,
            total_tokens: totalPromptTokens + totalCompletionTokens,
            avg_duration_ms: avgDuration,
            first_request_at: this.entries[0]?.timestamp,
            last_request_at: this.entries[this.entries.length - 1]?.timestamp,
        };
    }
}
export const llmUsage = new LlmUsageTracker();
//# sourceMappingURL=llm.js.map