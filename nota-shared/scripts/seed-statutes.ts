/**
 * seed-statutes.ts - Bulk-seed NY Consolidated Laws from NY Senate
 *                    OpenLegislation into local Postgres.
 *
 * Usage:
 *   npx tsx scripts/seed-statutes.ts                # all 137 laws
 *   npx tsx scripts/seed-statutes.ts --laws=EDN,TAX # specific laws only
 *
 * Required env:
 *   NY_SENATE_API_KEY
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *
 * 137 laws total. The big ones (Penal, Tax, Real Property) are several
 * MB each. Wall-clock to seed all of them on local Postgres: 5-15 min.
 *
 * Idempotent: re-running upserts on (source, jurisdiction, law_id, location_id).
 */

import pg from "pg";
import { NySenateClient } from "../src/scrapers/ny-senate.js";

interface Args {
  laws: string[] | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { laws: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--laws=")) args.laws = a.split("=")[1].split(",");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "lex",
    max: 4,
  });

  // Test connection
  const test = await pool.query("SELECT current_database(), version()");
  console.log("Connected to:", test.rows[0].current_database);

  const ny = new NySenateClient();

  console.log("Listing all NY laws...");
  const lawIds = (await ny.listLaws())
    .filter((l) => args.laws === null || args.laws.includes(l.lawId));

  console.log(`Will seed ${lawIds.length} laws.`);

  let totalSections = 0;

  for (const lawInfo of lawIds) {
    console.log(`\n=== ${lawInfo.lawId} (${lawInfo.name}) ===`);
    try {
      const tree = await ny.getLawTree(lawInfo.lawId, { full: true });
      const flat = NySenateClient.flattenTree(tree);
      console.log(`  ${flat.length} documents in tree`);

      const locationToDbId: Record<string, string> = {};

      // Batch insert in a single transaction for speed
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const { doc } of flat) {
          const res = await client.query(
            `INSERT INTO statutes (
               source, scraper_provider, source_url, jurisdiction,
               law_id, law_name, law_type, location_id, doc_type, doc_level_id,
               title, text, active_date, repealed, repealed_date, sequence_no
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             ON CONFLICT (source, jurisdiction, law_id, location_id)
             DO UPDATE SET
               title = EXCLUDED.title,
               text = EXCLUDED.text,
               active_date = EXCLUDED.active_date,
               repealed = EXCLUDED.repealed,
               repealed_date = EXCLUDED.repealed_date,
               sequence_no = EXCLUDED.sequence_no,
               scraped_at = now()
             RETURNING id`,
            [
              "ny_senate_openleg",
              "direct",
              `https://www.nysenate.gov/legislation/laws/${lawInfo.lawId}/${doc.locationId}`,
              "NY",
              lawInfo.lawId,
              lawInfo.name,
              lawInfo.lawType,
              doc.locationId,
              doc.docType,
              doc.docLevelId,
              doc.title,
              doc.text,
              doc.activeDate,
              doc.repealed || false,
              doc.repealedDate,
              doc.sequenceNo,
            ]
          );
          if (res.rows[0]) {
            locationToDbId[doc.locationId] = res.rows[0].id;
            if (doc.docType === "SECTION" && doc.text) totalSections++;
          }
        }

        // Wire up parent_id links in the same transaction
        for (const { parentLocationId, doc } of flat) {
          if (!parentLocationId) continue;
          const myId = locationToDbId[doc.locationId];
          const parentId = locationToDbId[parentLocationId];
          if (myId && parentId) {
            await client.query("UPDATE statutes SET parent_id = $1 WHERE id = $2", [parentId, myId]);
          }
        }

        await client.query("COMMIT");
        console.log(`  ${lawInfo.lawId}: done (running total sections=${totalSections})`);
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    } catch (e) {
      console.error(`  ${lawInfo.lawId} FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\nTotal SECTION-level statutes with text: ${totalSections}`);
  await pool.end();
}

main().then(() => process.exit(0)).catch((e) => { console.error("Fatal:", e); process.exit(1); });
