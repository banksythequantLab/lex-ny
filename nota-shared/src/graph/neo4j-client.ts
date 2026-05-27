/**
 * Neo4j integration for Lex.NY - citation graph layer.
 *
 * Why a graph DB on top of Postgres+pgvector?
 *   Legal research is inherently relational:
 *     - Cases CITE other cases (precedential chains)
 *     - Cases APPLY statutes (which sections were used)
 *     - Statutes REFERENCE other statutes (cross-references)
 *     - Statutes live UNDER a Law (e.g. PEN 400.00 is under Penal Law)
 *
 *   Pure vector retrieval can miss controlling precedent that doesn't
 *   share semantic vocabulary with the query. The graph adds a second
 *   retrieval signal: "what does this case cite, and what cites this case?"
 *
 * Hackathon angle:
 *   - Neo4j is a Proof of Usefulness sponsor (HackerNoon prize)
 *   - Hits these PoU tags: #knowledge-graph, #graphrag, #graph-powered-agents
 *   - Standard Neo4j AuraDB Free tier is enough for the demo corpus
 *
 * Deployment:
 *   - Local: docker run -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/<your-password> neo4j:latest
 *   - Production: AuraDB Free tier (neo4j+s://<id>.databases.neo4j.io)
 *
 *   Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env.local.
 *   If not set, all Neo4j-backed features degrade gracefully (no crash,
 *   just no graph augmentation).
 */

import neo4j, { Driver, Session, type Record as Neo4jRecord } from "neo4j-driver";

/* ------------------------------------------------------------------ */
/*  Driver lifecycle                                                   */
/* ------------------------------------------------------------------ */

let cachedDriver: Driver | null = null;

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
}

function getConfig(): Neo4jConfig | null {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) return null;
  return {
    uri,
    user,
    password,
    database: process.env.NEO4J_DATABASE || "neo4j",
  };
}

export function isNeo4jConfigured(): boolean {
  return getConfig() !== null;
}

export function getDriver(): Driver {
  if (cachedDriver) return cachedDriver;
  const cfg = getConfig();
  if (!cfg) {
    throw new Error(
      "Neo4j not configured. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env.local"
    );
  }
  cachedDriver = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.user, cfg.password), {
    // AuraDB requires encrypted connections (neo4j+s:// uri handles this)
    // For local docker, plain `neo4j://` is fine
    maxConnectionLifetime: 60 * 60 * 1000, // 1 hour
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 10000,
  });
  return cachedDriver;
}

export async function closeDriver(): Promise<void> {
  if (cachedDriver) {
    await cachedDriver.close();
    cachedDriver = null;
  }
}

async function withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  const driver = getDriver();
  const cfg = getConfig()!;
  const session = driver.session({ database: cfg.database });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

/* ------------------------------------------------------------------ */
/*  Schema setup                                                        */
/* ------------------------------------------------------------------ */

/**
 * Idempotent schema bootstrap. Creates uniqueness constraints on the
 * stable identifiers we'll use as MERGE keys.
 */
export async function bootstrapSchema(): Promise<{
  constraints_created: string[];
  indexes_created: string[];
}> {
  const constraints = [
    // Opinions keyed by CourtListener id
    "CREATE CONSTRAINT opinion_cl_id IF NOT EXISTS FOR (o:Opinion) REQUIRE o.cl_id IS UNIQUE",
    // Statutes keyed by (law_id, location_id) compound — we synthesize a citation_key
    "CREATE CONSTRAINT statute_citation_key IF NOT EXISTS FOR (s:Statute) REQUIRE s.citation_key IS UNIQUE",
    // Laws keyed by law_id (e.g. 'PEN', 'GBS', 'CVP')
    "CREATE CONSTRAINT law_id IF NOT EXISTS FOR (l:Law) REQUIRE l.law_id IS UNIQUE",
    // Courts keyed by id
    "CREATE CONSTRAINT court_id IF NOT EXISTS FOR (c:Court) REQUIRE c.id IS UNIQUE",
  ];

  const indexes = [
    "CREATE INDEX opinion_case_name IF NOT EXISTS FOR (o:Opinion) ON (o.case_name)",
    "CREATE INDEX statute_law_id IF NOT EXISTS FOR (s:Statute) ON (s.law_id)",
    "CREATE INDEX opinion_decision_date IF NOT EXISTS FOR (o:Opinion) ON (o.decision_date)",
  ];

  const constraintsCreated: string[] = [];
  const indexesCreated: string[] = [];

  await withSession(async (s) => {
    for (const c of constraints) {
      await s.run(c);
      constraintsCreated.push(c.split(" ")[2]);
    }
    for (const i of indexes) {
      await s.run(i);
      indexesCreated.push(i.split(" ")[2]);
    }
  });

  return { constraints_created: constraintsCreated, indexes_created: indexesCreated };
}

