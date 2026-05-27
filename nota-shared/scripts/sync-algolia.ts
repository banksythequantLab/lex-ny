/**
 * sync-algolia.ts - Push the NY statute corpus from Postgres into Algolia.
 *
 * Required env:
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *   ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX_NAME (optional)
 *
 * Behavior:
 *   1. Set up index settings (searchable attrs, facets, ranking).
 *   2. Pull all SECTION-level statutes from Postgres.
 *   3. Push to Algolia in batches of 500.
 *   4. Report total uploaded and final record count.
 *
 * Idempotent on objectID (statute UUID) — re-running upserts.
 *
 * Free Build tier caps:
 *   10K searches/month, 1M records, 10K AI recommendation calls.
 *   40K NY statute records fits comfortably.
 */

import pg from "pg";
import {
  algoliaBootstrapIndex,
  algoliaIndexStatutes,
  algoliaHealthCheck,
  getAlgoliaStats,
  type AlgoliaStatuteRecord,
} from "../dist/index.js";

interface Args {
  batchSize: number;
  textTruncate: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { batchSize: 500, textTruncate: 5000 };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--batch=")) a.batchSize = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--truncate=")) a.textTruncate = parseInt(arg.split("=")[1], 10);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);

  console.log("=== Bootstrapping index settings ===");
  await algoliaBootstrapIndex();
  console.log("  searchable_attrs: citation_key, title, law_name, text");
  console.log("  facets: law_id, jurisdiction, doc_type");

  console.log("\n=== Algolia health check ===");
  const health = await algoliaHealthCheck();
  if (!health.ok) {
    console.error(" FAIL:", health.details);
    process.exit(1);
  }
  console.log(" ", health.details);

  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "lex",
    max: 4,
  });

  console.log("\n=== Pulling statutes from Postgres ===");
  const r = await pool.query<{
    id: string;
    law_id: string;
    law_name: string;
    location_id: string;
    doc_type: string;
    title: string;
    text: string;
    jurisdiction: string;
  }>(
    `SELECT id, law_id, law_name, location_id, doc_type, title, text, jurisdiction
     FROM statutes
     WHERE doc_type = 'SECTION' AND text IS NOT NULL AND text != ''
     ORDER BY law_id, location_id`
  );
  console.log(`  ${r.rows.length} rows pulled`);

  console.log("\n=== Pushing to Algolia ===");
  let totalSent = 0;
  for (let i = 0; i < r.rows.length; i += args.batchSize) {
    const batch = r.rows.slice(i, i + args.batchSize);
    const records: AlgoliaStatuteRecord[] = batch.map((s) => ({
      objectID: s.id,
      citation_key: `${s.law_id} ${s.location_id}`,
      law_id: s.law_id,
      law_name: s.law_name,
      location_id: s.location_id,
      title: s.title || "",
      // Truncate to fit within Algolia free tier 10KB-per-record limit.
      text: (s.text || "").slice(0, args.textTruncate),
      doc_type: s.doc_type,
      jurisdiction: s.jurisdiction || "NY",
      source_url: `https://www.nysenate.gov/legislation/laws/${s.law_id}/${s.location_id}`,
    }));
    const sent = await algoliaIndexStatutes(records);
    totalSent += sent;
    if (i % (args.batchSize * 10) === 0 || i + args.batchSize >= r.rows.length) {
      console.log(`  batch ${i / args.batchSize + 1}: total uploaded ${totalSent}/${r.rows.length}`);
    }
  }

  console.log("\n=== Final Algolia stats ===");
  // Algolia is eventually-consistent on counts; give it a moment
  await new Promise((res) => setTimeout(res, 1500));
  const stats = await getAlgoliaStats();
  console.log(`  app: ${stats.app_id}`);
  console.log(`  index: ${stats.index_name}`);
  console.log(`  records: ${stats.total_records}`);
  console.log(`  searchable_attrs: ${stats.searchable_attributes?.join(", ")}`);
  console.log(`  facets: ${stats.facets?.join(", ")}`);

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
