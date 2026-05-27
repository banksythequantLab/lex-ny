/**
 * Probe Supavisor "aws-1-*" pooler hostnames for this project.
 */
import pg from "pg";

const projectRef = process.env.PROJECT_REF;
const password = process.env.PGPASSWORD;
if (!projectRef || !password) { console.error("need env"); process.exit(1); }

const regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "eu-west-2", "ap-northeast-1", "ap-southeast-1", "ap-southeast-2", "ap-south-1", "sa-east-1", "ca-central-1"];

for (const region of regions) {
  for (const generation of ["aws-1"]) {
    const host = `${generation}-${region}.pooler.supabase.com`;
    for (const user of [`postgres.${projectRef}`, "postgres"]) {
      const client = new pg.Client({
        host, port: 5432, user, password, database: "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      process.stdout.write(`  ${generation} ${region.padEnd(16)} user=${user.padEnd(40)} `);
      try {
        await client.connect();
        const r = await client.query("SELECT current_database()");
        console.log(`CONNECTED  db=${r.rows[0].current_database}`);
        await client.end();
        console.log(`\n>>> WORKS:`);
        console.log(`>>> PGHOST=${host}`);
        console.log(`>>> PGUSER=${user}`);
        process.exit(0);
      } catch (e) {
        const msg = (e.message || String(e)).slice(0, 60);
        if (/password.*authentication.*failed/i.test(msg))   console.log("AUTH-FAIL (tenant exists!)");
        else if (/Tenant or user not found/i.test(msg))     console.log("not here");
        else if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(e.code || "")) console.log(`${e.code}`);
        else                                                 console.log(msg);
        try { await client.end(); } catch {}
      }
    }
  }
}
console.log("\nNo aws-1 region matched.");
process.exit(1);
