/**
 * Smoke test: full hybrid retrieve() — opinions + statutes — against local lex.
 * Run: node scripts/smoke-retrieve-cases.mjs   (PGPASSWORD must be in env)
 */
import { retrieve } from "../dist/lex/retrieve.js";

const questions = [
  "warranty of habitability landlord failure to provide heat",
  "elements of common law fraud reliance and damages in New York",
  "standard for summary judgment under CPLR 3212",
];

for (const q of questions) {
  console.log("\n=== " + q + " ===");
  try {
    const r = await retrieve(q, { limit: 5 });
    console.log(`  ${r.opinions.length} opinions, ${r.statutes.length} statutes, ${r.durationMs}ms, dim=${r.queryEmbedding.length}`);
    console.log("  -- Top cases --");
    for (const o of r.opinions.slice(0, 5))
      console.log(`  [${o.combined_score.toFixed(3)}] ${o.court_id} ${o.decision_date} | ${(o.case_name||"").slice(0,52)}`);
    console.log("  -- Top statutes --");
    for (const s of r.statutes.slice(0, 3))
      console.log(`  [${s.combined_score.toFixed(3)}] ${s.law_id} ${s.location_id} | ${(s.title||"").slice(0,46)}`);
  } catch (e) {
    console.log("  ERROR: " + (e?.message || e));
  }
}
process.exit(0);
