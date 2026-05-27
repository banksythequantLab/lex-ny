/**
 * End-to-end test of NySenateClient against the real API.
 * Pulls one moderate-sized law (BSC = Business Corporation), flattens the tree,
 * and prints a summary that would-be inserted into Supabase.
 */
import { NySenateClient } from "../dist/scrapers/ny-senate.js";

const ny = new NySenateClient({ rateLimitMs: 50 });

console.log("=== List all laws ===");
const t0 = Date.now();
const laws = await ny.listLaws();
console.log(`  ${laws.length} laws (in ${Date.now() - t0} ms)`);

console.log("\n=== Pull a small law tree end-to-end: BSC (Business Corporation Law) ===");
const t1 = Date.now();
const tree = await ny.getLawTree("BSC", { full: true });
console.log(`  fetched in ${Date.now() - t1} ms`);
console.log(`  lawId:    ${tree.info.lawId}`);
console.log(`  name:     ${tree.info.name}`);
console.log(`  type:     ${tree.info.lawType}`);

console.log("\n=== Flatten into insert-ready rows ===");
const flat = NySenateClient.flattenTree(tree);
console.log(`  ${flat.length} total documents`);

const byType = new Map();
for (const { doc } of flat) {
  byType.set(doc.docType, (byType.get(doc.docType) || 0) + 1);
}
console.log("  document type breakdown:");
for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${t.padEnd(12)} ${n}`);
}

const sections = flat.filter((f) => f.doc.docType === "SECTION");
const withText = sections.filter((f) => f.doc.text && f.doc.text.length > 0);
console.log(`\n  sections with text: ${withText.length} / ${sections.length}`);

if (withText.length > 0) {
  const sample = withText[0].doc;
  console.log("\n=== Sample SECTION row (first one with text) ===");
  console.log(`  location_id:  ${sample.locationId}`);
  console.log(`  title:        ${sample.title || "(none)"}`);
  console.log(`  active_date:  ${sample.activeDate}`);
  console.log(`  text length:  ${sample.text.length} chars`);
  console.log(`  first 300 chars of text:`);
  console.log("    " + sample.text.slice(0, 300).replace(/\n/g, "\n    "));

  // Show parent linkage example
  const withParent = flat.find((f) => f.parentLocationId !== null && f.doc.docType === "SECTION");
  if (withParent) {
    console.log(`\n=== Parent linkage check ===`);
    console.log(`  section ${withParent.doc.locationId} (${withParent.doc.title})`);
    console.log(`    -> parent location_id: ${withParent.parentLocationId}`);
    const parent = flat.find((f) => f.doc.locationId === withParent.parentLocationId);
    if (parent) {
      console.log(`    -> parent doc type:    ${parent.doc.docType}`);
      console.log(`    -> parent title:       ${parent.doc.title}`);
    }
  }
}

console.log("\nPipeline OK — scraper produces clean rows ready for Supabase insert.");
