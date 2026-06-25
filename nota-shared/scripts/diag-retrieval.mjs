/** Diagnostic v2: replicate retrieve.ts's INDEX-FORM ann (ORDER BY <=> LIMIT k)
 *  and vary ivfflat.probes to measure IVFFlat recall for CVP 3212. */
import pg from "pg";
import { embed } from "../dist/embeddings.js";

const pool = new pg.Pool({ host: "localhost", port: 5432, user: "postgres", password: process.env.PGPASSWORD, database: "lex" });
const q = "What is the standard for summary judgment under CPLR 3212 in New York?";

async function annIndexForm(vec, probes) {
  const c = await pool.connect();
  try {
    await c.query(`SET ivfflat.probes = ${probes}`);
    const r = await c.query(
      `WITH ranked AS (
         SELECT content_id, embedding <=> $1::vector AS distance
         FROM embeddings WHERE content_kind='statute'
         ORDER BY embedding <=> $1::vector LIMIT 100
       )
       SELECT s.law_id, s.location_id, MIN(r.distance) d
       FROM ranked r JOIN statutes s ON s.id = r.content_id
       GROUP BY s.id, s.law_id, s.location_id
       ORDER BY MIN(r.distance) LIMIT 20`,
      ["[" + vec.join(",") + "]"]
    );
    return r.rows;
  } finally { c.release(); }
}

const v = await embed(q);
for (const probes of [1, 10, 40]) {
  const rows = await annIndexForm(v, probes);
  const hit = rows.findIndex(r => r.law_id === "CVP" && r.location_id === "3212");
  console.log(`\n=== index-form ANN | ivfflat.probes=${probes} | CVP 3212 rank: ${hit >= 0 ? hit + 1 : "MISS"} | candidates=${rows.length} ===`);
  for (const r of rows.slice(0, 6)) console.log(`  ${r.law_id} ${r.location_id} d=${Number(r.d).toFixed(4)}`);
}
await pool.end(); process.exit(0);
