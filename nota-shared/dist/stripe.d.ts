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
export declare function getStripe(): Stripe;
/**
 * Create a Checkout session for the $50 Counsel attorney review tier.
 *
 * Returns the session URL the user should be redirected to. After payment,
 * Stripe redirects to successUrl (we wire the webhook to flip the filing
 * status to pending_review).
 */
export declare function createCounselCheckoutSession(opts: {
    filing_id: string;
    user_id: string;
    user_email: string;
    filing_kind: string;
    successUrl: string;
    cancelUrl: string;
}): Promise<{
    session_id: string;
    url: string;
}>;
/**
 * Create a Checkout session for a swag purchase.
 *
 * This is for one-off swag SKUs (t-shirt, hoodie, etc.). For the actual
 * Buy Buttons embedded on nota.lawyer/swag we just use Stripe's hosted
 * embed and skip this entirely. This function is for cases where we want
 * server-side control (e.g. Counsel-tier customers getting a free shirt
 * added to their order).
 */
export declare function createSwagCheckoutSession(opts: {
    user_id: string | null;
    user_email: string;
    product_name: string;
    amount_cents: number;
    shipping_address_required?: boolean;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
}): Promise<{
    session_id: string;
    url: string;
}>;
/**
 * Verify a Stripe webhook signature.
 * Called from our /api/stripe/webhook route to confirm the event is real
 * before we update the database.
 */
export declare function verifyWebhookSignature(rawBody: string, signature: string): Stripe.Event;
/**
 * Extract metadata from a Checkout session event in a type-safe way.
 */
export declare function extractSessionMetadata(session: Stripe.Checkout.Session): {
    filing_id?: string;
    user_id?: string;
    kind?: PaymentKind;
    raw: Record<string, string>;
};
//# sourceMappingURL=stripe.d.ts.map