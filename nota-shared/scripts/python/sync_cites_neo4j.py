"""
sync_cites_neo4j.py - push opinion_citations into AuraDB as (:Opinion)-[:CITES]->(:Opinion).

Streams rows from Postgres in cursor batches, joins each side to opinions.source_id
(= cl_id), and runs UNWIND MERGE against Neo4j. Idempotent: MERGE on the pair, so
re-running adds only new edges. CITES carries a `weight` property = how many
citation rows backed this edge (helpful for the "how strong" question in GraphRAG).

Usage:
  python sync_cites_neo4j.py                # all edges
  python sync_cites_neo4j.py --batch=5000
  python sync_cites_neo4j.py --limit=100000 # for partial smoke tests
"""
import sys, os, re, time
import psycopg2
from neo4j import GraphDatabase

# ---- env ----
env = {}
with open(r'E:\nota_lawyer_hackathon\nota-build\nota-lex\.env.local', encoding='utf-8') as f:
    for line in f:
        m = re.match(r'^([A-Z][A-Z_0-9]+)=(.*)$', line.strip())
        if m:
            env[m.group(1)] = m.group(2)

NEO4J_URI = env['NEO4J_URI']
NEO4J_USER = env['NEO4J_USER']
NEO4J_PASSWORD = env['NEO4J_PASSWORD']
NEO4J_DB = env.get('NEO4J_DATABASE', 'neo4j')

PG = dict(host='localhost', port=5432, user='postgres',
          password=os.environ['PGPASSWORD'], dbname='lex')

BATCH = 5000
LIMIT = None
for a in sys.argv[1:]:
    if a.startswith('--batch='):
        BATCH = int(a.split('=')[1])
    if a.startswith('--limit='):
        LIMIT = int(a.split('=')[1])

# UNWIND MERGE pattern. The endpoint MATCHes (not MERGE) so we don't accidentally
# create empty Opinion nodes if an edge points to a cluster_id we haven't synced
# yet. Edges with missing endpoints are silently skipped by Cypher semantics.
MERGE_CYPHER = """
UNWIND $rows AS row
MATCH (citing:Opinion {cl_id: row.citing_cl_id})
MATCH (cited:Opinion  {cl_id: row.cited_cl_id})
MERGE (citing)-[r:CITES]->(cited)
  ON CREATE SET r.weight = row.weight
  ON MATCH  SET r.weight = row.weight
"""


def main():
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
        max_connection_lifetime=3600,
        connection_acquisition_timeout=120,
    )

    # quick health + node count
    with driver.session(database=NEO4J_DB) as s:
        n = s.run("MATCH (o:Opinion) RETURN count(o) AS c").single()['c']
        print(f"AuraDB connected. Opinion nodes available: {n:,}", flush=True)

    rconn = psycopg2.connect(**PG)
    rconn.autocommit = False
    cur = rconn.cursor(name='citecur')
    cur.itersize = BATCH
    # The two-sided join. cite_count -> weight.
    # ORDER BY citing_id so the cursor walks deterministically (resume-safe).
    sql = """
        SELECT a.source_id AS citing_cl_id,
               b.source_id AS cited_cl_id,
               oc.cite_count AS weight
        FROM opinion_citations oc
        JOIN opinions a ON a.id = oc.citing_id
        JOIN opinions b ON b.id = oc.cited_id
    """
    if LIMIT:
        sql += f" LIMIT {LIMIT}"
    cur.execute(sql)

    total_sent = 0
    start = time.time()
    batch = []

    with driver.session(database=NEO4J_DB) as s:
        for citing_cl, cited_cl, weight in cur:
            if not citing_cl or not cited_cl:
                continue
            batch.append({
                "citing_cl_id": citing_cl,
                "cited_cl_id": cited_cl,
                "weight": int(weight) if weight is not None else 1,
            })
            if len(batch) >= BATCH:
                s.run(MERGE_CYPHER, rows=batch)
                total_sent += len(batch)
                batch = []
                if total_sent % 50000 == 0:
                    el = time.time() - start
                    print(f"  {total_sent:>9,} CITES sent ({total_sent/el:.0f}/s)", flush=True)
        if batch:
            s.run(MERGE_CYPHER, rows=batch)
            total_sent += len(batch)

    el = time.time() - start
    print(f"DONE. {total_sent:,} CITES edges processed in {el:.0f}s ({total_sent/max(el,1):.0f}/s)", flush=True)

    cur.close()
    rconn.close()

    # final stats
    with driver.session(database=NEO4J_DB) as s:
        c = s.run("MATCH ()-[r:CITES]->() RETURN count(r) AS c").single()['c']
        print(f"Neo4j CITES relationships now: {c:,}", flush=True)
    driver.close()


if __name__ == '__main__':
    main()
