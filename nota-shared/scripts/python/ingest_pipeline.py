"""
CourtListener bulk-data ingest for Lex.NY.

Three stages — run individually or all-in-one:

  python ingest_pipeline.py courts        # tiny, ~5 sec
  python ingest_pipeline.py dockets       # ~5-15 min, builds NY docket->court map
  python ingest_pipeline.py clusters      # ~5-10 min, inserts NY opinion metadata
  python ingest_pipeline.py all           # all three in order

All stages stream from S3 -> bz2 decompress -> CSV -> Postgres without ever
writing the bz2 to disk (except courts which is 81 KB).
"""
from __future__ import annotations
import sys, os, bz2, csv, io, time, json, argparse
import urllib.request
import psycopg2
from psycopg2.extras import execute_values

# Bump CSV field size limit — CourtListener opinion-clusters has rows whose
# summary/headnotes fields exceed Python's default 131072 char cap.
# Use the maximum that fits in a C long on this platform.
_max_int = sys.maxsize
while True:
    try:
        csv.field_size_limit(_max_int)
        break
    except OverflowError:
        _max_int = int(_max_int / 10)

# ----- env / constants -----
PG = dict(
    host=os.environ.get('PGHOST', 'localhost'),
    port=int(os.environ.get('PGPORT', '5432')),
    user=os.environ.get('PGUSER', 'postgres'),
    password=os.environ.get('PGPASSWORD'),
    dbname=os.environ.get('PGDATABASE', 'lex'),
)

BASE = "https://com-courtlistener-storage.s3-us-west-2.amazonaws.com/bulk-data"
DATE = "2026-03-31"
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# Curated NY court IDs - appellate-tier and trial-tier courts that produce
# precedential opinions. Excludes the noise (justice courts, surrogate courts,
# etc. — hundreds of micro-courts that publish almost nothing).
NY_COURTS = {
    # Highest priority: binding precedent
    'ny',           # Court of Appeals
    'nyappdiv',     # Appellate Division (all departments)
    'nyappterm',    # Appellate Terms
    'ca2',          # 2nd Circuit federal appeals
    'nysd', 'nyed', 'nynd', 'nywd',  # Federal districts in NY
    # Trial-level state courts that publish significant decisions
    'nysupct',      # NY Supreme Court (trial)
    'nyfamct',      # Family Court
    'nyclaimsct',   # Court of Claims
    'nysurct',      # Surrogate's Court (generic, opinions of note)
    'nyag',         # NY Attorney General Reports
    # County-level supreme courts (where most published trial decisions land)
    'nysupctnewyork', 'nysupctkings', 'nysupctbrnx', 'nysupctqueens',
    'nysupctrichmond', 'nysupctnss', 'nysupctsuffolk', 'nysupctwester',
    'nysupcterie', 'nysupctmonroe', 'nysupctalbany', 'nysupctonondaga',
    # Federal bankruptcy
    'nysb', 'nyeb', 'nynb', 'nywb',
    # Circuit court historical
    'circtsdny', 'circtedny', 'circtndny', 'circtwdny',
}


def stream_csv_from_bz2_url(url: str):
    """Stream a bz2'd CSV over HTTPS without buffering the whole file.
    
    Yields dict rows from csv.DictReader.
    """
    req = urllib.request.Request(url, headers={'User-Agent': 'Lex.NY-ingest/0.1'})
    with urllib.request.urlopen(req) as resp:
        # Wrap the network response in a bz2 decompressing reader, then a
        # text reader, then a CSV DictReader. All streaming.
        decomp = bz2.BZ2File(resp, mode='rb')
        text = io.TextIOWrapper(decomp, encoding='utf-8', errors='replace', newline='')
        reader = csv.DictReader(text)
        for row in reader:
            yield row


