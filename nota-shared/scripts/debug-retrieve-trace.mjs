/**
 * Debug what retrieve.ts does inside the Next.js dev server
 *
 * Usage:
 *   pwsh -File run-step.ps1 scripts/debug-retrieve-trace.mjs
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

const q = "What are the requirements for a firearms license under New York Penal Law section 400.00?";
console.log("Query:", q);

const t0 = Date.now();
const v = await embed(q);
console.log("Embed:", Date.now() - t0, "ms, dim=" + v.length);

// Mimic retrieve.ts annSearch SQL exactly
const vec = "[" + v.join(",") + "]";
const limit = 8;
const candidateLimit = limit * 2;

const sql = `
  WITH ranked AS (
    SELECT
      content_id,
      embedding <=> $1::vector AS distance
    FROM embeddings
    WHERE content_kind = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  )
  SELECT content_id, MIN(distance) AS best_distance
  FROM ranked
  GROUP BY content_id
  ORDER BY MIN(distance)
  LIMIT $4
`;

console.log("\n=== annSearch(statute) ===");
const t1 = Date.now();
const r1 = await pool.query(sql, [vec, "statute", candidateLimit, limit]);
console.log("Took:", Date.now() - t1, "ms");
console.log("Rows:", r1.rows.length);

// Hydrate
if (r1.rows.length > 0) {
  const ids = r1.rows.map(r => r.content_id);
  const t2 = Date.now();
  const hyd = await pool.query(
    "SELECT id, law_id, location_id, title FROM statutes WHERE id = ANY($1::uuid[]) AND doc_type='SECTION'",
    [ids]
  );
  console.log("Hydrate:", Date.now() - t2, "ms");
  for (const row of hyd.rows) {
    const a = r1.rows.find(x => x.content_id === row.id);
    console.log("  " + row.law_id + " " + row.location_id + " | dist=" + Number(a.best_distance).toFixed(4) + " | " + (row.title || "").slice(0, 50));
  }
}

await pool.end();