/* ------------------------------------------------------------------ */
/*  Sync — Postgres corpus → Neo4j graph                                */
/* ------------------------------------------------------------------ */

export interface OpinionSyncRow {
  id: string;
  cl_id: string;
  case_name: string;
  citation: string | null;
  court_id: string;
  decision_date: string | null;
}

export interface StatuteSyncRow {
  id: string;
  law_id: string;
  law_name: string;
  location_id: string;
  doc_type: string;
  title: string | null;
}

export interface CitationSyncRow {
  /** citing opinion's CourtListener id */
  citing_cl_id: string;
  /** cited opinion's CourtListener id */
  cited_cl_id: string;
}

/**
 * Sync a batch of opinions into Neo4j. Idempotent (MERGE on cl_id).
 */
export async function syncOpinions(rows: OpinionSyncRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  return withSession(async (s) => {
    const result = await s.run(
      `
      UNWIND $rows AS row
      MERGE (o:Opinion { cl_id: row.cl_id })
      SET o.pg_id = row.id,
          o.case_name = row.case_name,
          o.citation = row.citation,
          o.decision_date = row.decision_date,
          o.updated_at = datetime()
      MERGE (c:Court { id: row.court_id })
      MERGE (o)-[:DECIDED_BY]->(c)
      RETURN count(o) AS synced
      `,
      { rows }
    );
    return result.records[0].get("synced").toNumber();
  });
}

/**
 * Sync a batch of statutes into Neo4j. Creates (:Statute)-[:UNDER]->(:Law).
 */
export async function syncStatutes(rows: StatuteSyncRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  return withSession(async (s) => {
    const result = await s.run(
      `
      UNWIND $rows AS row
      MERGE (l:Law { law_id: row.law_id })
        ON CREATE SET l.law_name = row.law_name
      MERGE (s:Statute { citation_key: row.law_id + ' ' + row.location_id })
      SET s.pg_id = row.id,
          s.law_id = row.law_id,
          s.location_id = row.location_id,
          s.doc_type = row.doc_type,
          s.title = row.title,
          s.updated_at = datetime()
      MERGE (s)-[:UNDER]->(l)
      RETURN count(s) AS synced
      `,
      { rows }
    );
    return result.records[0].get("synced").toNumber();
  });
}

/**
 * Bulk insert opinion-to-opinion citations: (:Opinion)-[:CITES]->(:Opinion).
 * Both endpoints must already exist in the graph (synced via syncOpinions).
 */
export async function syncOpinionCitations(rows: CitationSyncRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  return withSession(async (s) => {
    const result = await s.run(
      `
      UNWIND $rows AS row
      MATCH (citing:Opinion { cl_id: row.citing_cl_id })
      MATCH (cited:Opinion { cl_id: row.cited_cl_id })
      MERGE (citing)-[r:CITES]->(cited)
      RETURN count(r) AS edges
      `,
      { rows }
    );
    return result.records[0].get("edges").toNumber();
  });
}

/**
 * For opinions that mention a statute citation in their text, create
 * (:Opinion)-[:APPLIES]->(:Statute). Caller extracts (cl_id, citation_key)
 * pairs from opinion text via regex (e.g. "GBS § 349", "Penal Law § 400.00").
 */
export async function syncOpinionApplies(
  rows: Array<{ cl_id: string; citation_key: string }>
): Promise<number> {
  if (rows.length === 0) return 0;
  return withSession(async (s) => {
    const result = await s.run(
      `
      UNWIND $rows AS row
      MATCH (o:Opinion { cl_id: row.cl_id })
      MATCH (s:Statute { citation_key: row.citation_key })
      MERGE (o)-[r:APPLIES]->(s)
      RETURN count(r) AS edges
      `,
      { rows }
    );
    return result.records[0].get("edges").toNumber();
  });
}