def stage_courts():
    """Load courts.csv (already decompressed locally) into Postgres."""
    print("=== STAGE: courts ===", flush=True)
    courts_csv = os.path.join(DATA_DIR, 'courts.csv')
    if not os.path.exists(courts_csv):
        print(f"  Missing {courts_csv} — run the PowerShell download first.", flush=True)
        sys.exit(1)
    conn = psycopg2.connect(**PG)
    conn.autocommit = False
    cur = conn.cursor()
    # Ensure courts table exists; create minimal version if missing
    cur.execute("""
        CREATE TABLE IF NOT EXISTS courts (
            id text PRIMARY KEY,
            full_name text,
            short_name text,
            citation_string text,
            url text,
            level text,
            established date
        )
    """)
    conn.commit()
    total = 0
    with open(courts_csv, encoding='utf-8') as f:
        r = csv.DictReader(f)
        rows = []
        # Map CourtListener jurisdiction codes -> our level enum
        # S=state highest, SA=state appellate, ST=state trial, SS=state specialty,
        # SAG=state AG, F=federal appeals, FD=federal district, FB=federal bankruptcy,
        # FS=federal special, C=tribal/committee
        JUR_TO_LEVEL = {
            'S':   'appellate_high',
            'SA':  'appellate_mid',
            'F':   'appellate_mid',   # federal circuit courts
            'FS':  'appellate_mid',
            'ST':  'trial',
            'FD':  'trial',
            'SS':  'specialty',
            'SAG': 'specialty',
            'FB':  'specialty',
            'C':   'specialty',
            'I':   'specialty',
            'MA':  'specialty',
            'TRS': 'specialty',
            'T':   'specialty',
        }
        ny_courts_lc = {c.lower() for c in NY_COURTS}
        skipped_non_ny = 0
        skipped_bad_level = 0
        for row in r:
            try:
                cid = row['id']
                # Only ingest NY-relevant courts (we don't need a 3000-row table
                # for FK against ~hundreds of distinct NY courts)
                if cid.lower() not in ny_courts_lc:
                    skipped_non_ny += 1
                    continue
                start_date = row.get('start_date') or None
                if start_date == '':
                    start_date = None
                jur = row.get('jurisdiction') or ''
                level = JUR_TO_LEVEL.get(jur)
                if not level:
                    skipped_bad_level += 1
                    print(f"  Skip {cid}: unmapped jurisdiction='{jur}'", flush=True)
                    continue
                short_name = row.get('short_name') or row.get('full_name') or cid
                citation = row.get('citation_string') or short_name
                rows.append((
                    cid,
                    row.get('full_name') or short_name,
                    short_name,
                    citation,
                    row.get('url') or '',
                    level,
                    start_date,
                ))
            except Exception as e:
                print(f"  Skip row {row.get('id')}: {e}", flush=True)
        print(f"  Filtered {skipped_non_ny} non-NY rows, {skipped_bad_level} unmappable jurisdictions", flush=True)
        execute_values(cur,
            """INSERT INTO courts (id, full_name, short_name, citation_string,
                                   url, level, established)
               VALUES %s
               ON CONFLICT (id) DO UPDATE SET
                 full_name = EXCLUDED.full_name,
                 short_name = EXCLUDED.short_name,
                 citation_string = EXCLUDED.citation_string,
                 url = EXCLUDED.url,
                 level = EXCLUDED.level""",
            rows, page_size=500)
        total = len(rows)
    conn.commit()
    conn.close()
    print(f"  Loaded {total} courts.", flush=True)


def stage_dockets():
    """Stream dockets.csv.bz2 and write NY docket_id -> court_id map to disk."""
    print("=== STAGE: dockets ===", flush=True)
    url = f"{BASE}/dockets-{DATE}.csv.bz2"
    print(f"  Streaming {url}", flush=True)
    out_path = os.path.join(DATA_DIR, 'ny_dockets.json')
    
    ny_courts_lc = {c.lower() for c in NY_COURTS}
    
    docket_to_court: dict[str, str] = {}
    total = 0
    matched = 0
    start = time.time()
    
    for row in stream_csv_from_bz2_url(url):
        total += 1
        court_id = (row.get('court_id') or '').strip()
        if court_id.lower() in ny_courts_lc:
            docket_to_court[row['id']] = court_id
            matched += 1
        if total % 100000 == 0:
            elapsed = time.time() - start
            rate = total / elapsed if elapsed > 0 else 0
            print(f"  {total:>10,} rows scanned, {matched:>7,} NY matches "
                  f"({rate:.0f} rows/s)", flush=True)
    
    elapsed = time.time() - start
    print(f"  DONE. {total:,} total dockets, {matched:,} NY in "
          f"{elapsed:.0f}s ({total/elapsed:.0f}/s avg)", flush=True)
    
    # Save to disk for the next stage
    with open(out_path, 'w') as f:
        json.dump(docket_to_court, f)
    print(f"  Saved NY docket->court map -> {out_path} "
          f"({os.path.getsize(out_path) / 1024 / 1024:.1f} MB)", flush=True)


