/** Smoke test: brief citation-checker. Includes a planted FAKE case to prove
 *  the not_found / fabrication catch. Run: node scripts/smoke-citecheck.mjs */
import { checkBrief } from "../dist/lex/citation-check.js";

const brief = `
On a motion for summary judgment under CPLR 3212, the movant must make a prima
facie showing of entitlement to judgment as a matter of law. See Zuckerman v.
City of New York. The burden then shifts to the opponent. Alvarez v. Prospect
Hospital is the controlling statement of the burden-shifting framework, and
Winegrad v. New York University Medical Center is to the same effect.
Defendant's reliance on Fakename v. Nonexistent Holding Corp. is misplaced.
Penal Law 125.25 defines murder in the second degree.
`;

const r = await checkBrief(brief);
console.log("SUMMARY:", JSON.stringify(r.summary));
console.log("\nCHECKS:");
for (const c of r.checks) {
  const tag = c.status === "verified" ? "OK  " : c.status === "weak_match" ? "WEAK" : "MISS";
  const extra = c.kind === "case" && c.matched ? ` -> ${c.matched} (${c.detail}) sim=${c.similarity} cited ${c.inbound}x` :
                c.matched ? ` -> ${c.matched} (${c.detail || ""})` : "";
  console.log(`  [${tag}] ${c.kind}: "${c.raw}"${extra}`);
}
process.exit(0);
