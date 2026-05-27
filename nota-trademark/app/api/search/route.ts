import { NextRequest, NextResponse } from "next/server";
import { runConflictSearch, FilingKindSchema } from "@nota-lawyer/shared";
import { z } from "zod";

const SearchRequestSchema = z.object({
  mark: z.string().min(1).max(200),
  classes: z.array(z.number().int().min(1).max(45)).min(1).max(10),
  filing_kind: FilingKindSchema.default("trademark"),
  // Optional override of WEB_DATA_PROVIDER env var. Lets us demo Bright Data
  // and Nimble side-by-side without restarting the server.
  provider: z.enum(["brightdata", "nimble"]).optional(),
});

// Class number -> human-readable description, used to seed the common-law search
const CLASS_DESCRIPTIONS: Record<number, string> = {
  9: "computer software",
  25: "clothing",
  35: "advertising business services",
  41: "education entertainment",
  42: "technology services software design",
  // Add more as needed; full 45 are in the wizard
};

export const runtime = "nodejs";
export const maxDuration = 60;  // Web data + LLM can take 30+ seconds

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { mark, classes, filing_kind, provider } = parsed.data;

    const classDescriptions = classes
      .map((c) => CLASS_DESCRIPTIONS[c])
      .filter(Boolean);

    const report = await runConflictSearch({
      mark,
      classes,
      class_descriptions: classDescriptions,
      filing_kind,
      provider,  // undefined = use env var default
    });

    return NextResponse.json(report);
  } catch (e) {
    console.error("Search failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
