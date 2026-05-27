import { NextResponse } from "next/server";
import {
  isStoryblokConfigured,
  getStoryblokStats,
  storyblokHealthCheck,
} from "@nota-lawyer/shared";

export const runtime = "nodejs";

/**
 * Storyblok integration stats - proof of HackerNoon sponsor integration.
 */
export async function GET() {
  if (!isStoryblokConfigured()) {
    return NextResponse.json({
      integration: "Storyblok headless CMS",
      configured: false,
      message:
        "Storyblok not configured. Set STORYBLOK_ACCESS_TOKEN in .env.local. " +
        "45-day Growth+ free trial at https://www.storyblok.com (HackerNoon hackathon partner, worth $540).",
      setup_docs: "https://proofofusefulness.com/claim/storyblok",
    });
  }

  try {
    const health = await storyblokHealthCheck();
    if (!health.ok) {
      return NextResponse.json(
        { configured: true, ok: false, error: health.details },
        { status: 503 }
      );
    }
    const stats = await getStoryblokStats();
    return NextResponse.json({
      integration: "Storyblok headless CMS",
      health: health.details,
      stats,
      documentation: {
        blog_page: "/blog",
        space_dashboard: "https://app.storyblok.com",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
