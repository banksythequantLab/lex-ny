# Nota.Lawyer Platform — Setup Guide

Everything you need to get the platform running locally on Tuesday morning. Follow in order. Total time: ~30 minutes of clicking + ~5 minutes of `npm install`.

## Repo layout

```
nota-build/
├── nota-shared/          # Shared package: types, LLM, Bright Data, Supabase, Stripe, Conflict Agent
├── nota-trademark/       # Next.js 15 app — trademark.nota.lawyer (port 3001)
├── nota-copyright/       # Next.js 15 app — copyright.nota.lawyer (port 3002)
└── SETUP.md              # This file
```

The `nota-shared` package is consumed by both apps via local file reference. No need to publish to npm.

---

## Step 1 — Sign up for services (~20 minutes)

You need accounts on all of these. Open each link, sign up, save the API keys/secrets in a temporary text file as you go. You'll paste them into `.env.local` files in step 4.

### 1a. Supabase (database + auth) — ~3 min
- URL: https://supabase.com → Start your project
- Sign in with GitHub
- New project → name it "nota-lawyer" → pick a region near you (us-east-1 / NJ closest)
- Wait ~2 min for project provisioning
- **Save:**
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL` (looks like `https://xxx.supabase.co`)
  - Project Settings → API → anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Project Settings → API → service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

