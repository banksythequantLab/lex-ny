/**
 * Public API surface for @nota-lawyer/shared.
 *
 * Both nota-trademark and nota-copyright consume this package. Import from
 * the root (`@nota-lawyer/shared`) for everything, or from the named
 * subpaths (`@nota-lawyer/shared/auth` etc.) when you only want one module.
 */

// Types — Zod schemas + inferred TS types + fee constants
export {
  // User
  UserRoleSchema,
  UserSchema,
  type UserRole,
  type User,

  // Filing
  FilingKindSchema,
  FilingStatusSchema,
  FilingTierSchema,
  FilingSchema,
  type FilingKind,
  type FilingStatus,
  type FilingTier,
  type Filing,

  // Per-kind wizard data
  TrademarkWizardSchema,
  VisualArtWizardSchema,
  PhotographsWizardSchema,
  LiteraryWizardSchema,
  type TrademarkWizardData,
  type VisualArtWizardData,
  type PhotographsWizardData,
  type LiteraryWizardData,

  // Conflict report
  ConflictRiskLevelSchema,
  ConflictMatchSchema,
  ConflictReportSchema,
  type ConflictRiskLevel,
  type ConflictMatch,
  type ConflictReport,

  // Payment
  PaymentKindSchema,
  PaymentSchema,
  type PaymentKind,
  type Payment,

  // Review
  ReviewSchema,
  type Review,

  // Constants
  GOV_FEES,
  SERVICE_FEES,
  COMMON_USPTO_CLASSES,
} from "./types.js";

// Auth
export {
  getBrowserClient,
  getServiceClient,
  sendMagicLink,
  getCurrentUser,
  isStaff,
} from "./auth.js";

// Stripe
export {
  getStripe,
  createCounselCheckoutSession,
  createSwagCheckoutSession,
  verifyWebhookSignature,
  extractSessionMetadata,
} from "./stripe.js";

// LLM
export {
  getLLMConfig,
  getLLMClient,
  chat,
  chatJSON,
  chatStream,
  type LLMProvider,
  llmUsage,
  type LlmUsageEntry,
} from "./llm.js";

// Web data client — Bright Data Web Unlocker + SERP integration.
// All BD usage is tracked in brightDataUsage for /api/bright-data-stats.
export {
  getWebDataClient,
  BrightDataClient,
  brightDataUsage,
  parseGoogleHtmlResults,
  type WebDataClient,
  type SerpResult,
} from "./bright-data.js";

// Conflict Search Agent - the Bright Data hackathon centerpiece
export {
  runConflictSearch,
  type RunConflictSearchOpts,
} from "./conflict-agent.js";

// ============================================================
//  Lex.NY - NY law research engine
// ============================================================

// Scrapers (case law + statutes ingestion)
export {
  CourtListenerClient,
  NySenateClient,
  NycAmLegalScraper,
  JustiaNyScraper,
  liveSerpLegalSearch,
  type CLOpinion,
  type CLCluster,
  type CLDocket,
  type CLPerson,
  type OpenLegLawInfo,
  type OpenLegLawDoc,
  type OpenLegLawTree,
  type AmLegalNode,
  type JustiaCase,
  type JustiaCaseListing,
  type LiveLegalSource,
} from "./scrapers/index.js";

// Embeddings
export {
  embed,
  embedBatch,
  chunkForEmbedding,
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
} from "./embeddings.js";

// Retrieval + RAG answer generation
export {
  retrieve,
  answer,
  answerStream,
  type OpinionHit,
  type StatuteHit,
  type RetrievalResult,
  type LexAnswer,
  type AnswerCitation,
  type AnswerOpts,
  type StreamEvent,
  // Judge + citation-graph analytics (Aurora-native; replaces Neo4j cited-by)
  mostCitedDecisions,
  judgeInfluenceRanking,
  searchJudges,
  judgeProfile,
  citedBy,
  type CitedDecision,
  type JudgeInfluence,
  type JudgeProfile,
  type CitedByResult,
  getOpinion,
  type OpinionDetail,
  // Brief citation-checker (verify every cite against the corpus)
  checkBrief,
  type CiteCheck,
  type BriefCheckResult,
} from "./lex/index.js";

