// Apply the migration as separate statements (each function separately)
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const sql = readFileSync(file, "utf-8");

// Split on $$;  (the end of each function body)
const statements = sql.split(/\$\$;\s*$/m).filter(s => s.trim()).map(s => s.trim() + (s.includes("$$") ? "$$;" : ""));

console.log("Found " + statements.length + " statements");

const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await c.connect();
console.log("Connected.");

for (let i = 0; i < statements.length; i++) {
  const s = statements[i];
  if (!s.trim()) continue;
  console.log("\nStatement " + (i + 1) + "/" + statements.length + " (" + s.length + " chars):");
  console.log("  preview: " + s.slice(0, 100).replace(/\n/g, " "));
  const t = Date.now();
  try {
    await c.query(s);
    console.log("  OK in " + (Date.now() - t) + " ms");
  } catch (e) {
    console.error("  FAIL after " + (Date.now() - t) + " ms: " + e.message);
    if (e.detail) console.error("  detail: " + e.detail);
  }
}

await c.end();
console.log("Done.");
