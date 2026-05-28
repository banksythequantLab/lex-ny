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
PG = dict(host="localhost", port=5432, user="postgres", password=os.environ["PGPASSWORD"], dbname="lex")
URL = "https://com-courtlistener-storage.s3-us-west-2.amazonaws.com/bulk-data/dockets-2026-03-31.csv.bz2"
MAP = r"E:\nota_lawyer_hackathon\cl-bulk\ny_dockets.json"
print("Loading docket map...", flush=True)
with open(MAP) as f:
    ny = json.load(f)
ny_set = set(ny.keys())
print("  %d NY docket IDs" % len(ny_set), flush=True)
conn = psycopg2.connect(**PG)
cur = conn.cursor()
cur.execute("SELECT id FROM courts")
valid_courts = {r[0] for r in cur.fetchall()}
print("  %d valid courts" % len(valid_courts), flush=True)
INSERT = "INSERT INTO ny_cases (id, court_id, case_name, case_name_short, docket_number, date_filed, date_terminated, nature_of_suit, cause, jurisdiction_type, source_url) VALUES %s ON CONFLICT (id) DO NOTHING"
def pd_(s):
    return s[:10] if s and s.strip() else None
batch = []
total = matched = inserted = skipped_bad = skipped_nc = 0
start = time.time()

def flush():
    global batch, inserted, skipped_bad
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
req = urllib.request.Request(URL, headers={"User-Agent": "Lex.NY/0.1"})
print("Streaming dockets...", flush=True)
with urllib.request.urlopen(req) as resp:
    decomp = bz2.BZ2File(resp, mode="rb")
    text = io.TextIOWrapper(decomp, encoding="utf-8", errors="replace", newline="")
    reader = csv.DictReader(text)
    for row in reader:
        total += 1
        rid = row["id"]
        if rid not in ny_set:
            if total % 2000000 == 0:
                el = time.time() - start
                print("  %d scanned, %d matched, %d inserted (%d/s)" % (total, matched, inserted, total/el), flush=True)
            continue
        matched += 1
        court_id = ny[rid]
        if court_id not in valid_courts:
            skipped_nc += 1
            continue
        batch.append((rid, court_id,
            (row.get("case_name") or row.get("case_name_full") or "")[:5000] or None,
            (row.get("case_name_short") or "")[:500] or None,
            (row.get("docket_number") or "")[:500] or None,
            pd_(row.get("date_filed")), pd_(row.get("date_terminated")),
            (row.get("nature_of_suit") or "")[:500] or None,
            (row.get("cause") or "")[:500] or None,
            (row.get("jurisdiction_type") or "")[:100] or None,
            "https://www.courtlistener.com/docket/%s/" % rid))
        if len(batch) >= 1000:
            flush()
            if matched % 200000 == 0:
                el = time.time() - start
                print("  %d scanned, %d matched, %d inserted (%d/s)" % (total, matched, inserted, total/el), flush=True)
flush()
el = time.time() - start
print("\nDONE. %d scanned, %d matched, %d inserted, %d no-court, %d bad in %ds" % (total, matched, inserted, skipped_nc, skipped_bad, el), flush=True)
cur.close(); conn.close()
