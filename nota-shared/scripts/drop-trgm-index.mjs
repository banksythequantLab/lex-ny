// Drop the trigram index we're not using to free disk space
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 60000,
});
await c.connect();
console.log("Connected.");

// Check if trigram index exists
const check = await c.query("SELECT indexname FROM pg_indexes WHERE indexname = 'statutes_text_trgm_idx'");
if (check.rows.length === 0) {
  console.log("Index already gone.");
  await c.end();
  process.exit(0);
}

const t = Date.now();
console.log("Dropping statutes_text_trgm_idx (78 MB)...");
await c.query("BEGIN");
await c.query("DROP INDEX IF EXISTS statutes_text_trgm_idx");
await c.query("COMMIT");
console.log("Dropped in " + (Date.now() - t) + " ms");

// Verify
const after = await c.query("SELECT pg_size_pretty(pg_database_size('postgres')) AS total");
console.log("New database size: " + after.rows[0].total);

await c.end();
