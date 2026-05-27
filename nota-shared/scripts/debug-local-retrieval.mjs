/**
 * Debug retrieval against local Postgres - what does the ANN search actually return?
 *
 * Usage:
 *   pwsh -File run-step.ps1 scripts/debug-local-retrieval.mjs
 * (run-step.ps1 sources .env.local for PG* env vars)
 */
import pg from "pg";
import { embed } from "../dist/embeddings.js";

if (!process.env.PGPASSWORD) {
  console.error("ERROR: PGPASSWORD env var required. Source .env.local first.");
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "lex",
});

const queries = [
  "What does Alcoholic Beverage Control section 103 say about manufacturers?",
  "alcoholic beverage manufacturers",
  "ABC 103",
  "manufacturer wholesaler liquor",
];

for (const q of queries) {
  console.log("\n=== Query: " + q + " ===");
  const t0 = Date.now();
  const v = await embed(q);
  const embedMs = Date.now() - t0;

  const t1 = Date.now();
  const r = await pool.query(
    `SELECT s.law_id, s.location_id, s.title,
            MIN(e.embedding <=> $1::vector) AS distance
     FROM embeddings e
     JOIN statutes s ON s.id = e.content_id
     WHERE e.content_kind = 'statute'
     GROUP BY s.id, s.law_id, s.location_id, s.title
     ORDER BY MIN(e.embedding <=> $1::vector)
     LIMIT 8`,
    ["[" + v.join(",") + "]"]
  );
  const queryMs = Date.now() - t1;

  console.log("  embed=" + embedMs + "ms, query=" + queryMs + "ms");
  for (const row of r.rows) {
    console.log("  " + row.law_id + " " + row.location_id + " | dist=" + Number(row.distance).toFixed(4) + " | " + (row.title || "").slice(0, 50));
  }
}

await pool.end();
