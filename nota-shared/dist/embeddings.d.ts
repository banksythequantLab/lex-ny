/**
 * Embeddings for Lex.NY - 100% local via Ollama.
 *
 * Default model: mxbai-embed-large (1024 dims).
 *   - Open weights, MIT license, runs on Johnson's RTX 3090
 *   - Strong on English retrieval benchmarks (MTEB top-tier among small models)
 *   - 1024 dims = same as Voyage law-2, common pgvector size
 *   - Returns L2-normalized vectors -> cosine similarity is dot product
 *
 * Endpoint: POST {OLLAMA_EMBED_URL}/api/embed
 *   Body: { "model": "...", "input": "single string" | ["batch", "of", "strings"] }
 *   Resp: { "model": "...", "embeddings": [[...], [...]] }
 *
 * Cost: $0. No outside API keys. Everything stays on Johnson.
 *
 * If you ever need to swap models, change OLLAMA_EMBED_MODEL env var AND
 * change EMBEDDING_DIMS to match - then update the Postgres vector(N) column.
 */
export interface EmbedOptions {
    model?: string;
    /** Override Ollama base URL (no trailing slash). */
    url?: string;
}
/**
 * Embed a single string. Returns one 1024-dim vector.
 * Use for the live query-embedding step in /api/ask.
 */
export declare function embed(text: string, opts?: EmbedOptions): Promise<number[]>;
/**
 * Embed an array of strings. Auto-chunks large batches into MAX_BATCH-sized
 * sub-batches so we never OOM the GPU.
 */
export declare function embedBatch(texts: string[], opts?: EmbedOptions): Promise<number[][]>;
/**
 * Chunk a long document for embedding.
 * Character-based with overlap, snaps to sentence boundaries when possible.
 */
export declare function chunkForEmbedding(text: string, opts?: {
    chunkChars?: number;
    overlap?: number;
}): Array<{
    chunkIndex: number;
    text: string;
}>;
/**
 * Health check. Verifies the Ollama endpoint is reachable and the embedding
 * model is loadable. Call this at app startup to fail fast.
 */
export declare function embedHealthCheck(opts?: EmbedOptions): Promise<{
    ok: boolean;
    url: string;
    model: string;
    dims?: number;
    latencyMs?: number;
    error?: string;
}>;
/** Exposed so callers (schema, etc.) can reference the canonical dim count */
export declare const EMBEDDING_DIMS = 1024;
export declare const EMBEDDING_MODEL: string;
export declare const EMBEDDING_URL: string;
//# sourceMappingURL=embeddings.d.ts.map