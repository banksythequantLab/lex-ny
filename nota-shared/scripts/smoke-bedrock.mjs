/** Verify Claude responds via native Bedrock Converse. AWS creds from env. */
const { bedrockChat } = await import("../dist/bedrock-converse.js");
const t = Date.now();
const out = await bedrockChat({
  system: "You are a concise NY legal research assistant.",
  messages: [{ role: "user", content: "In one sentence, what is the standard for summary judgment under CPLR 3212?" }],
  temperature: 0.2,
  max_tokens: 200,
  model: process.env.BEDROCK_MODEL || "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
});
console.log(`CLAUDE (${Date.now() - t}ms):`, out);
process.exit(0);
