import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { FilingSchema } from "@nota-lawyer/shared";

export const runtime = "nodejs";

// POST /api/filings — create a new filing
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { error, data } = await supabase
    .from("filings")
    .insert({
      user_id: user.id,
      kind: body.kind || "trademark",
      tier: body.tier || "free",
      status: "draft",
      wizard_data: body.wizard_data || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PATCH /api/filings?id=... — update an existing filing
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await req.json();
  const { error, data } = await supabase
    .from("filings")
    .update({
      wizard_data: body.wizard_data,
      tier: body.tier,
      status: body.status,
      conflict_report: body.conflict_report,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
