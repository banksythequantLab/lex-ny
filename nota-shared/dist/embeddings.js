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
const DEFAULT_URL = process.env.OLLAMA_EMBED_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_EMBED_MODEL || "mxbai-embed-large";
const DEFAULT_DIMS = 1024;
// Chunking params - characters, not tokens. Legal text averages ~4 chars/token,
// so 6000 chars ~= 1500 tokens, comfortably under any embedding model's context.
const CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 200;
// Ollama's /api/embed accepts large batches in one request, but bigger batches
// hold VRAM longer and can OOM the GPU if other models are also loaded. 64 is a
// safe default that keeps each batch under ~400KB of input text.
const MAX_BATCH = 64;
async function callOllamaEmbed(input, opts) {
    const url = (opts.url || DEFAULT_URL).replace(/\/$/, "");
    const model = opts.model || DEFAULT_MODEL;
    const res = await fetch(`${url}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input }),
    });
    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Ollama /api/embed ${res.status} on ${url} (model=${model}): ${errBody.slice(0, 300)}`);
    }
    const data = (await res.json());
    if (!data.embeddings || data.embeddings.length === 0) {
        throw new Error(`Ollama returned no embeddings (model=${model})`);
    }
    return data.embeddings;
}
/**
 * Embed a single string. Returns one 1024-dim vector.
 * Use for the live query-embedding step in /api/ask.
 */
export async function embed(text, opts = {}) {
    const cleaned = text.trim().slice(0, 1200);
    const vectors = await callOllamaEmbed(cleaned, opts);
    return vectors[0];
}
/**
 * Embed an array of strings. Auto-chunks large batches into MAX_BATCH-sized
 * sub-batches so we never OOM the GPU.
 */
export async function embedBatch(texts, opts = {}) {
    if (texts.length === 0)
        return [];
    // Defensive clean
    const cleaned = texts.map((t) => t.trim().slice(0, 1200));
    // Single-batch fast path
    if (cleaned.length <= MAX_BATCH) {
        return callOllamaEmbed(cleaned, opts);
    }
    // Multi-batch path - sequential to avoid GPU contention
    const out = [];
    for (let i = 0; i < cleaned.length; i += MAX_BATCH) {
        const sub = cleaned.slice(i, i + MAX_BATCH);
        const vectors = await callOllamaEmbed(sub, opts);
        out.push(...vectors);
    }
    return out;
}
/**
 * Chunk a long document for embedding.
 * Character-based with overlap, snaps to sentence boundaries when possible.
 */
export function chunkForEmbedding(text, opts = {}) {
    const chunkSize = opts.chunkChars ?? CHUNK_CHARS;
    const overlap = opts.overlap ?? CHUNK_OVERLAP;
    if (text.length <= chunkSize) {
        return [{ chunkIndex: 0, text }];
    }
    const chunks = [];
    let start = 0;
    let i = 0;
    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        if (end < text.length) {
            const lookback = text.slice(end - 200, end);
            const lastBreak = lookback.search(/[.!?]\s+[A-Z]|\n\n/);
            if (lastBreak > 0) {
                end = end - 200 + lastBreak + 1;
            }
        }
        chunks.push({
            chunkIndex: i++,
            text: text.slice(start, end).trim(),
        });
        if (end >= text.length)
            break;
        start = end - overlap;
    }
    return chunks;
}
/**
 * Health check. Verifies the Ollama endpoint is reachable and the embedding
 * model is loadable. Call this at app startup to fail fast.
 */
export async function embedHealthCheck(opts = {}) {
    const url = (opts.url || DEFAULT_URL).replace(/\/$/, "");
    const model = opts.model || DEFAULT_MODEL;
    const start = Date.now();
    try {
        const vec = await embed("health check", opts);
        return {
            ok: true,
            url,
            model,
            dims: vec.length,
            latencyMs: Date.now() - start,
        };
    }
    catch (e) {
        return {
            ok: false,
            url,
            model,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}
/** Exposed so callers (schema, etc.) can reference the canonical dim count */
export const EMBEDDING_DIMS = DEFAULT_DIMS;
export const EMBEDDING_MODEL = DEFAULT_MODEL;
export const EMBEDDING_URL = DEFAULT_URL;
//# sourceMappingURL=embeddings.js.map