import { NextRequest, NextResponse } from "next/server";
import {
  answer,
  rateLimit,
  clientIp,
  rateLimitResponse,
} from "@nota-lawyer/shared";
import { z } from "zod";

const AskRequestSchema = z.object({
  question: z.string().min(3).max(500),
  // Bright Data SERP is the default for every answer. Set to false only for
  // dev/cost-saving runs that want pure corpus retrieval.
  use_live_serp: z.boolean().optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * /api/ask — non-streaming Q&A endpoint.
 *
 * Rate-limited at 10 requests / minute per client IP. Each call triggers
 * three Bright Data requests + a Groq completion + Postgres vector search
 * + Neo4j graph expansion, so this is the costliest endpoint on the box.
 */
export async function POST(req: NextRequest) {
  // Rate limit BEFORE doing any expensive work.
  const limit = rateLimit({
    key: `ask:${clientIp(req)}`,
    max: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    const r = rateLimitResponse(limit);
    return new NextResponse(r.body, { status: r.status, headers: r.headers });
  }

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

    const res = NextResponse.json(result);
    res.headers.set("X-RateLimit-Remaining", String(limit.remaining));
    res.headers.set("X-RateLimit-Reset", String(Math.ceil(limit.resetAt / 1000)));
    return res;
  } catch (e) {
    console.error("Ask failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
