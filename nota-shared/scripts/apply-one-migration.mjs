// Apply just one specific migration file
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node apply-one-migration.mjs <path>");
  process.exit(1);
}

const sql = readFileSync(file, "utf-8");
const c = new pg.Client({
  host: process.env.PGHOST,
  port: 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 600000, // 10 min for the long index rebuild
});

console.log("Connecting...");
await c.connect();
console.log("Applying " + file + " (" + sql.length + " chars)...");
const t0 = Date.now();
try {
  await c.query("BEGIN");
  await c.query(sql);
  await c.query("COMMIT");
  console.log("OK in " + (Date.now() - t0) + " ms");
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  console.error("FAIL after " + (Date.now() - t0) + " ms: " + e.message);
  if (e.detail) console.error("  detail: " + e.detail);
  if (e.hint) console.error("  hint: " + e.hint);
  process.exit(1);
}
await c.end();
