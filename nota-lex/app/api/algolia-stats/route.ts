import { NextResponse } from "next/server";
import { isAlgoliaConfigured, getAlgoliaStats, algoliaHealthCheck } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Algolia integration stats - proof of HackerNoon sponsor integration.
 *
 * Returns:
 *   - Whether Algolia is configured (ALGOLIA_APP_ID + key)
 *   - Health check
 *   - Index name + total record count
 *   - Searchable attributes and facets
 */
export async function GET() {
  if (!isAlgoliaConfigured()) {
    return NextResponse.json({
      integration: "Algolia federated search",
      configured: false,
      message:
        "Algolia not configured. Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY in .env.local. " +
        "Sign up for the free Build tier at https://www.algolia.com (HackerNoon hackathon partner: 10K searches/mo, 1M records).",
      setup_docs: "https://proofofusefulness.com/claim/algolia",
    });
  }

  try {
    const health = await algoliaHealthCheck();
    if (!health.ok) {
      return NextResponse.json(
        { configured: true, ok: false, error: health.details },
        { status: 503 }
      );
    }

    const stats = await getAlgoliaStats();
    return NextResponse.json({
      integration: "Algolia federated search",
      health: health.details,
      stats,
      documentation: {
        search_endpoint: "POST /api/search with { query, page, lawIdFilter? }",
        index_url: stats.app_id
          ? `https://www.algolia.com/apps/${stats.app_id}/explorer/browse/${stats.index_name}`
          : undefined,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
