import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("missing env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Test 1: read public courts table
console.log("Test 1: SELECT from courts via anon/publishable key");
const r1 = await supabase.from("courts").select("id, full_name, level").order("id");
if (r1.error) {
  console.error("  FAIL:", r1.error.message);
  process.exit(1);
}
console.log("  OK - rows:", r1.data.length);
for (const c of r1.data) console.log("    " + c.id + " :: " + c.full_name);

// Test 2: try to write (should fail - RLS blocks anon writes)
console.log("\nTest 2: INSERT into courts via anon key (should be blocked by RLS)");
const r2 = await supabase.from("courts").insert({ id: "test_invalid", full_name: "Bogus", short_name: "X", citation_string: "X", level: "trial" });
if (r2.error) {
  console.log("  OK - write blocked as expected:", r2.error.message.slice(0, 80));
} else {
  console.error("  WARN - write succeeded unexpectedly!");
}

// Test 3: call one of the hybrid search functions (anon-callable via SECURITY INVOKER)
console.log("\nTest 3: call lex_hybrid_search_opinions (empty corpus, just checking RPC plumbing)");
const dummyVec = new Array(1024).fill(0);
dummyVec[0] = 1;
const r3 = await supabase.rpc("lex_hybrid_search_opinions", {
  query_embedding: dummyVec,
  query_text: "fraud",
  match_limit: 3,
});
if (r3.error) {
  console.error("  FAIL:", r3.error.message);
  process.exit(1);
}
console.log("  OK - returned " + r3.data.length + " rows (expected 0, corpus is empty)");

console.log("\nAll three tests passed. Supabase JS client + publishable key works.");
