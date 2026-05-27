# Lex.NY Demo Video — Submission Scripts

Three cuts of the same demo, tuned to the audience of each submission.

- **Cut A (90 sec)** → Bright Data UNLOCKED — judging weighs *novel use of BD products*
- **Cut B (3 min)** → HackerNoon Proof of Usefulness — judging weighs *real-world utility*
- **Cut C (30 sec)** → Social / trailer for cross-posting

All cuts share the same recording session. Shoot the long version once with B-roll on the corpus + ask flow, then edit down into A and C from the same footage.

---

## SHARED B-ROLL / SCREEN RECORDING SHOT LIST

Capture these once. Each cut pulls from this pool.

1. **Hero shot**: `lex.nota.lawyer` landing page, slow scroll from hero through the three "how it works" columns. (~10 sec)
2. **Sample question click**: Click "What are the elements of fraud under NY law?" from the landing sidebar. Cuts to the ask page with the question already filled in. (~3 sec)
3. **Live ask, no live SERP**: Watch the progress messages cycle — *embedding → searching corpus → searching statutes → ranking → asking Llama 3.3 70B*. End on the answer rendering with citation markers and source cards. (~12 sec)
4. **Citation click**: Click a `[3]` marker in the answer body, screen scrolls to the matching source card, click through to the underlying CourtListener / NY Senate URL — opens in a new tab showing the real source. (~6 sec)
5. **Live SERP toggle**: Same question, this time with "Augment with live web sources (Bright Data SERP)" checked. Show the same answer plus a new `LIVE WEB` source card with a current article. (~10 sec)
6. **Corpus index**: Scroll the `/corpus` page, switch from Cases tab to Statutes tab, filter by court = `nyappdiv1`, then by law = `EDN`. (~15 sec)
7. **Terminal: scraper running**: A clean terminal showing `npx tsx scripts/seed-cases.ts --years=3` streaming output: `page 1: 100 clusters`, `page 2: 100 clusters`... (~8 sec)
8. **Terminal: BD scraper running**: Terminal showing the NYC Admin Code scraper hitting Bright Data Web Unlocker — log lines with `scraper_provider: brightdata`. (~5 sec)
9. **Closing card**: Logo + "lex.nota.lawyer" + "Built with Bright Data" + Derek's bar admission line. (~3 sec)

---

# CUT A — 90 seconds — BRIGHT DATA UNLOCKED

**Audience**: BD product judges. They care about novel BD usage, not lawyer marketing.
**Hook**: Bright Data is the unlock for a problem free APIs can't solve alone.

---

**[0:00 – 0:08] OPENING — the problem statement**

*[Voice over hero shot]*

> New York has 134 Consolidated Laws, four Appellate Divisions, the Court of Appeals, and the NYC Administrative Code. No single API gives you all of it. Most of it lives behind anti-bot pages, JS-rendered tables, and aggressive rate limits.

---

**[0:08 – 0:20] THE BUILD — what we made**

*[Cut to landing page hero, "Every case. Every statute. Every cite verifiable."]*

> Lex.NY is a New York law research engine. Ask a question in plain English. Get an answer grounded in real cases and real statutes, with every claim anchored to a source you can verify.

---

**[0:20 – 0:50] THE BRIGHT DATA PART — the actual demo**

*[Cut to ask page, click "What are the elements of fraud under NY law?"]*

> The corpus is built by a multi-source scraper. Free APIs do what free APIs are good at — CourtListener for case law, NY Senate OpenLeg for statutes.

*[Cut to terminal showing seed-cases.ts running]*

> But the parts that matter most aren't behind APIs.

*[Cut to a browser tab showing codelibrary.amlegal.com loading slowly with a CAPTCHA]*

> The NYC Administrative Code lives at American Legal Publishing. JS-rendered, anti-bot, no API. Without Bright Data Web Unlocker, you scrape it once and get blocked.

