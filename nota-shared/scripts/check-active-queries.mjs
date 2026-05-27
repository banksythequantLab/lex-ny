import pg from "pg";
const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const active = await c.query(
  "SELECT pid, usename, application_name, state, query_start, state_change, " +
  "       LEFT(query, 120) AS query " +
  "FROM pg_stat_activity " +
  "WHERE state IS NOT NULL AND state != 'idle' AND datname = 'postgres' " +
  "ORDER BY query_start DESC NULLS LAST LIMIT 10"
);

console.log("Active queries on Supabase right now:");
if (active.rows.length === 0) {
  console.log("  (none - DB is idle, seed process is not currently running queries)");
} else {
  for (const r of active.rows) {
    console.log("  pid " + r.pid + "  user=" + r.usename + "  state=" + r.state);
    console.log("    query: " + r.query);
    console.log("    started: " + r.query_start);
  }
}

await c.end();
