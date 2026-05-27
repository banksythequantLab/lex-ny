/**
 * sync-neo4j.ts - Mirror the Lex.NY corpus into the Neo4j citation graph.
 *
 * Reads from local Postgres:
 *   - All Opinions (cl_id, case_name, citation, court_id, decision_date)
 *   - All Statute SECTIONs (law_id, location_id, title)
 *   - opinion_citations table (citing -> cited edges, sourced from CourtListener)
 *
 * Writes to Neo4j:
 *   - (:Opinion), (:Statute), (:Law), (:Court) nodes (idempotent MERGE)
 *   - (:Opinion)-[:CITES]->(:Opinion) edges
 *   - (:Opinion)-[:APPLIES]->(:Statute) edges (extracted from opinion text via regex)
 *   - (:Opinion)-[:DECIDED_BY]->(:Court) edges
 *   - (:Statute)-[:UNDER]->(:Law) edges
 *
 * Idempotent — re-run after each new ingestion.
 *
 * Required env:
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *   NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */

import pg from "pg";
import {
  bootstrapSchema,
  closeNeo4jDriver,
  neo4jSyncOpinions,
  neo4jSyncStatutes,
  neo4jSyncOpinionCitations,
  neo4jSyncOpinionApplies,
  getGraphStats,
  neo4jHealthCheck,
} from "../dist/index.js";

interface Args {
  skipOpinions: boolean;
  skipStatutes: boolean;
  skipCitations: boolean;
  skipApplies: boolean;
  batchSize: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    skipOpinions: false,
    skipStatutes: false,
    skipCitations: false,
    skipApplies: false,
    batchSize: 1000,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--skip-opinions") a.skipOpinions = true;
    if (arg === "--skip-statutes") a.skipStatutes = true;
    if (arg === "--skip-citations") a.skipCitations = true;
    if (arg === "--skip-applies") a.skipApplies = true;
    if (arg.startsWith("--batch=")) a.batchSize = parseInt(arg.split("=")[1], 10);
  }
  return a;
}

/**
 * Regex patterns for extracting NY statute citations from opinion text.
 * Targets the most common forms judges write citations in:
 *   "General Business Law § 349"
 *   "Penal Law § 400.00"
 *   "CPLR § 3211"
 *   "GBS 349-A"
 *   "Penal § 400.00(1)"
 */
const STATUTE_CITATION_PATTERNS: Array<{ lawId: string; pattern: RegExp }> = [
  { lawId: "PEN", pattern: /Penal\s+Law\s+§?\s*(\d+(?:\.\d+)?(?:-[A-Z])?)/gi },
  { lawId: "GBS", pattern: /General\s+Business\s+Law\s+§?\s*(\d+(?:-[A-Z]+)?)/gi },
  { lawId: "CVP", pattern: /CPLR\s+§?\s*(\d+(?:\.\d+)?(?:-[A-Z])?)/gi },
  { lawId: "BSC", pattern: /Business\s+Corporation\s+Law\s+§?\s*(\d+(?:\.\d+)?(?:-[A-Z])?)/gi },
  { lawId: "GOB", pattern: /General\s+Obligations\s+Law\s+§?\s*(\d+(?:-\d+)?)/gi },
  { lawId: "EDN", pattern: /Education\s+Law\s+§?\s*(\d+(?:-[A-Z])?)/gi },
  { lawId: "LAB", pattern: /Labor\s+Law\s+§?\s*(\d+(?:-[A-Z])?)/gi },
  { lawId: "RPL", pattern: /Real\s+Property\s+Law\s+§?\s*(\d+(?:-[A-Z])?)/gi },
  { lawId: "TAX", pattern: /Tax\s+Law\s+§?\s*(\d+(?:-[A-Z])?)/gi },
  { lawId: "EXC", pattern: /Executive\s+Law\s+§?\s*(\d+(?:-[A-Z])?)/gi },
];