/* ------------------------------------------------------------------ */
/*  Graph-augmented retrieval — the GraphRAG payoff                    */
/* ------------------------------------------------------------------ */

export interface GraphExpansionResult {
  /** Opinions that cite one of the seed opinions */
  citing_opinions: Array<{ cl_id: string; case_name: string; depth: number }>;
  /** Opinions cited by one of the seed opinions */
  cited_opinions: Array<{ cl_id: string; case_name: string; depth: number }>;
  /** Other statutes that share an applying opinion with seed statutes */
  related_statutes: Array<{ citation_key: string; title: string; co_citations: number }>;
}

/**
 * Given a seed set of opinion CourtListener IDs and statute citation_keys
 * (typically from pgvector ANN), expand outward through the citation
 * graph to surface related authorities the vector search may have missed.
 *
 * This is what makes GraphRAG > pure vector RAG for legal research.
 */
export async function expandViaGraph(opts: {
  seedOpinionClIds: string[];
  seedStatuteCitationKeys: string[];
  maxDepth?: number;
  perBucketLimit?: number;
}): Promise<GraphExpansionResult> {
  const { seedOpinionClIds, seedStatuteCitationKeys } = opts;
  const maxDepth = opts.maxDepth ?? 1;
  const perBucketLimit = opts.perBucketLimit ?? 10;

  if (seedOpinionClIds.length === 0 && seedStatuteCitationKeys.length === 0) {
    return { citing_opinions: [], cited_opinions: [], related_statutes: [] };
  }

  return withSession(async (s) => {
    const [citing, cited, related] = await Promise.all([
      // Opinions citing the seeds
      seedOpinionClIds.length === 0
        ? Promise.resolve([] as Neo4jRecord[])
        : s
            .run(
              `
              MATCH (citer:Opinion)-[:CITES*1..${maxDepth}]->(seed:Opinion)
              WHERE seed.cl_id IN $clIds
              RETURN DISTINCT citer.cl_id AS cl_id, citer.case_name AS case_name, 1 AS depth
              LIMIT $lim
              `,
              { clIds: seedOpinionClIds, lim: neo4j.int(perBucketLimit) }
            )
            .then((r) => r.records),

      // Opinions cited by the seeds
      seedOpinionClIds.length === 0
        ? Promise.resolve([] as Neo4jRecord[])
        : s
            .run(
              `
              MATCH (seed:Opinion)-[:CITES*1..${maxDepth}]->(cited:Opinion)
              WHERE seed.cl_id IN $clIds
              RETURN DISTINCT cited.cl_id AS cl_id, cited.case_name AS case_name, 1 AS depth
              LIMIT $lim
              `,
              { clIds: seedOpinionClIds, lim: neo4j.int(perBucketLimit) }
            )
            .then((r) => r.records),

      // Statutes that share an applying opinion with seed statutes
      seedStatuteCitationKeys.length === 0
        ? Promise.resolve([] as Neo4jRecord[])
        : s
            .run(
              `
              MATCH (seed:Statute)<-[:APPLIES]-(o:Opinion)-[:APPLIES]->(related:Statute)
              WHERE seed.citation_key IN $keys AND seed <> related
              RETURN related.citation_key AS citation_key,
                     related.title AS title,
                     count(DISTINCT o) AS co_citations
              ORDER BY co_citations DESC
              LIMIT $lim
              `,
              { keys: seedStatuteCitationKeys, lim: neo4j.int(perBucketLimit) }
            )
            .then((r) => r.records),
    ]);

    return {
      citing_opinions: citing.map((r) => ({
        cl_id: r.get("cl_id") as string,
        case_name: r.get("case_name") as string,
        depth: r.get("depth") as number,
      })),
      cited_opinions: cited.map((r) => ({
        cl_id: r.get("cl_id") as string,
        case_name: r.get("case_name") as string,
        depth: r.get("depth") as number,
      })),
      related_statutes: related.map((r) => ({
        citation_key: r.get("citation_key") as string,
        title: r.get("title") as string,
        co_citations: r.get("co_citations").toNumber(),
      })),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Stats endpoint - proof of Neo4j integration for judges             */
/* ------------------------------------------------------------------ */

export interface Neo4jStats {
  configured: boolean;
  node_counts: Record<string, number>;
  relationship_counts: Record<string, number>;
  top_cited_opinions: Array<{ case_name: string; cited_by_count: number }>;
  top_applied_statutes: Array<{ citation_key: string; title: string; applied_by_count: number }>;
  total_nodes: number;
  total_relationships: number;
}

export async function getGraphStats(): Promise<Neo4jStats> {
  if (!isNeo4jConfigured()) {
    return {
      configured: false,
      node_counts: {},
      relationship_counts: {},
      top_cited_opinions: [],
      top_applied_statutes: [],
      total_nodes: 0,
      total_relationships: 0,
    };
  }

  return withSession(async (s) => {
    const [nodeCounts, relCounts, topCited, topApplied, totals] = await Promise.all([
      s.run(`
        CALL db.labels() YIELD label
        CALL (label) {
          MATCH (n)
          WHERE label IN labels(n)
          RETURN count(n) AS c
        }
        RETURN label, c
      `).catch(() => ({ records: [] as Neo4jRecord[] })),

      s.run(`
        CALL db.relationshipTypes() YIELD relationshipType
        CALL (relationshipType) {
          MATCH ()-[r]->()
          WHERE type(r) = relationshipType
          RETURN count(r) AS c
        }
        RETURN relationshipType, c
      `).catch(() => ({ records: [] as Neo4jRecord[] })),

      s
        .run(`
          MATCH (citer:Opinion)-[:CITES]->(o:Opinion)
          RETURN o.case_name AS case_name, count(citer) AS cited_by_count
          ORDER BY cited_by_count DESC
          LIMIT 5
        `)
        .catch(() => ({ records: [] as Neo4jRecord[] })),

      s
        .run(`
          MATCH (o:Opinion)-[:APPLIES]->(s:Statute)
          RETURN s.citation_key AS citation_key, s.title AS title, count(o) AS applied_by_count
          ORDER BY applied_by_count DESC
          LIMIT 5
        `)
        .catch(() => ({ records: [] as Neo4jRecord[] })),

      s
        .run(`
          MATCH (n) WITH count(n) AS nodes
          MATCH ()-[r]->() WITH nodes, count(r) AS rels
          RETURN nodes, rels
        `)
        .catch(() => ({ records: [] as Neo4jRecord[] })),
    ]);

    const node_counts: Record<string, number> = {};
    for (const r of nodeCounts.records) {
      node_counts[r.get("label") as string] = r.get("c").toNumber();
    }
    const relationship_counts: Record<string, number> = {};
    for (const r of relCounts.records) {
      relationship_counts[r.get("relationshipType") as string] = r.get("c").toNumber();
    }
    const total_nodes = totals.records[0]?.get("nodes").toNumber() ?? 0;
    const total_relationships = totals.records[0]?.get("rels").toNumber() ?? 0;

    return {
      configured: true,
      node_counts,
      relationship_counts,
      total_nodes,
      total_relationships,
      top_cited_opinions: topCited.records.map((r) => ({
        case_name: r.get("case_name") as string,
        cited_by_count: r.get("cited_by_count").toNumber(),
      })),
      top_applied_statutes: topApplied.records.map((r) => ({
        citation_key: r.get("citation_key") as string,
        title: r.get("title") as string,
        applied_by_count: r.get("applied_by_count").toNumber(),
      })),
    };
  });
}

/**
 * Health check — for the demo and CI.
 */
export async function healthCheck(): Promise<{ ok: boolean; details: string }> {
  if (!isNeo4jConfigured()) {
    return {
      ok: false,
      details: "NEO4J_URI/USER/PASSWORD not set in .env.local",
    };
  }
  try {
    const driver = getDriver();
    const info = await driver.getServerInfo();
    return {
      ok: true,
      details: `Connected to Neo4j ${info.protocolVersion} at ${info.address}`,
    };
  } catch (e) {
    return {
      ok: false,
      details: e instanceof Error ? e.message : String(e),
    };
  }
}
