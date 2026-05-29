# Lex.NY — Master TODO

Everything that needs to happen before, during, and after submissions. Ordered by impact + dependency. Check items off as you complete them.

---

## TIER 0 — Already done ✅
- [x] F extract (50GB → 647,979 APPLIES edges)
- [x] F sync to Neo4j (647,979 APPLIES relationships, total graph now ~6.95M rels)
- [x] CNAME `iam.nota.lawyer` published & verified live
- [x] Speechmatics $200 credit redeemed
- [x] /watches page (Triggerware live dashboard)
- [x] SSE streaming /api/ask
- [x] HackerNoon article drafted (1,838 words)
- [x] CONTRIBUTING.md + SETUP.md + DEMO_SCRIPT.md
- [x] 18/18 smoke test passing
- [x] Public repo @ github.com/banksythequantLab/lex-ny

---

## TIER 1 — Ship before recording demo (1–2 hours total)

### 1.1 — Make the public URL safe to publicize
- [ ] **Rate limit `/api/ask` and `/api/ask/stream`** to ~10 req/min per IP. Without this, one bad actor can run up the Bright Data + Groq bill.
- [ ] **Add a `/about` page** with the research-tool disclaimer (RPC 7.1 wording, "not legal advice", "supervised by NY-licensed attorney").
- [ ] **Footer disclaimer** on every page: "Research tool — not legal advice. No attorney-client relationship created."
- [ ] **Robots.txt + sitemap.xml** so it indexes properly (and blocks the API routes).

### 1.2 — Survive a reboot
- [ ] Run `install-lex-ny-service.bat` as Admin (1-click UAC; tunnel becomes a Windows service)
- [ ] Verify service auto-starts: `Restart-Computer; (after reboot) sc query cloudflared-lex-ny`

### 1.3 — Storyblok content
- [ ] Paste `STORYBLOK_BLOG_POST.md` content into Storyblok web UI as a new `blog_post` Story
- [ ] Verify `/blog` lists it and `/blog/citation-graph-is-the-moat` renders

### 1.4 — Final smoke + record
- [ ] Run `smoke_demo.py` → confirm 18/18 (or 19/19 if we add a watches check)
- [ ] Open all 7 demo tabs (home, ask, search, stats, cited-by/5688657, watches, blog), warm-load them
- [ ] **Record the 3-minute cut** from `DEMO_SCRIPT.md` (HackerNoon PoU version)
- [ ] Optionally record the 90-second cut for lablab.ai

---

## TIER 2 — Submissions (1–3 hours, mostly form-filling)

### 2.1 — Bright Data UNLOCKED (deadline May 31)
- [ ] Register team on **lablab.ai** + create project page
- [ ] Project name: Lex.NY · Tagline: "Every case. Every statute. Every cite verifiable."
- [ ] Upload demo video (90s cut)
- [ ] Repo URL: `github.com/banksythequantLab/lex-ny`
- [ ] Live URL: `https://iam.nota.lawyer`
- [ ] **Tech tags**: Bright Data (Web Unlocker + SERP), Neo4j, Algolia, Storyblok, Speechmatics, Triggerware, Groq, Ollama, pgvector, Next.js
- [ ] **Tier-specific sponsor track submissions** (one form per applicable):
  - [ ] Best Use of Bright Data
  - [ ] Best Use of Neo4j (the GraphRAG story — 6.95M relationships, top-cited Cypher)
  - [ ] Best Use of Algolia (federated 40k-statute search, sub-100ms)
  - [ ] Best Use of Speechmatics (mic on /ask, voice → cited legal answer)
  - [ ] Best Use of Storyblok (blog at /blog backed by their CMS)
  - [ ] Best Use of Triggerware (/watches page — live SQL deltas on federal bills)

### 2.2 — HackerNoon Proof of Usefulness (deadline June 5)
- [ ] Submit at proofofusefulness.com
- [ ] Paste HACKERNOON_ARTICLE.md as the entry article
- [ ] Optionally publish article on HackerNoon as a standalone piece too (separate from PoU submission)

### 2.3 — Optional / nice-to-have submissions
- [ ] **Devpost** for any active legal-tech or AI hackathon (check devpost.com/hackathons)
- [ ] **Show HN** post: "Show HN: Lex.NY — NY legal research engine with a 4.9M-edge citation graph that can't hallucinate"
- [ ] **LinkedIn** post with demo video (target legal-tech audience)
- [ ] **NY State Bar Tech Committee** — submit as a research tool, not as advice

---

## TIER 3 — Make it usable for real users (4–10 hours total)

### 3.1 — Reliability
- [ ] Bigger ivfflat index: `lists=1000` rebuild (drops /api/ask cold latency from 7s to ~2s)
- [ ] Similarity-floor cutoff in `answer.ts` (stop the model leaking past the "doesn't cover this" guard on weak retrievals)
- [ ] Persistent Bright Data + Groq call counter (currently in-memory, resets on dev server restart)
- [ ] Graceful degradation when Neo4j is unreachable (right now /api/ask works but emits `graph_provider: null`)

### 3.2 — Trust + safety
- [ ] `/terms` page (research only, no legal advice, no attorney-client relationship, Apache-2.0 disclaimer)
- [ ] `/privacy` page (we log queries server-side; no PII collected; data flow diagram)
- [ ] Cookie banner (only if we ever add analytics)
- [ ] Hard rate limit + IP banlist for abusive callers

### 3.3 — Discoverability
- [ ] Polish homepage (currently functional but could be more "this is what you do here")
- [ ] Add a `/how-it-works` page (the 5-step pipeline, visual)
- [ ] Better SEO meta tags (currently still shows "Trademark in a Box" title from a prior project)
- [ ] OpenGraph + Twitter card image (so the link previews look professional)
- [ ] Add /watches to homepage nav (currently only on /stats/search/cited-by)

### 3.4 — Power features (post-submission)
- [ ] User accounts (so people can save searches + watches)
- [ ] Email digests of /watches polls (daily summary of new bills)
- [ ] Export answer as PDF brief
- [ ] Citation-network visualization (D3 force-directed graph of the cited-by web)
- [ ] Mobile responsive audit + fixes

---

## TIER 4 — Aftermath (post-deadline)

- [ ] Migrate from dev server to production (`npm run build` + `next start` or Vercel)
- [ ] Move Postgres off the dev workstation (Hyperdrive + a real PG host)
- [ ] Decide: keep `Banksy AI` framing or rebrand to `Derek Soltis, NY Atty` for legal credibility
- [ ] Decide whether to charge for it (Nota.Lawyer Counsel tier integration?)
- [ ] Submit talk to NYS Bar Annual Meeting tech track

---

## STATUS DASHBOARD (as of the last commit)

| | Value |
|---|---:|
| Total legal records | 5,540,563 |
| Opinions embedded | 1,322,766 (100%) |
| Citation edges (CITES) | 4,940,299 |
| **APPLIES edges** | **647,979** ✨ new |
| **Total Neo4j relationships** | **~6,951,000** ✨ updated |
| Smoke test | 18/18 |
| Public URL | https://iam.nota.lawyer (live) |
| GitHub | banksythequantLab/lex-ny (public, 9 commits) |
| HackerNoon article | drafted (HACKERNOON_ARTICLE.md, 1,838 words) |
| Storyblok blog | drafted (STORYBLOK_BLOG_POST.md, ready to paste) |
| Demo script | drafted (DEMO_SCRIPT.md, 3 cuts) |

---

## Next action

The single most important thing left to do is **rate limit `/api/ask` and add a disclaimer footer** before publicizing the URL anywhere. That's Tier 1.1 above, and that's what this turn is going to ship.
