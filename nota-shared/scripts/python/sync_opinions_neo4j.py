"""
sync_opinions_neo4j.py - push Opinion + Court nodes into AuraDB.

Reads opinions from local Postgres in UUID-cursor batches, MERGEs:
  (:Court {id})
  (:Opinion {cl_id, case_name, court_id, decision_date, precedential_status})
  (:Opinion)-[:DECIDED_BY]->(:Court)

Uses UNWIND batch MERGE (one round-trip per batch) for speed over cloud Aura.
Idempotent — MERGE on cl_id. Safe to re-run / resume.

Usage:
  python sync_opinions_neo4j.py              # all opinions
  python sync_opinions_neo4j.py --published  # only precedential_status='Published'
  python sync_opinions_neo4j.py --batch=2000
"""
import sys, os, re, time
import psycopg2
from neo4j import GraphDatabase

# ---- load env ----
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

PG = dict(host='localhost', port=5432, user='postgres', password=os.environ['PGPASSWORD'], dbname='lex')

BATCH = 2000
published_only = False
for a in sys.argv[1:]:
    if a == '--published':
        published_only = True
    if a.startswith('--batch='):
        BATCH = int(a.split('=')[1])

MERGE_CYPHER = """
UNWIND $rows AS row
MERGE (o:Opinion {cl_id: row.cl_id})
  SET o.case_name = row.case_name,
      o.court_id = row.court_id,
      o.decision_date = row.decision_date,
      o.precedential_status = row.precedential_status
MERGE (c:Court {id: row.court_id})
MERGE (o)-[:DECIDED_BY]->(c)
"""

def valid_status(s):
    # filter the ~16 corrupted rows whose precedential_status holds leaked text
    if s is None:
        return None
    if len(s) > 30 or '<' in s or '$' in s:
        return 'Unknown'
    return s

def main():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    # bootstrap constraint for fast MERGE
    with driver.session(database=NEO4J_DB) as s:
        s.run("CREATE CONSTRAINT opinion_cl_id IF NOT EXISTS FOR (o:Opinion) REQUIRE o.cl_id IS UNIQUE")
        s.run("CREATE CONSTRAINT court_id IF NOT EXISTS FOR (c:Court) REQUIRE c.id IS UNIQUE")
    print("Constraints ensured.", flush=True)

    conn = psycopg2.connect(**PG)
    cur = conn.cursor(name='opcur')  # server-side cursor to stream
    cur.itersize = BATCH
    where = "WHERE precedential_status = 'Published'" if published_only else ""
    cur.execute(f"""
        SELECT source_id, case_name, court_id, decision_date::text, precedential_status
        FROM opinions {where}
        ORDER BY id
    """)

    total = 0
    start = time.time()
    batch = []
    with driver.session(database=NEO4J_DB) as s:
        for rec in cur:
            batch.append({
                'cl_id': rec[0],
                'case_name': (rec[1] or 'Unknown')[:500],
                'court_id': rec[2],
                'decision_date': rec[3],
                'precedential_status': valid_status(rec[4]),
            })
            if len(batch) >= BATCH:
                s.run(MERGE_CYPHER, rows=batch)
                total += len(batch)
                batch = []
                if total % 20000 == 0:
                    el = time.time() - start
                    print(f"  {total:>9,} opinions synced ({total/el:.0f}/s)", flush=True)
        if batch:
            s.run(MERGE_CYPHER, rows=batch)
            total += len(batch)

    el = time.time() - start
    print(f"DONE. {total:,} opinions synced in {el:.0f}s", flush=True)
    cur.close()
    conn.close()
    driver.close()

if __name__ == '__main__':
    main()
