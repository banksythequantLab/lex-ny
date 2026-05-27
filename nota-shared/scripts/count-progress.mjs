import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const counts = await c.query(
  "SELECT law_id, doc_type, COUNT(*) AS n FROM statutes GROUP BY law_id, doc_type ORDER BY law_id, doc_type"
);
console.log("law_id  doc_type    count");
for (const r of counts.rows) {
  console.log("  " + r.law_id.padEnd(6) + "  " + r.doc_type.padEnd(10) + "  " + r.n);
}

const total = await c.query("SELECT COUNT(*) FROM statutes");
console.log("\nTOTAL statutes:", total.rows[0].count);

const withText = await c.query(
  "SELECT COUNT(*) FROM statutes WHERE doc_type = 'SECTION' AND text IS NOT NULL AND text != ''"
);
console.log("SECTION rows with text:", withText.rows[0].count);

const withParent = await c.query("SELECT COUNT(*) FROM statutes WHERE parent_id IS NOT NULL");
console.log("rows with parent_id:", withParent.rows[0].count);

const opCount = await c.query("SELECT COUNT(*) FROM opinions");
console.log("opinions:", opCount.rows[0].count);

await c.end();
