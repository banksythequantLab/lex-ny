// Find what law_ids actually exist in the DB (because some I assumed may not match)
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query(
  "SELECT law_id, law_name, COUNT(*) AS sections " +
  "FROM statutes WHERE doc_type='SECTION' " +
  "GROUP BY law_id, law_name " +
  "ORDER BY law_id"
);
console.log("All law IDs in DB:");
for (const row of r.rows) {
  console.log("  " + row.law_id.padEnd(8) + " " + String(row.sections).padStart(5) + "  " + row.law_name);
}

await c.end();
