// Reproduce the retrieval step outside the app to see what's actually returned.
import { createClient } from "@supabase/supabase-js";
import { embed } from "../dist/embeddings.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const question = "What does General Business Law section 349 prohibit in New York?";

console.log("Embedding question...");
const t0 = Date.now();
const vec = await embed(question);
console.log("  dim=" + vec.length + " took " + (Date.now() - t0) + "ms");

console.log("\n=== Call lex_hybrid_search_statutes directly ===");
const t1 = Date.now();
const s = await supabase.rpc("lex_hybrid_search_statutes", {
  query_embedding: vec,
  query_text: question,
  match_limit: 8,
});
console.log("  took " + (Date.now() - t1) + "ms");
if (s.error) {
  console.log("  ERROR: " + s.error.message);
} else {
  console.log("  returned " + s.data.length + " hits");
  for (const row of s.data) {
    console.log("    " + row.law_id + " " + row.location_id + " | combined=" + Number(row.combined_score).toFixed(3) + " | " + (row.title || "").slice(0, 60));
  }
}

console.log("\n=== Call lex_hybrid_search_opinions directly ===");
const o = await supabase.rpc("lex_hybrid_search_opinions", {
  query_embedding: vec,
  query_text: question,
  match_limit: 8,
});
if (o.error) {
  console.log("  ERROR: " + o.error.message);
} else {
  console.log("  returned " + o.data.length + " hits");
  for (const row of o.data) {
    console.log("    " + row.case_name.slice(0, 60) + " | combined=" + Number(row.combined_score).toFixed(3));
  }
}

console.log("\n=== Brute-force: which statute embedding is closest to this question? ===");
// Run cosine similarity directly against all statute embeddings using SQL
const direct = await supabase.rpc("lex_hybrid_search_statutes", {
  query_embedding: vec,
  query_text: "deceptive trade practices consumer protection unfair",
  match_limit: 5,
});
console.log("With keyword query 'deceptive trade practices consumer protection unfair':");
if (direct.data) {
  for (const row of direct.data) {
    console.log("    " + row.law_id + " " + row.location_id + " | " + (row.title || "").slice(0, 60));
  }
}
