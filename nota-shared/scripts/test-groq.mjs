/**
 * Live test of Groq with the actual key. Calls chat.completions endpoint
 * using the openai-compatible SDK (same client we use in llm.ts).
 */
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

console.log("Asking Llama 3.3 70B a real Lex.NY-style question...");
const t0 = Date.now();
const resp = await client.chat.completions.create({
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.1,
  max_tokens: 220,
  messages: [
    {
      role: "system",
      content:
        "You are Lex.NY, a New York legal research assistant. Never invent citations. " +
        "If asked something you cannot cite, say so plainly.",
    },
    {
      role: "user",
      content:
        "In one short paragraph, name two well-established elements of common-law fraud under New York law. " +
        "Do not cite specific cases — just state the elements.",
    },
  ],
});
const duration = Date.now() - t0;

console.log("\n=== RESPONSE ===");
console.log(resp.choices[0].message.content);
console.log("\n=== METADATA ===");
console.log("  duration:    " + duration + " ms");
console.log("  model used:  " + resp.model);
console.log("  prompt tok:  " + resp.usage?.prompt_tokens);
console.log("  comp tok:    " + resp.usage?.completion_tokens);
if (duration > 0 && resp.usage?.completion_tokens) {
  const tps = Math.round(resp.usage.completion_tokens / (duration / 1000));
  console.log("  throughput:  ~" + tps + " tok/s");
}
console.log("  finish:      " + resp.choices[0].finish_reason);
