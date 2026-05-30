# Lex.NY — Demo Script

Three cuts. Pick the one that fits the submission format. Every number called out is **live** at the moment of recording — open a second tab on `/stats` so the audience sees you didn't fake anything.

**Public URL:** `https://iam.nota.lawyer`
**Repo:** `https://github.com/banksythequantLab/lex-ny`

---

## Setup before hitting Record (60 seconds)

1. **Confirm everything is green:**
   ```powershell
   python E:\nota_lawyer_hackathon\nota-build\smoke_demo.py
   ```
   Wait for `18/18 passed`. If anything fails, fix before recording.

2. **Open these tabs in order so they're cached:**
   - Tab 1: `https://iam.nota.lawyer/` (home)
   - Tab 2: `https://iam.nota.lawyer/stats` (live dashboard — your money shot)
   - Tab 3: `https://iam.nota.lawyer/ask` (streaming Q&A)
   - Tab 4: `https://iam.nota.lawyer/search`
   - Tab 5: `https://iam.nota.lawyer/cited-by/5688657` (Bleakley — graph traversal)
   - Tab 6: `https://github.com/banksythequantLab/lex-ny` (proof of code)

3. **Clear browser cache and zoom to 110%** so text is legible on recording playback.

4. **Run a warm-up `/api/ask` query** (e.g. "What is CPLR 3211?") so the corpus is in the OS page cache. Cold queries take 30s+, warm queries take 7s.

