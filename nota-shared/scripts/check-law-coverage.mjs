// Check coverage of common laws we want to demo with
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query(
  "SELECT s.law_id, COUNT(*) FILTER (WHERE s.doc_type='SECTION' AND s.text IS NOT NULL) AS sections, " +
  "       COUNT(DISTINCT e.content_id) FILTER (WHERE s.doc_type='SECTION') AS sections_embedded " +
  "FROM statutes s " +
  "LEFT JOIN embeddings e ON e.content_kind='statute' AND e.content_id=s.id " +
  "WHERE s.law_id IN ('GBS','PEN','BSC','GOL','CPL','CPLR','EDN','RPL','TAX','LAB') " +
  "GROUP BY s.law_id " +
  "ORDER BY s.law_id"
);
console.log("Demo-relevant laws:");
console.log("  law    sections    embedded    pct");
for (const row of r.rows) {
  const pct = row.sections > 0 ? Math.round(100 * row.sections_embedded / row.sections) : 0;
  console.log("  " + row.law_id.padEnd(6) + " " + String(row.sections).padStart(6) + "     " + String(row.sections_embedded).padStart(6) + "     " + pct + "%");
}

// Show a specific section's embed status
const gbs349 = await c.query(
  "SELECT s.law_id, s.location_id, s.title, LENGTH(s.text) AS text_len, " +
  "       COUNT(e.id) AS chunks " +
  "FROM statutes s " +
  "LEFT JOIN embeddings e ON e.content_id = s.id AND e.content_kind = 'statute' " +
  "WHERE s.law_id = 'GBS' AND s.location_id IN ('349','350','350-a','350-d') " +
  "GROUP BY s.id, s.law_id, s.location_id, s.title, s.text " +
  "ORDER BY s.location_id"
);
console.log("\nGBS deceptive practices sections:");
for (const row of gbs349.rows) {
  console.log("  GBS " + row.location_id + " | " + (row.title || "").slice(0, 50) + " | text=" + row.text_len + " | chunks=" + row.chunks);
}

await c.end();
