// Apply with explicit BEGIN/COMMIT (forces writable transaction)
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const sql = readFileSync(file, "utf-8");

const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await c.connect();
console.log("Connected.");

const t = Date.now();
try {
  await c.query("BEGIN");
  console.log("Begin OK");
  await c.query(sql);
  console.log("Query OK in " + (Date.now() - t) + " ms");
  await c.query("COMMIT");
  console.log("Commit OK");
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  console.error("FAIL after " + (Date.now() - t) + " ms: " + e.message);
  if (e.detail) console.error("  detail: " + e.detail);
  if (e.hint) console.error("  hint: " + e.hint);
  process.exit(1);
}

await c.end();
