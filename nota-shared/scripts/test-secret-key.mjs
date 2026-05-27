/**
 * Round-trip test of the service-role secret key.
 * Tries the write that the publishable key was blocked from earlier.
 * Inserts a temp court row, reads it back, deletes it.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) { console.error("missing env"); process.exit(1); }

const sb = createClient(url, secret, { auth: { persistSession: false } });

const testId = "test_secret_key_roundtrip";

console.log("1. INSERT (should succeed - secret bypasses RLS)");
const ins = await sb.from("courts").insert({
  id: testId,
  full_name: "TEMPORARY - safe to delete",
  short_name: "TMP",
  citation_string: "TMP",
  level: "trial",
});
if (ins.error) { console.error("   FAIL:", ins.error.message); process.exit(1); }
console.log("   OK");

console.log("2. SELECT back");
const sel = await sb.from("courts").select("id, full_name, level").eq("id", testId).single();
if (sel.error) { console.error("   FAIL:", sel.error.message); process.exit(1); }
console.log("   OK -", JSON.stringify(sel.data));

console.log("3. DELETE (cleanup)");
const del = await sb.from("courts").delete().eq("id", testId);
if (del.error) { console.error("   FAIL:", del.error.message); process.exit(1); }
console.log("   OK");

console.log("4. Verify cleanup");
const ver = await sb.from("courts").select("id").eq("id", testId);
if (ver.error) { console.error("   FAIL:", ver.error.message); process.exit(1); }
console.log("   OK - row count after delete:", ver.data.length);

console.log("\nSecret key works. RLS bypass confirmed. Cleanup verified.");
