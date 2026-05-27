import { NextResponse } from "next/server";
import { getGraphStats, isNeo4jConfigured, neo4jHealthCheck } from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Neo4j citation graph stats - proof of HackerNoon sponsor integration.
 *
 * Returns:
 *   - Whether Neo4j is configured (NEO4J_URI/USER/PASSWORD env vars present)
 *   - Driver health check
 *   - Node counts by label (Opinion, Statute, Law, Court)
 *   - Relationship counts by type (CITES, APPLIES, REFERENCES, UNDER, DECIDED_BY)
 *   - Top cited opinions (most-referenced precedents)
 *   - Top applied statutes (most frequently litigated NY laws)
 */
export async function GET() {
  if (!isNeo4jConfigured()) {
    return NextResponse.json({
      integration: "Neo4j AuraDB citation graph",
      configured: false,
      message:
        "Neo4j not configured. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env.local. " +
        "Sign up for AuraDB Free at https://console.neo4j.io (HackerNoon hackathon partner).",
      setup_docs: "https://proofofusefulness.com/claim/neo4j",
    });
  }

  try {
    const health = await neo4jHealthCheck();
    if (!health.ok) {
      return NextResponse.json(
        { configured: true, ok: false, error: health.details },
        { status: 503 }
      );
    }

    const stats = await getGraphStats();
    return NextResponse.json({
      integration: "Neo4j AuraDB citation graph",
      health: health.details,
      stats,
      documentation: {
        schema: {
          nodes: ["Opinion", "Statute", "Law", "Court"],
          relationships: ["CITES", "APPLIES", "REFERENCES", "UNDER", "DECIDED_BY"],
        },
        graphrag_endpoint:
          "POST /api/ask?graphrag=true to enable graph-augmented retrieval",
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
