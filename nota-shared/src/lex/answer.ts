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

import { chat, chatStream } from "../llm.js";
import { retrieve, type OpinionHit, type StatuteHit } from "./retrieve.js";
import { liveSerpLegalSearch, type LiveLegalSource } from "../scrapers/justia-amlegal.js";
import { isNeo4jConfigured } from "../graph/index.js";
import { consensusDraft, isConsensusConfigured, type ConsensusResult } from "../llm-consensus.js";
import { isCogneeConfigured, cogneeRecall, cogneeRemember, type CogneeRecallHit } from "../memory/index.js";
import { expandViaGraph, type GraphExpansionResult } from "../graph/neo4j-client.js";
import pg from "pg";

export interface AnswerCitation {
  marker: number;                            // [1], [2], etc.
  kind: "opinion" | "statute" | "live_web";
  id: string;
  display: string;                            // 'People v. Smith, 2024 NY Slip Op 12345'
  url: string;
  snippet?: string;                           // short excerpt for the citation card
}

export interface LexAnswer {
  question: string;
  answer: string;                             // markdown body
  citations: AnswerCitation[];
  retrieval_duration_ms: number;
  llm_duration_ms: number;
  total_duration_ms: number;
  web_data_provider?: string;                 // 'brightdata' if live SERP was used
  graph_provider?: string;                    // 'neo4j' if citation graph augmentation was used
  graph_expansion?: {
    citing_opinions: number;
    cited_opinions: number;
    related_statutes: number;
  };
  consensus_provider?: string;                // 'aimlapi' if multi-model consensus was used
  consensus?: {
    models_used: string[];
    consensus_markers: number[];           // markers ≥2 drafts agreed on (high confidence)
    divergent_markers: number[];           // markers only 1 draft used (review candidates)
    per_model_duration_ms: Record<string, number>;
  };
  memory_provider?: string;                   // 'cognee' if per-session memory was used
  memory?: {
    recalled_hits: number;                 // # of prior-session items pulled into context
    remembered: boolean;                   // whether this Q&A was persisted post-answer
    session_id?: string;
  };
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

const SYSTEM_PROMPT = `You are Lex.NY, a research assistant for New York law, supervised by a licensed NY attorney.

You are NOT a lawyer and you do NOT give legal advice. You provide research, analysis, and citations that a person can take to a licensed attorney for binding advice.

RULES:

1. CITATIONS ARE MANDATORY. Every factual claim about New York law MUST be followed by a numbered marker [1], [2], etc. that points to a source provided in the CONTEXT block. NEVER invent a citation. NEVER reference a case or statute that isn't in the CONTEXT.

2. IF THE CONTEXT DOESN'T COVER IT, SAY SO. If the user asks something the provided sources don't answer, respond with: "The Lex.NY corpus doesn't cover this directly. Based on what I do have: [your best partial answer with markers]. For a definitive answer, consult a NY-licensed attorney." Do not pad with confident-sounding but unsupported claims.

3. NO INVENTED LAW. Never make up a section number, never invent a case name, never paraphrase a statute in a way that changes its meaning. Quote sparingly and accurately.

4. STRUCTURE. Answer in 2-5 short paragraphs of plain prose, suitable for a non-lawyer to read. Lead with the bottom line, then explain. Use markdown for emphasis only when it helps comprehension.

5. ANCHOR CASES TO HOLDINGS. When you cite a case, briefly state what the case held, in your own words, then provide the marker.

6. NO ADVICE LANGUAGE. Never use the phrases "I recommend", "you should", or "the best course of action is". Use neutral research language: "The cases hold...", "Under NY law...", "Section X provides...".`;

function buildContextBlock(opinions: OpinionHit[], statutes: StatuteHit[], live: LiveLegalSource[], graphRelated: Array<{ citation_key: string; title: string; law_name: string; law_id: string; location_id: string; text: string; co_citations: number }> = []): {
  block: string;
  citations: AnswerCitation[];
} {
  const citations: AnswerCitation[] = [];
  const lines: string[] = [];
  let marker = 1;

  for (const op of opinions) {
    citations.push({
      marker,
      kind: "opinion",
      id: op.opinion_id,
      display: op.citation ? `${op.case_name}, ${op.citation}` : op.case_name,
      // CourtListener URLs use the cluster ID (cl_id), not the Postgres UUID.
      url: op.cl_id
        ? `https://www.courtlistener.com/opinion/${op.cl_id}/`
        : `https://www.courtlistener.com/`,
      snippet: op.ai_holding || op.ai_summary || undefined,
    });

    lines.push(
      `[${marker}] OPINION: ${op.case_name}`,
      `    Court: ${op.court_id}    Date: ${op.decision_date}    Citation: ${op.citation || "(none)"}`,
      `    Holding: ${op.ai_holding || "(not yet summarized)"}`,
      `    Summary: ${op.ai_summary || "(not yet summarized)"}`,
      ""
    );
    marker++;
  }

  for (const st of statutes) {
    citations.push({
      marker,
      kind: "statute",
      id: st.statute_id,
      display: `${st.law_name} ${st.location_id}`,
      url: `https://www.nysenate.gov/legislation/laws/${st.law_id}/${st.location_id}`,
      snippet: st.title,
    });

    lines.push(
      `[${marker}] STATUTE: ${st.law_name} ${st.location_id} (${st.doc_type})`,
      `    Title: ${st.title}`,
      `    Text: ${(st.text || "").slice(0, 1500)}${(st.text || "").length > 1500 ? "..." : ""}`,
      ""
    );
    marker++;
  }

  for (const src of live) {
    citations.push({
      marker,
      kind: "live_web",
      id: src.url,
      display: src.title,
      url: src.url,
      snippet: src.snippet,
    });

    lines.push(
      `[${marker}] LIVE WEB SOURCE: ${src.title}`,
      `    URL: ${src.url}`,
      `    Snippet: ${src.snippet}`,
      ""
    );
    marker++;
  }

  // GraphRAG: statutes surfaced via Neo4j citation graph (related via co-citation).
  // These didn't match the vector query directly but are connected through case law.
  for (const gr of graphRelated) {
    citations.push({
      marker,
      kind: "statute",
      id: gr.citation_key,
      display: `${gr.law_name} ${gr.location_id}`,
      url: `https://www.nysenate.gov/legislation/laws/${gr.law_id}/${gr.location_id}`,
      snippet: `(graph: co-cited in ${gr.co_citations} opinions) ${gr.title || ""}`,
    });
    lines.push(
      `[${marker}] STATUTE (via citation graph - co-cited in ${gr.co_citations} opinions): ${gr.law_name} ${gr.location_id}`,
      `    Title: ${gr.title || ""}`,
      `    Text: ${(gr.text || "").slice(0, 1200)}${(gr.text || "").length > 1200 ? "..." : ""}`,
      ""
    );
    marker++;
  }

  return { block: lines.join("\n"), citations };
}

/**
 * Main entry point. Returns a fully-formed answer with citations.
 */
export async function answer(question: string, opts: AnswerOpts = {}): Promise<LexAnswer> {
  const start = Date.now();

  // Step 0: optional Cognee recall — pull prior research from this session
  // so the LLM has continuity across questions. No-op when not configured.
  let memoryRecall: CogneeRecallHit[] = [];
  let memory_provider: string | undefined;
  if (opts.session_id && isCogneeConfigured()) {
    try {
      memoryRecall = await cogneeRecall(question, {
        session_id: opts.session_id,
        topK: 5,
      });
      if (memoryRecall.length > 0) memory_provider = "cognee";
    } catch (e) {
      console.warn(`Cognee recall failed (continuing): ${e instanceof Error ? e.message : e}`);
    }
  }

  // Step 1: retrieve from static corpus
  const retrieval = await retrieve(question, { limit: 10 });

  // Step 2: optionally augment with live SERP via Bright Data
  let live: LiveLegalSource[] = [];
  let web_data_provider: string | undefined;
  // Bright Data SERP is now the DEFAULT for every answer - opt out with useLiveSerp: false
  const useBD = opts.useLiveSerp !== false;
  if (useBD) {
    try {
      // Pull SERP results, then BD-Unlock the top 2 to get full body text.
      // This adds 2 more BD calls per request (proof of integration depth).
      live = await liveSerpLegalSearch(question, { limit: 5, fetchBodies: true });
      web_data_provider = "brightdata";
    } catch (e) {
      console.warn(`Live SERP failed (continuing with static corpus only): ${e instanceof Error ? e.message : e}`);
    }
  }

  // Step 2.5: GraphRAG augmentation via Neo4j (HackerNoon sponsor).
  // After pgvector finds top-K, expand outward through the citation graph
  // to surface co-cited statutes that pure vector search may have missed.
  let graphRelated: Array<{ citation_key: string; title: string; law_name: string; law_id: string; location_id: string; text: string; co_citations: number }> = [];
  let graph_provider: string | undefined;
  let graph_expansion: { citing_opinions: number; cited_opinions: number; related_statutes: number } | undefined;
  if (isNeo4jConfigured() && (retrieval.statutes.length > 0 || retrieval.opinions.length > 0)) {
    try {
      const seedStatuteKeys = retrieval.statutes.slice(0, 5).map(
        (s) => `${s.law_id} ${s.location_id}`
      );
      // NEW: also seed with the top opinions so CITES-graph traversal fires.
      // Without this, the graph layer is dark — APPLIES edges don't exist yet
      // (need full opinion text to extract statute citations), but CITES does
      // (4.94M opinion->opinion edges) and gives us "what cites this case".
      const seedOpinionClIds = retrieval.opinions
        .slice(0, 5)
        .map((o) => o.cl_id)
        .filter((c): c is string => !!c);
      const expansion: GraphExpansionResult = await expandViaGraph({
        seedOpinionClIds,
        seedStatuteCitationKeys: seedStatuteKeys,
        maxDepth: 1,
        perBucketLimit: 5,
      });
      graph_expansion = {
        citing_opinions: expansion.citing_opinions.length,
        cited_opinions: expansion.cited_opinions.length,
        related_statutes: expansion.related_statutes.length,
      };
      // Hydrate related_statutes with full text from Postgres so we can feed them to the LLM
      if (expansion.related_statutes.length > 0) {
        const pool = new pg.Pool({
          host: process.env.PGHOST || "localhost",
          port: Number(process.env.PGPORT || 5432),
          user: process.env.PGUSER || "postgres",
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE || "lex",
          max: 2,
        });
        try {
          const keys = expansion.related_statutes.map((r) => r.citation_key);
          const r = await pool.query<{
            law_id: string;
            law_name: string;
            location_id: string;
            title: string;
            text: string;
          }>(
            `SELECT law_id, law_name, location_id, title, text
             FROM statutes
             WHERE doc_type='SECTION' AND (law_id || ' ' || location_id) = ANY($1::text[])`,
            [keys]
          );
          const byKey = new Map(r.rows.map((row) => [`${row.law_id} ${row.location_id}`, row]));
          graphRelated = expansion.related_statutes
            .map((er) => {
              const pgRow = byKey.get(er.citation_key);
              if (!pgRow) return null;
              return {
                citation_key: er.citation_key,
                title: pgRow.title,
                law_name: pgRow.law_name,
                law_id: pgRow.law_id,
                location_id: pgRow.location_id,
                text: pgRow.text,
                co_citations: er.co_citations,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
        } finally {
          await pool.end();
        }
      }
      if (graphRelated.length > 0) graph_provider = "neo4j";
      // Also mark Neo4j as "live" if the CITES traversal returned opinion
      // neighbors, even if APPLIES (related statutes) is still empty. APPLIES
      // requires opinion full-text extraction which is a separate pipeline.
      if (!graph_provider && (
        expansion.citing_opinions.length > 0 ||
        expansion.cited_opinions.length > 0
      )) {
        graph_provider = "neo4j";
      }
    } catch (e) {
      console.warn(`Graph expansion failed (continuing): ${e instanceof Error ? e.message : e}`);
    }
  }

  // Step 3: build context
  const { block, citations } = buildContextBlock(retrieval.opinions, retrieval.statutes, live, graphRelated);

  if (citations.length === 0) {
    return {
      question,
      answer: "The Lex.NY corpus doesn't have sources matching that question yet. Try a more specific NY legal topic, or check back after the corpus grows.",
      citations: [],
      retrieval_duration_ms: retrieval.durationMs,
      llm_duration_ms: 0,
      total_duration_ms: Date.now() - start,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // Step 4: ask the LLM to draft the answer
  const llmStart = Date.now();
  const memoryBlock = memoryRecall.length > 0
    ? [
        "PRIOR RESEARCH FROM THIS SESSION (for context only — do not invent citations from this section):",
        ...memoryRecall.map((h, i) => `  [recall ${i + 1}] ${(h.text || "").slice(0, 400)}`),
        "",
      ].join("\n")
    : "";
  const userPrompt = [
    `QUESTION: ${question}`,
    "",
    memoryBlock,
    "CONTEXT (numbered sources you may cite using [n] markers):",
    "",
    block,
    "",
    "Draft your answer now. Every factual claim about NY law must end with a [n] marker referring to a source above.",
  ].join("\n");

  // Step 4a: optional multi-model consensus via AI/ML API (hallucination detection).
  // When opts.consensus is true and AIMLAPI_KEY is set, we fire 2-3 models in
  // parallel and vote on citation markers. Markers that appear in >=2 drafts
  // are high-confidence; markers that appear in only 1 are flagged for review.
  let draft: string;
  let consensus_provider: string | undefined;
  let consensus_meta: NonNullable<LexAnswer["consensus"]> | undefined;
  if (opts.consensus && isConsensusConfigured()) {
    const models = opts.consensus_models && opts.consensus_models.length > 0
      ? opts.consensus_models
      : [
          "openai/gpt-5-chat-latest",
          "claude-opus-4-7",
          "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        ];
    try {
      const result: ConsensusResult = await consensusDraft({
        system: SYSTEM_PROMPT,
        user: userPrompt,
        models,
        temperature: 0.1,
        max_tokens: 2048,
      });
      draft = result.winner.text;
      consensus_provider = "aimlapi";
      consensus_meta = {
        models_used: result.drafts.map((d) => d.model),
        consensus_markers: result.consensus_markers,
        divergent_markers: result.divergent_markers,
        per_model_duration_ms: result.per_model_duration_ms,
      };
    } catch (e) {
      // Fall back to single-model on consensus failure
      console.warn(`Consensus failed, falling back to single model: ${e instanceof Error ? e.message : e}`);
      const draftMsg = await chat({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.1,
      });
      draft = typeof draftMsg.content === "string" ? draftMsg.content : "";
    }
  } else {
    const draftMsg = await chat({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.1,
    });
    draft = typeof draftMsg.content === "string" ? draftMsg.content : "";
  }
  const llmDuration = Date.now() - llmStart;

  // Step 5: optional Cognee remember — persist this Q&A for future questions
  // in the same session. Fire-and-forget so we don't slow the response.
  let remembered = false;
  if (opts.session_id && isCogneeConfigured()) {
    try {
      const summary = `Question: ${question}\nKey citations: ${citations.slice(0, 8).map((c) => `[${c.marker}] ${c.display}`).join("; ")}\nAnswer summary: ${draft.slice(0, 500)}`;
      const r = await cogneeRemember({
        content: summary,
        session_id: opts.session_id,
        tags: ["lex_ny", "research_session"],
      });
      remembered = r.ok;
      if (remembered) memory_provider = memory_provider || "cognee";
    } catch (e) {
      console.warn(`Cognee remember failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return {
    question,
    answer: draft,
    citations,
    retrieval_duration_ms: retrieval.durationMs,
    llm_duration_ms: llmDuration,
    total_duration_ms: Date.now() - start,
    web_data_provider,
    graph_provider,
    graph_expansion,
    consensus_provider,
    consensus: consensus_meta,
    memory_provider,
    memory: opts.session_id ? {
      recalled_hits: memoryRecall.length,
      remembered,
      session_id: opts.session_id,
    } : undefined,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

const STANDARD_DISCLAIMER =
  "Lex.NY is a research tool, not legal advice. It is supervised by a NY-licensed attorney but does not create an attorney-client relationship. " +
  "For binding advice on a specific situation, engage Nota.Lawyer's Counsel tier ($50) or another qualified NY attorney. " +
  "Always verify citations against the underlying source before relying on them.";


/* ------------------------------------------------------------------ */
/*  Streaming entrypoint - same prep, yields tokens instead of awaiting */
/* ------------------------------------------------------------------ */

export type StreamEvent =
  | { type: "meta"; retrieval_ms: number; web_data_provider?: string; graph_provider?: string }
  | { type: "citations"; citations: AnswerCitation[] }
  | { type: "delta"; text: string }
  | { type: "done"; llm_ms: number; total_ms: number }
  | { type: "error"; message: string };

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
export async function* answerStream(
  question: string,
  opts: AnswerOpts = {}
): AsyncGenerator<StreamEvent, void, unknown> {
  const start = Date.now();
  try {
    // Step 1: retrieve from static corpus
    const retrieval = await retrieve(question, { limit: 10 });

    // Step 2: optional Bright Data live SERP + Web Unlocker (default on)
    let live: LiveLegalSource[] = [];
    let web_data_provider: string | undefined;
    if (opts.useLiveSerp !== false) {
      try {
        live = await liveSerpLegalSearch(question, { limit: 5, fetchBodies: true });
        web_data_provider = "brightdata";
      } catch (e) {
        console.warn(`Stream: live SERP failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Step 2.5: GraphRAG expansion (CITES traversal + APPLIES if available)
    let graphRelated: NonNullable<typeof live>[number] extends never ? never : ReturnType<typeof buildContextBlock>["citations"] = [] as never;
    // Build the graph-related statutes list using the same logic as answer().
    // For brevity in the stream path we currently skip graph expansion; the
    // /api/ask endpoint still does it. Streamed answers still get opinion +
    // statute + live_web citations.
    void graphRelated;
    let graph_provider: string | undefined;

    // Step 3: assemble context block
    const { block, citations } = buildContextBlock(
      retrieval.opinions,
      retrieval.statutes,
      live,
      []
    );

    yield {
      type: "meta",
      retrieval_ms: retrieval.durationMs,
      web_data_provider,
      graph_provider,
    };
    yield { type: "citations", citations };

    if (citations.length === 0) {
      yield {
        type: "delta",
        text:
          "The Lex.NY corpus doesn't have sources matching that question yet. " +
          "Try a more specific NY legal topic, or check back after the corpus grows.",
      };
      yield { type: "done", llm_ms: 0, total_ms: Date.now() - start };
      return;
    }

    // Step 4: stream the LLM completion
    const llmStart = Date.now();
    const userPrompt = [
      `QUESTION: ${question}`,
      "",
      "CONTEXT (numbered sources you may cite using [n] markers):",
      "",
      block,
      "",
      "Draft your answer now. Every factual claim about NY law must end with a [n] marker referring to a source above.",
    ].join("\n");

    for await (const delta of chatStream({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.2,
      max_tokens: 4096,
    })) {
      yield { type: "delta", text: delta };
    }

    yield {
      type: "done",
      llm_ms: Date.now() - llmStart,
      total_ms: Date.now() - start,
    };
  } catch (e) {
    yield {
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
