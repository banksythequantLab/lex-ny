# Lex.NY — Demo Video Script

Three cuts for three audiences. **Record them once, edit down to the right length.**

All numbers in this script are live-verified against `/api/corpus-stats` and `/api/graph-stats` as of May 28, 2026. Don't round down. Don't soften.

---

## CUT 1 — 90 seconds — Bright Data UNLOCKED submission (lablab.ai)

**Tone:** Technical depth, attorney credibility, "shows the BD stack working in real time."

### Setup
- Screen: split — left half is the Lex.NY app at `/ask`, right half is `/api/bright-data-stats` in a terminal tab.
- Have the **Penal Law 400.00 firearms** question pre-typed in the textarea (don't waste seconds typing on camera).
- Have a third tab ready on `/stats` showing the dashboard counters.

### Script

> **(0:00)** "I'm Derek Soltis, a New York attorney. This is Lex.NY — a research engine where every answer is anchored to real NY law, with Bright Data pulling the receipts in real time."

> **(0:08)** "Here's the killer problem with legal AI: it makes things up. Invented case names. Phantom section numbers. As an attorney supervising a tool like this, that's a non-starter under New York Rule of Professional Conduct 7.1."

> **(0:20)** "So we built Lex.NY to make hallucination physically impossible. Watch."

> **(0:24)** *Click "Ask Lex.NY". The Penal 400.00 question fires.*

> **(0:28)** *Point at the right pane where `/api/bright-data-stats` shows the counter incrementing.* "Right now, Bright Data is firing three calls. One SERP query to Google constrained to NY legal sources. Two Web Unlocker calls pulling full statute text from nysenate.gov in parallel."

> **(0:42)** *The answer renders.* "Every claim has a citation marker. The model is required to anchor every sentence to either an indexed source or a Bright Data-sourced URL — or admit it can't answer. No middle ground."

> **(0:55)** *Cut to `/stats` page.* "Behind that answer: one-point-three-two million NY case decisions, four-point-one-eight million docket records, all forty thousand statute sections. Five-point-five million legal records, queryable live. Bright Data is the layer that keeps it grounded in the present-day web."

> **(1:15)** *Back to the answer panel.* "Three Bright Data requests. Four hundred kilobytes of fresh legal text. Five seconds end-to-end. The Web Unlocker zone handles bot detection, CAPTCHAs, JavaScript pages — nysenate.gov, Justia, AmLegal, all reliable."

> **(1:25)** "Built by a NY attorney, supervised by a NY attorney, grounded in Bright Data on every request. Lex.NY — every cite verifiable."

> **(1:30)** *End card with GitHub URL (`github.com/banksythequantLab/lex-ny`) and the live tunnel URL.*

### B-roll if needed
- Scroll through `/api/bright-data-stats` showing the recent_requests log
- Zoom in on a citation card showing the source URL → click → nysenate.gov opens
- Quick pan across the `/stats` hero counters

---

## CUT 2 — 3 minutes — HackerNoon Proof of Usefulness (proofofusefulness.com + HackerNoon article hero clip)

**Tone:** Real product, real corpus, real use case. Lean on the scale story — the corpus is the moat.

### Setup
- Same split screen, plus a third pane: `/stats` open in a separate tab so you can switch to it on cue.

### Script

> **(0:00) — Hook**
> "I get the same question from clients every week. 'Hey Derek, what does New York law actually say about X?' And every time I have to bill them three hundred dollars to find out. So I built the tool I wished existed."

> **(0:20) — The problem**
> "Legal AI either invents law — which gets you disciplined — or it's so limited it only answers trivia. There's no production-grade middle ground for jurisdiction-specific research."

> **(0:40) — Show the corpus**
> *Cut to `/stats` page. Counters animate up.*
> "Lex.NY runs against the real NY legal record. One-point-three-two million case decisions, going back to seventeen-fourteen. Four-point-one-eight million docket records — every NY case ever filed in the federal districts and appellate courts. All forty thousand statute sections. Five-point-five million legal records, end to end."

> **(1:00) — Show the citation graph**
> *Cut to the `Knowledge graph` panel on `/stats`.*
> "Underneath it: a Neo4j AuraDB citation graph. One-point-three-six million nodes. Six-point-three million relationships. Four-point-nine million opinion-to-opinion citations — meaning Lex.NY doesn't just know what cases exist, it knows which ones cite each other."

> **(1:15) — Demo: question 1 (Bright Data live web)**
> *Switch to `/ask`. Type:* "What does General Business Law 349 prohibit?"
> "Consumer protection law. Watch the Bright Data counter tick on the right."
> *Answer renders.* "Fifteen citations. Ten from the indexed corpus, five fetched live through Bright Data Web Unlocker pointing to nysenate.gov and Justia. Eleven seconds end-to-end."

> **(1:40) — Demo: question 2 (GraphRAG)**
> *Switch to `/search`. Type:* "summary judgment standard in negligence cases"
> "Now I'm asking for the *case law*, not the statute. This is where the citation graph earns its keep."
> *Results appear, ranked by similarity AND `cited_by_count`.*
> "Top result: Winegrad versus NYU Medical Center, nineteen-eighty-five, two thousand nine hundred fifty-one citations in the graph. That's the canonical NY summary judgment case. Lex.NY surfaced it not because the words matched, but because the graph knows that's the case everyone cites."

> **(2:05) — Demo: top-cited query (live Cypher)**
> *Show `/api/graph-stats` JSON response with `top_cited_opinions`.*
> "Real Cypher query against the live graph. People v. Bleakley — eleven thousand cites. People v. Contes — ten thousand eight hundred. People v. Danielson. These are the actual most-cited NY appellate decisions. Not handpicked. Not memorized. The graph computed it."

> **(2:25) — The sponsor stack, briefly**
> "Six sponsors, end-to-end. Bright Data on every request. Neo4j for the graph. Algolia for forty-thousand-record federated search in sixty milliseconds. Speechmatics for voice input — there's a mic button on the ask page. Storyblok runs the editorial blog. Triggerware watches federal bills."

> **(2:45) — Closing**
> "Lex.NY is open source. The pipeline scripts that built the corpus from CourtListener's bulk dumps are in the repo. It's a real tool, supervised by a real attorney, with a real corpus underneath. Five-point-five million legal records. Every cite verifiable. Find us at lex.nota.lawyer."

> **(3:00)** *End card with repo URL, proofofusefulness.com submission tag, HackerNoon article URL.*

---

## CUT 3 — 30 seconds — Social hook for Twitter/LinkedIn

**Tone:** Punchy. Designed to drive clicks to the long video.

### Script

> "I'm a New York attorney. Every legal AI hallucinates. So I built one that *physically can't*."
> *2-second clip of the GBS 349 answer rendering with citations highlighted.*
> "One-point-three-two million NY cases. Four-point-nine million citation edges. Six sponsors live. Bright Data fetches the receipts. Neo4j maps the graph. Every answer has the source."
> *3-second clip of `/stats` counters animating up.*
> "Lex.NY. Every cite verifiable. Link below."

### Visuals
- Bold text overlay at the punch line: "Every cite verifiable."
- End card with Bright Data + HackerNoon + Neo4j + Algolia + Speechmatics + Storyblok + Triggerware logos in a single row

---

## Specific numbers to lock in before recording

These are live as of the script being written. **Refresh `/api/corpus-stats` right before recording and update if anything moved.**

| Claim in the script | Value | Live source |
|---|---:|---|
| Total legal records | 5,540,563 | `/api/corpus-stats` `postgres.total_legal_records` |
| Case decisions | 1,322,766 | `postgres.opinions` |
| Docket records | 4,177,369 | `postgres.ny_cases` |
| Statute sections | 40,428 | `postgres.statutes` |
| Citation edges (Postgres) | 4,940,299 | `postgres.opinion_citations` |
| Date coverage | 1714 → 2026 | `postgres.decision_date_range` |
| Graph nodes | 1,363,359 | `neo4j.stats.total_nodes` |
| Graph relationships | 6,303,493 | `neo4j.stats.total_relationships` |
| People v. Bleakley cites | 11,064 | `neo4j.stats.top_cited_opinions[0]` |
| People v. Contes cites | 10,824 | `top_cited_opinions[1]` |
| Algolia statute index | 40,427 | `/api/algolia-stats` `stats.total_records` |
| Algolia search ms | <100 | `stats.last_search_ms` |

---

## Recording checklist

- [ ] **Clean desktop background** — dark, no clutter
- [ ] **Browser zoom 110-125%** so text is readable on mobile
- [ ] **Hide bookmarks bar** during the recording
- [ ] **Refresh `/api/corpus-stats`** and update any number in the script that moved
- [ ] **Mic test** — record 10 sec, listen back, fix levels
- [ ] **Lighting** — face the window, soft front light
- [ ] **OBS scenes pre-built:**
  - Scene 1: Full-screen Lex.NY at `/ask`
  - Scene 2: Split (Lex.NY `/ask` + BD stats terminal)
  - Scene 3: Full-screen `/stats` for the corpus reveal
  - Scene 4: `/search` for the semantic case demo
  - Scene 5: End card
- [ ] **Demo questions queued** in a text file — paste, don't type live
- [ ] **Take 3 attempts** per cut, pick the best, edit in DaVinci Resolve or CapCut

## Length targets

| Cut | Target | Use |
|---|---|---|
| 1 | 90 sec | lablab.ai submission upload |
| 2 | 3 min | HackerNoon article embed + proofofusefulness.com |
| 3 | 30 sec | Twitter/LinkedIn launch post |

## Upload destinations

- **YouTube unlisted** for the 90 sec and 3 min versions
- **Twitter native** for the 30 sec (better algo treatment than YouTube embed)
- **HackerNoon article** embeds the 3 min via the YouTube URL
