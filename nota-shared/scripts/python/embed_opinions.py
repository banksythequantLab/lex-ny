"""
embed_opinions.py - semantic embeddings for all NY opinions.

Embeds case_name + cleaned ai_summary via Ollama /api/embed (batched, ~100/s).
Inserts into embeddings table (content_kind='opinion'), resume-safe via
ON CONFLICT (content_kind, content_id, chunk_index) DO NOTHING.

Usage:
  python embed_opinions.py            # all opinions, batch 2048
  python embed_opinions.py --batch=1024
"""
import sys, os, re, time, json, html
import urllib.request
import psycopg2
from psycopg2.extras import execute_values

PG = dict(host='localhost', port=5432, user='postgres', password=os.environ['PGPASSWORD'], dbname='lex')
OLLAMA = 'http://localhost:11434/api/embed'
MODEL = 'mxbai-embed-large'
BATCH = 2048
for a in sys.argv[1:]:
    if a.startswith('--batch='):
        BATCH = int(a.split('=')[1])

TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'\s+')

def clean(text):
    if not text:
        return ''
    t = TAG_RE.sub(' ', text)         # strip HTML tags
    t = html.unescape(t)
    t = t.replace('\ufffd', ' ')      # OCR replacement chars
    t = WS_RE.sub(' ', t).strip()
    return t[:440]                    # mxbai 512-token ctx; ~440 chars stays safely under

def embed_batch(texts):
    body = json.dumps({"model": MODEL, "input": texts, "keep_alive": "60m"}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={'Content-Type': 'application/json'})
    resp = json.loads(urllib.request.urlopen(req, timeout=600).read())
    return resp.get('embeddings', [])

def vec_literal(arr):
    return '[' + ','.join(repr(float(x)) for x in arr) + ']'

def main():
    # Separate connections: read (server-side cursor in its own txn) + write
    # (separate conn, so its commits don't invalidate the read cursor snapshot).
    rconn = psycopg2.connect(**PG)
    rconn.autocommit = False
    cur = rconn.cursor(name='opcur')   # server-side stream cursor
    cur.itersize = BATCH
    # Only opinions not already embedded. Anti-join.
    cur.execute("""
        SELECT o.id, o.case_name, o.ai_summary
        FROM opinions o
        WHERE NOT EXISTS (
            SELECT 1 FROM embeddings e
            WHERE e.content_kind='opinion' AND e.content_id = o.id AND e.chunk_index = 0
        )
        ORDER BY o.id
    """)

    conn = psycopg2.connect(**PG)
    conn.autocommit = False
    ins = conn.cursor()
    INSERT = """INSERT INTO embeddings (content_kind, content_id, chunk_index, chunk_text, embedding, embedding_model)
                VALUES %s ON CONFLICT (content_kind, content_id, chunk_index) DO NOTHING"""

    total = 0
    start = time.time()
    pending_ids, pending_texts = [], []

    def flush():
        nonlocal pending_ids, pending_texts, total
        if not pending_ids:
            return
        embs = embed_batch(pending_texts)
        if len(embs) != len(pending_ids):
            print(f"  WARN: got {len(embs)} embs for {len(pending_ids)} inputs; skipping batch", flush=True)
            pending_ids, pending_texts = [], []
            return
        rows = []
        for oid, txt, emb in zip(pending_ids, pending_texts, embs):
            rows.append((oid, txt, vec_literal(emb)))
        execute_values(ins, INSERT,
                       [('opinion', r[0], 0, r[1], r[2], MODEL) for r in rows],
                       template="(%s,%s,%s,%s,%s::vector,%s)", page_size=500)
        conn.commit()
        total += len(rows)
        pending_ids, pending_texts = [], []
        el = time.time() - start
        print(f"  {total:>9,} embedded ({total/el:.0f}/s)", flush=True)

    for oid, case_name, summary in cur:
        text = clean(case_name or '')
        s = clean(summary or '')
        if s:
            text = (text + '. ' + s)[:440]
        if not text:
            text = 'NY opinion ' + str(oid)
        pending_ids.append(oid)
        pending_texts.append(text)
        if len(pending_ids) >= BATCH:
            flush()

    flush()
    el = time.time() - start
    print(f"DONE. {total:,} opinions embedded in {el:.0f}s ({total/max(el,1):.0f}/s)", flush=True)
    cur.close()
    ins.close()
    conn.close()
    rconn.close()

if __name__ == '__main__':
    main()
