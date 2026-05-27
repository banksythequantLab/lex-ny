# Lex.NY — Demo Video Script

Three cuts for three audiences. **Record them once, edit down to the right length.**

---

## CUT 1 — 90 seconds — Bright Data UNLOCKED submission (lablab.ai)

**Tone:** Technical depth, attorney credibility, "shows the BD stack working in real time."

### Setup
- Screen: split — left half is the Lex.NY app (`http://localhost:3000` or live tunnel URL), right half is `/api/bright-data-stats` in a terminal or browser tab.
- Have **Penal §400.00 firearms** question pre-typed in the textarea (don't waste seconds typing on camera).
- Have a second window with the GitHub repo open in case the demo cuts to it.

### Script

> **(0:00)** "I'm Derek Soltis, a New York attorney. This is Lex.NY — a research engine where every answer is anchored to real sources, with Bright Data Web Unlocker and SERP pulling the receipts in real time."

> **(0:08)** "Here's the killer problem with most legal AI: it makes things up. Invented case names, invented section numbers. As an attorney supervising a tool like this, that's a non-starter under New York Rule of Professional Conduct 7.1."

> **(0:20)** "So we built Lex.NY to make hallucination physically impossible. Watch."

> **(0:24)** *Click "Ask Lex.NY". The Penal §400.00 question fires.*

> **(0:28)** *Point at the right pane where `/api/bright-data-stats` shows the counter incrementing.* "Right now, Bright Data is firing three calls. One SERP query to Google constrained to NY legal sources. Two Web Unlocker calls to pull full statute text from nysenate.gov in parallel."

> **(0:42)** *The answer renders.* "Notice every claim has a citation marker. The model is required to anchor every sentence to either an indexed statute or a Bright Data-sourced URL — or admit it can't answer. No middle ground."

> **(0:55)** *Refresh `/api/bright-data-stats`.* "Three requests, 400 kilobytes of fresh legal text fetched through Bright Data, in five seconds total. The Web Unlocker zone handles bot detection, CAPTCHAs, JavaScript-rendered pages — nysenate.gov, Justia, AmLegal all served reliably."

> **(1:10)** "The corpus is forty thousand NY statute sections in local Postgres with pgvector. Bright Data is what makes it more than a snapshot — it's the layer that gives Lex.NY the present-day web."

> **(1:22)** "Built by a NY-licensed attorney, supervised by a NY-licensed attorney, and grounded in Bright Data on every single request. Lex.NY — every cite verifiable."

> **(1:30)** *End card with GitHub URL and lablab.ai team page link.*

### B-roll if needed
- Scroll through `/api/bright-data-stats` showing the recent_requests log
- Zoom in on a citation card showing the source URL → click it → it goes to nysenate.gov

---

## CUT 2 — 3 minutes — HackerNoon Proof of Usefulness (proofofusefulness.com + HackerNoon article hero clip)

**Tone:** Real product, real use case, real users (paralegals, small-firm attorneys). Lean on traction story.

### Setup
- Same split screen plus a third pane: `/api/graph-stats` and `/api/algolia-stats` for the second-half sponsor showcase.

### Script

> **(0:00) — Hook**  
> "I get the same question from clients every week. 'Hey Derek, what does New York law actually say about X?' And every time I have to bill them three hundred dollars to look it up. So I built the tool I wished existed."

> **(0:20) — The Problem**  
> "Legal AI tools either invent law — which gets you disciplined — or they're so limited they only answer trivia. There's no production-grade middle ground for jurisdiction-specific research."

> **(0:40) — Demo: question 1**  
> *Type: "What does General Business Law 349 prohibit?"*  
> "I just asked Lex.NY about consumer protection law. Watch the citation count climb…"  
> *Point at the BD stats counter ticking.*

> **(1:00)** *Answer renders.* "Every claim has a [number] citation. Fifteen total — ten from the indexed statute corpus, five fetched live through Bright Data Web Unlocker pointing to nysenate.gov and law.justia.com."

> **(1:15) — Demo: question 2 (graph augmentation)**  
> *Type: "What statutes does Penal Law 400.00 cite or interact with?"*  
> "Now I'm asking a relational question. Pure vector search would miss this. Neo4j AuraDB is what makes it work — every NY opinion-statute citation is in a graph database, so the model can traverse outward from a seed statute and find what else applies."

> **(1:40)** *Show /api/graph-stats with node and relationship counts.*  
> "Right now my graph has thousands of nodes and tens of thousands of relationships between statutes and the opinions that apply them."

> **(2:00) — Demo: question 3 (Algolia lexical)**  
> "And when someone already knows the cite they want — like 'GBS 349-A' — they don't need semantic search. They need a fast lookup. That's Algolia."  
> *Type "GBS 349" into the corpus search box.*  
> *Results appear in milliseconds.*  
> "Forty thousand records indexed, ten thousand free searches per month on the Build tier."

> **(2:25) — Storyblok closing beat**  
> "Every product launch needs a blog. Lex.NY's release notes and how-tos live in Storyblok — content team writes in the visual editor, the Next.js front-end pulls it via API."  
> *Cut to a /blog page rendering Storyblok content.*

> **(2:40) — Closing**  
> "Lex.NY uses Bright Data for live web data, Neo4j for the citation graph, Algolia for federated search, and Storyblok for the public site. Four sponsor tools doing exactly what they're best at, behind one product that solves a real problem."

> **(2:55)** "I'm a NY-licensed attorney. I'll be the supervising attorney for the production version. Find us at lex.nota.lawyer."

> **(3:00)** *End card with repo URL, proofofusefulness.com submission URL, and HackerNoon article tag.*

---

## CUT 3 — 30 seconds — Social hook for Twitter/LinkedIn

**Tone:** Punchy. Designed to drive clicks to the long video.

### Script

> "I'm a New York attorney. Every legal AI hallucinates. So I built one that *physically can't*. Watch."  
> *5-second clip of the Penal §400.00 demo answer rendering with citations highlighted.*  
> "Forty thousand NY statutes indexed. Bright Data fetches the receipts. Neo4j maps the citation graph. Every answer has the source. Lex.NY — lex.nota.lawyer."

### Visuals
- Bold text overlay: "Every cite verifiable."
- End card with Bright Data + HackerNoon + Neo4j + Algolia logos

---

## Recording checklist

- [ ] **Clean desktop background** — dark, no clutter
- [ ] **Browser zoom 110-125%** so the text is readable on mobile
- [ ] **Hide bookmarks bar** during the recording
- [ ] **Mic test** — record 10 sec, listen back, fix levels
- [ ] **Lighting** — face the window, soft front light
- [ ] **OBS scenes pre-built:**
  - Scene 1: Full-screen Lex.NY at /ask
  - Scene 2: Split (Lex.NY + BD stats terminal)
  - Scene 3: Three-pane (Lex.NY + BD stats + graph-stats)
  - Scene 4: End card
- [ ] **Demo questions queued** — paste each from a text file, don't type live
- [ ] **Empty BD stats counter** before each take — POST /api/bright-data-stats?reset isn't a thing yet, but a server restart clears it
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
