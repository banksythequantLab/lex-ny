# Lex.NY

> Every case. Every statute. Every cite verifiable.

NY law research engine with mandatory citation RAG. Ask a question in plain English, get an answer where every factual claim is anchored to either (a) an indexed NY statute, (b) a real NY court decision retrieved by vector + citation-graph similarity, or (c) a live web source fetched in real time through Bright Data's Web Unlocker and SERP infrastructure. No invented law. No hallucinated case names.

Built by a NY-licensed attorney (SDNY/EDNY) for the **Bright Data UNLOCKED** and **HackerNoon Proof of Usefulness** hackathons.

---

## Corpus

| | Count |
|---|---:|
| NY case decisions (opinions, with metadata + summary) | **1,322,766** |
| NY docket records (case names, dates, parties, courts) | **4,177,369** |
| NY statute sections (all 137 Consolidated Laws) | **40,428** |
| Opinion-to-opinion citation edges | **4,940,299** |
| Date coverage | **1714 → 2026** |
| **Total legal records** | **5,540,563** |

Backed by a live knowledge graph in Neo4j AuraDB:

| | Count |
|---|---:|
| Graph nodes (`Opinion`, `Statute`, `Law`, `Court`) | **1,363,359** |
| Graph relationships (`CITES`, `DECIDED_BY`, `UNDER`) | **6,303,493** |

Top-cited NY opinions surfaced by the graph (real Cypher query, not handpicked):

| Opinion | Court | Year | Cites in graph |
|---|---|---:|---:|
| People v. Bleakley | NY CoA | 1987 | 11,064 |
| People v. Contes | NY CoA | 1983 | 10,824 |
| People v. Gonzalez | NY CoA | — | 9,538 |
| People v. Danielson | NY CoA | 2007 | 9,314 |
| People v. Lopez | NY CoA | — | 8,302 |