5. **Quiet the box** — pause the F extract if it's running (it's pegging Postgres). To pause and resume cleanly: stop the extract process, restart it after recording (it's resume-safe).
   ```powershell
   # If you need maximum responsiveness for the demo:
   Get-Process python | Where-Object { $_.WorkingSet64 -gt 200MB } | Stop-Process
   ```

---

## CUT 1 — The 90-second sponsor reel (for lablab.ai submission)

> Aim for crisp pacing, no dead air. Have these numbers memorized so you don't have to read.

### Beat 1 — The problem (0:00–0:15)

**On camera, opening shot of you at the desk:**

> "I'm a New York attorney. Last month I asked a major commercial AI a real legal question — and it cited a case that doesn't exist. Under New York Rule of Professional Conduct 7.1, I can't ship that to clients. So I built one that physically can't hallucinate."

**Cut to screen, tab on `/`:**

> "This is Lex.NY."

### Beat 2 — The corpus (0:15–0:35)

**Switch to `/stats` tab. Slow scroll while narrating.**

> "Five and a half million NY legal records — every appellate opinion since 1714, every section of the Consolidated Laws, every federal NY decision. Nineteen-thousand seven hundred sixty courts."

**Pause on the counter (it ticks live):**

> "Six point three million relationships in the Neo4j citation graph. Every NY-to-NY citation between opinions is an edge. This is how I find leading precedent."

### Beat 3 — The ask (0:35–1:00)

**Switch to `/ask` tab. Type slowly:**

> "What does General Business Law section 349 prohibit?"

**Hit Enter. Narrate while it runs:**

> "Watch what happens. First — Bright Data fires three live web requests to nysenate.gov and law.justia.com — see the citation count tick up in the corner. Then pgvector hits the corpus. Then Neo4j expands the citation graph. Then Groq streams the answer in real time, with every claim tied to a numbered source."

**When the citation strip appears (~11s in), point at it:**

> "Twenty-five citations. Ten from indexed opinions, ten from statutes, five from live Bright Data. The model literally can't say a sentence the retrieval layer can't prove."

### Beat 4 — The graph (1:00–1:20)

**Switch to `/cited-by/5688657` tab — Bleakley page already loaded.**

> "This is People v. Bleakley — the canonical NY weight-of-evidence case. It's been cited eleven thousand fifty-four times. Westlaw and Lexis sell that count as a premium feature. Mine renders it as a free Cypher query."

**Click the top citer — People v. Danielson.**

> "Click any citer, traverse the graph. Real GraphRAG, not vector tricks."

### Beat 5 — Close (1:20–1:30)

**Back to camera.**

> "Every case. Every statute. Every cite verifiable. Open source. Apache 2.0. github.com/banksythequantLab/lex-ny."

---

## CUT 2 — The 3-minute deep dive (for HackerNoon Proof of Usefulness)

Use this when you have time to actually show how the architecture works.

### Beat 1 — Hook (0:00–0:20)

Same as Cut 1.

### Beat 2 — Corpus build (0:20–0:50)

**On `/stats`:**

> "Five and a half million records. CourtListener publishes their bulk dumps monthly — fifty gigabytes of opinions, four gigs of dockets, half a gig of citation maps. I wrote streaming Python that filters down to NY courts, ingests into local Postgres, and embeds every opinion with `mxbai-embed-large` on a single RTX 3090."

**Point at the date range:**

> "1714 to 2026. The oldest opinion in the corpus is from the New York Supreme Court of Judicature, eighteen years before the United States existed."

### Beat 3 — The pipeline (0:50–1:30)

**Switch to `/ask`. Type a question that needs graph context:**

> "What's the standard for summary judgment on a negligence claim under New York law?"

**While it runs, talk through the pipeline:**

> "Five steps. One — embed the question. Two — pgvector ANN search across one point three million opinion embeddings and forty thousand statute sections. Three — Neo4j graph traversal, pulling the citing/cited neighborhood. Four — Bright Data Web Unlocker hits nysenate.gov and CourtListener for live current text. Five — Groq's Llama 3.3 70B drafts the answer under a strict-citation system prompt that forbids it from inventing names."

**Citation strip lands (~11s):**

> "Twenty-five citations. Eight to ten seconds end-to-end. Notice — `graph=neo4j`. That means the GraphRAG expansion fired and pulled in cases the pure vector search would have missed. Like Winegrad — the 1985 Court of Appeals decision that's the canonical statement of the summary-judgment standard."

### Beat 4 — Why the graph matters (1:30–2:10)

**Switch to `/cited-by/5688657`.**

> "Vector search finds cases that sound similar. The graph finds cases that *matter*. This is People v. Bleakley — eleven thousand citing opinions. The top citer is People v. Danielson — nine thousand two hundred ninety-four cites. Then Romero — four thousand sixty-one. Mateo — two thousand seven hundred sixty-three."

**Click Danielson.**

> "These are the cases an experienced NY litigator would put at the top of any brief on weight-of-evidence appellate review. The graph computed it from four point nine million citation edges. No human curation."

### Beat 5 — Sponsor integration (2:10–2:40)

**Back to `/stats`.**

> "Five sponsor integrations, all live. Bright Data on every ask call. Neo4j AuraDB for the graph. Algolia for sub-100ms federated statute search across forty thousand sections. Speechmatics for voice input on the ask page. Triggerware watching federal bills for legislative changes."

**Switch to `/ask` and tap the mic button briefly:**

> "Voice in. Cited answer out."

### Beat 6 — Close (2:40–3:00)

> "Lex.NY. Built by a New York attorney in one month on a single workstation. Five point five million records. Apache 2.0. The code is at github.com/banksythequantLab/lex-ny. The full writeup is on HackerNoon. Every case, every statute, every cite verifiable."

---

## CUT 3 — The 30-second hot version (for X/LinkedIn)

> Single take, no cuts. Memorize this.

**Open on `/stats`. Slow zoom on the counter.**

> "I'm a NY attorney. I built a legal AI that physically can't hallucinate. Five point five million records. Six point three million citation edges. Every claim tied to a real, retrievable source. Open source. Lex dot N Y."

**Cut to `/ask` mid-stream:**

> "Watch the citations land before the text. That's the moat."

**Cut to `/cited-by/5688657`:**

> "And the graph traversal is a free Cypher query, not a paid Westlaw subscription."

**Black card with text:** `github.com/banksythequantLab/lex-ny`

---

## Live numbers cheat sheet

Memorize the round numbers. Open `/stats` in a side window during recording so you can verify-as-you-talk.

| What to say | Why |
|---|---|
| **Five and a half million records** | Total in corpus |
| **One point three million opinions** | NY appellate + federal NY |
| **Forty thousand statute sections** | All 137 NY Consolidated Laws |
| **Four point nine million citation edges** | Opinion-to-opinion CITES |
| **Six point three million graph relationships** | Neo4j total |
| **1714 to 2026** | Date span |
| **Eleven thousand citing opinions** | Bleakley's inbound count |
| **Seven seconds, warm** | `/api/ask` p50 latency once OS cache settles |
| **Twenty-five citations per answer** | 10 opinions + 10 statutes + 5 live web |

## If F extract has completed at recording time

**Add this beat to whichever cut you're using:**

> "And the citation graph isn't just opinion-to-opinion. Every opinion that applies a New York statute is also linked in the graph — five hundred eighty-three thousand `APPLIES` edges so far, growing to roughly six hundred thousand. Click any statute on the stats page, see every case that ever applied it."

(Update the number to whatever `/api/graph-stats` shows at recording time.)

## Watch for

- **`/api/ask` timeouts:** if you see >20s spinner, F extract is hogging Postgres. Pause it (`Stop-Process`) before continuing.
- **Stream stuttering:** the SSE endpoint expects a stable connection. If your wifi flakes, use Ethernet for the recording.
- **Stats showing zero:** that means a sponsor health check is failing. Check `/api/algolia-stats` etc. individually. Re-run smoke_demo.py.
- **Citation strip empty:** retrieval returned no hits. Use a more common NY legal question — "What is CPLR 3211?", "What does Labor Law 240 cover?", "Summary judgment standard in negligence".

## Closing one-liners (pick one based on platform)

- **Hackathon submission:** "Built for Bright Data UNLOCKED and HackerNoon Proof of Usefulness. Live now at iam.nota.lawyer."
- **LinkedIn:** "If your AI cites cases that don't exist, you don't have a research tool. You have a liability."
- **X:** "Every case. Every statute. Every cite verifiable. github.com/banksythequantLab/lex-ny"
