import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

// Find all PEN sections in the 70-series (sentencing) and 125-series (homicide)
const r = await c.query(
  "SELECT s.law_id, s.location_id, LEFT(s.title, 60) AS title, " +
  "       LENGTH(s.text) AS text_len, " +
  "       COUNT(e.id) AS chunks " +
  "FROM statutes s " +
  "LEFT JOIN embeddings e ON e.content_id = s.id AND e.content_kind = 'statute' " +
  "WHERE s.law_id = 'PEN' AND (s.location_id LIKE '125%' OR s.location_id LIKE '70%') " +
  "  AND s.doc_type = 'SECTION' " +
  "GROUP BY s.id, s.law_id, s.location_id, s.title, s.text " +
  "ORDER BY s.location_id"
);
console.log("PEN 125.* (homicide) and 70.* (sentencing) sections:");
console.log("  loc        title                                                      text  chunks");
for (const row of r.rows) {
  console.log(
    "  PEN " + row.location_id.padEnd(8) + " " + (row.title || "").padEnd(58) +
    " " + String(row.text_len).padStart(5) + "  " + String(row.chunks).padStart(2)
  );
}

await c.end();
