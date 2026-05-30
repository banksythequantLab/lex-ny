# I'm a New York Attorney. I Built Legal AI That Physically Can't Hallucinate.

**Or: how a 5,540,563-record corpus, a 6.3 million-edge citation graph, and one Bright Data Web Unlocker zone made the difference between a chatbot and a research tool.**

---

I've been a practicing attorney in the Southern and Eastern Districts of New York for several years. The first time I asked a major commercial AI a real legal question — something I would have billed a client three hundred dollars to research — it cited a case that does not exist.

Not a misquote. Not a misattribution. A fictional opinion, with a confident citation, supposedly from the New York Court of Appeals. When I went to look it up, it wasn't on Westlaw. It wasn't on CourtListener. It wasn't anywhere.

That's the moment Lex.NY started.

The problem is structural. Large language models are trained to produce plausible text. Plausible legal text looks like *Smith v. Jones, 123 N.Y.2d 456 (2003)*. The model doesn't know whether *Smith v. Jones* exists. It knows what a citation *looks like*. And under [New York Rule of Professional Conduct 7.1](https://www.nysenate.gov/), I cannot ship a tool to clients that confidently invents law. It's not a matter of polish or fine-tuning. It's a matter of architecture.

So I built one where the model is *physically incapable* of citing law it didn't retrieve.

## What the system actually does

A user types a question — say, *"What does General Business Law section 349 prohibit?"* — and Lex.NY runs five steps in a row:

