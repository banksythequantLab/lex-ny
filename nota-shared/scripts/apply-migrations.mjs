/**
 * apply-migrations.mjs - Apply all .sql files in supabase/migrations/ in order
 *                        directly against the Supabase Postgres instance.
 *
 * Why direct connection instead of Supabase REST API?
 *   The REST API doesn't expose DDL execution. The CLI does, but it's a
 *   heavier dep and a separate install. Direct pg with the connection
 *   string we already have is the cleanest path.
 *
 * Reads secrets from process.env to avoid putting them on the CLI:
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *
 * Idempotent: each migration uses CREATE EXTENSION IF NOT EXISTS,
 * CREATE TABLE IF NOT EXISTS, INSERT ... ON CONFLICT DO NOTHING, and
 * CREATE OR REPLACE FUNCTION, so re-running on a partially-applied
 * database is safe. Re-running on a fully-applied database is a no-op.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migDir = join(here, "..", "supabase", "migrations");

const required = ["PGHOST", "PGUSER", "PGPASSWORD", "PGDATABASE"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },   // Supabase requires SSL; their self-signed cert is fine
  connectionTimeoutMillis: 15000,
});

const start = Date.now();
console.log(`Connecting to ${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE} ...`);
await client.connect();
console.log(`  connected in ${Date.now() - start} ms`);

const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`\nFound ${files.length} migration file(s):`);
for (const f of files) console.log(`  - ${f}`);

for (const f of files) {
  const sql = readFileSync(join(migDir, f), "utf-8");
  console.log(`\n=== Applying ${f} (${sql.length} chars) ===`);
  const t0 = Date.now();
  try {
    // Wrap in a transaction so each migration is atomic
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`  OK in ${Date.now() - t0} ms`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`  FAILED in ${Date.now() - t0} ms`);
    console.error(`  ${e.message}`);
    if (e.position) console.error(`  position: ${e.position}`);
    if (e.detail) console.error(`  detail:   ${e.detail}`);
    if (e.hint) console.error(`  hint:     ${e.hint}`);
    process.exit(1);
  }
}

// Quick verification
console.log("\n=== Verifying tables ===");
const r = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`);
console.log(`  ${r.rows.length} tables in public schema:`);
for (const row of r.rows) console.log(`    - ${row.table_name}`);

console.log("\n=== Verifying pgvector extension ===");
const ext = await client.query(`SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pg_trgm')`);
for (const e of ext.rows) console.log(`  ${e.extname} v${e.extversion}`);

await client.end();
console.log(`\nDone. Total time: ${Date.now() - start} ms`);
