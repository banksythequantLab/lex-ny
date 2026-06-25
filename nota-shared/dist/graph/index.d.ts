/**
 * Neo4j-backed citation graph for Lex.NY. See neo4j-client.ts for design rationale.
 */
export { getDriver, closeDriver, isNeo4jConfigured, bootstrapSchema, healthCheck as neo4jHealthCheck, syncOpinions, syncStatutes, syncOpinionCitations, syncOpinionApplies, expandViaGraph, getGraphStats, type Neo4jConfig, type OpinionSyncRow, type StatuteSyncRow, type CitationSyncRow, type GraphExpansionResult, type Neo4jStats, } from "./neo4j-client.js";
//# sourceMappingURL=index.d.ts.map