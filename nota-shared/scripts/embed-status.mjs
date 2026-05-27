// Quick embed status checker. Reads PG* env vars.
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST,
  port: 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await c.connect();

const r = await c.query(
  "SELECT content_kind, COUNT(*) AS rows, COUNT(DISTINCT content_id) AS docs " +
  "FROM embeddings GROUP BY content_kind ORDER BY content_kind"
);
console.log("Embeddings by kind:");
for (const row of r.rows) {
  console.log("  " + row.content_kind + ": " + row.rows + " rows across " + row.docs + " docs");
}

const u1 = await c.query(
  "SELECT COUNT(*) AS pending FROM statutes s " +
  "WHERE s.doc_type = 'SECTION' AND s.text IS NOT NULL AND s.text != '' " +
  "AND NOT EXISTS (SELECT 1 FROM embeddings e WHERE e.content_kind = 'statute' AND e.content_id = s.id)"
);
console.log("\nStatute SECTIONs still unembedded: " + u1.rows[0].pending);

const u2 = await c.query(
  "SELECT COUNT(*) AS pending FROM opinions o " +
  "WHERE o.text_plain IS NOT NULL AND o.text_plain != '' " +
  "AND NOT EXISTS (SELECT 1 FROM embeddings e WHERE e.content_kind = 'opinion' AND e.content_id = o.id)"
);
console.log("Opinions still unembedded: " + u2.rows[0].pending);

await c.end();
