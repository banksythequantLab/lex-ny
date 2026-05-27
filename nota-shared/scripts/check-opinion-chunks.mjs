import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query(
  "SELECT o.case_name, LENGTH(o.text_plain) AS text_len, " +
  "       COUNT(e.id) AS chunk_count, " +
  "       MAX(LENGTH(e.chunk_text)) AS max_chunk_chars " +
  "FROM opinions o " +
  "LEFT JOIN embeddings e ON e.content_id = o.id AND e.content_kind = 'opinion' " +
  "GROUP BY o.id, o.case_name, o.text_plain " +
  "ORDER BY text_len DESC"
);
console.log("Opinions vs embedding state:");
for (const row of r.rows) {
  console.log("  " + row.case_name + " | text=" + row.text_len + " | chunks=" + row.chunk_count + " | max_chunk_chars=" + row.max_chunk_chars);
}

await c.end();
