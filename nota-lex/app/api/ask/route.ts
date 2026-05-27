import { NextRequest, NextResponse } from "next/server";
import { answer } from "@nota-lawyer/shared";
import { z } from "zod";

const AskRequestSchema = z.object({
  question: z.string().min(3).max(500),
  // Bright Data SERP is the default for every answer. Set to false only for
  // dev/cost-saving runs that want pure corpus retrieval.
  use_live_serp: z.boolean().optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await answer(parsed.data.question, {
      useLiveSerp: parsed.data.use_live_serp,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Ask failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
