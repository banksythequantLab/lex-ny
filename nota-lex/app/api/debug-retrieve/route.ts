import { NextResponse } from "next/server";
import { retrieve } from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question } = await req.json();
  try {
    const r = await retrieve(question, { limit: 8 });
    return NextResponse.json({
      ok: true,
      opinion_count: r.opinions.length,
      statute_count: r.statutes.length,
      duration_ms: r.durationMs,
      embedding_dim: r.queryEmbedding.length,
      statutes_sample: r.statutes.slice(0, 5).map(s => ({
        law: s.law_id + " " + s.location_id,
        title: s.title?.slice(0, 60),
        vec: s.vector_score?.toFixed(4),
        kw: s.keyword_score?.toFixed(4),
        combined: s.combined_score?.toFixed(4),
      })),
      opinions_sample: r.opinions.slice(0, 5).map(o => ({
        case: o.case_name,
        vec: o.vector_score?.toFixed(4),
        combined: o.combined_score?.toFixed(4),
      })),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
