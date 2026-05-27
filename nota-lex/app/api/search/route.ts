import { NextRequest, NextResponse } from "next/server";
import { algoliaSearchStatutes, isAlgoliaConfigured } from "@nota-lawyer/shared";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(300),
  page: z.number().int().min(0).max(100).optional(),
  hitsPerPage: z.number().int().min(1).max(50).optional(),
  lawIdFilter: z.string().regex(/^[A-Z]{2,5}$/).optional(),
});

/**
 * Lexical/keyword search across the NY statute corpus, powered by Algolia.
 * Complementary to /api/ask (which uses pgvector semantic retrieval).
 * Use this endpoint when the user knows roughly what citation they want.
 */
export async function POST(req: NextRequest) {
  if (!isAlgoliaConfigured()) {
    return NextResponse.json(
      {
        error: "Algolia not configured",
        hint: "Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY in .env.local",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parsed = SearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await algoliaSearchStatutes(parsed.data.query, {
      page: parsed.data.page,
      hitsPerPage: parsed.data.hitsPerPage,
      lawIdFilter: parsed.data.lawIdFilter,
    });

    return NextResponse.json({
      provider: "algolia",
      ...result,
    });
  } catch (e) {
    console.error("Search failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
