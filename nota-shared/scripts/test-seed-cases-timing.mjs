/**
 * Time a single cluster ingestion end-to-end to figure out our throughput ceiling.
 */
import { createClient } from "@supabase/supabase-js";
import { CourtListenerClient } from "../dist/scrapers/courtlistener.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const cl = new CourtListenerClient({ rateLimitMs: 100 });

console.log("=== Listing 5 most recent NY CoA clusters ===");
const t0 = Date.now();
const page = await cl.listClusters({ court: "ny", pageSize: 5, dateFiledAfter: "2025-01-01" });
console.log(`  list took ${Date.now() - t0} ms`);
console.log(`  ${page.results.length} clusters`);

for (let i = 0; i < page.results.length; i++) {
  const cluster = page.results[i];
  const t1 = Date.now();
  console.log(`\n--- cluster ${i+1}: ${cluster.case_name} (${cluster.date_filed}) ---`);
  console.log(`  sub_opinions: ${cluster.sub_opinions.length}, panel: ${cluster.panel?.length || 0}`);

  // Fetch lead opinion only (don't iterate all sub-opinions)
  const leadUri = cluster.sub_opinions[0];
  const tt = Date.now();
  const op = await cl.getOpinion(leadUri);
  console.log(`  fetched lead opinion in ${Date.now() - tt} ms, type=${op.type}, text=${(op.html_with_citations || op.plain_text || "").length} chars`);

  // Try a real insert
  const tt2 = Date.now();
  const text = CourtListenerClient.htmlToPlain(op.html_with_citations || op.plain_text);
  const citation = CourtListenerClient.primaryCitation(cluster.citations);
  const { data, error } = await supabase.from("opinions").upsert({
    source: "courtlistener",
    source_id: String(cluster.id),
    source_url: `https://www.courtlistener.com${cluster.absolute_url}`,
    scraper_provider: "direct",
    court_id: "ny",
    case_name: cluster.case_name,
    case_name_short: cluster.case_name_short,
    citation,
    parallel_citations: CourtListenerClient.formatCitations(cluster.citations),
    decision_date: cluster.date_filed,
    argued_date: cluster.date_argued,
    precedential_status: cluster.precedential_status,
    page_count: op.page_count,
    text_plain: text,
    text_html: op.html_with_citations || null,
    cleanup_status: "raw",
  }, { onConflict: "source,source_id" }).select("id").single();

  if (error) {
    console.error(`  INSERT FAILED in ${Date.now() - tt2} ms: ${error.message}`);
  } else {
    console.log(`  INSERT OK in ${Date.now() - tt2} ms, id=${data.id}`);
  }

  console.log(`  total cluster time: ${Date.now() - t1} ms`);
}

console.log(`\nTotal: ${Date.now() - t0} ms`);
