/**
 * Neo4j-backed citation graph for Lex.NY. See neo4j-client.ts for design rationale.
 */
export { 
// Lifecycle
getDriver, closeDriver, isNeo4jConfigured, bootstrapSchema, healthCheck as neo4jHealthCheck, 
// Sync
syncOpinions, syncStatutes, syncOpinionCitations, syncOpinionApplies, 
// Retrieval
expandViaGraph, 
// Stats
getGraphStats, } from "./neo4j-client.js";
//# sourceMappingURL=index.js.map