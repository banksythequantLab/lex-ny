// Show law-by-law seeding progress
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await c.connect();

const r = await c.query(
  "SELECT COUNT(DISTINCT law_id) AS laws_seeded, " +
  "       COUNT(*) AS total_docs, " +
  "       COUNT(*) FILTER (WHERE doc_type = 'SECTION') AS sections, " +
  "       COUNT(*) FILTER (WHERE doc_type = 'SECTION' AND text IS NOT NULL AND text != '') AS sections_with_text " +
  "FROM statutes"
);
console.log(JSON.stringify(r.rows[0], null, 2));

const last = await c.query(
  "SELECT law_id, COUNT(*) AS docs, MAX(scraped_at) AS last_at " +
  "FROM statutes GROUP BY law_id ORDER BY MAX(scraped_at) DESC LIMIT 6"
);
console.log("\nLast 6 laws to receive inserts:");
for (const row of last.rows) {
  console.log("  " + row.law_id.padEnd(6) + " " + row.docs + " docs   at " + row.last_at);
}

await c.end();
