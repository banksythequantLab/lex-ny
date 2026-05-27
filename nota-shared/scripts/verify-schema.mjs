import pg from "pg";

const client = new pg.Client({
  host: process.env.PGHOST,
  port: 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const courts = await client.query("SELECT id, full_name, level FROM courts ORDER BY id");
console.log("Courts seeded:");
for (const c of courts.rows) {
  console.log("  " + c.id.padEnd(12) + " " + c.level.padEnd(15) + " " + c.full_name);
}

const fns = await client.query(
  "SELECT routine_name FROM information_schema.routines " +
  "WHERE routine_schema = 'public' AND routine_name LIKE 'lex_%' ORDER BY routine_name"
);
console.log("\nHybrid-search functions:");
for (const r of fns.rows) console.log("  " + r.routine_name);

const rls = await client.query(
  "SELECT tablename, rowsecurity FROM pg_tables " +
  "WHERE schemaname='public' AND tablename IN ('opinions','statutes','embeddings','courts','judges') " +
  "ORDER BY tablename"
);
console.log("\nRLS on corpus tables:");
for (const r of rls.rows) console.log("  " + r.tablename.padEnd(15) + " rowsecurity=" + r.rowsecurity);

const indexes = await client.query(
  "SELECT tablename, indexname FROM pg_indexes " +
  "WHERE schemaname='public' AND (indexname LIKE '%vector%' OR indexname LIKE '%trgm%' OR indexname LIKE '%embeddings%') " +
  "ORDER BY tablename, indexname"
);
console.log("\nSpecialized indexes (vector / pg_trgm):");
for (const r of indexes.rows) console.log("  " + r.tablename.padEnd(15) + " " + r.indexname);

await client.end();
