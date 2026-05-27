/**
 * find-supabase-region.mjs - probe each AWS pooler region to find where
 * this Supabase project lives. We just attempt TCP+TLS connect and a STARTUP
 * packet; the response tells us if the tenant exists.
 *
 *   - "password authentication failed" => RIGHT region, wrong password
 *   - "Tenant or user not found"       => WRONG region, project isn't here
 */
import pg from "pg";

const projectRef = process.env.PROJECT_REF;
const password = process.env.PGPASSWORD;
if (!projectRef || !password) {
  console.error("Need PROJECT_REF and PGPASSWORD env vars");
  process.exit(1);
}

const regions = [
  "us-east-1", "us-east-2",
  "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-northeast-1", "ap-northeast-2",
  "ap-southeast-1", "ap-southeast-2",
  "ap-south-1", "sa-east-1", "ca-central-1",
];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 5000,
  });
  process.stdout.write(`  ${region.padEnd(18)} `);
  try {
    await client.connect();
    console.log("CONNECTED (this is the region!)");
    const r = await client.query("SELECT current_database(), version()");
    console.log("    db:", r.rows[0].current_database);
    console.log("    version:", r.rows[0].version.slice(0, 60));
    await client.end();
    console.log(`\n>>> Use:`);
    console.log(`>>> PGHOST=aws-0-${region}.pooler.supabase.com`);
    console.log(`>>> PGUSER=postgres.${projectRef}`);
    process.exit(0);
  } catch (e) {
    const msg = (e.message || String(e)).slice(0, 80);
    if (/password.*authentication.*failed/i.test(msg)) {
      console.log(`tenant exists, password wrong (${msg})`);
    } else if (/Tenant or user not found/i.test(msg)) {
      console.log("not here");
    } else {
      console.log(`other: ${msg}`);
    }
    try { await client.end(); } catch {}
  }
}

console.log("\nNo region matched. Project ref may be wrong, or it's in a region not in this list.");
process.exit(1);
