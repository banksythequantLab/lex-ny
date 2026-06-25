"""load_and_embed_opinions.py — load opinion BODY text from the CL dump and
chunk-embed it, fixing the caption-only opinion vectors.

For NY-state slice courts (default: ny, nyappdiv, nysupct), streams the 54GB
dump, loads plain_text (+ html_with_citations into text_html for the click-cite
UX) into opinions, deletes the old caption embedding, and writes proper chunked
embeddings via Ollama mxbai. Resume-safe: skips opinions already text-loaded.

Usage:
  python load_and_embed_opinions.py                 # full slice run
  python load_and_embed_opinions.py --max-matches N # smoke: stop after N opinions
  python load_and_embed_opinions.py --courts ny     # override slice
"""
import sys, os, re, time, json, html, bz2, csv, argparse
import urllib.request
import psycopg2
from psycopg2.extras import execute_values

SRC = r'B:\nota_lawyer_hackathon\cl-bulk\opinions-2026-03-31.csv.bz2'
PG = dict(host='localhost', port=5432, user='postgres',
          password=os.environ.get('PGPASSWORD', ''), dbname='lex')
OLLAMA = 'http://localhost:11434/api/embed'
MODEL = 'mxbai-embed-large'
SLICE_COURTS = {'ny', 'nyappdiv', 'nysupct'}

CHUNK_CHARS = 1000      # ~300 tokens, safely under mxbai 512-token ctx
OVERLAP = 150
MAX_CHUNKS = 8          # cap per opinion (front-loads the holding); bounds volume
EMBED_BATCH = 128       # chunks per Ollama call

TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'\s+')

def clean(text, limit=None):
    if not text:
        return ''
    t = TAG_RE.sub(' ', text)
    t = html.unescape(t)
    t = t.replace('�', ' ')
    t = WS_RE.sub(' ', t).strip()
    return t[:limit] if limit else t

def chunk_text(text):
    if len(text) <= CHUNK_CHARS:
        return [text] if text else []
    out, start = [], 0
    while start < len(text) and len(out) < MAX_CHUNKS:
        end = min(start + CHUNK_CHARS, len(text))
        if end < len(text):
            lb = text.rfind('. ', end - 200, end)
            if lb > 0:
                end = lb + 1
        out.append(text[start:end].strip())
        if end >= len(text):
            break
        start = end - OVERLAP
    return out

def embed_batch(texts):
    body = json.dumps({"model": MODEL, "input": texts, "keep_alive": "60m"}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={'Content-Type': 'application/json'})
    resp = json.loads(urllib.request.urlopen(req, timeout=600).read())
    return resp.get('embeddings', [])

def vec_literal(arr):
    return '[' + ','.join(repr(float(x)) for x in arr) + ']'

def log(m):
    print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-matches', type=int, default=0)
    ap.add_argument('--courts', type=str, default='')
    args = ap.parse_args()
    courts = set(args.courts.split(',')) if args.courts else SLICE_COURTS
    if not PG['password']:
        log("ERROR: PGPASSWORD not set"); sys.exit(2)

    rconn = psycopg2.connect(**PG); rcur = rconn.cursor()
    wconn = psycopg2.connect(**PG); wcur = wconn.cursor()

    log(f"Slice courts: {sorted(courts)}")
    rcur.execute("SELECT source_id, id FROM opinions WHERE court_id = ANY(%s) AND source_id IS NOT NULL",
                 (list(courts),))
    cluster_to_uuid = {str(s): i for s, i in rcur.fetchall()}
    log(f"  {len(cluster_to_uuid):,} opinions in slice")
    rcur.execute("SELECT id FROM opinions WHERE court_id = ANY(%s) AND text_plain IS NOT NULL",
                 (list(courts),))
    done = set(r[0] for r in rcur.fetchall())
    log(f"  {len(done):,} already text-loaded (skip)")

    INS = ("INSERT INTO embeddings (content_kind, content_id, chunk_index, chunk_text, embedding, embedding_model) "
           "VALUES %s ON CONFLICT (content_kind, content_id, chunk_index) DO NOTHING")
    text_rows, del_oids = [], []
    e_oid, e_idx, e_txt = [], [], []
    rows = ny = embedded = 0
    t0 = time.time()

    def flush():
        nonlocal text_rows, del_oids, e_oid, e_idx, e_txt, embedded
        if text_rows:
            execute_values(wcur,
                "UPDATE opinions o SET text_plain=v.tp, text_html=v.th FROM (VALUES %s) "
                "AS v(id, tp, th) WHERE o.id = v.id::uuid",
                text_rows, template="(%s,%s,%s)")
        if del_oids:
            wcur.execute("DELETE FROM embeddings WHERE content_kind='opinion' AND content_id = ANY(%s::uuid[])", (del_oids,))
        if e_txt:
            embs = embed_batch(e_txt)
            if len(embs) == len(e_txt):
                rows_ins = [('opinion', e_oid[i], e_idx[i], e_txt[i], vec_literal(embs[i]), MODEL)
                            for i in range(len(e_txt))]
                execute_values(wcur, INS, rows_ins, template="(%s,%s,%s,%s,%s::vector,%s)", page_size=500)
                embedded += len(rows_ins)
            else:
                log(f"  WARN embed count {len(embs)}!={len(e_txt)}, skip batch")
        wconn.commit()
        text_rows, del_oids, e_oid, e_idx, e_txt = [], [], [], [], []

    csv.field_size_limit(2**31 - 1)
    with bz2.open(SRC, mode='rt', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.reader(f, doublequote=False, escapechar='\\')
        ix = {n: i for i, n in enumerate(next(reader))}
        c_cl = ix['cluster_id']; c_pt = ix['plain_text']; c_hwc = ix.get('html_with_citations', -1)
        c_h = ix.get('html', -1); c_lb = ix.get('html_lawbox', -1); c_col = ix.get('html_columbia', -1)
        for row in reader:
            rows += 1
            if rows % 250000 == 0:
                log(f"  {rows:,} scanned | {ny:,} loaded | {embedded:,} chunks | {rows/(time.time()-t0):.0f}/s")
            if len(row) <= c_cl:
                continue
            oid = cluster_to_uuid.get(row[c_cl].strip())
            if not oid or oid in done:
                continue
            raw = row[c_pt] if c_pt < len(row) else ''
            hwc = row[c_hwc] if 0 <= c_hwc < len(row) else ''
            if not raw or not raw.strip():
                for ci in (c_hwc, c_h, c_lb, c_col):
                    if 0 <= ci < len(row) and row[ci].strip():
                        raw = row[ci]; break
            text = clean(raw)
            if not text:
                continue
            done.add(oid); ny += 1
            text_rows.append((str(oid), text[:500000], (hwc or '')[:500000]))
            del_oids.append(oid)
            for ci, ch in enumerate(chunk_text(text)):
                e_oid.append(oid); e_idx.append(ci); e_txt.append(ch)
            if len(e_txt) >= EMBED_BATCH:
                flush()
            if args.max_matches and ny >= args.max_matches:
                break
    flush()
    wcur.execute("SELECT count(*) FROM embeddings WHERE content_kind='opinion' AND chunk_index>=1")
    multi = wcur.fetchone()[0]
    log(f"DONE: scanned {rows:,} | opinions loaded {ny:,} | chunks embedded {embedded:,} | "
        f"opinion multi-chunk rows now {multi:,} | {(time.time()-t0)/60:.1f} min")
    for c in (rcur, wcur, rconn, wconn):
        try: c.close()
        except Exception: pass

if __name__ == '__main__':
    main()
