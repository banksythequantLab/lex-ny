/**
 * seed-cases.ts - Bulk-seed NY case law from CourtListener into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-cases.ts                  # seeds last 3 years of CoA
 *   npx tsx scripts/seed-cases.ts --years=5        # custom range
 *   npx tsx scripts/seed-cases.ts --courts=ny,nyappdiv1  # custom courts
 *
 * Required env:
 *   COURTLISTENER_API_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: re-running skips opinions already in DB (by source+source_id).
 *
 * Roughly 102 CoA new filings + ~8500 AD filings per year. Pulling 3 years
 * across all 5 courts ~ 30K opinions. At 4 req/s with the throttle, that's
 * ~2 hours wall-clock. Run overnight Tue->Wed of hackathon week.
 */

import { createClient } from "@supabase/supabase-js";
import { CourtListenerClient, type CLCluster, type CLOpinion } from "../src/scrapers/courtlistener.js";

const DEFAULT_COURTS = ["ny", "nyappdiv1", "nyappdiv2", "nyappdiv3", "nyappdiv4"];
const DEFAULT_YEARS = 3;

interface Args {
  years: number;
  courts: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = { years: DEFAULT_YEARS, courts: DEFAULT_COURTS };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--years=")) args.years = parseInt(a.split("=")[1], 10);
    if (a.startsWith("--courts=")) args.courts = a.split("=")[1].split(",");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const cl = new CourtListenerClient();
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - args.years);
  const dateFiledAfter = cutoff.toISOString().slice(0, 10);

  let totalIngested = 0;

  for (const courtId of args.courts) {
    console.log(`\n=== Seeding court: ${courtId} (since ${dateFiledAfter}) ===`);

    let cursor: string | undefined = undefined;
    let page = 0;

    while (true) {
      page++;
      let resp;
      try {
        resp = await cl.listClusters({
          court: courtId,
          dateFiledAfter,
          cursor,
          pageSize: 100,
        });
      } catch (e) {
        console.error(`Cluster list failed page ${page}: ${e instanceof Error ? e.message : e}`);
        break;
      }

      console.log(`  page ${page}: ${resp.results.length} clusters`);

      for (const cluster of resp.results) {
        try {
          await ingestCluster(supabase, cl, cluster, courtId);
          totalIngested++;
        } catch (e) {
          console.warn(`  Failed cluster ${cluster.id}: ${e instanceof Error ? e.message : e}`);
        }
      }

      if (!resp.next) break;
      const nextUrl = new URL(resp.next);
      cursor = nextUrl.searchParams.get("cursor") || undefined;
      if (!cursor) break;
    }

    console.log(`  ${courtId} done.`);
  }

  console.log(`\nTotal opinions ingested: ${totalIngested}`);
}

async function ingestCluster(
  supabase: ReturnType<typeof createClient>,
  cl: CourtListenerClient,
  cluster: CLCluster,
  courtId: string
): Promise<void> {
  // Check if already ingested (any opinion of this cluster)
  const sourceId = String(cluster.id);
  const { data: existing } = await supabase
    .from("opinions")
    .select("id")
    .eq("source", "courtlistener")
    .eq("source_id", sourceId)
    .limit(1);

  if (existing && existing.length > 0) {
    return; // skip - already have it
  }

  // Fetch the actual opinion text(s)
  const opinions = await cl.getClusterOpinions(cluster);
  if (opinions.length === 0) return;

  // For now we collapse cluster -> 1 opinion row using the lead/combined opinion.
  // We'll add separate rows for dissents/concurrences in a later pass.
  const leadOp =
    opinions.find((o) => o.type === "020lead") ||
    opinions.find((o) => o.type === "010combined") ||
    opinions[0];

  const textPlain = CourtListenerClient.htmlToPlain(leadOp.html_with_citations || leadOp.plain_text);
  const citation = CourtListenerClient.primaryCitation(cluster.citations);
  const parallelCitations = CourtListenerClient.formatCitations(cluster.citations);

  // Try to fetch docket for docket_number
  let docketNumber: string | undefined;
  try {
    const docket = await cl.getDocket(cluster.docket);
    docketNumber = docket.docket_number;
  } catch {
    /* non-fatal */
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("opinions")
    .insert({
      source: "courtlistener",
      source_id: sourceId,
      source_url: `https://www.courtlistener.com${cluster.absolute_url}`,
      scraper_provider: "direct",
      court_id: courtId,
      case_name: cluster.case_name,
      case_name_short: cluster.case_name_short,
      citation,
      parallel_citations: parallelCitations,
      docket_number: docketNumber,
      decision_date: cluster.date_filed,
      argued_date: cluster.date_argued,
      decision_type: clOpinionTypeToDecisionType(leadOp.type),
      precedential_status: cluster.precedential_status,
      page_count: leadOp.page_count,
      text_plain: textPlain,
      text_html: leadOp.html_with_citations || null,
      cleanup_status: "raw",
    })
    .select("id")
    .single();

  if (insertErr) {
    throw new Error(`Insert opinion failed: ${insertErr.message}`);
  }

  // Link judges (M:N) — best-effort, skip if we can't resolve
  if (inserted?.id && cluster.panel && cluster.panel.length > 0) {
    for (const personId of cluster.panel) {
      try {
        await linkJudge(supabase, cl, inserted.id as string, personId, courtId, "panel");
      } catch {
        /* non-fatal */
      }
    }
  }
}

async function linkJudge(
  supabase: ReturnType<typeof createClient>,
  cl: CourtListenerClient,
  opinionId: string,
  personId: number,
  courtId: string,
  role: string
): Promise<void> {
  // Upsert the judge if we don't have them
  const { data: existing } = await supabase
    .from("judges")
    .select("id")
    .eq("cl_person_id", personId)
    .limit(1);

  let judgeId: string;
  if (existing && existing.length > 0) {
    judgeId = existing[0].id as string;
  } else {
    const person = await cl.getPerson(personId);
    const fullName = [person.name_first, person.name_middle, person.name_last, person.name_suffix]
      .filter(Boolean).join(" ").trim() || `Judge #${personId}`;
    const { data: ins } = await supabase
      .from("judges")
      .insert({
        full_name: fullName,
        normalized_name: fullName.toLowerCase().replace(/[^a-z0-9 ]/g, ""),
        cl_person_id: personId,
        court_id: courtId,
        date_of_birth: person.date_dob,
      })
      .select("id")
      .single();
    if (!ins) return;
    judgeId = ins.id as string;
  }

  await supabase.from("opinion_judges").upsert(
    { opinion_id: opinionId, judge_id: judgeId, role },
    { onConflict: "opinion_id,judge_id,role" }
  );
}

function clOpinionTypeToDecisionType(t: string): string {
  if (t.startsWith("020")) return "majority";
  if (t.startsWith("030")) return "concurrence";
  if (t.startsWith("040")) return "dissent";
  if (t.startsWith("050")) return "concurrence_in_part";
  if (t.startsWith("060")) return "per_curiam";
  return "combined";
}

main().then(() => process.exit(0)).catch((e) => { console.error("Fatal:", e); process.exit(1); });
