# Lex.NY — submissions copy

Single source of truth for every external post. Each section is paste-ready.
Personalize where you see `[brackets]`.

| # | Destination | Deadline |
|---|---|---|
| 1 | lablab.ai (Web Data UNLOCKED) | **May 31** |
| 2 | proofofusefulness.com (HackerNoon PoU) | June 5 |
| 3 | Show HN | Post Monday 06:00–08:00 ET |
| 4 | LinkedIn | Within 48h of submission |
| 5 | X / Twitter thread | Same window as LinkedIn |

---

# 1. lablab.ai project page

## Project name
Lex.NY

## Tagline (one line)
Every case. Every statute. Every cite verifiable.

## Demo URL
https://iam.nota.lawyer

## Repository
https://github.com/banksythequantLab/lex-ny

## Tech tags (comma-separated, paste into the "Tech stack" field)
Bright Data, Bright Data Web Unlocker, Bright Data SERP API, Neo4j, Neo4j AuraDB, Algolia, Speechmatics, Triggerware, Groq, Llama 3.3 70B, Ollama, mxbai-embed-large, pgvector, PostgreSQL, Next.js, TypeScript, Cloudflare Tunnel, Apache 2.0, Open Source, GraphRAG, RAG, Legal Tech, New York Law

## Project description (≈250 words — main "About" field)

Most legal AI tools have one critical flaw: they hallucinate cases. Lex.NY was built so hallucination is architecturally impossible — the model cannot produce a sentence about New York law without anchoring it to a specific source the user can open and verify.

Three pieces stack together. **A NY-specific corpus** of 1.32 million opinions back to 1714 and all 40,000 sections of the NY Consolidated Laws. **A 6.95 million-edge citation graph** in Neo4j that turns retrieval into a controlling-precedent map — pure vector search returns cases that *read* alike; the graph returns cases that *matter*. **A strict-citation system prompt** that refuses to produce any sentence without a numbered citation pointing into the retrieval context.

Bright Data's Web Unlocker is what makes the live-currency story work. On every `/api/ask` request, three parallel calls fire — nysenate.gov, law.justia.com, courtlistener.com — to fetch fresh statutory and decisional text from publishers that block normal scrapers. The SERP API fills the gap when the static corpus doesn't have the answer.

Built by Derek Soltis, a NY-licensed attorney (SDNY/EDNY). Apache-2.0 open source. The whole stack runs on a single workstation: Postgres + pgvector for the vector index, Ollama for local embeddings, Groq for inference, Neo4j AuraDB for the graph. End-to-end latency is ~5.7s warm with 30 citations on the marquee test query (CPLR 5015).

This is a research tool, not legal advice. But every answer comes with receipts.

---

## Sponsor track essays

Submit one per applicable track. Each is sized to fit the typical 100-word lablab field.

### Best Use of Bright Data

Bright Data is on every single `/api/ask` request — not a "considered" or "could integrate" mention. Three parallel Web Unlocker calls hit nysenate.gov, law.justia.com, and courtlistener.com to pull live, current statutory and decisional text from publishers that block normal scrapers. SERP API fills in current-events coverage when the static corpus doesn't have the answer. The lifetime call counter is disk-persistent (JSON Lines, survives dev restarts) and surfaced on `/stats` and `/api/bright-data-stats`. No mocks, no maybes. Every cited answer ran through Bright Data.

### Best Use of Neo4j

A 6.95 million-edge citation graph lives in Neo4j AuraDB enterprise: 4.94M CITES edges (opinion → opinion), 648K APPLIES edges (opinion → statute), 1.36M nodes total. Every `/api/ask` traverses it after the pgvector retrieval to surface leading precedent — vector search returns cases that read alike, the graph returns cases that matter. `/cited-by/[case_id]` lets users walk the graph manually (try `/cited-by/5688657` for People v. Bleakley). The full Cypher patterns are in the repo. Live counts on `/stats`. GraphRAG, done right.

### Best Use of Algolia

All 40,000 NY statute sections — the entire Consolidated Laws, every CPLR, Penal Law, Labor Law, Tax Law, you name it — indexed in Algolia for sub-100ms keyword and faceted search. Powers the `/search` page's instant statute lookup and the keyword-fallback path in `/api/ask` when vector retrieval misses. ~76ms p50 federated search on a free tier. Watch it return five hits on "consumer protection" in under 200ms in the demo. Real index, real numbers.

### Best Use of Speechmatics

Real-time WebSocket transcription wired to the `/ask` page mic button. JWT minted server-side via `@speechmatics/auth` — no client-side keys, no exposure. A user taps the mic, speaks a legal question, watches the transcription appear in the textarea as they talk, then submits it through the same `/api/ask` pipeline as a typed question. Voice → cited NY legal answer in one flow. $200 WEBDATAHACK200 credit redeemed against production usage.

