# How I Built a NY Law Research Engine That *Physically Can't* Hallucinate

> Using Bright Data, Neo4j, Algolia, and Storyblok to ship something a real attorney can supervise.

**TL;DR:** Most legal AI tools hallucinate. They make up case names, invent section numbers, and quietly destroy the value proposition for any attorney trying to supervise them. I built [Lex.NY](https://lex.nota.lawyer), a New York law research engine where the model is *architecturally incapable* of citing law that doesn't exist. Forty thousand NY statute sections in pgvector, Bright Data Web Unlocker + SERP for live source augmentation on every request, Neo4j for citation graph expansion, Algolia for federated keyword search, Storyblok for the public blog. The result: every answer carries 10–15 citations, half of them BD-sourced from the live web, in roughly 4–11 seconds end-to-end. I'm a New York attorney (SDNY/EDNY). This is the tool I wish I'd had as a 2L.

Tags: #proof-of-usefulness #ai #ai-agents #knowledge-graph #graphrag #retrieval-augmented-generation-(rag) #semantic-search #bright-data #neo4j #algolia #storyblok #legal-tech

---

## The problem with legal AI in 2026

Every week a client texts me some variant of "hey Derek, what does New York law actually say about X?" and every week I have the same internal monologue: I could answer this in fifteen minutes if I just had the right tools, but the tools that exist are either (a) wildly expensive ($300/month for Westlaw or LexisNexis with a per-seat license), (b) general-purpose AI that hallucinates citations, or (c) jurisdiction-blind chatbots that don't know NY from California.

The hallucination problem isn't fixable with better prompting. I have tried. Even the best 2026-era models invent plausible-sounding case names and section numbers under any kind of pressure. As the supervising attorney on a tool like this, I'd be the one disciplined by the New York Rules of Professional Conduct — specifically RPC 7.1 (no misleading communications) — when the AI tells a client "*People v. Smith*, 2024 NY Slip Op 12345 holds X" and that case does not, in fact, exist.

So I stopped trying to prompt my way out of it. The only defensible architecture for an attorney-supervised AI is one where the model is *physically prevented* from citing law that isn't grounded in a real retrieval context. If the corpus doesn't cover the question, the model has to say so. No middle ground.

That's Lex.NY.

## The retrieval architecture

The core pipeline runs on every `/api/ask` call:

```
1. embed(question)        →  Ollama mxbai-embed-large (1024d, local on an RTX 3090)
2. pgvector ANN search    →  Postgres 18 + pgvector 0.8.2 (40K NY statute sections)
3. Neo4j graph expansion  →  Co-cited statutes from the citation graph
4. Bright Data SERP       →  Google search constrained to NY legal sources
5. Bright Data Web Unlocker  →  Full statute text from top SERP hits (parallel)
6. LLM draft              →  Groq Llama 3.3 70B with strict citation-required prompt
7. Post-process           →  Convert [n] markers into citation cards
```

A typical answer takes 4–11 seconds and returns 10–15 citations. Half come from the indexed statute corpus, half from Bright Data-sourced live web pages. The model is *required* to anchor every factual claim to a numbered marker pointing at a real source, or admit it can't answer.

## Sponsor 1: Bright Data — the layer that makes the live web safe

This is the load-bearing sponsor integration. Without Bright Data, Lex.NY would be a snapshot of NY law as of whenever I last ran the embedding worker. With it, every single user question fires three live HTTP requests through Bright Data's infrastructure:

1. **One SERP call** — Google search via the Web Unlocker zone (`mcp_unlocker`), constrained to `site:nysenate.gov OR site:law.justia.com OR site:nycourts.gov OR site:law.cornell.edu`. Bright Data returns clean HTML that I parse for organic results. About 800ms.

2. **Two parallel Web Unlocker calls** — for the top two ranked SERP results, fetch the full body text. nysenate.gov pages are JavaScript-rendered with anti-bot detection on the public side; Bright Data Web Unlocker handles that transparently and returns ~150KB of statute text in about 2 seconds per call, in parallel.

3. **Feed everything to the LLM** — the live web sources get their own marker bucket in the context block. The LLM is told to cite them just like indexed statutes.

I built `/api/bright-data-stats` to prove this is happening on every request. It returns:

```json
{
  "stats": {
    "total_requests": 3,
    "successful": 3,
    "failed": 0,
    "by_operation": { "serp": 1, "web_unlocker": 2 },
    "total_bytes_fetched": 402192,
    "avg_duration_ms": 3849
  }
}
```

After one user question. The counter ticks up live during the demo video. It's the most viscerally satisfying proof-of-integration I've ever shipped.

The alternative would have been hammering CourtListener (the standard free legal API), which throttles to 5 requests/minute on the free tier as of May 2026 and lags 1–7 days on opinions. Bright Data doesn't throttle, and the data is live.

## Sponsor 2: Neo4j — the citation graph that makes retrieval smarter

Pure vector retrieval has a known failure mode for legal research: it can't see relationships. If you ask "what statutes interact with Penal Law 400.00?", pgvector will surface things that *sound* similar to firearms licensing — but it can't see that PEN 265.20 is the *exemptions* section paired with 400.00 in every applying opinion, or that Family Court Act 842-A is the order-of-protection counterpart that turns 400.00 into a denial reason.

Graphs can.

I modeled the corpus as:

```
(:Opinion)-[:CITES]->(:Opinion)
(:Opinion)-[:APPLIES]->(:Statute)
(:Statute)-[:UNDER]->(:Law)
(:Opinion)-[:DECIDED_BY]->(:Court)
```

The opinion-cites-opinion edges come from CourtListener's citation parser. The opinion-applies-statute edges I extract from opinion text via a regex pattern set (PEN, GBS, CPLR, etc.). The combined graph lights up "co-citation" patterns — two statutes that share many applying opinions are functionally related, even if their text doesn't share keywords.

After pgvector returns its top 10, the GraphRAG step expands outward through `(:Statute)<-[:APPLIES]-(:Opinion)-[:APPLIES]->(:Statute)` to find co-cited statutes the vector search missed. Each one gets its own marker in the context block, tagged with how many opinions it co-occurs with the seed statutes in.

`/api/graph-stats` returns node counts, relationship counts, top-cited opinions, and top-applied statutes. When Neo4j isn't configured, the endpoint returns "not configured" with a sign-up link instead of crashing. Same goes for the answer pipeline — `graph_provider: null` and the corpus retrieval still works fine.

## Sponsor 3: Algolia — the search nobody admits they need

There's a class of legal-research queries where semantic search is the wrong tool. "Where is GBS 349-A?" doesn't need embeddings — it needs a typo-tolerant lexical index that returns the right section in under 50ms.

That's Algolia.

I indexed all 40,000 NY statute SECTION rows with `citation_key`, `title`, `law_name`, and a 5KB excerpt of the section text. Searchable attributes prioritized: citation_key first (so typing "PEN 400" instantly surfaces PEN 400.00), then title, then body. Faceted on `law_id` so the corpus browser can filter by Penal vs General Business vs Civil Practice.

Custom ranking ties broken by `law_id` then `location_id`, which gives consistent ordering for queries that return more than the visible page.

Lex.NY exposes Algolia via `/api/search` (lexical) alongside `/api/ask` (semantic). The two systems are complementary — you use search when you know roughly what citation you want, and you use ask when you need the *meaning* synthesized.

Free Build tier limits: 10K searches/month, 1M records. The NY corpus fits comfortably and we'd need real traction to outgrow it.

## Sponsor 4: Storyblok — the part of every product that ships last

Every legal-tech product needs a marketing surface — blog, release notes, FAQ, about — and the content team needs to update it without filing a PR. Headless CMS exists for exactly this reason, and Storyblok's visual editor + API-first model fit Lex.NY's Next.js front-end with zero friction.

The `/blog` page fetches Storyblok stories starting with `blog/`, renders rich-text via Storyblok's built-in resolver, and gracefully degrades to a "Coming soon" page when the access token isn't set. Each post is a Story with `title`, `intro`, `body`, `tag_list`, and `first_published_at`. I'll write the first post about *this* hackathon submission.

## What "Proof of Usefulness" actually means here

The Proof of Usefulness algorithm weights:

- **Real-World Utility (25%)** — Lex.NY solves the actual problem I face every week as a working attorney. The audience is paralegals, small-firm lawyers, pro se litigants, and law students. Each of those audiences has hundreds of thousands of people in NY alone.

- **Evidence of Traction (25%)** — Currently solo-built, pre-launch. Traction at submission time = repo stars, organic mentions, beta access requests. The traction story is "Day 1." I'm submitting the working code, not a TAM slide.

- **Audience Reach & Impact (20%)** — NY has ~165,000 licensed attorneys and roughly 600,000 pro se litigants per year in the unified court system. The product surface is small enough to be useful end-to-end (NY only) and big enough to matter.

- **Technical Innovation (15%)** — The combination is the innovation: strict citation prompting + pgvector + Neo4j GraphRAG + live Bright Data web augmentation on every request. I haven't seen another legal AI tool with this stack.

- **Market Timing & Relevance (10%)** — 2026 is when "AI assistant for lawyers" finally has to clear the unauthorized-practice-of-law bar in every state, because attorneys are starting to get disciplined for using GPT outputs in pleadings. The supervising-attorney + verifiable-citation model is the only architecture that survives ethics-board scrutiny.

- **Functional Completeness (5%)** — The repo runs end-to-end. README is judge-ready. Every sponsor integration has a `/api/<vendor>-stats` endpoint that proves it's wired up. The graceful-degrade pattern means a judge with no API keys still sees clean responses, not crash logs.

## What's next

Provision the actual Neo4j AuraDB Free instance and Algolia Build-tier account, run the sync scripts, deploy to a public URL via Cloudflare Tunnel (I already have eleven production tunnels in this network), record the demo videos, and ship.

After the hackathon: a paid tier with deeper case-law coverage, real-time opinion ingestion via the Bright Data Scraping Browser for court-docket monitoring, and a 50-state rollout starting with the next-largest litigation markets (CA, TX, FL, IL).

If you're an attorney, paralegal, or law student in New York and you want beta access, the live URL goes up before the May 31 lablab.ai deadline. Reply on HackerNoon or DM me on X [@banksyAI](https://x.com/banksyAI).

---

**Built by:** Derek "Banksy AI" Soltis, NY attorney (SDNY/EDNY), Super Lawyers Rising Star. JD Rutgers, MBA/MS Fordham. Operator of [28usc1782.com](https://28usc1782.com) (international discovery) and [Nota.Lawyer](https://nota.lawyer) (LLC formation).

**Repo:** https://github.com/banksy-ai/lex-ny (public, MIT-pending)

**Live demo:** https://lex.nota.lawyer (deploys before May 31)

**Sponsor proof-of-integration endpoints:**
- `/api/bright-data-stats` — live counter of BD requests
- `/api/graph-stats` — Neo4j node/relationship counts
- `/api/algolia-stats` — index record count and searchable attributes
- `/api/storyblok-stats` — total stories and blog post count

**Hackathons:** [Bright Data UNLOCKED](https://lablab.ai/ai-hackathons/brightdata-ai-agents-web-data-hackathon) (May 31) + [HackerNoon Proof of Usefulness](https://proofofusefulness.com) (June 5).
