# Lex.NY — Setup Guide

End-to-end setup to get Lex.NY running locally with the full 5.5M-record corpus, the Neo4j citation graph, and all six sponsor integrations live.

**Skip ahead** if you only want to run the app against a subset of the data — the [Quick start](#quick-start) section gets you to a working `/api/ask` in about 5 minutes with just statutes (no opinion corpus, no citation graph). The full corpus build is in the [Full corpus build](#full-corpus-build) section at the bottom; that takes ~6 hours of mostly-unattended pipelines.

---

## Prerequisites

- **OS:** Windows 10/11, macOS, or Linux (developed on Windows 10/11)
- **Node.js:** LTS (v20+)
- **Python:** 3.11+ (3.12 recommended)
- **Postgres 18** with pgvector 0.8.2 (`CREATE EXTENSION vector`)
- **Disk:** ~5 GB for statute corpus + indexes, ~75 GB if you build the full opinion corpus
- **GPU (optional):** an RTX-class GPU makes the embed pipeline ~80× faster but isn't required for the app to run

---

## Quick start

This gets the app running with the statute corpus only — no opinions, no citation graph. Enough to demo `/api/ask` against the 40,428 NY statute sections via Algolia + Bright Data.

### 1. Clone + install

```bash
git clone https://github.com/banksythequantLab/lex-ny
cd lex-ny
npm install
```

### 2. Set up local Postgres

```bash
# Postgres 18 needs pgvector — Windows users see https://github.com/pgvector/pgvector
createdb lex
psql -d lex -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Create `.env.local`

Copy the example and fill in the values from the API keys you've signed up for:

```bash
cp .env.example nota-lex/.env.local
# edit nota-lex/.env.local
```

Minimum required values for the Quick Start:

| Variable | Where to get it |
|---|---|
| `PGHOST` / `PGPORT` / `PGUSER` / `PGDATABASE` / `PGPASSWORD` | Your local Postgres install |
| `GROQ_API_KEY` | https://console.groq.com — free, sub-second Llama 3.3 70B |
| `BRIGHT_DATA_API_TOKEN` | https://brightdata.com → MCP page → Zone `mcp_unlocker` |
| `OLLAMA_EMBED_URL` | Default: `http://localhost:11434` (install [Ollama](https://ollama.com), then `ollama pull mxbai-embed-large`) |

All other env vars (Neo4j, Algolia, Speechmatics, Triggerware) are optional — the app gracefully degrades when they're missing, and `/stats` will tell you which sponsors are dark.

### 4. Seed the statute corpus

```bash
# Pulls all 137 NY Consolidated Laws via the NY Senate OpenLegislation API
# Takes ~2 min total.
NY_SENATE_API_KEY=yours npx tsx nota-shared/scripts/seed-statutes.ts
```

### 5. Run it

```bash
npm run dev:lex
# Open http://localhost:3000
# Visit /stats to confirm health
```

You should see ~40,428 statute sections, Bright Data live on every `/api/ask` call, and the sponsor health wall showing whichever sponsors you configured.

---

## Full corpus build

Adds **1,322,766 NY case decisions**, **4,177,369 docket records**, **4,940,299 citation edges**, and the Neo4j graph layer. ~6 hours total, mostly unattended.

### Prerequisites

- **Sign up for Neo4j AuraDB Free** at https://console.neo4j.io (free tier handles up to 200K nodes; if you want all 1.3M opinion nodes, you need a paid plan or enterprise free trial — Lex.NY's reference deployment uses an enterprise tier instance from the AuraDB free trial)
- **Ollama** with `mxbai-embed-large` pulled and the model resident in GPU VRAM:
  ```bash
  ollama pull mxbai-embed-large
  # First request loads it; pass keep_alive: "30m" in API calls
  ```
- **B: drive** (or any drive with ~75 GB free) for the CourtListener bulk dumps

Set the env vars for the Python scripts:

```powershell
$env:PGPASSWORD = "your_pg_password"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "lex"
# Neo4j
$env:NEO4J_URI = "neo4j+s://xxxxxxxx.databases.neo4j.io"
$env:NEO4J_USER = "neo4j"
$env:NEO4J_PASSWORD = "your_aura_password"
$env:NEO4J_DATABASE = "neo4j"
```

### Step 1 — Download CourtListener bulk dumps

CourtListener publishes monthly. Pick the most recent month from https://com-courtlistener-storage.s3-us-west-2.amazonaws.com/bulk-data/

```powershell
# ~50 GB; ~30-50 min depending on bandwidth.
curl -L -C - -o B:\cl-bulk\opinions-LATEST.csv.bz2 `
  https://storage.courtlistener.com/bulk-data/opinions-2026-03-31.csv.bz2

# Smaller files:
curl -L -C - -o B:\cl-bulk\opinion-clusters-LATEST.csv.bz2 https://storage.courtlistener.com/bulk-data/opinion-clusters-2026-03-31.csv.bz2
curl -L -C - -o B:\cl-bulk\courts-LATEST.csv.bz2          https://storage.courtlistener.com/bulk-data/courts-2026-03-31.csv.bz2
curl -L -C - -o B:\cl-bulk\dockets-LATEST.csv.bz2         https://storage.courtlistener.com/bulk-data/dockets-2026-03-31.csv.bz2
curl -L -C - -o B:\cl-bulk\citation-map-LATEST.csv.bz2    https://storage.courtlistener.com/bulk-data/citation-map-2026-03-31.csv.bz2
```

### Step 2 — Ingest opinions + courts (~10 min)

```bash
python nota-shared/scripts/python/ingest_pipeline.py all
```

Streams 71M rows through `csv.reader` with the `doublequote=False, escapechar='\\\\'` flags that CourtListener's files require. Inserts 1,322,766 NY opinions and 30 NY courts into Postgres. Resume-safe via `ON CONFLICT DO NOTHING`.

### Step 3 — Ingest dockets (~20 min)

```bash
python nota-shared/scripts/python/ingest_dockets_to_cases.py
```

4.18M NY case records → `ny_cases` table. Slow because the dockets dump is 4.64 GB compressed.

### Step 4 — Build the citation graph (~2 hours)

```bash
python nota-shared/scripts/python/build_citation_graph.py all
```

Two stages:
1. Stream the 50 GB `opinions.csv.bz2` once just to build a 28.8 MB `opinion_id → cluster_id` map (CourtListener has both IDs and they're different keyspaces).
2. Stream the 498 MB `citation-map.csv.bz2` and turn every NY-to-NY edge into a row in `opinion_citations`. Result: 4,940,299 directed citation edges.

### Step 5 — Embed opinions (~4 hours on RTX 3090)

```bash
python nota-shared/scripts/python/embed_opinions.py --batch=2048
```

mxbai-embed-large via Ollama's `/api/embed` (the batched endpoint — 160× faster than `/api/embeddings`). Embed text is `case_name + cleaned ai_summary`, capped at 440 chars (mxbai context is 512 tokens).

Resume-safe via anti-join on the `embeddings` table. Throughput ~75-80/s at batch=2048.

### Step 6 — Sync to Neo4j (~15 min)

```bash
python nota-shared/scripts/python/sync_opinions_neo4j.py    # ~3 min
python nota-shared/scripts/python/sync_cites_neo4j.py       # ~8 min
```

These push the opinion nodes + DECIDED_BY edges, then 4.94M CITES edges. Uses MERGE so they're idempotent.

### Step 7 (optional) — APPLIES edges from opinion text

```bash
# Waits for the 50GB dump to exist, then regex-mines NY statute citations
# from every opinion's full text → opinion_applies_statute table.
# 2-4 hours, completely unattended.
python nota-shared/scripts/python/auto_applies.py
```

Populates `top_applied_statutes` in `/api/graph-stats` and fills `graph_expansion.related_statutes` on `/api/ask`. Optional because it's mining statute citations from the opinion text — useful but not essential.

### Verify

```bash
python smoke_demo.py
# Should print 18/18 OK with the corpus numbers matching what was promised
```

`/stats` should now show:

| | |
|---|---:|
| Total legal records | **5,540,563** |
| Case decisions | 1,322,766 |
| Graph nodes | 1,363,359 |
| Graph relationships | 6,303,493 |
| Top-cited opinion | People v. Bleakley (~11,054 cites) |

---

## Cloudflare tunnel (optional, for public access)

The reference deployment exposes the local dev server through a Cloudflare tunnel at `iam.nota.lawyer`. To do the same for your domain:

```bash
# 1. Install cloudflared
choco install cloudflared    # Windows
brew install cloudflared      # macOS

# 2. Authenticate (browser will pop)
cloudflared tunnel login

# 3. Create the tunnel
cloudflared tunnel create lex-ny
# Save the UUID it prints — you'll need it.

# 4. Write a config (~/.cloudflared/lex-ny-config.yml)
cat > ~/.cloudflared/lex-ny-config.yml <<EOF
tunnel: YOUR_UUID_HERE
credentials-file: /Users/you/.cloudflared/YOUR_UUID_HERE.json

ingress:
  - hostname: iam.yourdomain.com
    service: http://127.0.0.1:3000
  - service: http_status:404
EOF

# 5. Add the DNS record. EITHER:
#    a) Add a CNAME in the Cloudflare dashboard pointing
#       'iam' -> 'YOUR_UUID_HERE.cfargotunnel.com' (Proxied),
#    b) OR run: cloudflared tunnel route dns lex-ny iam.yourdomain.com
#       (this only works if cloudflared's origin cert is scoped to yourdomain.com)

# 6. Run it
cloudflared tunnel --config ~/.cloudflared/lex-ny-config.yml run lex-ny
```

For Windows reboot survival, install as a service — see `install-lex-ny-service.bat` in the repo root.

---

## Troubleshooting

### `psycopg2.errors.UndefinedColumn: column "citation_key" does not exist`
The `statutes` table doesn't have a `citation_key` column; it's synthesized as `law_id + ' ' + location_id`. This is already handled in the committed `extract_applies.py`.

### `OverflowError: Python int too large to convert to C long` in `csv.field_size_limit`
Windows Python's C `long` is 32-bit. Use `2**31 - 1` instead of `sys.maxsize`. Already handled.

### Server-side cursor crashes with `named cursor isn't valid anymore`
psycopg2 server-side cursors can't survive `conn.commit()` on the same connection. The fix is two connections — read on one, write-and-commit on the other. All pipeline scripts already do this.

### Ollama `/api/embed` returns 400 "the input length exceeds the context length"
`mxbai-embed-large` has a 512-token context. Cap embed input at 440 chars. Already handled in `embed_opinions.py`.

### Neo4j queries error with "Queries cannot be run directly on a session with an open transaction"
The JS driver's sessions aren't safe across concurrent awaits. Use serial awaits, not `Promise.all`, on a single session. See the comment in `neo4j-client.ts`.

### `/api/ask` is slow (>30s)
At full corpus scale, the ivfflat ANN index with `lists=100` is too few. Rebuild with `lists=1000`:
```sql
DROP INDEX embeddings_vector_idx;
CREATE INDEX embeddings_vector_idx
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1000);
ANALYZE embeddings;
```
This is a separate engineering improvement, not a blocker for the demo.

---

## Reference deployment

Lex.NY's reference instance runs on Windows 10/11 with:
- Postgres 18, data on `B:\postgres-data`
- Ollama 0.24.0 with `mxbai-embed-large` resident in 24 GB GPU VRAM (RTX 3090)
- Neo4j AuraDB enterprise tier
- Cloudflare tunnel `lex-ny` published to `iam.nota.lawyer`
- Bright Data zone `mcp_unlocker` with the $250 `unlocked` promo applied
- Algolia, Speechmatics, Triggerware all on free tiers
