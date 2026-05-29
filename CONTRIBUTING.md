# Contributing to Lex.NY

Thanks for the interest. Lex.NY was built for the [Bright Data UNLOCKED](https://brightdata.com/) and [HackerNoon Proof of Usefulness](https://proofofusefulness.com/) hackathons by a NY-licensed attorney (SDNY/EDNY). It is also the engine behind [Nota.Lawyer](https://nota.lawyer)'s Counsel tier.

This guide is short on purpose. The codebase isn't large, but every choice in it is deliberate — please read before opening a PR.

---

## Ground rules

1. **Every factual claim Lex.NY produces about NY law must trace to a real source.** The whole architecture exists to prevent hallucination. If your change makes it easier for the model to make up a case or a section number, the change is wrong, no matter how clever.
2. **Don't soften the system prompt.** The strict-citation guard in [`nota-shared/src/lex/answer.ts`](nota-shared/src/lex/answer.ts) is doing real RPC 7.1 work. If the model is leaking past it, tighten the retrieval floor or the prompt — don't relax it.
3. **No secrets in commits.** Every Python script reads `PGPASSWORD` (and friends) from the environment. The repo runs a secret sweep against 17 known patterns before every commit; if you add a new credentialed integration, add its key prefix to the sweep list.
4. **Use what already exists.** There's a working `pg.Pool` in retrieve.ts. There's an existing Neo4j session helper with a thread-safety comment. There's a Bright Data client with retry built in. Reuse before you rewrite.

---

## Architecture invariants

These are not nice-to-haves — they are the spine of the system. Don't break them.

| Invariant | Where enforced | Why |
|---|---|---|
| Every LLM-cited claim ends in `[N]` | `SYSTEM_PROMPT` in `answer.ts` | RPC 7.1 supervision |
| Neo4j sessions are NEVER used concurrently | Serial awaits in `neo4j-client.ts`; comment explains | Driver throws "open transaction" otherwise |
| `OpinionHit.opinion_id` is the Postgres UUID; `cl_id` is the CourtListener cluster ID | `retrieve.ts` interface | UUID is the FK, cl_id is what Neo4j/URLs key on |
| Embed input capped at 440 chars | `embed_opinions.py`, `embeddings.ts` | mxbai-embed-large has a 512-token context |
| Bulk Postgres reads use a server-side cursor on one connection, writes commit on another | `embed_opinions.py`, `sync_*.py` | Commits on the same conn invalidate the streaming cursor |
| CourtListener CSV parsing uses `doublequote=False, escapechar='\\\\'` | All ingest scripts | Their files have literal newlines + backslash-quoted strings |
| pgvector ANN uses cosine distance (`<=>`) with `vector_cosine_ops` ivfflat | `retrieve.ts`, schema | All embeddings normalized, distance is symmetric |

If you change one of these, the test plan in your PR has to show what didn't break.

---

## Development workflow

```bash
# Initial setup (see SETUP.md for full corpus build)
git clone https://github.com/banksythequantLab/lex-ny
cd lex-ny
npm install
cp .env.example nota-lex/.env.local
# Fill in the values, then:
npm run build:shared
npm run dev:lex   # http://localhost:3000

# Before opening a PR
python smoke_demo.py    # 18 pre-flight checks
```

## What "passes" looks like

The bar for a PR to merge is the `smoke_demo.py` exit code. All 18 checks must return `OK`. Don't add a new feature without adding a check for it.

The current checks cover:
- All 5 user-facing pages return 200 with their expected hero copy
- All 7 sponsor stat APIs return 200 with `health: ok`
- Corpus counts match expectations (opinions, ny_cases, statutes, citations)
- Graph counts match (nodes, relationships, CITES)
- Top-cited query returns a known landmark
- Algolia federated search returns hits
- Semantic case search returns hits with `similarity` + `cited_by_count`
- End-to-end `/api/ask` on a real legal question returns ≥1 opinion + ≥1 statute + Bright Data live web sources

## Style

- **TypeScript everywhere.** No `any` without a comment justifying why.
- **No bullet-soup in user-visible docs.** Read the README before adding to it; the tone is meant to be a working attorney's voice, not a sales deck.
- **Comments explain non-obvious choices.** Not "this loops through the array" — "this loops serially because Neo4j sessions throw on concurrent awaits."
- **Commits messages are paragraphs, not titles.** Look at the recent commit log for the format. Explain *why*, not *what* — the diff shows the what.

## What we're explicitly not accepting right now

- New LLM providers without retry + cost telemetry
- New sponsor integrations without a `/api/<sponsor>-stats` endpoint that the smoke test can probe
- "Improvements" to the strict-citation prompt that haven't been demonstrated to keep `top_cited_opinions` returning real NY landmarks
- UI rewrites that drop the editorial styling (the `--color-paper`, `--color-ink`, `--color-seal` palette is a deliberate design choice)
- Cleanups that shorten variable names below clarity

## Issues worth working on

- **Retrieval at scale.** `pgvector` ivfflat with `lists=100` over 1.32M opinion embeddings is workable but not great. Rebuild with `lists=1000` and benchmark.
- **APPLIES edges from opinion text.** Currently a regex pass over the 50GB CourtListener bulk dump (`extract_applies.py`). The precision could be improved with a small classifier on the citation context.
- **Similarity-floor cutoff in `answer.ts`.** When retrieval is weak (e.g. "fraud claim elements"), the model still occasionally leaks past the strict-citation guard. A minimum similarity threshold per source would close this gap.
- **A Lex.NY VSCode extension.** Hover over any NY citation in a brief draft, get the underlying source. The retrieval pipeline is already an HTTP API.

## Getting in touch

Open an issue on GitHub or reach out: [Derek Soltis](https://x.com/banksyAI), NY-licensed attorney, SDNY/EDNY.

Lex.NY is one front of a broader [Banksy AI](https://github.com/banksy-ai) push — there are adjacent projects (MaiVid Studio, Nota.Lawyer LLC formation, the IRFL universe) that share infrastructure but not codebases.
