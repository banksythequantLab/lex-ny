"""
Citation graph builder for Lex.NY.

Stage 1 (map):   stream 50GB opinions file -> opinion_id -> cluster_id map,
                 keeping ONLY opinions whose cluster is in our NY set.
                 Writes opinion_to_cluster.json
Stage 2 (edges): stream 498MB citation-map -> opinion_citations table,
                 keeping edges where BOTH endpoints resolve to NY clusters.

Usage:
  python build_citation_graph.py map
  python build_citation_graph.py edges
  python build_citation_graph.py all
"""
import sys, os, bz2, csv, io, time, json
import urllib.request
import psycopg2
from psycopg2.extras import execute_values

_m = sys.maxsize
while True:
    try:
        csv.field_size_limit(_m); break
    except OverflowError:
        _m = int(_m / 10)

PG = dict(host='localhost', port=5432, user='postgres',
          password=os.environ['PGPASSWORD'], dbname='lex')
BASE = "https://com-courtlistener-storage.s3-us-west-2.amazonaws.com/bulk-data"
DATE = "2026-03-31"
DATA = r'E:\nota_lawyer_hackathon\cl-bulk'
MAP_PATH = os.path.join(DATA, 'opinion_to_cluster.json')
NY_CLUSTERS_PATH = os.path.join(DATA, 'ny_cluster_ids.json')


def stage_map():
    print("=== STAGE 1: opinion_id -> cluster_id map (streaming 50GB) ===", flush=True)
    with open(NY_CLUSTERS_PATH) as f:
        ny_clusters = set(json.load(f))
    print(f"  {len(ny_clusters):,} NY cluster IDs loaded", flush=True)

    url = f"{BASE}/opinions-{DATE}.csv.bz2"
    print(f"  Streaming {url}", flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Lex.NY/0.1'})

    op_to_cluster = {}
    total = 0
    matched = 0
    start = time.time()

    with urllib.request.urlopen(req) as resp:
        decomp = bz2.BZ2File(resp, mode='rb')
        text = io.TextIOWrapper(decomp, encoding='utf-8', errors='replace', newline='')
        # CourtListener opinions CSV uses backslash-escaped quotes (\") not
        # doubled quotes, with literal newlines inside quoted text fields.
        # Must set doublequote=False + escapechar='\\' or 99% of rows misalign.
        reader = csv.reader(text, doublequote=False, escapechar='\\')
        header = next(reader)
        id_idx = header.index('id')
        cluster_idx = header.index('cluster_id')
        for row in reader:
            total += 1
            try:
                cluster_id = row[cluster_idx]
                if cluster_id in ny_clusters:
                    op_to_cluster[row[id_idx]] = cluster_id
                    matched += 1
            except IndexError:
                pass
            if total % 200000 == 0:
                el = time.time() - start
                print(f"  {total:>10,} opinions scanned, {matched:>8,} NY mapped ({total/el:.0f}/s)", flush=True)

    el = time.time() - start
    print(f"  DONE. {total:,} scanned, {matched:,} NY opinion->cluster mappings in {el:.0f}s", flush=True)
    with open(MAP_PATH, 'w') as f:
        json.dump(op_to_cluster, f)
    print(f"  Saved {MAP_PATH} ({os.path.getsize(MAP_PATH)/1024/1024:.1f} MB)", flush=True)


def stage_edges():
    print("=== STAGE 2: citation edges -> opinion_citations ===", flush=True)
    with open(MAP_PATH) as f:
        op_to_cluster = json.load(f)
    print(f"  {len(op_to_cluster):,} opinion->cluster mappings loaded", flush=True)

    # Build cluster_id -> opinions.id (uuid PK) lookup for FK
    conn = psycopg2.connect(**PG)
    cur = conn.cursor()
    print("  Loading cluster_id -> uuid map from opinions table...", flush=True)
    cur.execute("SELECT source_id, id FROM opinions WHERE source='courtlistener'")
    cluster_to_uuid = {r[0]: r[1] for r in cur.fetchall()}
    print(f"  {len(cluster_to_uuid):,} clusters in DB", flush=True)

    url = f"{BASE}/citation-map-{DATE}.csv.bz2"
    print(f"  Streaming {url}", flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Lex.NY/0.1'})

    INSERT = """
        INSERT INTO opinion_citations (citing_id, cited_id, cite_count, cite_string)
        VALUES %s ON CONFLICT (citing_id, cited_id) DO NOTHING
    """
    batch = []
    total = matched = inserted = skipped_bad = 0
    start = time.time()

    def flush():
        nonlocal batch, inserted, skipped_bad
        if not batch:
            return
        try:
            execute_values(cur, INSERT, batch, page_size=500)
            if cur.rowcount and cur.rowcount > 0:
                inserted += cur.rowcount
            conn.commit()
        except Exception:
            conn.rollback()
            for one in list(batch):
                try:
                    execute_values(cur, INSERT, [one], page_size=1)
                    if cur.rowcount and cur.rowcount > 0:
                        inserted += cur.rowcount
                    conn.commit()
                except Exception:
                    conn.rollback()
                    skipped_bad += 1
        batch = []

    with urllib.request.urlopen(req) as resp:
        decomp = bz2.BZ2File(resp, mode='rb')
        text = io.TextIOWrapper(decomp, encoding='utf-8', errors='replace', newline='')
        reader = csv.DictReader(text)
        for row in reader:
            total += 1
            cited_op = row.get('cited_opinion_id')
            citing_op = row.get('citing_opinion_id')
            cited_cluster = op_to_cluster.get(cited_op)
            citing_cluster = op_to_cluster.get(citing_op)
            if not cited_cluster or not citing_cluster:
                if total % 1000000 == 0:
                    el = time.time() - start
                    print(f"  {total:>10,} edges scanned, {matched:>7,} NY-NY, {inserted:>7,} inserted ({total/el:.0f}/s)", flush=True)
                continue
            citing_uuid = cluster_to_uuid.get(citing_cluster)
            cited_uuid = cluster_to_uuid.get(cited_cluster)
            if not citing_uuid or not cited_uuid or citing_uuid == cited_uuid:
                continue
            matched += 1
            depth = row.get('depth') or '1'
            try:
                cc = int(depth)
            except ValueError:
                cc = 1
            batch.append((citing_uuid, cited_uuid, cc, None))
            if len(batch) >= 1000:
                flush()
                if matched % 50000 == 0:
                    el = time.time() - start
                    print(f"  {total:>10,} scanned, {matched:>7,} NY-NY, {inserted:>7,} inserted ({total/el:.0f}/s)", flush=True)

    flush()
    el = time.time() - start
    print(f"  DONE. {total:,} edges scanned, {matched:,} NY-NY matched, "
          f"{inserted:,} inserted, {skipped_bad} bad in {el:.0f}s", flush=True)
    cur.close()
    conn.close()


if __name__ == '__main__':
    stage = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if stage in ('map', 'all'):
        stage_map()
    if stage in ('edges', 'all'):
        stage_edges()
    print("Citation graph build complete.", flush=True)
