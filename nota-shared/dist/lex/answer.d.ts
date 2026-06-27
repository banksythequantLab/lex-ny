/**
 * Lex.NY answer generation - RAG with strict citation enforcement.
 *
 * Pipeline:
 *   1. retrieve() returns top-K opinions + statutes
 *   2. We build a context block with numbered [1], [2], [3]... markers
 *   3. Llama 3.3 70B (via Groq) drafts an answer that MUST anchor every
 *      claim to a [n] marker
 *   4. We post-process to convert [n] markers into actual citation cards
 *      with links back to the source
 *
 * Hallucination guard: the system prompt explicitly forbids inventing
 * cases, citations, or statute numbers. If the corpus doesn't have the
 * answer, the model must say so plainly. This is a hard NY RPC 7.1
 * compliance requirement - attorney supervision can't fix invented law.
 */
export interface AnswerCitation {
    marker: number;
    kind: "opinion" | "statute" | "live_web";
    id: string;
    display: string;
    url: string;
    snippet?: string;
    cl_id?: string;
    bluebook?: string;
}
export interface LexAnswer {
    question: string;
    answer: string;
    citations: AnswerCitation[];
    retrieval_duration_ms: number;
    llm_duration_ms: number;
    total_duration_ms: number;
    web_data_provider?: string;
    graph_provider?: string;
    graph_expansion?: {
        citing_opinions: number;
        cited_opinions: number;
        related_statutes: number;
    };
    consensus_provider?: string;
    consensus?: {
        models_used: string[];
        consensus_markers: number[];
        divergent_markers: number[];
        per_model_duration_ms: Record<string, number>;
    };
    memory_provider?: string;
    memory?: {
        recalled_hits: number;
        remembered: boolean;
        session_id?: string;
    };
    /**
     * Best raw cosine similarity across all retrieved opinions and statutes.
     * 1.0 = perfect match, ~0.7+ = strong, ~0.55-0.7 = weak, <0.55 = no good match.
     * The UI uses this to render a confidence chip on /ask.
     */
    best_corpus_similarity?: number;
    /**
     * True when best_corpus_similarity is below the abstain floor (0.55).
     * When set, callers should display a "weak corpus match" warning;
     * the LLM has also been told to lean on live_web sources only.
     */
    weak_corpus?: boolean;
    disclaimer: string;
}
export interface AnswerOpts {
    /** If true, augment with live BD SERP search for recent sources */
    useLiveSerp?: boolean;
    /** Override the LLM provider (defaults to whatever llm.ts uses) */
    llmProvider?: "groq" | "ollama" | "aimlapi";
    /** If true, fire 2-3 models in parallel via AI/ML API and vote on citation markers */
    consensus?: boolean;
    /** Override the model set for consensus mode (3 models recommended) */
    consensus_models?: string[];
    /** Session ID for Cognee per-session memory. When set + Cognee configured, prior session research is recalled and the current Q&A is remembered. */
    session_id?: string;
}
/**
 * Main entry point. Returns a fully-formed answer with citations.
 */
export declare function answer(question: string, opts?: AnswerOpts): Promise<LexAnswer>;
export type StreamEvent = {
    type: "meta";
    retrieval_ms: number;
    web_data_provider?: string;
    graph_provider?: string;
} | {
    type: "citations";
    citations: AnswerCitation[];
} | {
    type: "delta";
    text: string;
} | {
    type: "done";
    llm_ms: number;
    total_ms: number;
} | {
    type: "error";
    message: string;
};
/**
 * answerStream — same pipeline as answer() but yields events as they happen.
 *
 * Order:
 *   1. meta            — retrieval timings + providers (so UI can show "got it")
 *   2. citations       — full citation list (UI renders the strip right away)
 *   3. delta x N       — LLM tokens, one per chunk
 *   4. done            — final timings
 *
 * Errors are yielded as a final { type: "error" } event rather than throwing,
 * so the route handler can send them through SSE without dropping the stream.
 */
export declare function answerStream(question: string, opts?: AnswerOpts): AsyncGenerator<StreamEvent, void, unknown>;
//# sourceMappingURL=answer.d.ts.map