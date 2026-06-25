/**
 * Smoke test: full ask() pipeline end-to-end against local lex + Ollama.
 * Small local model for speed; skips Bright Data (useLiveSerp:false) + Neo4j
 * so it's a clean corpus->answer test. Run: node scripts/smoke-ask.mjs
 */
process.env.OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b";
process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || "ollama";
delete process.env.NEO4J_URI; // clean local test: no external graph call

const { answer } = await import("../dist/lex/answer.js");

const q = "What is the standard for summary judgment under CPLR 3212 in New York?";
console.log("Q: " + q + "\n");
const r = await answer(q, { useLiveSerp: false });
console.log("ANSWER:\n" + r.answer + "\n");
console.log("CITATIONS (assembled from retrieval):");
for (const c of r.citations) console.log(`  [${c.marker}] ${c.kind}: ${c.display}`);
console.log(`\nbest_sim=${r.best_corpus_similarity?.toFixed(3)} | retrieval=${r.retrieval_duration_ms}ms | llm=${r.llm_duration_ms}ms | total=${r.total_duration_ms}ms | model=${process.env.OLLAMA_MODEL}`);
process.exit(0);
