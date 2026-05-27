/**
 * Algolia federated search for Lex.NY. See algolia-client.ts for design rationale.
 */
export {
  isAlgoliaConfigured,
  getAlgoliaAdminClient,
  getAlgoliaSearchClient,
  bootstrapIndex,
  indexStatutes,
  clearIndex,
  searchStatutes,
  getAlgoliaStats,
  algoliaHealthCheck,
  type AlgoliaConfig,
  type StatuteRecord as AlgoliaStatuteRecord,
  type AlgoliaSearchHit,
  type AlgoliaSearchResult,
  type AlgoliaStats,
} from "./algolia-client.js";