*[Cut to terminal showing the BD-powered AmLegal scraper running, with "scraper_provider: brightdata" log line highlighted]*

> With Web Unlocker, it just works. Same code, same fetch, no CAPTCHA dance.

---

**[0:50 – 1:15] THE LIVE-SERP PART — augment-at-query-time**

*[Cut to ask page with "Augment with live web sources (Bright Data SERP)" checkbox highlighted, then checked]*

> Lex.NY also uses Bright Data SERP at query time. If you ask a question about a case decided last week — too fresh to be in our static index — SERP fills the gap.

*[Cut to running the same fraud query with live SERP on, showing the new LIVE WEB source card appearing alongside the corpus sources]*

> The system constrains the search to legal sources only: nycourts.gov, justia, nysenate, cornell. No SEO spam ever reaches the answer.

---

**[1:15 – 1:30] CLOSING**

*[Cut to the answer page showing citations 1–7, then click marker [4] to scroll to source card]*

> Every claim is cited. Click any marker. Verify the source. The system prompt forbids invented law — if the corpus doesn't cover something, Lex.NY says so instead of guessing.

*[Cut to closing card]*

> Lex.NY. Built with Bright Data. Supervised by a New York attorney. Try it at lex.nota.lawyer.

---

# CUT B — 3 minutes — HACKERNOON PROOF OF USEFULNESS

**Audience**: HackerNoon community + judges. They care about real utility, not feature lists.
**Hook**: AI legal tools hallucinate. This one can't, because the architecture won't let it.

---

**[0:00 – 0:25] OPENING — the credibility problem**

*[Talking head, Derek to camera, office setting]*

> I'm Derek Soltis. I'm a New York attorney, admitted to practice in the Southern and Eastern Districts. I've watched the legal-AI space for two years now, and the same problem keeps appearing.

*[B-roll: news headlines about lawyers sanctioned for filing briefs with hallucinated case citations from ChatGPT]*

> Lawyers have been sanctioned, fined, and disbarred for filing briefs full of cases that don't exist. The AI made them up. The lawyer didn't check. The court noticed.

> The problem isn't that AI is bad at law. The problem is that most legal AI tools answer first and cite later — if at all. Lex.NY does the opposite.

---

**[0:25 – 0:55] THE THESIS — architecture, not promises**

*[Whiteboard or simple animated diagram]*

> Lex.NY can't hallucinate citations. Not because the model is smarter. Because the architecture won't let it.

*[Diagram: question → embed → retrieve from corpus → context block → LLM → answer with [n] markers]*

> Every question goes through three steps. First, retrieve real sources from the corpus — opinions and statutes that actually exist, because we scraped them from CourtListener, the NY Senate, and the NYC Administrative Code. Second, build a context block with numbered markers. Third, ask Llama 3.3 70B to draft an answer where every factual claim ends with a marker pointing to a real source.

> If the corpus doesn't have the answer, the model is instructed to say so. No filler. No guessing.

---

**[0:55 – 1:30] THE DEMO — actually use it**

*[Switch to screen recording: landing page, click sample question]*

> Let me show you. "What is the standard for piercing the corporate veil in New York?" Real research question, the kind I answer for clients regularly.

*[Watch the answer render — show the progress messages, then the final answer with multiple [n] citations]*

> Five seconds. Answer cites three Court of Appeals decisions and one statute. Let me click on the first citation.

*[Click marker [1], page scrolls to source card, click the source URL]*

> That's a real case. Real citation. Real holding. I just opened it on CourtListener. The card on Lex.NY accurately quotes the holding because the AI worked from the actual opinion text, not from training data that might be three years old.

---

**[1:30 – 2:00] THE CORPUS — what's actually in there**

*[Cut to /corpus page, scroll through cases tab]*

> The corpus is real, and it's growing. Five thousand-plus appellate opinions from the Court of Appeals and all four Appellate Divisions, going back three years. All 134 NY Consolidated Laws — every section, every chapter, with the full text. The NYC Administrative Code, every title.

