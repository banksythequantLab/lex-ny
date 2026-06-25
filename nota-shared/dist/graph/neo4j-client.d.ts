/**
 * Neo4j integration for Lex.NY - citation graph layer.
 *
 * Why a graph DB on top of Postgres+pgvector?
 *   Legal research is inherently relational:
 *     - Cases CITE other cases (precedential chains)
 *     - Cases APPLY statutes (which sections were used)
 *     - Statutes REFERENCE other statutes (cross-references)
 *     - Statutes live UNDER a Law (e.g. PEN 400.00 is under Penal Law)
 *
 *   Pure vector retrieval can miss controlling precedent that doesn't
 *   share semantic vocabulary with the query. The graph adds a second
 *   retrieval signal: "what does this case cite, and what cites this case?"
 *
 * Hackathon angle:
 *   - Neo4j is a Proof of Usefulness sponsor (HackerNoon prize)
 *   - Hits these PoU tags: #knowledge-graph, #graphrag, #graph-powered-agents
 *   - Standard Neo4j AuraDB Free tier is enough for the demo corpus
 *
 * Deployment:
 *   - Local: docker run -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/<your-password> neo4j:latest
 *   - Production: AuraDB Free tier (neo4j+s://<id>.databases.neo4j.io)
 *
 *   Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env.local.
 *   If not set, all Neo4j-backed features degrade gracefully (no crash,
 *   just no graph augmentation).
 */
import { Driver } from "neo4j-driver";
export interface Neo4jConfig {
    uri: string;
    user: string;
    password: string;
    database?: string;
}
export declare function isNeo4jConfigured(): boolean;
export declare function getDriver(): Driver;
export declare function closeDriver(): Promise<void>;
/**
 * Idempotent schema bootstrap. Creates uniqueness constraints on the
 * stable identifiers we'll use as MERGE keys.
 */
export declare function bootstrapSchema(): Promise<{
    constraints_created: string[];
    indexes_created: string[];
}>;
export interface OpinionSyncRow {
    id: string;
    cl_id: string;
    case_name: string;
    citation: string | null;
    court_id: string;
    decision_date: string | null;
}
export interface StatuteSyncRow {
    id: string;
    law_id: string;
    law_name: string;
    location_id: string;
    doc_type: string;
    title: string | null;
}
export interface CitationSyncRow {
    /** citing opinion's CourtListener id */
    citing_cl_id: string;
    /** cited opinion's CourtListener id */
    cited_cl_id: string;
}
/**
 * Sync a batch of opinions into Neo4j. Idempotent (MERGE on cl_id).
 */
export declare function syncOpinions(rows: OpinionSyncRow[]): Promise<number>;
/**
 * Sync a batch of statutes into Neo4j. Creates (:Statute)-[:UNDER]->(:Law).
 */
export declare function syncStatutes(rows: StatuteSyncRow[]): Promise<number>;
/**
 * Bulk insert opinion-to-opinion citations: (:Opinion)-[:CITES]->(:Opinion).
 * Both endpoints must already exist in the graph (synced via syncOpinions).
 */
export declare function syncOpinionCitations(rows: CitationSyncRow[]): Promise<number>;
/**
 * For opinions that mention a statute citation in their text, create
 * (:Opinion)-[:APPLIES]->(:Statute). Caller extracts (cl_id, citation_key)
 * pairs from opinion text via regex (e.g. "GBS § 349", "Penal Law § 400.00").
 */
export declare function syncOpinionApplies(rows: Array<{
    cl_id: string;
    citation_key: string;
}>): Promise<number>;
export interface GraphExpansionResult {
    /** Opinions that cite one of the seed opinions */
    citing_opinions: Array<{
        cl_id: string;
        case_name: string;
        depth: number;
    }>;
    /** Opinions cited by one of the seed opinions */
    cited_opinions: Array<{
        cl_id: string;
        case_name: string;
        depth: number;
    }>;
    /** Other statutes that share an applying opinion with seed statutes */
    related_statutes: Array<{
        citation_key: string;
        title: string;
        co_citations: number;
    }>;
}
/**
 * Given a seed set of opinion CourtListener IDs and statute citation_keys
 * (typically from pgvector ANN), expand outward through the citation
 * graph to surface related authorities the vector search may have missed.
 *
 * This is what makes GraphRAG > pure vector RAG for legal research.
 */
export declare function expandViaGraph(opts: {
    seedOpinionClIds: string[];
    seedStatuteCitationKeys: string[];
    maxDepth?: number;
    perBucketLimit?: number;
}): Promise<GraphExpansionResult>;
export interface Neo4jStats {
    configured: boolean;
    node_counts: Record<string, number>;
    relationship_counts: Record<string, number>;
    top_cited_opinions: Array<{
        cl_id: string;
        case_name: string;
        cited_by_count: number;
    }>;
    top_applied_statutes: Array<{
        citation_key: string;
        title: string;
        applied_by_count: number;
    }>;
    total_nodes: number;
    total_relationships: number;
}
export declare function getGraphStats(): Promise<Neo4jStats>;
/**
 * Health check — for the demo and CI.
 */
export declare function healthCheck(): Promise<{
    ok: boolean;
    details: string;
}>;
//# sourceMappingURL=neo4j-client.d.ts.map