### Best Use of Triggerware

Two active SQL-compiled watches on federal bills — consumer protection enforcement and data privacy / hemp regulation. The `/watches` page renders live deltas: new bills matching the watch criteria, last poll timestamp, full bill text + Triggerware metadata. SQL-over-data-streams running on a schedule independent of any user query. Live legislative monitoring, not a mock. The watches surface bills the attorney behind Lex.NY would actually want to know about, which is the whole point.

---

## "How we built it" — long-form (≈500 words, for the lablab body)

I'm a NY-licensed attorney. For months I'd been trying every legal AI tool that crossed my desk, and every one of them eventually invented a case. Wrong cite. Wrong parties. Sometimes an entire fabricated decision with all the formatting tics of a real opinion. The tech was good enough to fool a layperson, which is exactly why it was dangerous.

So Lex.NY started with one constraint: it had to be architecturally impossible for the model to write a sentence without a real source attached.

**The corpus.** 1.32M opinions ingested from the Free Law Project's CourtListener bulk dumps — NY Court of Appeals, all four Appellate Divisions, the federal SDNY and EDNY. 40K statute sections pulled from the NY Senate's OpenLegislation API — all 137 Consolidated Laws. Embedded into pgvector locally on a single workstation with mxbai-embed-large (1024-dim, served by Ollama). Index is ivfflat with `lists=1200` — tuned for ~1,460 rows per list, which dropped warm `/api/ask` latency 30% (from 8.3s to 5.7s).

**The graph.** Pure vector RAG is great at finding cases that *read* alike but bad at finding cases that *matter*. So we extract citation edges from every opinion at ingest time and load them into Neo4j AuraDB enterprise — 4.94M `CITES` edges between opinions, 648K `APPLIES` edges between opinions and statutes, 1.36M nodes. Every retrieved opinion gets a one-hop traversal to surface its controlling precedent. It's how an attorney shepardizes, encoded as Cypher.

**Bright Data.** This is what makes the live-currency story work. Even with 1.32M opinions and 40K statutes locally, statutes get amended, decisions come down, and the demo needed to feel current. So every `/api/ask` fires three parallel Bright Data Web Unlocker calls — nysenate.gov for statute text, law.justia.com for opinions, courtlistener.com as a backup. SERP API picks up the slack when the question is genuinely outside the corpus. All Bright Data calls are tracked with a disk-persistent JSON Lines counter; the live count is on `/stats`.

**The strict-citation prompt.** Llama 3.3 70B drafts the answer through Groq (~135 tok/s), but the system prompt forbids producing any sentence without a numbered citation pointing into the retrieval context. If the best vector similarity is below 0.55, the system abstains in 0.3s — no Groq call, no hedged nonsense, just "outside the corpus, here's how to rephrase."

**Trust infrastructure.** /terms, /privacy, RPC 7.1 supervised, 10-req/min rate limit on `/api/ask`. Cloudflare Tunnel publishes the workstation to `iam.nota.lawyer` and survives reboots as a Windows service. The /stats page surfaces every sponsor counter live. 19/19 smoke tests pass end-to-end on every commit.

**What it isn't.** It's a research tool, not legal advice. The /terms page says that seven different ways. But for a NY attorney starting CPLR research, or a researcher curious about citation-anchored RAG, this is a working, open-source, attorney-supervised reference.

---

## Submission flow on lablab.ai

1. Sign in / register team — use the GitHub account `banksythequantLab` if possible (matches the repo handle).
2. Create new project → paste fields from this doc.
3. Upload the 90-second demo video (export from the recording).
4. Check sponsor track boxes:
   - [x] Best Use of Bright Data
   - [x] Best Use of Neo4j
   - [x] Best Use of Algolia
   - [x] Best Use of Speechmatics
   - [x] Best Use of Triggerware
5. Public the project. Verify the URL renders.
6. Tag `@brightdata` in the post-submit announcement on X (template in section 5).

---

# 2. HackerNoon Proof of Usefulness (proofofusefulness.com)

The submission asks for an article. `HACKERNOON_ARTICLE.md` in the repo root is the entry — already drafted at 1,838 words. Paste it directly into the submission form.

Cross-reference notes when submitting:
- Title field: `Lex.NY: Building a Legal AI That Architecturally Cannot Hallucinate`
- Subtitle: `5.5M legal records, a 6.95M-edge citation graph, and a system prompt that refuses to invent citations.`
- Cover image: upload `nota-lex/public/og-image.svg` (1200×630)
- Demo URL: `https://iam.nota.lawyer`
- Repo URL: `https://github.com/banksythequantLab/lex-ny`
- Author: Derek Soltis (Banksy AI)

---

# 3. Show HN