### 1b. Stripe (payments — test mode) — ~5 min
- URL: https://dashboard.stripe.com/register
- Sign up, skip the business onboarding (we're in test mode)
- Make sure the "View test data" toggle is ON (top-left of dashboard)
- Developers → API keys
- **Save:**
  - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_`)
  - Secret key → `STRIPE_SECRET_KEY` (starts with `sk_test_`)
- Webhook secret comes later in step 5.

### 1c. Groq (LLM inference — free tier) — ~2 min
- URL: https://console.groq.com/keys
- Sign in with GitHub or Google
- Create API Key → name it `nota-conflict-agent`
- **Save:** `GROQ_API_KEY` (starts with `gsk_`)
- Free tier limits: ~30 requests/minute on Llama 3.3 70B Versatile. Plenty for the hackathon.

### 1d. Bright Data (web scraping — hackathon free tier) — ~5 min
- URL: https://brightdata.com/cp/start
- Sign up (use the hackathon email or your work email)
- Dashboard → Proxies & Scraping Infrastructure → Add proxy
- **Create Web Unlocker zone:**
  - Click "Web Unlocker"
  - Name it `mcp_unlocker` (exactly — that's what our code expects by default, override via env var if needed)
  - Default settings (US country)
- **Create SERP API zone:**
  - Click "+ Add" → SERP API
  - Name it `serp`
  - Default settings
- Dashboard → Settings → API Tokens → Add token
- **Save:** `BRIGHT_DATA_API_TOKEN`

### 1e. Resend (transactional email) — ~2 min
- URL: https://resend.com → Sign up
- API Keys → Create API Key → name `nota-lawyer`
- **Save:** `RESEND_API_KEY` (we wire this in post-hackathon; not needed for demo)
- For the hackathon you can skip this — Supabase magic-link emails use Supabase's built-in mailer.

### 1f. Vercel (hosting) — ~3 min
- URL: https://vercel.com/signup
- Sign in with GitHub
- We deploy in step 6 after the apps run locally.

---

## Step 2 — Install dependencies (~3 min)

```bash
cd nota-shared && npm install && npm run build && cd ..
cd nota-trademark && npm install && cd ..
cd nota-copyright && npm install && cd ..
```

If you get peer-dependency warnings, ignore them. Next.js 15 / React 19 are still new enough that some packages haven't formally bumped their declared peer ranges yet.

---

## Step 3 — Apply Supabase schema (~2 min)

1. Open your Supabase project → SQL Editor → New query
2. Paste the entire contents of `nota-shared/supabase/migrations/0001_initial_schema.sql`
3. Click **Run**
4. Verify: in the side nav, Tables should now show `users`, `filings`, `payments`, `reviews`
5. Storage → check that the `filings` bucket exists (it's private)

**Make yourself an admin** (so the `/admin` route works):
1. Sign up via either app's `/login` page first (creates the user row)
2. Back in Supabase SQL Editor:
   ```sql
   update public.users set role = 'admin' where email = 'YOUR_EMAIL@HERE';
   ```

---

## Step 4 — Create `.env.local` files (~2 min)

Each app has a `.env.example` showing what's needed. Copy and fill:

```bash
cp nota-trademark/.env.example nota-trademark/.env.local
cp nota-copyright/.env.example nota-copyright/.env.local
```

Open both `.env.local` files and paste in the values you saved in step 1.

**Critical knobs:**
- `LLM_PROVIDER=groq` — uses Groq's free Llama 3.3 70B for the demo. Set to `ollama` to use your Johnson box's Qwen3 32B instead (for dev/test when offline or when Groq rate-limits).
- `BRIGHT_DATA_WEB_UNLOCKER_ZONE=mcp_unlocker` — must match the name you gave the zone in step 1d.
- `BRIGHT_DATA_SERP_ZONE=serp` — same.

---

## Step 5 — Run the Stripe setup script (~2 min)

This creates the $50 Counsel review product + 5 swag SKUs in your Stripe test mode. Safe to run multiple times — it upserts by metadata key.

```bash
cd nota-shared
STRIPE_SECRET_KEY=sk_test_YOUR_KEY npx tsx scripts/setup-stripe.ts
```

The script will print Price IDs at the end. Save those in your env files if you want to reference them by ID (optional — the apps create prices on-the-fly too).

**Set up the Stripe webhook:**
1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://YOUR_NGROK_OR_VERCEL_URL/api/stripe/webhook` (for local dev, use `ngrok http 3001` to expose your dev server)
3. Events to listen for: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the "Signing secret" (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in both `.env.local` files

For pure local dev without webhook handling, you can skip this — the apps work, you just won't get the post-payment status flip until you wire the webhook.

---

## Step 6 — Run the dev servers

In separate terminals:

```bash
# Terminal 1
cd nota-trademark && npm run dev
# → http://localhost:3001
```

```bash
# Terminal 2
cd nota-copyright && npm run dev
# → http://localhost:3002
```

Both apps run independently. Visit each URL and verify:
- [ ] Landing page renders with editorial design (parchment, ink, seal red)
- [ ] `/login` accepts an email and shows "Check your inbox"
- [ ] Magic link arrives, click it, redirects to `/dashboard`
- [ ] Empty dashboard shows "No filings yet" + "Start your first filing"
- [ ] `/wizard` (trademark) or `/wizard/visual-art` (copyright) renders step 1
- [ ] `/admin` shows "Not authorized" until you run the SQL to make yourself admin

For the trademark app, **the showpiece test:**
- [ ] `/search` renders the AI conflict search UI
- [ ] Enter a mark like "BANKSY AI" → pick Class 9 → click "Run AI conflict search"
- [ ] Within ~30 seconds, get a ConflictReport with risk badge, DuPont analysis, scored matches

If the conflict search hangs or errors, check:
1. `BRIGHT_DATA_API_TOKEN` is set and the zones (`mcp_unlocker`, `serp`) exist
2. `GROQ_API_KEY` is set and `LLM_PROVIDER=groq`
3. Terminal output of the trademark dev server for stack traces

---

## Step 7 — Deploy to Vercel (do this Friday or Saturday)

Two separate Vercel projects:

```bash
# trademark
cd nota-trademark
npx vercel
# Follow the prompts. Set up the project.

# copyright
cd nota-copyright
npx vercel
```

In the Vercel dashboard for each project:
- Settings → Environment Variables → paste in everything from `.env.local`
- Settings → Domains → add `trademark.nota.lawyer` (or `copyright.nota.lawyer`)
- DNS at your registrar (IONOS) → add CNAME pointing to `cname.vercel-dns.com`

Trigger a redeploy after env vars are set (Vercel doesn't auto-redeploy on env changes).

---

## Day-by-day workflow (the 6-day sprint)

| Day | Hours | Focus |
|---|---|---|
| Tue May 26 | 12h | Wire the conflict search end-to-end + frontend polish on `/search` |
| Wed May 27 | 12h | Trademark wizard: complete TEAS package generation + USPTO ID Manual mapping |
| Thu May 28 | 12h | Copyright wizards: all 3 work types + Stripe Checkout + swag page on parent domain |
| Fri May 29 | 12h | Dashboard polish + admin queue UX + transactional emails + bug bash |
| Sat May 30 | 12h | Demo video (90 sec), lablab.ai writeup, custom domains in Vercel |
| Sun May 31 | 4h | Submit by 6 PM ET, buffer time |

## Troubleshooting

**`Cannot find module '@nota-lawyer/shared'`**
Run `cd nota-shared && npm run build` before starting the dev servers. The apps depend on `nota-shared/dist/`.

**Magic link email never arrives**
Check Supabase → Authentication → Logs. Default Supabase emails sometimes get caught by Gmail spam. Add a verified domain in Authentication → Email Settings for the demo.

**Bright Data returns 401**
Token is wrong or expired. Regenerate at Bright Data Dashboard → Settings → API Tokens.

**Groq returns 429**
You've hit the free tier rate limit (~30 RPM on Llama 3.3 70B). Either wait a minute or flip `LLM_PROVIDER=ollama` to fall back to Johnson.

**`TypeError: Failed to fetch` on conflict search**
Server timed out (>60s). Either the LLM is slow or Bright Data is rate-limited. Check the trademark app's terminal log.

**Stripe webhook signature verification fails**
You're using a `whsec_` from the wrong environment. Test mode webhooks have a different signing secret than live mode.

---

## Hackathon submission checklists

### DWNY 2026 (June 9-10, TWA Hotel JFK)
- [ ] All three boxes live at their subdomains
- [ ] AI conflict search demo recorded (90s)
- [ ] Sponsor mentions: name.com (domains), Tower.dev, Runpod
- [ ] Echos prize submission
- [ ] 60K-list email blast outreach prepared

### Bright Data Web Data UNLOCKED (May 31, online)
- [ ] Conflict Search Agent uses Web Unlocker AND SERP API (both required)
- [ ] Demo video showing the agent in action
- [ ] lablab.ai project writeup explaining the DuPont factors angle
- [ ] Public GitHub repo or video link
- [ ] Submission by 6 PM ET Sunday

---

## Architecture cheat sheet

- **Trademark conflict search flow:** `/search` page → POST `/api/search` → `runConflictSearch()` in `@nota-lawyer/shared` → 6 parallel Bright Data calls + LLM analysis via Groq → ConflictReport JSON back to client
- **Filing flow:** `/wizard` (multi-step state in React) → `/api/filings` POST (Supabase insert) → optional Stripe Checkout → webhook flips status → admin review at `/admin`
- **Auth:** Supabase magic link → `/auth/callback` exchanges code for session → cookie set → server components read user via `createSupabaseServerClient()`
- **RLS:** Customers see their own filings only; attorneys see all. Enforced at Supabase, not in app code (the app uses anon key by default, service role only in webhook handlers).

## Costs at a glance

| Service | Cost | Notes |
|---|---|---|
| Supabase | $0 | Free tier: 500MB DB, 50K MAU, 1GB storage |
| Groq | $0 | Free tier: 30 RPM on Llama 3.3 70B Versatile |
| Bright Data | $0 | Hackathon: 5K Web Unlocker + 5K SERP free per month |
| Stripe | $0 (test) | No fees on test mode. Live mode: 2.9% + 30¢ per charge |
| Vercel | $0 | Free tier: 100GB bandwidth/month, hobby projects |
| Resend | $0 | Free tier: 3K emails/month |

**Total ongoing cost during hackathon: $0.**

When live, the only per-transaction cost is Stripe's 2.9% + 30¢ on the $50 Counsel tier = ~$1.75 per Counsel customer. Affiliate revenue from Mercury/Gusto/Northwest covers everything else.
