/**
 * embed-corpus.ts - Generate embeddings for all opinions and statutes
 *                   that don't have them yet. LOCAL POSTGRES VERSION.
 *
 * Usage:
 *   npx tsx scripts/embed-corpus.ts                # embed everything pending
 *   npx tsx scripts/embed-corpus.ts --kind=opinion # opinions only
 *   npx tsx scripts/embed-corpus.ts --kind=statute # statutes only
 *   npx tsx scripts/embed-corpus.ts --limit=500    # cap per page
 *
 * Required env:
 *   OLLAMA_EMBED_URL  (default: http://localhost:11434)
 *   OLLAMA_EMBED_MODEL (default: mxbai-embed-large, 1024 dims, 512 token ctx)
 *   PGHOST, PGUSER, PGPASSWORD, PGDATABASE
 */

import pg from "pg";
import { embedBatch, chunkForEmbedding, EMBEDDING_MODEL } from "../src/embeddings.js";

interface Args {
  kind: "opinion" | "statute" | "both";
  pageSize: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { kind: "both", pageSize: 1000 };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--kind=")) args.kind = a.split("=")[1] as Args["kind"];
    if (a.startsWith("--limit=")) args.pageSize = parseInt(a.split("=")[1], 10);
  }
  return args;
}

function vectorLiteral(arr: number[]): string {
  return "[" + arr.join(",") + "]";
}

async function main() {
  const args = parseArgs(process.argv);

  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "lex",
    max: 4,
  });

  if (args.kind === "opinion" || args.kind === "both") {
    await embedOpinions(pool, args.pageSize);
  }
  if (args.kind === "statute" || args.kind === "both") {
    await embedStatutes(pool, args.pageSize);
  }

  await pool.end();
}

async function embedOpinions(pool: pg.Pool, pageSize: number) {
  console.log("\n=== Embedding opinions ===");

  let lastId = "00000000-0000-0000-0000-000000000000";
  let totalEmbedded = 0;
  let page = 0;

  while (true) {
    page++;
    const r = await pool.query(
      `SELECT id, case_name, text_plain FROM opinions
       WHERE text_plain IS NOT NULL AND text_plain != ''
         AND id > $1
       ORDER BY id LIMIT $2`,
      [lastId, pageSize]
    );
    if (r.rows.length === 0) {
      console.log(`  page ${page}: end of opinions`);
      break;
    }

    // Filter out already-embedded
    const ids = r.rows.map((row) => row.id);
    const existing = await pool.query(
      `SELECT DISTINCT content_id FROM embeddings
       WHERE content_kind = 'opinion' AND content_id = ANY($1::uuid[])`,
      [ids]
    );
    const done = new Set(existing.rows.map((row) => row.content_id));
    const pending = r.rows.filter((row) => !done.has(row.id));
    console.log(`  page ${page}: ${r.rows.length} rows, ${pending.length} pending`);

    for (const op of pending) {
      const chunks = chunkForEmbedding(op.text_plain);
      if (chunks.length === 0) continue;

      try {
        const vectors = await embedBatch(chunks.map((c) => c.text));
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (let i = 0; i < chunks.length; i++) {
            await client.query(
              `INSERT INTO embeddings (content_kind, content_id, chunk_index, chunk_text, embedding, embedding_model)
               VALUES ($1, $2, $3, $4, $5::vector, $6)
               ON CONFLICT (content_kind, content_id, chunk_index) DO UPDATE
                 SET chunk_text = EXCLUDED.chunk_text,
                     embedding = EXCLUDED.embedding,
                     embedding_model = EXCLUDED.embedding_model`,
              ["opinion", op.id, chunks[i].chunkIndex, chunks[i].text, vectorLiteral(vectors[i]), EMBEDDING_MODEL]
            );
          }
          await client.query("COMMIT");
          totalEmbedded++;
          if (totalEmbedded % 25 === 0) console.log(`    ${totalEmbedded} opinions embedded`);
        } catch (e) {
          await client.query("ROLLBACK").catch(() => {});
          throw e;
        } finally {
          client.release();
        }
      } catch (e) {
        console.warn(`    ${op.case_name}: embed failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    lastId = r.rows[r.rows.length - 1].id;
    if (r.rows.length < pageSize) break;
  }

  console.log(`  Embedded ${totalEmbedded} opinions`);
}

async function embedStatutes(pool: pg.Pool, pageSize: number) {
  console.log("\n=== Embedding statutes ===");

  let lastId = "00000000-0000-0000-0000-000000000000";
  let totalEmbedded = 0;
  let page = 0;

  while (true) {
    page++;
    const r = await pool.query(
      `SELECT id, law_id, law_name, title, text, location_id FROM statutes
       WHERE doc_type = 'SECTION' AND text IS NOT NULL AND text != ''
         AND id > $1
       ORDER BY id LIMIT $2`,
      [lastId, pageSize]
    );
    if (r.rows.length === 0) {
      console.log(`  page ${page}: end of statutes`);
      break;
    }

    const ids = r.rows.map((row) => row.id);
    const existing = await pool.query(
      `SELECT DISTINCT content_id FROM embeddings
       WHERE content_kind = 'statute' AND content_id = ANY($1::uuid[])`,
      [ids]
    );
    const done = new Set(existing.rows.map((row) => row.content_id));
    const pending = r.rows.filter((row) => !done.has(row.id));
    console.log(`  page ${page}: ${r.rows.length} rows, ${pending.length} pending`);

    for (const s of pending) {
      const prefix = `${s.law_id} ${s.location_id} ${s.title || ""}`.trim();
      const body = (s.text || "").trim();
      const fullText = prefix + (body ? "\n" + body : "");
      const chunks = chunkForEmbedding(fullText);
      if (chunks.length === 0) continue;

      const texts = chunks.map((c, i) => (i === 0 ? c.text : prefix + " (cont.) " + c.text));

      try {
        const vectors = await embedBatch(texts);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (let i = 0; i < chunks.length; i++) {
            await client.query(
              `INSERT INTO embeddings (content_kind, content_id, chunk_index, chunk_text, embedding, embedding_model)
               VALUES ($1, $2, $3, $4, $5::vector, $6)
               ON CONFLICT (content_kind, content_id, chunk_index) DO UPDATE
                 SET chunk_text = EXCLUDED.chunk_text,
                     embedding = EXCLUDED.embedding,
                     embedding_model = EXCLUDED.embedding_model`,
              ["statute", s.id, chunks[i].chunkIndex, texts[i], vectorLiteral(vectors[i]), EMBEDDING_MODEL]
            );
          }
          await client.query("COMMIT");
          totalEmbedded++;
          if (totalEmbedded % 100 === 0) console.log(`    ${totalEmbedded} statutes embedded`);
        } catch (e) {
          await client.query("ROLLBACK").catch(() => {});
          throw e;
        } finally {
          client.release();
        }
      } catch (e) {
        console.warn(`    ${s.law_id} ${s.location_id}: embed failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    lastId = r.rows[r.rows.length - 1].id;
    if (r.rows.length < pageSize) break;
  }

  console.log(`  Embedded ${totalEmbedded} statutes`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("Fatal:", e); process.exit(1); });
