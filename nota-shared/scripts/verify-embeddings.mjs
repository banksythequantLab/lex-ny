import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const total = await c.query("SELECT COUNT(*) FROM embeddings");
console.log("Total embedding rows:", total.rows[0].count);

const byKind = await c.query(
  "SELECT content_kind, COUNT(*) AS rows, COUNT(DISTINCT content_id) AS distinct_docs " +
  "FROM embeddings GROUP BY content_kind"
);
console.log("\nBy content kind:");
for (const r of byKind.rows) {
  console.log("  " + r.content_kind + ": " + r.rows + " rows across " + r.distinct_docs + " docs");
}

const sample = await c.query(
  "SELECT e.content_id, e.chunk_index, vector_dims(e.embedding) AS dims, " +
  "       LEFT(e.chunk_text, 80) AS text_preview, s.law_id, s.location_id, s.title " +
  "FROM embeddings e " +
  "JOIN statutes s ON s.id = e.content_id " +
  "WHERE e.content_kind = 'statute' " +
  "LIMIT 5"
);
console.log("\nSample rows:");
for (const r of sample.rows) {
  console.log("  " + r.law_id + " " + r.location_id + " (chunk " + r.chunk_index + ", dims=" + r.dims + ")");
  console.log("    title: " + (r.title || "(none)"));
  console.log("    preview: " + r.text_preview);
}

// Verify a vector similarity query against one of the embeddings actually works
const simTest = await c.query(`
  SELECT e1.content_id AS query_id, e2.content_id AS match_id,
         s1.law_id AS qlaw, s1.location_id AS qloc,
         s2.law_id AS mlaw, s2.location_id AS mloc,
         (1 - (e1.embedding <=> e2.embedding))::numeric(5,4) AS cosine_similarity
  FROM embeddings e1
  CROSS JOIN LATERAL (
    SELECT * FROM embeddings e2
    WHERE e2.content_id != e1.content_id AND e2.content_kind = 'statute'
    ORDER BY e1.embedding <=> e2.embedding
    LIMIT 3
  ) e2
  JOIN statutes s1 ON s1.id = e1.content_id
  JOIN statutes s2 ON s2.id = e2.content_id
  WHERE e1.content_kind = 'statute'
  LIMIT 9
`);
console.log("\nNearest-neighbor sanity check (most similar statutes):");
let lastQuery = "";
for (const r of simTest.rows) {
  const qStr = r.qlaw + " " + r.qloc;
  if (qStr !== lastQuery) {
    console.log("  query: " + qStr);
    lastQuery = qStr;
  }
  console.log("    -> " + r.mlaw + " " + r.mloc + "  cosine=" + r.cosine_similarity);
}

await c.end();
