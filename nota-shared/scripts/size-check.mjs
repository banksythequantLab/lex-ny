import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const r = await c.query("SELECT pg_size_pretty(pg_database_size('postgres')) AS total");
console.log("db size: " + r.rows[0].total);

const idx = await c.query(
  "SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size " +
  "FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'statutes_text_trgm_idx'"
);
if (idx.rows.length) {
  console.log("trgm idx still present: " + idx.rows[0].size);
} else {
  console.log("trgm idx is gone");
}

// Also count remaining indexes
const all = await c.query(
  "SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size " +
  "FROM pg_indexes WHERE schemaname = 'public' " +
  "ORDER BY pg_relation_size(indexname::regclass) DESC LIMIT 5"
);
console.log("\nTop 5 indexes:");
for (const row of all.rows) {
  console.log("  " + row.indexname.padEnd(50) + " " + row.size);
}

await c.end();