*[Switch to Statutes tab, filter to EDN]*

> Filter by law, by court, by date. Click any row, go straight to the original source. This is the same data the AI sees. There's no proprietary index we're hiding.

---

**[2:00 – 2:30] THE BRIGHT DATA STORY — why this works**

*[Cut to terminal running BD-powered AmLegal scraper]*

> The corpus is built by a hybrid scraper. Free APIs where they exist — CourtListener for cases, NY Senate OpenLegislation for statutes. Bright Data Web Unlocker for everything else: the NYC Admin Code, the freshest decisions Justia indexes before CourtListener does, and live SERP queries at answer time so we can pull in articles published yesterday.

> Without Bright Data, the corpus has gaps. With it, the corpus is complete, and the cost stays under a few cents per question.

---

**[2:30 – 3:00] CLOSING — who this is for**

*[Talking head, Derek to camera]*

> Lex.NY is for the next pro se litigant who can't afford Westlaw, the next paralegal who needs to verify a citation in twenty seconds instead of twenty minutes, the next lawyer who wants a draft answer with real sources before they spend an hour writing the brief themselves.

> It's not a replacement for a lawyer. It's a research assistant a lawyer can supervise. I supervise this one personally — I'm responsible for what it says.

> Try it at lex.nota.lawyer. The corpus, the scrapers, the system prompts — all open and inspectable. That's the only kind of legal AI I'd put my bar number behind.

*[Closing card]*

---

# CUT C — 30 seconds — TRAILER

**Audience**: Twitter / LinkedIn / Bluesky / Threads
**Hook**: Strong claim, strong proof.

---

**[0:00 – 0:05]**

*[Hero shot, voice over]*

> Most legal AI hallucinates cases. This one can't.

---

**[0:05 – 0:15]**

*[Quick cuts: ask page → answer rendering → citation markers → click marker → source card → click out to real CourtListener URL]*

> Every claim cites a real case. Click it. Open the source. Verify it yourself.

---

**[0:15 – 0:25]**

*[Cut to corpus page, fast scroll through cases and statutes]*

> 5,000 NY appellate opinions. 134 Consolidated Laws. The NYC Admin Code. All indexed. All searchable.

---

**[0:25 – 0:30]**

*[Logo card]*

> Lex.NY. Built with Bright Data. Supervised by a NY attorney.
> lex.nota.lawyer

---

# PRODUCTION CHECKLIST

Before recording:

- [ ] Seed corpus is populated (so `/ask` returns real answers, `/corpus` is not empty)
- [ ] At least one good test question that returns a strong answer with 4+ citations
- [ ] Browser zoom set to 110% so text is readable on YouTube/Devpost players
- [ ] OBS recording at 1920×1080, 30fps
- [ ] Mic check — Derek's voice is the talking-head audio for Cut B
- [ ] Closing card PNG ready at /mnt/user-data/outputs/lex_closing_card.png

Recording sequence (one continuous session):

1. Talking head segments for Cut B opening + closing (1 min total)
2. Full screen-recording of landing → ask flow → corpus browse, **without live SERP**, narrating naturally
3. Same flow **with live SERP**, narrating the difference
4. Terminal segments — scraper output, BD logs
5. Citation-click sequences

Editing:

- Cut B = the master edit, full 3 min
- Cut A = lift 0:00–1:30 of Cut B minus the talking head sections
- Cut C = 6 fast scenes from B's b-roll, no voiceover except opening/closing
- Captions burned in for all three (most social viewers watch muted)

Submission destinations:

| Cut | Where | Format |
|---|---|---|
| A | Bright Data UNLOCKED Devpost submission | YouTube unlisted, link in submission |
| B | HackerNoon writeup | YouTube unlisted, embedded in article |
| C | X, LinkedIn, Bluesky | MP4 direct upload, 30 sec native video |

Both A and B get a written README/post that the video supports. The video alone is not the submission — the writeup is, with the video as proof.
