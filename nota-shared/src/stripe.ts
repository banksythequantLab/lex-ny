/**
 * Stripe helpers for the Nota.Lawyer platform.
 *
 * Two payment kinds:
 *   - counsel_review: $50 attorney review tier, triggered after wizard completion
 *   - swag: t-shirts, hoodies, etc. — sold via Stripe Buy Buttons on nota.lawyer/swag
 *
 * Setup:
 *   1. Stripe account at stripe.com (test mode by default — that's what we want)
 *   2. Developers → API keys → copy publishable + secret keys
 *   3. Set environment variables:
 *        STRIPE_SECRET_KEY=sk_test_...
 *        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 *        STRIPE_WEBHOOK_SECRET=whsec_...  (after creating webhook endpoint)
 *   4. Run scripts/setup-stripe.ts (in nota-shared) to create products
 */

import Stripe from "stripe";
import type { PaymentKind } from "./types.js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/**
 * Get a configured Stripe client. Cached.
 */
let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(getEnv("STRIPE_SECRET_KEY"), {
    // Use SDK default API version - update via Stripe dashboard, not in code
    typescript: true,
  });

  return stripeClient;
}

/**
 * Create a Checkout session for the $50 Counsel attorney review tier.
 *
 * Returns the session URL the user should be redirected to. After payment,
 * Stripe redirects to successUrl (we wire the webhook to flip the filing
 * status to pending_review).
 */
export async function createCounselCheckoutSession(opts: {
  filing_id: string;
  user_id: string;
  user_email: string;
  filing_kind: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ session_id: string; url: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: opts.user_email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Nota.Lawyer — Counsel-tier attorney review",
            description: `15-minute attorney review of your ${opts.filing_kind} filing by Derek Soltis, Esq. (NY, S.D.N.Y., E.D.N.Y.). Includes engagement letter and consultation. T-shirt with your registered work ships separately.`,
            metadata: {
              filing_kind: opts.filing_kind,
            },
          },
          unit_amount: 5000,  // $50.00
        },
        quantity: 1,
      },
    ],
    metadata: {
      filing_id: opts.filing_id,
      user_id: opts.user_id,
      kind: "counsel_review",
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    // Important: collect billing address for engagement letter
    billing_address_collection: "required",
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session created without a URL");
  }

  return { session_id: session.id, url: session.url };
}

/**
 * Create a Checkout session for a swag purchase.
 *
 * This is for one-off swag SKUs (t-shirt, hoodie, etc.). For the actual
 * Buy Buttons embedded on nota.lawyer/swag we just use Stripe's hosted
 * embed and skip this entirely. This function is for cases where we want
 * server-side control (e.g. Counsel-tier customers getting a free shirt
 * added to their order).
 */
export async function createSwagCheckoutSession(opts: {
  user_id: string | null;
  user_email: string;
  product_name: string;
  amount_cents: number;
  shipping_address_required?: boolean;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ session_id: string; url: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: opts.user_email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: opts.product_name,
          },
          unit_amount: opts.amount_cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: opts.user_id || "guest",
      kind: "swag",
      ...opts.metadata,
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    shipping_address_collection: opts.shipping_address_required
      ? { allowed_countries: ["US", "CA", "GB"] }
      : undefined,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session created without a URL");
  }

  return { session_id: session.id, url: session.url };
}

/**
 * Verify a Stripe webhook signature.
 * Called from our /api/stripe/webhook route to confirm the event is real
 * before we update the database.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = getEnv("STRIPE_WEBHOOK_SECRET");

  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Extract metadata from a Checkout session event in a type-safe way.
 */
export function extractSessionMetadata(session: Stripe.Checkout.Session): {
  filing_id?: string;
  user_id?: string;
  kind?: PaymentKind;
  raw: Record<string, string>;
} {
  const md = session.metadata || {};
  return {
    filing_id: md.filing_id,
    user_id: md.user_id !== "guest" ? md.user_id : undefined,
    kind: md.kind as PaymentKind | undefined,
    raw: md,
  };
}