def stage_clusters():
    """Stream opinion-clusters.csv.bz2 and INSERT NY rows into opinions table."""
    print("=== STAGE: opinion-clusters ===", flush=True)
    map_path = os.path.join(DATA_DIR, 'ny_dockets.json')
    if not os.path.exists(map_path):
        print(f"  Missing {map_path} — run 'dockets' stage first.", flush=True)
        sys.exit(1)
    with open(map_path) as f:
        docket_to_court: dict[str, str] = json.load(f)
    print(f"  Loaded {len(docket_to_court):,} NY docket_ids from map.", flush=True)
    
    url = f"{BASE}/opinion-clusters-{DATE}.csv.bz2"
    print(f"  Streaming {url}", flush=True)
    
    conn = psycopg2.connect(**PG)
    conn.autocommit = False
    cur = conn.cursor()
    
    batch = []
    BATCH_SIZE = 1000
    total = 0
    matched = 0
    inserted = 0
    start = time.time()
    
    INSERT_SQL = """
        INSERT INTO opinions (
            source, source_id, source_url, court_id, case_name, case_name_short,
            citation, docket_number, decision_date, precedential_status,
            ai_summary, cleanup_status
        )
        VALUES %s
        ON CONFLICT (source, source_id) DO NOTHING
    """
    
    skipped_bad = 0
    def flush_batch():
        nonlocal batch, inserted, skipped_bad
        if not batch:
            return
        try:
            execute_values(cur, INSERT_SQL, batch, page_size=500)
            if cur.rowcount and cur.rowcount > 0:
                inserted += cur.rowcount
            conn.commit()
        except Exception:
            conn.rollback()
            for one in list(batch):
                try:
                    execute_values(cur, INSERT_SQL, [one], page_size=1)
                    if cur.rowcount and cur.rowcount > 0:
                        inserted += cur.rowcount
                    conn.commit()
                except Exception as e2:
                    conn.rollback()
                    skipped_bad += 1
                    if skipped_bad <= 10:
                        print(f'  Skip bad row source_id={one[1]} court={one[3]}: {str(e2)[:120]}', flush=True)
        batch = []
    
    try:
        for row in stream_csv_from_bz2_url(url):
            total += 1
            docket_id = row.get('docket_id', '')
            if docket_id not in docket_to_court:
                if total % 50000 == 0:
                    elapsed = time.time() - start
                    rate = total / elapsed if elapsed > 0 else 0
                    print(f"  {total:>10,} rows scanned, {matched:>6,} NY matches, "
                          f"{inserted:>6,} inserted ({rate:.0f}/s)", flush=True)
                continue
            matched += 1
            court_id = docket_to_court[docket_id]
            cluster_id = row['id']
            slug = row.get('slug') or 'opinion'
            date_filed = row.get('date_filed') or None
            if not date_filed:
                # decision_date is NOT NULL in our schema — skip rows without it
                continue
            try:
                batch.append((
                    'courtlistener',
                    cluster_id,
                    f'https://www.courtlistener.com/opinion/{cluster_id}/{slug}/',
                    court_id,
                    row.get('case_name') or row.get('case_name_full') or 'Unknown',
                    row.get('case_name_short') or None,
                    None,  # citation - not in clusters file
                    None,  # docket_number - in dockets file (could backfill)
                    date_filed,
                    row.get('precedential_status') or None,
                    row.get('summary') or None,
                    'raw',
                ))
            except Exception as e:
                print(f"  Skip cluster {cluster_id}: {e}", flush=True)
                continue
            if len(batch) >= BATCH_SIZE:
                flush_batch()
                if matched % 5000 == 0:
                    elapsed = time.time() - start
                    print(f"  {total:>10,} scanned, {matched:>6,} matched, "
                          f"{inserted:>6,} inserted ({total/elapsed:.0f}/s)", flush=True)
    finally:
        flush_batch()
        cur.close()
        conn.close()
    
    elapsed = time.time() - start
    print(f"  DONE. {total:,} clusters scanned, {matched:,} NY matched, "
          f"{inserted:,} inserted in {elapsed:.0f}s", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['courts', 'dockets', 'clusters', 'all'])
    args = parser.parse_args()
    
    if args.stage in ('courts', 'all'):
        stage_courts()
    if args.stage in ('dockets', 'all'):
        stage_dockets()
    if args.stage in ('clusters', 'all'):
        stage_clusters()
    print("All stages complete.", flush=True)


if __name__ == '__main__':
    main()
