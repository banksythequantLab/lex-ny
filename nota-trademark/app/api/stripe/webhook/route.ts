import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature, extractSessionMetadata, getServiceClient } from "@nota-lawyer/shared";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const md = extractSessionMetadata(session);

    if (md.kind === "counsel_review" && md.filing_id) {
      // Record the payment
      await supabase.from("payments").insert({
        user_id: md.user_id,
        filing_id: md.filing_id,
        kind: "counsel_review",
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        amount_cents: session.amount_total || 5000,
        currency: session.currency || "usd",
        status: "paid",
        metadata: md.raw,
      });

      // Flip filing status to pending_review
      await supabase
        .from("filings")
        .update({ status: "pending_review", tier: "counsel" })
        .eq("id", md.filing_id);
    } else if (md.kind === "swag") {
      // Record swag purchase (could trigger Printify order here)
      await supabase.from("payments").insert({
        user_id: md.user_id || null,
        filing_id: null,
        kind: "swag",
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        amount_cents: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "paid",
        metadata: md.raw,
      });
      // TODO: trigger Printify order via their API
    }
  }

  return NextResponse.json({ received: true });
}
