import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createCounselCheckoutSession } from "@nota-lawyer/shared";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { filing_id } = body;
  if (!filing_id) {
    return NextResponse.json({ error: "Missing filing_id" }, { status: 400 });
  }

  // Verify the user owns this filing
  const { data: filing } = await supabase
    .from("filings")
    .select("*")
    .eq("id", filing_id)
    .eq("user_id", user.id)
    .single();

  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") || "https://trademark.nota.lawyer";
  const session = await createCounselCheckoutSession({
    filing_id: filing.id,
    user_id: user.id,
    user_email: user.email!,
    filing_kind: filing.kind,
    successUrl: `${origin}/wizard?filing_id=${filing.id}&paid=true`,
    cancelUrl: `${origin}/wizard?filing_id=${filing.id}`,
  });

  // Mark the filing as pending_payment, store session id
  await supabase
    .from("filings")
    .update({
      status: "pending_payment",
      tier: "counsel",
      stripe_session_id: session.session_id,
    })
    .eq("id", filing_id);

  return NextResponse.json(session);
}