1. **Embed the question** with a local `mxbai-embed-large` model (1,024-dim vectors).
2. **Approximate-nearest-neighbor search** in Postgres with pgvector, against two indexed corpora: 40,428 NY statute sections and 1,322,766 NY case decisions.
3. **Expand via the citation graph.** Take the top opinions, query Neo4j AuraDB for what cites them and what they cite, and pull those neighbors into context. This is GraphRAG — the part vector search alone always misses.
4. **Fetch the live web** through [Bright Data](https://brightdata.com/)'s Web Unlocker zone. One SERP query for the most relevant authoritative sources (`nysenate.gov`, `law.justia.com`, `courtlistener.com`), then two parallel Web Unlocker calls to pull the actual statute or opinion text from those pages.
5. **Generate the answer** with Groq's Llama 3.3 70B, under a system prompt that requires a `[N]` citation marker after every factual claim. If the marker doesn't point to something in the retrieval context, the answer doesn't ship.

End to end: 4 to 11 seconds. Twenty-five citations on a typical answer. Ten from indexed opinions, ten from indexed statutes, five from the live web through Bright Data.

The trick isn't the LLM. The trick is that the LLM never gets to invent anything, because the things it would invent aren't in the box it's allowed to draw from.

## The corpus is the moat

A legal AI is only as good as what it can cite. So most of the engineering work this month wasn't on the model — it was on the corpus.

CourtListener publishes [bulk data dumps](https://www.courtlistener.com/help/api/bulk-data/) of every American court opinion and docket they've digitized. The raw files are uncompromising: a 50 GB opinions text dump, a 4.64 GB dockets dump, a 498 MB citation map. I wrote a streaming Python pipeline that scans the lot row by row, filters for New York courts (federal districts in NY plus state appellate courts, surrogate's, bankruptcy), and inserts into local Postgres in 5,000-row batches.

Three things almost killed the build:

**The CSV format.** CourtListener's opinions file uses backslash-escaped quotes and literal newlines inside text fields — Python's default `csv.reader` misaligns 99.9% of rows. The fix was `doublequote=False, escapechar='\\\\'`, plus `csv.field_size_limit(sys.maxsize)` for summary cells that exceed 130 KB. Without those two flags, my opinion-to-cluster map had 2 matches out of 5.6 million rows. With them, 1,322,766.

**The cluster-versus-opinion ID confusion.** CourtListener stores opinions and "clusters" (groups of opinions on the same case) under separate ID spaces. The citation map references opinion IDs; my opinions table uses cluster IDs. Bridging them required streaming the 50 GB opinions file just to build an `opinion_id → cluster_id` map (28.8 MB JSON, two hours of streaming).

**Postgres transaction semantics.** Server-side named cursors are wonderful for streaming millions of rows. They're also incompatible with `conn.commit()` on the same connection — the commit invalidates the cursor's transaction snapshot. The fix is two connections: read on one, write-and-commit on the other.

After all of that, the build:

| | Count |
|---|---:|
| NY case decisions, fully metadata-indexed | **1,322,766** |
| NY docket records (every case name, every party) | **4,177,369** |
| NY statute sections, every Consolidated Law | **40,428** |
| Opinion-to-opinion citation edges | **4,940,299** |
| Date coverage | **1714 → 2026** |
| **Total legal records** | **5,540,563** |

Three centuries of New York law, queryable in a single SQL `SELECT`.

## Bright Data is what keeps it grounded in the present

The corpus is huge but it's not live. Statutes get amended. Recent decisions land. Court rules change. A research tool that only knows what's in its index ages out within months.

Bright Data's [Web Unlocker](https://brightdata.com/products/web-unlocker) is what closes that gap. On every `/api/ask` call, Lex.NY fires three Bright Data requests in parallel: one SERP query against Google constrained to authoritative NY legal sources, then two Web Unlocker calls that pull the full body of the top two results.

The Web Unlocker handles what would otherwise be infrastructure I don't want to maintain — bot detection, CAPTCHA solving, JavaScript-rendered pages, regional routing. `nysenate.gov`, `law.justia.com`, the NY Senate's `OpenLegislation` browse pages — all reliably scrapeable through one consistent API. The five live web citations in every answer are what let me confidently say to a client: *this is current as of the moment you asked.*

In a recording last week, a Bright Data counter on a side panel ticked from 4,127 to 4,130 the moment I clicked Ask. Three requests. Four hundred kilobytes of fresh statutory text. Five seconds end-to-end. That's not retrieval-augmented generation in the academic sense. That's a working tool.

## The citation graph is the part that surprises people

Vector search is good at semantic similarity. It is bad at importance.

If you ask Lex.NY *"what's the standard for summary judgment in negligence cases under New York law?"*, pure vector search will return cases that *talk about* summary judgment. It will not necessarily return *Winegrad v. New York University Medical Center*, 64 N.Y.2d 851 (1985) — the canonical NY Court of Appeals decision on the topic — unless the question happens to mirror its text closely.

What surfaces *Winegrad* is the citation graph.

After the corpus was loaded, I ran a second pipeline that streams the 498 MB CourtListener citation map and converts every NY-to-NY citation into an edge in a Neo4j AuraDB graph. The result:

| | Count |
|---|---:|
| Graph nodes (`Opinion`, `Statute`, `Law`, `Court`) | **1,363,359** |
| Graph relationships (`CITES`, `DECIDED_BY`, `UNDER`) | **6,303,493** |

Then I ran a single Cypher query to find the most-cited NY opinions in the entire graph:

```cypher
MATCH (citer:Opinion)-[:CITES]->(o:Opinion)
RETURN o.cl_id, o.case_name, count(citer) AS times_cited
ORDER BY times_cited DESC LIMIT 5
```

The result was the kind of list every NY litigator recognizes on sight:

| Opinion | Court | Year | Cites |
|---|---|---:|---:|
| People v. Bleakley | NY CoA | 1987 | 11,064 |
| People v. Contes | NY CoA | 1983 | 10,824 |
| People v. Gonzalez | NY CoA | — | 9,538 |
| People v. Danielson | NY CoA | 2007 | 9,314 |
| People v. Lopez | NY CoA | — | 8,302 |

These are the most-cited NY appellate decisions in modern criminal procedure. The graph didn't memorize that. It computed it from 4,940,299 citation edges.

Once that graph existed, the rest of the system got smarter. The `/api/ask` retrieval pipeline now seeds its Neo4j traversal with the top opinions from the vector search and pulls back what cites them and what they cite — the citing/cited neighborhood that pure vector search would have missed. The `/search` page ranks results by `cited_by_count` so leading precedent floats up. The `/cited-by/[cl_id]` page lets you click any opinion and traverse the graph one hop at a time, recursively, forever. Click Bleakley, see the 9,294-cite Danielson at the top, click Danielson, keep going.

What Westlaw and Lexis sell as "KeyCite" or "Shepard's" — premium paid features in five-figure subscriptions — Lex.NY exposes as a free JSON endpoint and a clickable page, backed by an open citation graph.

## How the architecture survives Rule 7.1

The model is never the source of truth. The retrieval layer is. That distinction is what lets the system pass a supervision standard a chatbot can't.

The `SYSTEM_PROMPT` in [`answer.ts`](https://github.com/banksythequantLab/lex-ny/blob/main/nota-shared/src/lex/answer.ts) enforces four rules:

1. **Every factual claim ends in a `[N]` citation marker.**
2. **If the question isn't covered by the retrieval context, the answer must say so.** *"The Lex.NY corpus doesn't directly address this..."* — and stop.
3. **No invented case names. No invented section numbers. No invented holdings.**
4. **No advice language.** "I recommend" / "you should" are forbidden. The output is neutral research, not counsel.

When weak retrievals slip past those rules — and they sometimes do, on questions where the corpus genuinely doesn't have a good match — the right answer is to tighten the floor in the retrieval layer, not to soften the prompt. There's a real engineering backlog there. But "the model occasionally leaks past a clearly-stated guardrail when retrieval is weak" is a tractable problem. *"The model invented a case"* is not.

## The submission

This piece is the writeup for the [HackerNoon Proof of Usefulness](https://proofofusefulness.com/) submission. The Bright Data UNLOCKED hackathon submission is the demo video shot against the same codebase. Repo:

> **[github.com/banksythequantLab/lex-ny](https://github.com/banksythequantLab/lex-ny)** — Apache-2.0, 18-check smoke test included, six sponsor integrations verified end-to-end, full Python ingest pipeline reproducible from CourtListener bulk dumps.

Six sponsor integrations are live: Bright Data on every request, Neo4j AuraDB for the graph, Algolia for federated statute search at sub-100ms, Speechmatics for voice input on the Ask page, Triggerware for federal-bill legislative watches.

## Why this matters beyond New York

The pattern generalizes. The cost of building a defensible AI system for any expert domain — medical, regulatory, scientific — isn't the model. It's the corpus. And the corpus is the *only* thing that determines whether the output is true.

Five-point-five million records cost me one month of streaming pipelines on a single workstation with one RTX 3090. The architecture that prevents hallucination isn't more compute. It's the discipline of refusing to let the model write a sentence the retrieval layer can't prove.

I am a lawyer. I have to sign my name to my work. So the tool I built does the same.

> Every case. Every statute. Every cite verifiable.

---

*Derek "Banksy AI" Soltis is a NY-licensed attorney (SDNY/EDNY), Super Lawyers Rising Star, JD Rutgers, MBA/MS Fordham. He operates [28usc1782.com](https://28usc1782.com) and is building [Nota.Lawyer](https://nota.lawyer).*
