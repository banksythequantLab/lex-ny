/**
 * Native Bedrock Converse API for Claude.
 *
 * Bedrock's OpenAI-compatible /openai/v1 endpoint only serves the openai.gpt-oss
 * models; Claude is served by the native Converse API, used here. Auth is SigV4
 * via the default AWS credential chain (AWS_ACCESS_KEY_ID/SECRET/REGION). Used
 * when LLM_PROVIDER=bedrock.
 */
import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand, } from "@aws-sdk/client-bedrock-runtime";
let client = null;
function getClient() {
    if (!client) {
        client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
        });
    }
    return client;
}
function toConverseMessages(messages) {
    const out = [];
    for (const m of messages) {
        if (m.role !== "user" && m.role !== "assistant")
            continue;
        const text = typeof m.content === "string" ? m.content : "";
        if (!text)
            continue;
        out.push({ role: m.role, content: [{ text }] });
    }
    return out;
}
export async function bedrockChat(opts) {
    const resp = await getClient().send(new ConverseCommand({
        modelId: opts.model,
        system: opts.system ? [{ text: opts.system }] : undefined,
        messages: toConverseMessages(opts.messages),
        inferenceConfig: { temperature: opts.temperature, maxTokens: opts.max_tokens },
    }));
    const blocks = (resp.output?.message?.content ?? []);
    return blocks.map((b) => b.text ?? "").join("");
}
export async function* bedrockChatStream(opts) {
    const resp = await getClient().send(new ConverseStreamCommand({
        modelId: opts.model,
        system: opts.system ? [{ text: opts.system }] : undefined,
        messages: toConverseMessages(opts.messages),
        inferenceConfig: { temperature: opts.temperature, maxTokens: opts.max_tokens },
    }));
    for await (const ev of resp.stream ?? []) {
        const text = ev.contentBlockDelta?.delta?.text;
        if (text)
            yield text;
    }
}
//# sourceMappingURL=bedrock-converse.js.map