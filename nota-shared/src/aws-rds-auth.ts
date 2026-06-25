/**
 * Aurora IAM database authentication.
 *
 * When the DB host is an RDS/Aurora endpoint, password auth isn't available —
 * the pg pool password must be a fresh 15-minute IAM auth token, generated per
 * new connection via the AWS RDS signer. For local Postgres (localhost) we use
 * the static PGPASSWORD as before. node-postgres accepts a function (sync or
 * async) for `password`, called when it opens a new connection.
 *
 * On Vercel/AWS, requires AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
 * (the IAM user only needs the rds-db:connect permission).
 */
import { Signer } from "@aws-sdk/rds-signer";

export function isRdsHost(host: string): boolean {
  return /\.rds\.amazonaws\.com$/i.test(host);
}

export function pgPassword(
  host: string,
  port: number,
  user: string
): string | (() => Promise<string>) {
  if (isRdsHost(host)) {
    const signer = new Signer({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
      hostname: host,
      port,
      username: user,
    });
    // Fresh token per new connection (tokens are valid ~15 min; only checked
    // at connect time, so long-lived pooled connections keep working).
    return () => signer.getAuthToken();
  }
  return process.env.PGPASSWORD || "";
}