Post Monday morning, **06:00–08:00 America/New_York**. That's when HN traffic peaks and Show HN posts have the best shot at the front page. Submit, then **immediately** post the first comment below.

## Headline
```
Show HN: Lex.NY – NY legal research engine with a 6.95M-edge citation graph
```

## URL field
```
https://iam.nota.lawyer
```

## Body (paste into the "text" field — HN allows both URL + text)

Lex.NY is an open-source research engine for New York law. It indexes 1.32M opinions back to 1714 and all 40K statute sections of the NY Consolidated Laws, plus a 6.95M-edge citation graph in Neo4j.

The design constraint: every answer is anchored to specific sources. The system prompt forbids unsourced claims, and the retrieval pipeline runs pgvector → Neo4j graph traversal → live Bright Data web fetches → Groq for inference. If the best corpus similarity drops below 0.55, it abstains in <300ms instead of burning a Groq call on a question it can't answer.

Live at https://iam.nota.lawyer. Apache 2.0. Built by a NY-licensed attorney (SDNY/EDNY).

## First comment (post yourself immediately after the submission)

Hey HN — Derek here. I'm a NY-licensed attorney (SDNY/EDNY) who got tired of every legal AI tool I tried inventing case citations. So I built this with one design constraint: the model can never produce a sentence about NY law without a real, openable source attached.

The piece I'm most proud of is the citation graph. Pure vector RAG returns cases that *read* alike. The 6.95M-edge `CITES` + `APPLIES` graph in Neo4j returns cases that *matter* — the same way an attorney shepardizes. Top-cited cases like People v. Bleakley (NY's weight-of-evidence standard) surface naturally as you walk it. There's a `/cited-by/[cl_id]` route that lets you walk the graph manually.

A few technical specifics in case they're useful:

- Corpus is from the Free Law Project (CourtListener bulk dumps) and the NY Senate OpenLegislation API. All public sources, no scraping shortcuts on the ingest path.
- Embeddings via `mxbai-embed-large` (1024d), served by local Ollama on a single workstation. ivfflat index in pgvector tuned to `lists=1200` (~1,460 rows per list).
- Live web layer via Bright Data Web Unlocker — three parallel calls per request to nysenate.gov, law.justia.com, courtlistener.com. The publishers block normal scrapers and these three together cover the long tail.
- Inference is Llama 3.3 70B on Groq (~135 tok/s streaming). System prompt is open in the repo if you want to see the actual constraint that refuses unsourced output.
- End-to-end is ~5.7s warm with 30 citations on the marquee test query (CPLR 5015 — vacating a NY judgment).
- The 0.55 similarity floor + abstain path was added after I realized the system would happily try to answer "best chocolate chip cookie recipe" with a hedged legal-sounding paragraph. Now it returns "outside the corpus, here's how to rephrase" in 0.3 seconds. No Groq call.

It's a research tool, not legal advice — there's a 7-section /terms page that says so multiple times, and the /privacy page enumerates every third party that sees your query. The whole stack is in the repo; happy to answer questions about any of it.

---

# 4. LinkedIn announcement

Post on the same day as Show HN, ideally a few hours later. LinkedIn's algorithm rewards long-form storytelling — paste the **long version** unless you specifically want a brief teaser.

## Short version (paste-ready)

```
After watching the third legal AI tool in a row hallucinate case citations, I built one that can't.

Lex.NY indexes 1.32 million NY court opinions back to 1714, 40,000 statute sections, and a 6.95-million-edge citation graph. Every answer is anchored to sources you can open and verify. If the corpus doesn't cover the question, the system abstains in 0.3 seconds instead of guessing.

Open source under Apache-2.0. Live at iam.nota.lawyer. Built by a NY-licensed attorney for the bar.

This is a research tool, not legal advice — but every answer comes with receipts.

→ https://iam.nota.lawyer
→ https://github.com/banksythequantLab/lex-ny

#LegalTech #OpenSource #AI #NewYorkLaw
```

## Long version (paste-ready)