function extractStatuteCitations(text: string): Array<{ lawId: string; locationId: string }> {
  const found = new Set<string>();
  const out: Array<{ lawId: string; locationId: string }> = [];
  for (const { lawId, pattern } of STATUTE_CITATION_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const locationId = m[1];
      const key = lawId + " " + locationId;
      if (!found.has(key)) {
        found.add(key);
        out.push({ lawId, locationId });
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);

  // Verify Neo4j connection
  const health = await neo4jHealthCheck();
  if (!health.ok) {
    console.error("Neo4j health check failed:", health.details);
    process.exit(1);
  }
  console.log("Neo4j:", health.details);

  // Bootstrap schema
  console.log("\n=== Bootstrapping schema ===");
  const bs = await bootstrapSchema();
  console.log(`  ${bs.constraints_created.length} constraints, ${bs.indexes_created.length} indexes`);

  const pool = new pg.Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "lex",
    max: 4,
  });

  // ----- Statutes -----
  if (!args.skipStatutes) {
    console.log("\n=== Syncing statutes ===");
    let cursor = "00000000-0000-0000-0000-000000000000";
    let totalSynced = 0;
    while (true) {
      const r = await pool.query<{
        id: string;
        law_id: string;
        law_name: string;
        location_id: string;
        doc_type: string;
        title: string | null;
      }>(
        `SELECT id, law_id, law_name, location_id, doc_type, title
         FROM statutes
         WHERE doc_type = 'SECTION' AND id > $1
         ORDER BY id LIMIT $2`,
        [cursor, args.batchSize]
      );
      if (r.rows.length === 0) break;
      const n = await neo4jSyncStatutes(r.rows);
      totalSynced += n;
      console.log(`  batch: ${r.rows.length} pulled, ${n} synced (total: ${totalSynced})`);
      cursor = r.rows[r.rows.length - 1].id;
      if (r.rows.length < args.batchSize) break;
    }
    console.log(`  Statutes synced: ${totalSynced}`);
  }

  // ----- Opinions -----
  if (!args.skipOpinions) {
    console.log("\n=== Syncing opinions ===");
    let cursor = "00000000-0000-0000-0000-000000000000";
    let totalSynced = 0;
    while (true) {
      const r = await pool.query<{
        id: string;
        cl_id: string;
        case_name: string;
        citation: string | null;
        court_id: string;
        decision_date: string | null;
      }>(
        `SELECT id, cl_id::text AS cl_id, case_name, citation, court_id, decision_date::text AS decision_date
         FROM opinions
         WHERE id > $1
         ORDER BY id LIMIT $2`,
        [cursor, args.batchSize]
      );
      if (r.rows.length === 0) break;
      const n = await neo4jSyncOpinions(r.rows);
      totalSynced += n;
      console.log(`  batch: ${r.rows.length} pulled, ${n} synced (total: ${totalSynced})`);
      cursor = r.rows[r.rows.length - 1].id;
      if (r.rows.length < args.batchSize) break;
    }
    console.log(`  Opinions synced: ${totalSynced}`);
  }

  // ----- Opinion -> Opinion citations -----
  if (!args.skipCitations) {
    console.log("\n=== Syncing opinion citations (CITES edges) ===");
    // opinion_citations table schema (from migration 0002):
    //   citing_opinion_id UUID, cited_cl_id TEXT (CourtListener id of cited opinion)
    try {
      const r = await pool.query<{ citing_cl_id: string; cited_cl_id: string }>(
        `SELECT o.cl_id::text AS citing_cl_id, oc.cited_cl_id::text AS cited_cl_id
         FROM opinion_citations oc
         JOIN opinions o ON o.id = oc.citing_opinion_id
         WHERE oc.cited_cl_id IS NOT NULL`
      );
      console.log(`  ${r.rows.length} citation edges in Postgres`);
      let synced = 0;
      for (let i = 0; i < r.rows.length; i += args.batchSize) {
        const batch = r.rows.slice(i, i + args.batchSize);
        const n = await neo4jSyncOpinionCitations(batch);
        synced += n;
      }
      console.log(`  CITES edges created: ${synced}`);
    } catch (e) {
      console.warn(`  Skipped (table missing or empty): ${e instanceof Error ? e.message : e}`);
    }
  }

  // ----- Opinion -> Statute applies (extracted from text) -----
  if (!args.skipApplies) {
    console.log("\n=== Extracting (:Opinion)-[:APPLIES]->(:Statute) from text ===");
    const r = await pool.query<{
      cl_id: string;
      text_plain: string | null;
    }>(`SELECT cl_id::text AS cl_id, text_plain FROM opinions WHERE text_plain IS NOT NULL`);

    const allEdges: Array<{ cl_id: string; citation_key: string }> = [];
    for (const row of r.rows) {
      const cites = extractStatuteCitations(row.text_plain || "");
      for (const c of cites) {
        allEdges.push({ cl_id: row.cl_id, citation_key: `${c.lawId} ${c.locationId}` });
      }
    }
    console.log(`  extracted ${allEdges.length} citation edges from ${r.rows.length} opinions`);

    let synced = 0;
    for (let i = 0; i < allEdges.length; i += args.batchSize) {
      const batch = allEdges.slice(i, i + args.batchSize);
      const n = await neo4jSyncOpinionApplies(batch);
      synced += n;
    }
    console.log(`  APPLIES edges created: ${synced}`);
  }

  // ----- Final stats -----
  console.log("\n=== Final graph stats ===");
  const stats = await getGraphStats();
  console.log(`  Total nodes: ${stats.total_nodes}`);
  console.log(`  Total relationships: ${stats.total_relationships}`);
  console.log(`  Nodes by label:`, stats.node_counts);
  console.log(`  Relationships by type:`, stats.relationship_counts);
  if (stats.top_cited_opinions.length > 0) {
    console.log(`  Top cited opinions:`);
    for (const o of stats.top_cited_opinions) {
      console.log(`    ${o.case_name} (${o.cited_by_count} citers)`);
    }
  }
  if (stats.top_applied_statutes.length > 0) {
    console.log(`  Top applied statutes:`);
    for (const s of stats.top_applied_statutes) {
      console.log(`    ${s.citation_key} (${s.applied_by_count} applications): ${s.title || ""}`);
    }
  }

  await pool.end();
  await closeNeo4jDriver();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
