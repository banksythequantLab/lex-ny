// Diagnose database disk usage and find what's eating space
import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

// Total database size
const dbSize = await c.query("SELECT pg_size_pretty(pg_database_size('postgres')) AS total");
console.log("Total postgres database size: " + dbSize.rows[0].total);

// Per-table sizes (including indexes)
const tableSize = await c.query(`
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) AS index_size,
    pg_total_relation_size(schemaname || '.' || tablename) AS sort_bytes
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
  LIMIT 15
`);
console.log("\nTop tables by size:");
console.log("  table                    total      table      indexes");
for (const r of tableSize.rows) {
  console.log("  " + r.tablename.padEnd(24) + " " + r.total_size.padStart(8) + "   " + r.table_size.padStart(8) + "   " + r.index_size.padStart(8));
}

// pgvector index can be huge
const idx = await c.query(`
  SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
  FROM pg_indexes WHERE schemaname = 'public'
  ORDER BY pg_relation_size(indexname::regclass) DESC LIMIT 5
`);
console.log("\nTop indexes:");
for (const r of idx.rows) {
  console.log("  " + r.indexname.padEnd(40) + " " + r.size);
}

await c.end();
