// Debug version - print every step
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const sql = readFileSync(file, "utf-8");

console.log("Step 1: creating client");
const c = new pg.Client({
  host: process.env.PGHOST,
  port: 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

c.on("error", (e) => console.log("CLIENT ERROR:", e.message));
c.on("notice", (n) => console.log("NOTICE:", n.message));

try {
  console.log("Step 2: connecting...");
  await c.connect();
  console.log("Step 3: connected");

  console.log("Step 4: running query...");
  const t = Date.now();
  const r = await c.query(sql);
  console.log("Step 5: query returned in", Date.now() - t, "ms");
  console.log("rowCount:", r.rowCount);

  console.log("Step 6: closing");
  await c.end();
  console.log("Step 7: done");
} catch (e) {
  console.error("EXCEPTION:", e.message);
  console.error("  code:", e.code);
  console.error("  severity:", e.severity);
  console.error("  detail:", e.detail);
  console.error("  hint:", e.hint);
  console.error("  position:", e.position);
  console.error("  stack:", e.stack?.split("\n").slice(0, 3).join("\n"));
  process.exit(1);
}
