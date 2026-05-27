/**
 * Cognee agent memory for Lex.NY. See cognee-client.ts for design rationale.
 */
export {
  isCogneeConfigured,
  remember as cogneeRemember,
  recall as cogneeRecall,
  cogneeHealthCheck,
  getCogneeStats,
  type CogneeConfig,
  type CogneeMemoryEntry,
  type CogneeRecallHit,
  type CogneeStats,
} from "./cognee-client.js";
