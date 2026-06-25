/**
 * Native Bedrock Converse API for Claude.
 *
 * Bedrock's OpenAI-compatible /openai/v1 endpoint only serves the openai.gpt-oss
 * models; Claude is served by the native Converse API, used here. Auth is SigV4
 * via the default AWS credential chain (AWS_ACCESS_KEY_ID/SECRET/REGION). Used
 * when LLM_PROVIDER=bedrock.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type OpenAI from "openai";

let client: BedrockRuntimeClient | null = null;
function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    });
  }
  return client;
}

type Msg = OpenAI.Chat.ChatCompletionMessageParam;

function toConverseMessages(messages: Msg[]) {
  const out: { role: "user" | "assistant"; content: { text: string }[] }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = typeof m.content === "string" ? m.content : "";
    if (!text) continue;
    out.push({ role: m.role, content: [{ text }] });
  }
  return out;
}

export async function bedrockChat(opts: {
  system: string; messages: Msg[]; temperature: number; max_tokens: number; model: string;
}): Promise<string> {
  const resp = await getClient().send(
    new ConverseCommand({
      modelId: opts.model,
      system: opts.system ? [{ text: opts.system }] : undefined,
      messages: toConverseMessages(opts.messages),
      inferenceConfig: { temperature: opts.temperature, maxTokens: opts.max_tokens },
    })
  );
  const blocks: any[] = (resp.output?.message?.content ?? []) as any[];
  return blocks.map((b) => b.text ?? "").join("");
}

export async function* bedrockChatStream(opts: {
  system: string; messages: Msg[]; temperature: number; max_tokens: number; model: string;
}): AsyncGenerator<string, void, unknown> {
  const resp = await getClient().send(
    new ConverseStreamCommand({
      modelId: opts.model,
      system: opts.system ? [{ text: opts.system }] : undefined,
      messages: toConverseMessages(opts.messages),
      inferenceConfig: { temperature: opts.temperature, maxTokens: opts.max_tokens },
    })
  );
  for await (const ev of resp.stream ?? []) {
    const text = (ev as any).contentBlockDelta?.delta?.text;
    if (text) yield text as string;
  }
}
