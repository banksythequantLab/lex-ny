"""sync_applies_neo4j.py

Push opinion_applies_statute into AuraDB as (:Opinion)-[:APPLIES]->(:Statute).

Both endpoint MERGE keys already exist:
  - Opinion.cl_id        (set during sync_opinions)
  - Statute.citation_key (set during sync_statutes)

So we just MATCH both and create the edge. Idempotent via MERGE.
"""
import sys, os, re, time
import psycopg2
from neo4j import GraphDatabase

# Env from .env.local
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

CYPHER = """
UNWIND $rows AS row
MATCH (op:Opinion {cl_id: row.cl_id})
MATCH (st:Statute {citation_key: row.ckey})
MERGE (op)-[r:APPLIES]->(st)
"""


def main():
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
        max_connection_lifetime=3600,
        connection_acquisition_timeout=120,
    )

    rconn = psycopg2.connect(**PG)
    rconn.autocommit = False
    cur = rconn.cursor(name='applies_cur')
    cur.itersize = BATCH
    # Join opinion_applies_statute -> opinions.source_id (= cl_id Neo4j knows)
    cur.execute("""
        SELECT o.source_id AS cl_id, aps.citation_key AS ckey
        FROM opinion_applies_statute aps
        JOIN opinions o ON o.id = aps.opinion_id
        WHERE o.source_id IS NOT NULL
    """)

    total = 0
    start = time.time()
    batch = []

    with driver.session(database=NEO4J_DB) as s:
        for cl_id, ckey in cur:
            batch.append({"cl_id": str(cl_id), "ckey": ckey})
            if len(batch) >= BATCH:
                s.run(CYPHER, rows=batch)
                total += len(batch)
                if total % 50000 == 0:
                    el = time.time() - start
                    print(f"  {total:>9,} APPLIES sent ({total/el:.0f}/s)", flush=True)
                batch.clear()
        if batch:
            s.run(CYPHER, rows=batch)
            total += len(batch)

    el = time.time() - start
    print(f"DONE. {total:,} APPLIES edges sent in {el:.0f}s")

    # Final count
    with driver.session(database=NEO4J_DB) as s:
        c = s.run("MATCH ()-[r:APPLIES]->() RETURN count(r) AS c").single()["c"]
        print(f"Neo4j APPLIES relationships now: {c:,}")

    cur.close()
    rconn.close()
    driver.close()


if __name__ == '__main__':
    main()
