/**
 * Lex.NY retrieval - hybrid semantic + keyword search.
 *
 * Architecture (local Postgres):
 *   1. Embed the query via Ollama (~150ms)
 *   2. Use pg.Pool to run pgvector ANN against the indexed embeddings table
 *   3. Hydrate full statute/opinion rows via the same pg.Pool
 *   4. Score keywords client-side and blend
 *
 * No more supabase-js for retrieval - direct Postgres only.
 */
export interface OpinionHit {
    opinion_id: string;
    cl_id: string | null;
    case_name: string;
    citation: string | null;
    court_id: string;
    decision_date: string;
    ai_summary: string | null;
    ai_holding: string | null;
    vector_score: number;
    keyword_score: number;
    combined_score: number;
}
export interface StatuteHit {
    statute_id: string;
    law_id: string;
    law_name: string;
    location_id: string;
    doc_type: string;
    title: string;
    text: string;
    jurisdiction: string;
    vector_score: number;
    keyword_score: number;
    combined_score: number;
}
export interface RetrievalResult {
    opinions: OpinionHit[];
    statutes: StatuteHit[];
    queryEmbedding: number[];
    durationMs: number;
}
export declare function retrieve(question: string, opts?: {
    limit?: number;
}): Promise<RetrievalResult>;
//# sourceMappingURL=retrieve.d.ts.map