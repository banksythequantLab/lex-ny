#!/usr/bin/env tsx
/**
 * One-time Stripe setup for Nota.Lawyer.
 *
 * Creates the products + prices we need:
 *   - Counsel-tier attorney review ($50, generic, used for both trademark and copyright)
 *   - Swag SKUs: t-shirt, hoodie, mug, sticker pack, hat
 *
 * After running this, you'll have Price IDs you can either:
 *   (a) put in your env vars as STRIPE_PRICE_* and reference from code, OR
 *   (b) embed as <stripe-buy-button> Buy Buttons on nota.lawyer/swag
 *
 * Run:
 *   cd nota-shared
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts
 *
 * Safe to run multiple times — it looks up products by metadata key and
 * upserts. Won't create duplicates.
 */

import Stripe from "stripe";

const SETUP_KEY = "nota-lawyer-product";

interface ProductSpec {
  key: string;
  name: string;
  description: string;
  unit_amount: number;   // in cents
  shippable: boolean;
}

const PRODUCTS: ProductSpec[] = [
  {
    key: "counsel-review",
    name: "Nota.Lawyer — Counsel-tier attorney review",
    description:
      "15-minute consultation with Derek Soltis, Esq. (NY, S.D.N.Y., E.D.N.Y.). Review of your trademark or copyright filing for likelihood-of-confusion, descriptiveness, specimen sufficiency, or AI-authorship disclosure issues. Includes a limited-scope engagement letter. T-shirt with your registered work ships separately upon registration.",
    unit_amount: 5000,
    shippable: false,
  },
  {
    key: "swag-tshirt",
    name: "Nota.Lawyer — T-shirt",
    description: "Heavyweight cotton t-shirt. Editorial design. Printed with the seal of the Republic of Free Legal Forms.",
    unit_amount: 2500,
    shippable: true,
  },
  {
    key: "swag-hoodie",
    name: "Nota.Lawyer — Hoodie",
    description: "Pullover hoodie. Weight: heavy. Vibe: appellate court chambers in winter.",
    unit_amount: 4500,
    shippable: true,
  },
  {
    key: "swag-mug",
    name: "Nota.Lawyer — Ceramic mug",
    description: "11 oz ceramic mug. Holds coffee, tea, or the slow burn of having paid $999 to LegalZoom for a $350 trademark filing.",
    unit_amount: 1500,
    shippable: true,
  },
  {
    key: "swag-stickers",
    name: "Nota.Lawyer — Sticker pack",
    description: "Set of 5 die-cut vinyl stickers. Apply to laptops, water bottles, or competing law firms' filing cabinets.",
    unit_amount: 500,
    shippable: true,
  },
  {
    key: "swag-hat",
    name: "Nota.Lawyer — Hat",
    description: "Unstructured 6-panel hat. Embroidered seal. For wearing to bar admission ceremonies and small claims court.",
    unit_amount: 2000,
    shippable: true,
  },
];

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("ERROR: STRIPE_SECRET_KEY environment variable required.");
    console.error("Get yours at https://dashboard.stripe.com/test/apikeys");
    process.exit(1);
  }
  if (!secretKey.startsWith("sk_test_")) {
    console.error("ERROR: Refusing to run with a non-test Stripe key.");
    console.error("This script is for test mode only. Key must start with sk_test_");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2025-10-29.basil" });

  console.log("Stripe setup for Nota.Lawyer\n");
  console.log("Test mode key detected. Setting up products...\n");

  const results: Array<{
    key: string;
    product_id: string;
    price_id: string;
    amount: number;
  }> = [];

  for (const spec of PRODUCTS) {
    // Look for an existing product with our metadata key
    const existing = await stripe.products.search({
      query: `metadata['${SETUP_KEY}']:'${spec.key}'`,
    });

    let product: Stripe.Product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      // Update in case the spec changed
      product = await stripe.products.update(product.id, {
        name: spec.name,
        description: spec.description,
        shippable: spec.shippable,
      });
      console.log(`✓ Updated product: ${spec.name}`);
    } else {
      product = await stripe.products.create({
        name: spec.name,
        description: spec.description,
        shippable: spec.shippable,
        metadata: { [SETUP_KEY]: spec.key },
      });
      console.log(`✓ Created product: ${spec.name}`);
    }

    // Find or create the price
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });
    let price = prices.data.find(
      (p) => p.unit_amount === spec.unit_amount && p.currency === "usd"
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: spec.unit_amount,
        currency: "usd",
      });
      console.log(`  ✓ Created price: $${(spec.unit_amount / 100).toFixed(2)}`);
    } else {
      console.log(`  ↻ Existing price: $${(spec.unit_amount / 100).toFixed(2)}`);
    }

    results.push({
      key: spec.key,
      product_id: product.id,
      price_id: price.id,
      amount: spec.unit_amount,
    });
  }

  // Print the env-var-ready summary
  console.log("\n" + "=".repeat(60));
  console.log("DONE — Price IDs to put in your .env files:");
  console.log("=".repeat(60));
  for (const r of results) {
    const envName = `STRIPE_PRICE_${r.key.toUpperCase().replace(/-/g, "_")}`;
    console.log(`${envName}=${r.price_id}`);
  }
  console.log("\nProduct IDs (for the Stripe Buy Button embeds on swag page):");
  for (const r of results.filter((x) => x.key.startsWith("swag-"))) {
    console.log(`  ${r.key}: ${r.product_id}`);
  }
  console.log("\n" + "=".repeat(60));
  console.log("Webhook setup:");
  console.log("=".repeat(60));
  console.log("1. dashboard.stripe.com/test/webhooks → Add endpoint");
  console.log("2. URL: https://<your-vercel-url>/api/stripe/webhook");
  console.log("3. Events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed");
  console.log("4. Copy the 'Signing secret' (whsec_...) into STRIPE_WEBHOOK_SECRET");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
