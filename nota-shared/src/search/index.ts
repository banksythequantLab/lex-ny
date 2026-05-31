/**
 * Federated search for Lex.NY.
 *
 * Postgres FTS replaced Algolia in the self-hosted era. The exports are
 * a drop-in shape match, so callers (route.ts, stats route, etc.) don't
 * need to change — only the import path's underlying module did.
 *
 * See pg-fts-client.ts for the implementation and design rationale.
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
} from "./pg-fts-client.js";