Live source: [`GET /api/corpus-stats`](https://github.com/banksythequantLab/lex-ny/blob/main/nota-lex/app/api/corpus-stats/route.ts).

---

## What it does

```
POST /api/ask
{ "question": "What are the requirements for a firearms license under Penal Law section 400.00?" }
```

```json
{
  "answer": "To obtain a license to carry or possess a firearm in New York, an applicant
  must meet certain eligibility criteria. The applicant must be at least 21 years old,
  unless they have been honorably discharged from the United States military [1]. The
  applicant must also be of good moral character, have no felony or serious offense
  convictions, and not be a fugitive from justice [1]...",
  "citations": [
    { "marker": 1, "kind": "statute", "display": "Penal 400.00", "...": "..." },
    { "marker": 11, "kind": "live_web", "display": "Legislation - The Laws of NY",
      "url": "https://www.nysenate.gov/legislation/laws/PEN/400.00" }
  ],
  "retrieval_duration_ms": 1058,
  "llm_duration_ms": 895,
  "web_data_provider": "brightdata",
  "graph_provider": "neo4j"
}
```

Typical answer: **4–11 seconds end-to-end**, 10–15 citations per question, half of them BD-sourced from the live web.

There are also two purpose-built surfaces on top of the same corpus:

- **[`/search`](nota-lex/app/search/page.tsx)** — semantic case search. Type a natural-language issue, get the most similar NY decisions ranked by vector similarity and citation-graph influence (`cited_by_count`). Backed by [`/api/search/cases`](nota-lex/app/api/search/cases/route.ts).
- **[`/stats`](nota-lex/app/stats/page.tsx)** — live corpus + sponsor health dashboard. Every number fetched from local Postgres + Neo4j on page load. Backed by [`/api/corpus-stats`](nota-lex/app/api/corpus-stats/route.ts).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          /api/ask                                │
├─────────────────────────────────────────────────────────────────┤
│  1. embed(question) ─────────► Ollama mxbai-embed-large (1024d) │
│  2. pgvector ANN  ────────────► Postgres 18 + pgvector 0.8.2    │
│     (top-10 statutes + opinions)                                 │
│  3. expandViaGraph() ─────────► Neo4j AuraDB                     │
│     (related cases via CITES traversal; co-cited statutes)       │
│  4. liveSerpLegalSearch() ────► Bright Data SERP API             │
│     (5 Google results, NY legal sources)                         │
│  5. fetchBodies(top 2) ───────► Bright Data Web Unlocker         │
│     (full statute/opinion text in parallel)                      │
│  6. Llama 3.3 70B ────────────► Groq                             │
│     (strict citation-required prompt, no invented law)           │
└─────────────────────────────────────────────────────────────────┘
```

### Sponsor integrations (6 live, end-to-end verified)

| Sponsor | Product | How it's used | Proof |
|---------|---------|---------------|-------|
| **Bright Data** | Web Unlocker (`mcp_unlocker` zone) | Fetches full statute/opinion text from gated sources (nysenate.gov, law.justia.com, courtlistener.com). Counter on every `/api/ask` call. | [`/api/bright-data-stats`](nota-lex/app/api/bright-data-stats) |
| **Bright Data** | SERP API (same zone) | Real-time Google results for authoritative NY legal sources. | same |
| **Neo4j AuraDB** | GraphRAG citation graph | 1.36M nodes / 6.3M relationships. `(:Opinion)-[:CITES]->(:Opinion)` traversal surfaces leading cases pure vector search misses. | [`/api/graph-stats`](nota-lex/app/api/graph-stats) |
| **Algolia** | Federated search | 40,427 NY statute sections indexed; sub-100ms federated keyword search. | [`/api/algolia-stats`](nota-lex/app/api/algolia-stats) |
| **Storyblok** | Headless CMS | [`/blog`](nota-lex/app/blog) editorial content with rich-text rendering. | [`/api/storyblok-stats`](nota-lex/app/api/storyblok-stats) |
| **Speechmatics** | Real-time voice transcription | 🎙 mic button on `/ask` opens a WebSocket to Speechmatics RT; JWT minted server-side with `@speechmatics/auth`. | [`/api/speechmatics-stats`](nota-lex/app/api/speechmatics-stats) |
| **Triggerware** | Connector-driven scheduled queries | `(:LegalWatch)`: describe a topic in English, Triggerware compiles SQL against `govtrack_bills`, polls for new federal bills, returns deltas. | [`/api/triggerware-stats`](nota-lex/app/api/triggerware-stats) |

---

## Pipeline scripts

The 5.5M-record corpus was built reproducibly from CourtListener's quarterly bulk dumps. All Python pipeline scripts are in [`nota-shared/scripts/python/`](nota-shared/scripts/python):

| Script | What it does |
|---|---|
| `ingest_pipeline.py` | Streams CourtListener `courts` + `opinion-clusters` (2.28 GB bz2) → Postgres `courts` + `opinions` tables. 71M rows scanned, 1.32M NY matched. |
| `ingest_dockets_to_cases.py` | Streams the `dockets` dump (4.64 GB bz2) → 4.18M NY case records in `ny_cases`. |
| `build_citation_graph.py` | Two stages: streams the 50 GB `opinions` text dump for `opinion_id → cluster_id` map (~2 hrs), then the 498 MB `citation-map` for `opinion_citations` edges. |
| `embed_opinions.py` | Batched Ollama `/api/embed` (1024-d mxbai-embed-large) over `case_name + summary`. 160× faster than serial `/api/embeddings`. |
| `sync_opinions_neo4j.py` | Postgres `opinions` → AuraDB `Opinion` + `Court` nodes + `DECIDED_BY` edges. UNWIND MERGE at ~8K/s. |
| `sync_cites_neo4j.py` | Postgres `opinion_citations` → AuraDB `CITES` relationships. ~10K/s. |

All scripts read `PGPASSWORD` from env — zero hardcoded creds.

---

## Quick start

```bash
# Clone
git clone https://github.com/banksythequantLab/lex-ny
cd lex-ny

# Install
npm install

# Configure
cp .env.example nota-lex/.env.local
# Fill in: GROQ_API_KEY, BRIGHT_DATA_API_TOKEN, NEO4J_URI/USER/PASSWORD,
# ALGOLIA_APP_ID + keys, STORYBLOK_ACCESS_TOKEN, SPEECHMATICS_API_KEY,
# TRIGGERWARE_API_KEY, PGPASSWORD, COURTLISTENER_API_TOKEN (for incremental),
# NY_SENATE_API_KEY (for statute re-seed)

# Set up local Postgres 18 + pgvector
# https://www.postgresql.org/download/  (pgvector ships in contrib on PG18)
createdb lex
psql -d lex -c "CREATE EXTENSION IF NOT EXISTS vector"

# Statute corpus (~2 min for all 137 NY laws via NY Senate API)
npx tsx nota-shared/scripts/seed-statutes.ts

# Case corpus (downloads + parses CourtListener bulk dumps)
# Takes ~30 minutes total; resume-safe via ON CONFLICT DO NOTHING.
export PGPASSWORD=your_pwd
python nota-shared/scripts/python/ingest_pipeline.py all
python nota-shared/scripts/python/ingest_dockets_to_cases.py
python nota-shared/scripts/python/build_citation_graph.py all

# Embeddings (~4 hours on RTX 3090 at 80/s batch=2048)
python nota-shared/scripts/python/embed_opinions.py

# Neo4j graph sync (~15 min total)
python nota-shared/scripts/python/sync_opinions_neo4j.py
python nota-shared/scripts/python/sync_cites_neo4j.py

# Run dev server
npm run dev:lex
```

Open [http://localhost:3000](http://localhost:3000). Visit `/stats` to confirm every counter is live.

---

## Stack

- **Frontend:** Next.js 16.2.6 (App Router, Turbopack) + Tailwind v4 + TypeScript
- **Database:** Postgres 18 + pgvector 0.8.2 (local; corpus ~1.4 GB)
- **Embeddings:** Ollama `mxbai-embed-large` via `/api/embed` (1024d, 512-token context, batched at 2048)
- **LLM:** Groq Llama 3.3 70B (~500 ms per draft) with AI/ML API consensus as optional multi-model voting layer
- **Live web:** Bright Data Web Unlocker + SERP (default on every `/api/ask`)
- **Citation graph:** Neo4j AuraDB enterprise (1.36M nodes, 6.3M relationships)
- **Federated search:** Algolia (40K statute records)
- **CMS:** Storyblok (editorial blog)
- **Voice input:** Speechmatics real-time WebSocket
- **Legislative watches:** Triggerware on the `govtrack_bills` connector
- **Workspace:** npm workspaces (`nota-shared`, `nota-lex`, `nota-trademark`, `nota-copyright`)

---

## Why the strict citation prompt matters

NY Rules of Professional Conduct 7.1 requires that legal services advertising not be misleading. An AI that invents case names or makes up statute section numbers can't be supervised into compliance — the only defensible architecture is one where the model is *physically incapable* of citing law that wasn't in its retrieval context.

The `SYSTEM_PROMPT` in [`nota-shared/src/lex/answer.ts`](nota-shared/src/lex/answer.ts) enforces:

1. **Citations mandatory.** Every factual claim followed by a `[n]` marker pointing to a context source.
2. **If context doesn't cover it, say so.** "The Lex.NY corpus doesn't cover this directly..." rather than confident fabrication.
3. **No invented section numbers, no invented case names.** The retrieval layer is the source of truth.
4. **No advice language.** "I recommend" / "you should" are forbidden — only neutral research language.

This isn't a chatbot. It's a research assistant whose output a paralegal can walk to a partner's office.

---

## Demo

Three questions that work today (all return real citations in 4–11 seconds):

1. **`"Licensing and other provisions relating to firearms"`**
   → Penal Law 400.00 with full statutory eligibility quoted (4.2 s, 10 citations)

2. **`"What does General Business Law section 349 prohibit?"`**
   → GBS 349 + Article 22-A with live BD-sourced URLs (11 s, 15 citations)

3. **`"What's the standard for summary judgment in NY?"`** (semantic search on `/search`)
   → Winegrad v. NYU Medical Center surfaces first, ranked up by its 2,951+ citation count

---

## License

Proprietary — © 2026 Derek Soltis. Hackathon submission only. Production deployment is via [Nota.Lawyer](https://nota.lawyer).

## Built by

Derek "Banksy AI" Soltis — NY attorney (SDNY/EDNY), Super Lawyers Rising Star. JD Rutgers, MBA/MS Fordham. Operator of [28usc1782.com](https://28usc1782.com) (international discovery) and [Nota.Lawyer](https://nota.lawyer) (LLC formation).

Find me on X: [@banksyAI](https://x.com/banksyAI) · GitHub: [@banksythequantLab](https://github.com/banksythequantLab) · [@banksy-ai](https://github.com/banksy-ai)