```
I'm a NY-licensed attorney. I've practiced in the Southern and Eastern Districts of New York for years.

For the past few months I kept running into the same problem with every "legal AI" product I tried: they confidently cited cases that don't exist. Wrong cite numbers. Wrong parties. Sometimes entire fabricated decisions presented with all the formatting tics of a real opinion. The technology was good enough to fool a layperson — and that was the danger.

So I built Lex.NY with one architectural constraint: the model can never produce a sentence about NY law without anchoring it to a real, openable source.

How it works:

→ A NY-specific corpus: 1.32M opinions back to 1714, all 40K sections of the NY Consolidated Laws. Ingested from the Free Law Project (CourtListener) and the NY Senate's OpenLegislation API. All public sources.

→ A 6.95M-edge citation graph in Neo4j. Pure vector search returns cases that *read* alike. The CITES + APPLIES graph returns cases that *matter* — leading precedent surfaced by traversal, the way an attorney shepardizes.

→ Bright Data's Web Unlocker on every request — three parallel calls to nysenate.gov, law.justia.com, and courtlistener.com — to pull current statutory text from publishers that block normal scrapers.

→ Llama 3.3 70B (via Groq) for drafting, with a strict-citation system prompt that refuses to write a sentence not anchored to a numbered citation in the retrieval context.

→ A 0.55 similarity floor on retrieval. If the corpus doesn't cover what you asked, Lex.NY abstains in 0.3 seconds. No invented citations. No hedged nonsense. Just "outside the corpus, here's how to rephrase."

The whole stack is Apache-2.0 open source and runs on a single workstation. ~5.7 seconds warm latency to a fully cited NY legal answer.

This is a research tool. It is not legal advice. It does not create an attorney-client relationship. The /terms page explains this seven different ways, and the public version has a 10-req/min rate limit. But if you're a NY attorney looking for a faster way to start your CPLR research, or a researcher curious about citation-anchored RAG, take a look.

Live: https://iam.nota.lawyer
Source: https://github.com/banksythequantLab/lex-ny

Submitted to @brightdata Web Data UNLOCKED + HackerNoon Proof of Usefulness.

#LegalTech #OpenSource #NewYorkLaw #RAG #AI #GraphRAG
```

---

# 5. X / Twitter thread

5 tweets. Post the first one with the OG card image attached (drag in `nota-lex/public/og-image.svg` or take a screenshot of the homepage hero). The OG card from `iam.nota.lawyer/og-image.svg` will auto-preview when you paste the link, but a directly attached image gives the post more vertical real estate in the timeline.

## Tweet 1 (with OG image attached)

```
I'm a NY attorney (SDNY/EDNY). I got tired of legal AI inventing case citations.

So I built one that can't.

Lex.NY: every answer anchored to a real, openable source.

Live: https://iam.nota.lawyer
```

## Tweet 2

```
The corpus: 1.32M opinions back to 1714, all 40K sections of the NY Consolidated Laws.

Sources: Free Law Project (CourtListener) + NY Senate OpenLegislation.

Embedded into pgvector with mxbai-embed-large (1024d, local Ollama on a single workstation).
```

## Tweet 3

```
The interesting bit: a 6.95M-edge citation graph in Neo4j.

Vector RAG returns cases that *read* alike.
The graph returns cases that *matter* — leading precedent surfaced by traversal, the way you shepardize.

CITES + APPLIES edges seeded from every retrieved opinion.
```

## Tweet 4

```
Plus three Bright Data Web Unlocker calls on every request — nysenate.gov, law.justia.com, courtlistener.com — for live statutory text.

If the corpus similarity drops below 0.55, the system abstains in 0.3s instead of guessing.

No hallucinations. Receipts on every line.
```

## Tweet 5

```
Open source, Apache-2.0. Built on a single workstation.

End-to-end ~5.7s warm with 30 citations on the marquee CPLR query.

Research tool, not legal advice. NY attorney supervised.

→ https://github.com/banksythequantLab/lex-ny

Submitted to @bright_data UNLOCKED + @hackernoon PoU.
```

## Handles to tag in replies (not the main tweets — preserves engagement)
- `@bright_data` (Bright Data)
- `@neo4j`
- `@algolia`
- `@speechmatics`
- `@GroqInc`
- `@hackernoon`
- `@lablabai`

---

# Post-submission ops

- **Pin Tweet 1 to your X profile** for at least 7 days.
- **Add a "Submissions" line to the GitHub README** above the install instructions:
  > Lex.NY was submitted to Bright Data's *Web Data UNLOCKED* and HackerNoon's *Proof of Usefulness* in May/June 2026.
- **Tag a screenshot of the lablab submission confirmation** and quote-tweet the original Show HN post once it hits the front page (don't ask for upvotes — just say "wild morning, thanks all" with the screenshot).
- **Check `/stats` once a day for the first 72h.** The persistent counters now show real public traffic. If `/api/ask` rate-limit hits start appearing in the logs, that's a good sign.

---

## Final pre-flight checklist

- [ ] Smoke test green: `python smoke_demo.py` shows 19/19
- [ ] Tunnel up: `https://iam.nota.lawyer/` returns 200 from an external machine (not localhost)
- [ ] OG card preview works: paste `https://iam.nota.lawyer/` into https://opengraph.xyz/
- [ ] Demo tabs warm: `.\demo-launcher.ps1 -Public` opened all 9 tabs cleanly
- [ ] Video recorded: 90-second cut exists as MP4 ≥1080p
- [ ] Copy paste-tested: pulled this file up on the actual submission form and confirmed the fields fit
- [ ] First comment ready: section 3's "First comment" copied to clipboard *before* hitting submit on Show HN
