/**
 * Smoke test: judge + citation-graph analytics module against local lex.
 * Run: node scripts/smoke-analytics.mjs   (PGPASSWORD must be in env)
 */
import { mostCitedDecisions, judgeInfluenceRanking, judgeProfile, citedBy } from "../dist/lex/analytics.js";

const top = await mostCitedDecisions({ limit: 5 });
console.log("\n=== Most-cited NY decisions ===");
for (const d of top) console.log(`  [${d.inbound}] ${d.court_id} ${d.decision_date} | ${d.case_name}`);

const judges = await judgeInfluenceRanking({ limit: 5 });
console.log("\n=== Top judges by citation influence ===");
for (const j of judges) console.log(`  ${j.name}: authored ${j.authored}, cited ${j.total_citations}x`);

console.log(`\n=== Profile: ${judges[0].name} ===`);
const prof = await judgeProfile(judges[0].judge_id, { topN: 3 });
console.log(`  ${prof.authored} authored, ${prof.first_decision} -> ${prof.last_decision}, courts: ${prof.courts.join(",")}`);
for (const d of prof.top_decisions) console.log(`    [${d.inbound}] ${d.case_name} (${d.decision_date})`);

console.log(`\n=== Cited-by: ${top[0].case_name} ===`);
const cb = await citedBy(top[0].cl_id, { limit: 3 });
console.log(`  seed inbound=${cb.total_citers}; top citers:`);
for (const c of cb.citers) console.log(`    [${c.inbound}] ${c.case_name} (${c.court_id} ${c.decision_date})`);

process.exit(0);
