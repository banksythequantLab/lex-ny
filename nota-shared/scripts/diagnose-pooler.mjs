// Verbose version - print everything the connection emits
import pg from "pg";

const c = new pg.Client({
  host: process.env.PGHOST, port: 5432,
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

c.on("error", (e) => { console.log("ERR:", e.message); });
c.on("notice", (n) => { console.log("NOTICE:", n.message); });
c.on("end", () => { console.log("END"); });

console.log("connect...");
await c.connect();
console.log("connected");

// Trivial probe
const r = await c.query("SELECT current_user, current_database()");
console.log("user/db:", r.rows[0]);

// Existing function check
const fn = await c.query("SELECT proname FROM pg_proc WHERE proname LIKE 'lex_%' OR proname = 'match_embeddings_ann'");
console.log("existing fns:", fn.rows);

// Try a one-line function with vector parameter — see what happens
console.log("\nAttempt 1: simple function with vector parameter...");
try {
  const t = Date.now();
  await c.query("CREATE OR REPLACE FUNCTION test_vec_fn(v vector(1024)) RETURNS INTEGER LANGUAGE SQL AS $$ SELECT 1; $$");
  console.log("OK in " + (Date.now() - t) + " ms");
  await c.query("DROP FUNCTION test_vec_fn(vector)");
  console.log("dropped");
} catch (e) {
  console.log("FAIL:", e.message);
}

console.log("\nAttempt 2: function with TEXT parameter (no vector)...");
try {
  const t = Date.now();
  await c.query("CREATE OR REPLACE FUNCTION test_text_fn(v TEXT) RETURNS INTEGER LANGUAGE SQL AS $$ SELECT 1; $$");
  console.log("OK in " + (Date.now() - t) + " ms");
  await c.query("DROP FUNCTION test_text_fn(TEXT)");
  console.log("dropped");
} catch (e) {
  console.log("FAIL:", e.message);
}

await c.end();
