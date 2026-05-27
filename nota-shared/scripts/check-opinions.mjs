import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query(
  "SELECT court_id, COUNT(*) AS n, " +
  "       COUNT(*) FILTER (WHERE text_plain IS NOT NULL AND text_plain != '') AS with_text " +
  "FROM opinions GROUP BY court_id"
);
console.log("Opinions by court:");
for (const row of r.rows) {
  console.log("  " + row.court_id + ": " + row.n + " rows, " + row.with_text + " with text");
}

const sample = await c.query(
  "SELECT case_name, citation, decision_date, LENGTH(text_plain) AS text_len " +
  "FROM opinions ORDER BY scraped_at DESC LIMIT 5"
);
console.log("\nSample:");
for (const row of sample.rows) {
  console.log("  " + row.decision_date + " | " + row.case_name + " | text_len=" + row.text_len);
}

await c.end();
