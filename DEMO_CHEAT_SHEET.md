# Lex.NY recording cheat sheet

Keep this open on a second monitor (or printed). Each section below
corresponds to one tab in `demo-launcher.ps1`, in order.

For the **90-second cut**, hit only the boxed tabs (`★`) and skip the rest.
For the **3-minute cut**, hit everything in order.

---

## TAB 1 — Homepage `/` ★

**Time on this tab: 0:00–0:15 (90s) | 0:00–0:25 (3min)**

What you're showing: the entrypoint. The OG card lives here. Live stats strip pulls real numbers on page load.

Say:
- "This is Lex.NY. A research engine for New York law. Built by a NY-licensed attorney."
- "Every case, every statute, every cite verifiable. Five and a half million legal records. Six point nine five million graph relationships."
- *(point at stats strip)* "These are live, fetched right now from the running corpus."

**Transition:** "Let's see what makes it different from any other legal RAG." → Tab 2

---

## TAB 2 — `/ask?q=CPLR 5015` ★ (the marquee answer)

**Time: 0:15–0:45 (90s) | 0:25–1:10 (3min)**

What you're showing: a fully cited answer to a real CPLR question. The bar at the top of the answer card shows the retrieval pipeline.

Say:
- "I asked when a NY court can vacate a judgment. Watch what comes back."
- *(wait for the streaming answer to populate)* "Thirty citations. Each one is a real opinion or statute. Each one is a clickable link to CourtListener, justia, the NY Senate."
- "The model never sees a sentence that isn't grounded in retrieval. The system prompt forbids it."
- *(scroll to the citation list)* "If I click any of these, I'm reading the actual opinion."

**Transition (90s):** "And here's the part I'm most proud of." → Tab 5
**Transition (3min):** "But what about junk queries?" → Tab 3

---

## TAB 3 — `/ask?q=cookie recipe` (the abstain demo, 3-min only)

**Time: 1:10–1:25 (3min only)**

What you're showing: the 0.55 similarity floor in action.

Say:
- "If I ask something that isn't NY law — best cookie recipe — Lex.NY doesn't hallucinate a citation. It abstains in three hundred milliseconds."
- "No Groq call. No invented authority. Just 'outside the corpus, here's how to rephrase.' That's the floor working."

**Transition:** "Now the part I'm most proud of." → Tab 5 (skip 4 for time)

---

## TAB 4 — `/search` semantic + keyword (3-min only, optional)

**Time: 1:25–1:40 (3min only)**

What you're showing: federated Algolia + pgvector search across the corpus.

Say:
- "Search runs over 40,000 NY statute sections in Algolia at sub-100 ms plus semantic over a million-plus opinions."
- "If you don't have a question, just a topic, this is the entry point."

**Transition:** "But the centerpiece is the citation graph." → Tab 5

---

## TAB 5 — `/cited-by/5688657` ★ (Bleakley — the graph payoff)

**Time: 0:45–1:10 (90s) | 1:40–2:15 (3min)**

What you're showing: every case that ever cited Bleakley v. NY. This is the GraphRAG wow.

Say:
- "This is People v. Bleakley. The weight-of-evidence standard for NY appellate review."
- "Six point nine five million CITES and APPLIES edges in Neo4j. Every case that ever cited this one is on this page, traversable in milliseconds."
- "Pure vector search returns cases that *read* alike. The graph returns cases that *matter.* That's the difference."

**Transition (90s):** "And the whole thing is open source." → Tab 9 (skip ahead)
**Transition (3min):** "Same graph powers the live stats." → Tab 6

---

## TAB 6 — `/stats` (3-min)

**Time: 2:15–2:35 (3min)**

What you're showing: the sponsor wall. Six live integrations, each with a real counter.

Say:
- "Six sponsor integrations, all live, all verified end-to-end. Bright Data on every request — three parallel calls to nysenate, justia, courtlistener for live statutory text. Neo4j for the graph. Algolia for federated statute search. Speechmatics for the voice input. Triggerware for legislative watches. Groq for inference."
- "These counters are disk-persistent. They survive every restart."

---

## TAB 7 — `/watches` (3-min, optional)

**Time: 2:35–2:45 (3min)**

What you're showing: Triggerware live deltas on federal bills.

Say:
- "Two active SQL-compiled watches on consumer protection and data privacy bills. Live legislative monitoring. Not a mock — real polling of the federal bill database."

---

## TAB 8 — `/how-it-works` (3-min, optional)

**Time: 2:45–2:55 (3min)**

What you're showing: the five-step pipeline diagram. Use as a backup / transition if the live demo glitches.

Say (only if needed):
- "Full architecture is documented here for anyone who wants to fork it."

---

## TAB 9 — GitHub repo ★

**Time: 1:10–1:30 (90s) | 2:55–3:00 (3min)**

What you're showing: the close. The "this is real" moment.

Say:
- "Apache 2.0. Open source. Built on a single workstation. Live at iam.nota.lawyer."
- "If you want to fork it, run it air-gapped, or just see the strict-citation prompt — it's all here."

---

## Recording mechanics

- **OBS / Loom settings:** 1080p, 30fps, 22000 audio. One window capture pointed at Chrome.
- **Window size:** Full screen. The nav bar wraps cleanly at 1280+ wide.
- **Cursor:** Use a highlight cursor (Loom default works). Click slowly so the highlight catches.
- **Audio check:** Say one sentence, watch the wave form, adjust gain BEFORE rolling.
- **First take is the take:** If you flub once, keep going. You can cut in post. Don't restart for small stumbles — re-recording the intro three times is how you lose 90 minutes.
- **Pre-warm:** Click through every tab once before you hit record. Cold Groq calls add 4–5s. Warm calls are 2s.
- **Backup:** If the live demo glitches mid-recording, switch to Tab 8 (/how-it-works) and narrate from the diagram.

---

## After recording

1. Trim head/tail dead air. Don't over-edit; rough is fine.
2. Export as MP4 at 1080p. ~15–25 MB for 90s, ~30–60 MB for 3min.
3. Upload to lablab.ai (item 1 in SUBMISSIONS.md) and proofofusefulness.com (item 2).
4. Drop the 90s cut on LinkedIn / X (items 3 + 4 in SUBMISSIONS.md).
