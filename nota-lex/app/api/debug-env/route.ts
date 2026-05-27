import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGDATABASE: process.env.PGDATABASE,
    PGPASSWORD_set: !!process.env.PGPASSWORD,
    OLLAMA_EMBED_URL: process.env.OLLAMA_EMBED_URL,
    OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL,
    GROQ_API_KEY_set: !!process.env.GROQ_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