// ============================================================
//  Neo4j citation graph (HackerNoon Proof of Usefulness sponsor)
// ============================================================
export {
  getDriver as getNeo4jDriver,
  closeDriver as closeNeo4jDriver,
  isNeo4jConfigured,
  bootstrapSchema as bootstrapNeo4jSchema,
  neo4jHealthCheck,
  syncOpinions as neo4jSyncOpinions,
  syncStatutes as neo4jSyncStatutes,
  syncOpinionCitations as neo4jSyncOpinionCitations,
  syncOpinionApplies as neo4jSyncOpinionApplies,
  expandViaGraph,
  getGraphStats,
  type Neo4jConfig,
  type OpinionSyncRow as Neo4jOpinionSyncRow,
  type StatuteSyncRow as Neo4jStatuteSyncRow,
  type CitationSyncRow as Neo4jCitationSyncRow,
  type GraphExpansionResult,
  type Neo4jStats,
} from "./graph/index.js";

// ============================================================
//  Algolia federated search (HackerNoon Proof of Usefulness sponsor)
// ============================================================
export {
  isAlgoliaConfigured,
  getAlgoliaAdminClient,
  getAlgoliaSearchClient,
  bootstrapIndex as algoliaBootstrapIndex,
  indexStatutes as algoliaIndexStatutes,
  clearIndex as algoliaClearIndex,
  searchStatutes as algoliaSearchStatutes,
  getAlgoliaStats,
  algoliaHealthCheck,
  type AlgoliaConfig,
  type AlgoliaStatuteRecord,
  type AlgoliaSearchHit,
  type AlgoliaSearchResult,
  type AlgoliaStats,
} from "./search/index.js";

// ============================================================
//  AI/ML API multi-model consensus (Bright Data UNLOCKED partner —  prize)
// ============================================================
export {
  consensusDraft,
  extractMarkers as extractCitationMarkers,
  isConsensusConfigured,
  aimlapiHealthCheck,
  type ConsensusOpts,
  type ConsensusDraft,
  type ConsensusResult,
} from "./llm-consensus.js";

// ============================================================
//  Cognee agent memory (Bright Data UNLOCKED partner — $2,400 + $500 prize)
// ============================================================
export {
  isCogneeConfigured,
  cogneeRemember,
  cogneeRecall,
  cogneeHealthCheck,
  getCogneeStats,
  type CogneeConfig,
  type CogneeMemoryEntry,
  type CogneeRecallHit,
  type CogneeStats,
} from "./memory/index.js";

// ============================================================
//  Speechmatics voice (STUB — Bright Data UNLOCKED partner, first 100 get $200 credits)
// ============================================================
export {
  isSpeechmaticsConfigured,
  getSpeechmaticsConfig,
  issueTemporaryRTKey,
  getSpeechmaticsStats,
  speechmaticsHealthCheck,
  type SpeechmaticsConfig,
  type SpeechmaticsStats,
} from "./voice/index.js";

// ============================================================
//  Triggerware workflow actions (STUB — Bright Data UNLOCKED partner)
// ============================================================
export {
  isTriggerwareConfigured,
  triggerwareQuery,
  triggerwareCreate,
  triggerwareListTriggers,
  triggerwarePoll,
  triggerwareDelete,
  triggerwareCatalog,
  triggerwareInstalled,
  triggerwareInstallConnector,
  getTriggerwareStats,
  triggerwareHealthCheck,
  type TWQueryResult,
  type TWTrigger,
  type TWPollResult,
  type TWConnector,
  type TriggerwareStats,
  type TriggerwareConfig,
} from "./actions/index.js";

// ============================================================
//  Rate limiting (in-memory token bucket, single-node)
// ============================================================
export {
  rateLimit,
  clientIp,
  rateLimitResponse,
  type RateLimitOptions,
  type RateLimitResult,
} from "./rate-limit.js";
