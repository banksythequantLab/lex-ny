# Lex.NY

> Every case. Every statute. Every cite verifiable.

NY law research engine with mandatory citation RAG. Ask a question in plain English, get an answer where every factual claim is anchored to either (a) an indexed NY statute, or (b) a live web source fetched in real time through Bright Data's Web Unlocker and SERP infrastructure. No invented law. No hallucinated case names.

Built by a NY-licensed attorney (SDNY/EDNY) for the **Bright Data UNLOCKED** and **HackerNoon Proof of Usefulness** hackathons.

---

## What it does

```
POST /api/ask
{ "question": "What are the requirements for a firearms license under Penal Law section 400.00?" }
```

```
{
  "answer": "To obtain a license to carry or possess a firearm in New York, an applicant
  must meet certain eligibility criteria. The applicant must be at least 21 years old,
  unless they have been honorably discharged from the United States military [1]. The
  applicant must also be of good moral character, have no felony or serious offense
  convictions, and not be a fugitive from justice [1]...",
  "citations": [
    { "marker": 1, "kind": "statute", "display": "Penal 400.00", ... },
    { "marker": 11, "kind": "live_web", "display": "Legislation - The Laws of NY", "url": "https://www.nysenate.gov/legislation/laws/PEN/400.00", ... }
  ],
  "retrieval_duration_ms": 1058,
  "llm_duration_ms": 895,
  "web_data_provider": "brightdata",
  "graph_provider": "neo4j"
}
```

Typical answer: **4–11 seconds end-to-end**, 10–15 citations per question, half of them BD-sourced from the live web.

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
│     (related statutes via co-citation, when configured)          │
│  4. liveSerpLegalSearch() ────► Bright Data SERP API             │
│     (5 Google results, NY legal sources)                         │
│  5. fetchBodies(top 2) ───────► Bright Data Web Unlocker         │
│     (full statute text in parallel)                              │
│  6. Llama 3.3 70B ────────────► Groq                             │
│     (strict citation-required prompt, no invented law)           │
└─────────────────────────────────────────────────────────────────┘
```

### Sponsor integrations

| Sponsor | Product | How it's used | Proof |
|---------|---------|---------------|-------|
| **Bright Data** | Web Unlocker (`mcp_unlocker` zone) | Fetches full statute text from gated sources (nysenate.gov, law.justia.com, codelibrary.amlegal.com) | `GET /api/bright-data-stats` |
| **Bright Data** | SERP API (via same Web Unlocker zone) | Finds authoritative NY legal sources in real time | `GET /api/bright-data-stats` |
| **Neo4j** | AuraDB citation graph | (:Opinion)-[:CITES]-(:Opinion), (:Opinion)-[:APPLIES]-(:Statute), (:Statute)-[:UNDER]-(:Law). GraphRAG expansion surfaces co-cited statutes that pure vector search misses. | `GET /api/graph-stats` |
| **Algolia** | Build tier search | Federated search across statute corpus (planned) | `GET /api/search` (TODO) |
| **Storyblok** | Headless CMS | Blog/changelog/about pages (planned) | `/blog` (TODO) |

---

## Quick start

```bash
# Clone
git clone https://github.com/banksy-ai/lex-ny
cd lex-ny

# Install
npm install

# Configure
cp nota-lex/.env.example nota-lex/.env.local
# Fill in: GROQ_API_KEY, BRIGHT_DATA_API_TOKEN, NY_SENATE_API_KEY, etc.

# Set up local Postgres 18 + pgvector
choco install postgresql18  # Windows
# Then install pgvector — see docs/POSTGRES_SETUP.md

# Seed the corpus (5 minutes for all 137 NY laws)
npx tsx nota-shared/scripts/seed-statutes.ts

# Generate embeddings (~25 minutes for 40K sections on RTX 3090)
npx tsx nota-shared/scripts/embed-corpus.ts --kind=statute

# Optional: provision Neo4j AuraDB and run graph sync
# (Sign up free at console.neo4j.io)
npx tsx nota-shared/scripts/sync-neo4j.ts

# Run dev server
npm run dev:lex
```

Open [http://localhost:3000](http://localhost:3000).

---

## Stack

- **Frontend:** Next.js 16.2.6 (App Router) + Tailwind v4 + TypeScript
- **Database:** Postgres 18 + pgvector 0.8.2 (local; ~1.3GB corpus)
- **Embeddings:** Ollama `mxbai-embed-large` (1024d, 512-token context)
- **LLM:** Groq Llama 3.3 70B (~500ms per draft)
- **Live web:** Bright Data Web Unlocker + SERP (default on every request)
- **Citation graph:** Neo4j AuraDB (optional — graceful degrade if unconfigured)
- **Workspace:** npm workspaces (nota-shared, nota-lex, nota-trademark, nota-copyright)

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

## Corpus

- **137 NY Consolidated Laws** seeded from the [NY Senate OpenLegislation API](https://legislation.nysenate.gov/static/docs/html/index.html)
- **44,758 documents / 40,427 SECTION-level rows with text**
- **140,970 embedding chunks** at `mxbai-embed-large` 1024d
- **0 opinions currently** — CourtListener re-seed pending (free tier throttled to 5/min as of May 2026)

---

## Demo

Three questions that work great today:

1. `"Licensing and other provisions relating to firearms"` → PEN 400.00 with full statutory eligibility quoted (4.2s, 10 citations)
2. `"What does General Business Law section 349 prohibit?"` → GBS 349 + Article 22-A with live BD-sourced URLs (11s, 15 citations)
3. `"What are the requirements for a firearms license under New York Penal Law section 400.00?"` → 1.3s, PEN 400.00 cited [1] with applicant criteria quoted

---

## License

Proprietary — © 2026 Derek Soltis. Hackathon submission only. Production deployment is via [Nota.Lawyer](https://nota.lawyer).

## Built by

Derek "Banksy AI" Soltis — NY attorney (SDNY/EDNY), Super Lawyers Rising Star. JD Rutgers, MBA/MS Fordham. Operator of [28usc1782.com](https://28usc1782.com) (international discovery) and [Nota.Lawyer](https://nota.lawyer) (LLC formation).

Find me on X: [@banksyAI](https://x.com/banksyAI) · GitHub: [@banksy-ai](https://github.com/banksy-ai)
