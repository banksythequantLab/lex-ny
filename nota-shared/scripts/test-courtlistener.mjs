/**
 * Live test of CourtListener with the actual token.
 * Fetches one recent NY Court of Appeals cluster and reads the lead opinion text,
 * exercising the same code paths the seed scraper will use.
 */
import { CourtListenerClient } from "../dist/scrapers/courtlistener.js";

const cl = new CourtListenerClient({ rateLimitMs: 100 });

console.log("=== Test 1: list NY Court of Appeals clusters from last 30 days ===");
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
console.log("  dateFiledAfter:", cutoff);

const t0 = Date.now();
const page = await cl.listClusters({ court: "ny", dateFiledAfter: cutoff, pageSize: 5 });
console.log("  HTTP OK in", Date.now() - t0, "ms");
console.log("  returned " + page.results.length + " clusters (of " + (page.count ?? "?") + " total since cutoff)");

if (page.results.length === 0) {
  console.log("  No recent CoA decisions in that window. Trying 6 months back...");
  const cutoff2 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const page2 = await cl.listClusters({ court: "ny", dateFiledAfter: cutoff2, pageSize: 5 });
  console.log("  6mo window:", page2.results.length, "clusters");
  if (page2.results.length === 0) {
    console.error("  No clusters even in 6mo - check court ID?");
    process.exit(1);
  }
  page.results.push(...page2.results);
}

console.log("\nFirst 3 clusters:");
for (const c of page.results.slice(0, 3)) {
  const cite = CourtListenerClient.primaryCitation(c.citations);
  console.log("  - " + c.case_name);
  console.log("      filed: " + c.date_filed + "   citation: " + (cite || "(none)") + "   status: " + c.precedential_status);
  console.log("      sub_opinions: " + c.sub_opinions.length + "   panel size: " + (c.panel?.length || 0));
}

console.log("\n=== Test 2: fetch the lead opinion text of the first cluster ===");
const firstCluster = page.results[0];
const opinions = await cl.getClusterOpinions(firstCluster);
console.log("  pulled " + opinions.length + " opinion(s)");

const lead = opinions.find((o) => o.type === "020lead") || opinions.find((o) => o.type === "010combined") || opinions[0];
const plain = CourtListenerClient.htmlToPlain(lead.html_with_citations || lead.plain_text);
console.log("  type: " + lead.type);
console.log("  text length: " + plain.length + " chars");
console.log("  per_curiam: " + lead.per_curiam);
if (plain.length > 0) {
  console.log("\n  first 400 chars of opinion text:");
  console.log("  " + plain.slice(0, 400).replace(/\n/g, "\n  "));
}

console.log("\n=== Test 3: fetch a panel judge's record (if any) ===");
if (firstCluster.panel && firstCluster.panel.length > 0) {
  const personId = firstCluster.panel[0];
  const person = await cl.getPerson(personId);
  const fullName = [person.name_first, person.name_middle, person.name_last, person.name_suffix].filter(Boolean).join(" ");
  console.log("  panel judge: " + fullName + " (CL person id " + personId + ")");
} else {
  console.log("  no panel data on this cluster - skipping");
}

console.log("\nAll CL tests passed.");
