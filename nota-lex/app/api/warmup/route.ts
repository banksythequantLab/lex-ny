import { NextResponse } from "next/server";
import pg from "pg";
import { Signer } from "@aws-sdk/rds-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /api/warmup — wake the Aurora cluster and report readiness.
 *
 * Aurora Serverless v2 scales to zero between visits to save compute, so the
 * first request after an idle period must resume the instance (a cold start).
 * The client prefetches this on page load and polls it: a short connection
 * timeout means a cold cluster returns { ready:false } quickly (while the
 * connection attempt itself nudges the resume along), and a later poll returns
 * { ready:true } once the cluster is live. Same IAM/SSL auth as retrieval.
 */

function pgPassword(host: string, port: number, user: string): string | (() => Promise<string>) {
  if (/\.rds\.amazonaws\.com$/i.test(host)) {
    const accessKeyId = process.env.NOTA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NOTA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const signer = new Signer({
      region: process.env.NOTA_AWS_REGION || process.env.AWS_REGION || "us-east-1",
      hostname: host,
      port,
      username: user,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    return () => signer.getAuthToken();
  }
  return process.env.PGPASSWORD || "";
}

export async function GET() {
  const t0 = Date.now();
  const host = process.env.PGHOST || "localhost";
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER || "postgres";
  const needsSSL = /\.amazonaws\.|\.rds\./.test(host);

  let password: string;
  try {
    const pw = pgPassword(host, port, user);
    password = typeof pw === "function" ? await pw() : pw;
  } catch (e) {
    return NextResponse.json(
      { ready: false, warming: false, error: "auth", detail: e instanceof Error ? e.message : String(e) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const client = new pg.Client({
    host,
    port,
    user,
    password,
    database: process.env.PGDATABASE || "lex",
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 4500,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return NextResponse.json(
      { ready: true, ms: Date.now() - t0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ready: false, warming: true, ms: Date.now() - t0, detail: e instanceof Error ? e.message : String(e) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    client.end().catch(() => {});
  }
}
