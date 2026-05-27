import { NextResponse } from "next/server";
import { brightDataUsage } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Bright Data usage stats endpoint - proof of integration for the hackathon.
 *
 * Returns:
 *   - total/successful/failed request counts
 *   - breakdown by operation (web_unlocker vs serp)
 *   - total bytes fetched through Bright Data
 *   - recent request log (last 20 entries)
 */
export async function GET() {
  const stats = brightDataUsage.getStats();
  const recent = brightDataUsage.getAll().slice(-20).reverse();

  return NextResponse.json({
    integration: "Bright Data Web Unlocker + SERP",
    provider: "brightdata",
    stats,
    recent_requests: recent.map(r => ({
      timestamp: r.timestamp,
      operation: r.operation,
      url: r.url.length > 100 ? r.url.slice(0, 100) + "..." : r.url,
      zone: r.zone,
      status: r.status,
      duration_ms: r.duration_ms,
      bytes: r.bytes,
      error: r.error,
    })),
    documentation: {
      web_unlocker_docs: "https://docs.brightdata.com/scraping-automation/web-unlocker/introduction",
      serp_docs: "https://brightdata.com/products/serp-api",
      mcp_docs: "https://docs.brightdata.com/mcp-server/overview",
    },
  });
}
