"""smoke_demo.py — pre-flight check for demo recording.

Runs every demo asset back-to-back, prints a one-page pass/fail report.
If any line is RED at recording time, fix it before hitting record.

Usage:
  python smoke_demo.py
  python smoke_demo.py --json  # machine-readable

Returns nonzero exit if any check fails (use in CI).
"""
import sys, json, time, urllib.request

BASE = "http://localhost:3000"
CHECKS = []

def check(name, fn):
    t0 = time.time()
    try:
        result = fn()
        ok, detail = result if isinstance(result, tuple) else (True, str(result))
    except Exception as e:
        ok, detail = False, f"EXCEPTION: {str(e)[:200]}"
    dt = int((time.time() - t0) * 1000)
    CHECKS.append({"name": name, "ok": ok, "ms": dt, "detail": detail})

def get_json(path, timeout=30):
    r = urllib.request.urlopen(BASE + path, timeout=timeout)
    return json.loads(r.read().decode("utf-8", "replace")), r.status

def post_json(path, body, timeout=120):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                  headers={"Content-Type": "application/json"})
    r = urllib.request.urlopen(req, timeout=timeout)
    return json.loads(r.read().decode("utf-8", "replace")), r.status

# 1. Static page renders
def page_loads(path, must_contain):
    r = urllib.request.urlopen(BASE + path, timeout=30)
    body = r.read().decode("utf-8", "replace")
    if r.status != 200:
        return False, f"HTTP {r.status}"
    if must_contain not in body:
        return False, f"missing '{must_contain}'"
    return True, f"{len(body)} bytes OK"

check("/", lambda: page_loads("/", "Lex.NY"))
check("/ask", lambda: page_loads("/ask", "Ask"))
check("/stats", lambda: page_loads("/stats", "Every number here is live"))
check("/search", lambda: page_loads("/search", "Find the case"))
check("/terms", lambda: page_loads("/terms", "Terms of Use"))
check("/privacy", lambda: page_loads("/privacy", "Privacy notice"))

# 2. Sponsor stats APIs all return 200
def stats_ok(path):
    d, status = get_json(path)
    return status == 200, f"health={str(d.get('health',''))[:60]}"

check("/api/corpus-stats", lambda: stats_ok("/api/corpus-stats"))
check("/api/algolia-stats", lambda: stats_ok("/api/algolia-stats"))
check("/api/graph-stats", lambda: stats_ok("/api/graph-stats"))
check("/api/speechmatics-stats", lambda: stats_ok("/api/speechmatics-stats"))
check("/api/triggerware-stats", lambda: stats_ok("/api/triggerware-stats"))
check("/api/bright-data-stats", lambda: stats_ok("/api/bright-data-stats"))
check("/api/llm-stats", lambda: stats_ok("/api/llm-stats"))

# 3. Corpus numbers (live truth)
def corpus_numbers():
    d, _ = get_json("/api/corpus-stats")
    pg = d.get("postgres", {})
    if not pg.get("ok"):
        return False, "postgres not ok"
    return True, (f"records={pg['total_legal_records']:,} | "
                  f"opinions={pg['opinions']:,} | "
                  f"citations={pg['opinion_citations']:,}")
check("corpus counts", corpus_numbers)

# 4. Graph numbers
def graph_numbers():
    d, _ = get_json("/api/graph-stats")
    s = d.get("stats", {})
    nc = s.get("node_counts", {})
    rc = s.get("relationship_counts", {})
    if not s.get("configured"):
        return False, "neo4j not configured"
    return True, f"nodes={s.get('total_nodes',0):,} | rels={s.get('total_relationships',0):,} | CITES={rc.get('CITES',0):,}"
check("graph counts", graph_numbers)

# 5. Top-cited opinions populated
def top_cited():
    d, _ = get_json("/api/graph-stats")
    top = d.get("stats", {}).get("top_cited_opinions", [])
    if len(top) == 0:
        return False, "top_cited_opinions empty"
    first = top[0]
    return True, f"top: {first.get('case_name','?')[:50]} ({first.get('times_cited','?')} cites)"
check("top-cited query", top_cited)

# 6. Algolia federated search returns hits
def algolia_search():
    d, _ = post_json("/api/search", {"query": "consumer protection", "hitsPerPage": 5}, timeout=30)
    hits = d.get("hits", []) if "hits" in d else d.get("results", [])
    return len(hits) > 0, f"{len(hits)} hits"
check("algolia search 'consumer protection'", algolia_search)

# 7. Semantic case search returns hits with cited_by_count
def semantic_search():
    d, _ = get_json("/api/search/cases?q=summary+judgment&limit=5", timeout=60)
    hits = d.get("results", [])
    if not hits:
        return False, "no results"
    top = hits[0]
    return True, f"{len(hits)} hits | top: {top['case_name'][:40]} sim={top['similarity']:.2f} cites={top['cited_by_count']}"
check("semantic search 'summary judgment'", semantic_search)

# 8. End-to-end /api/ask (the big one)
def ask_test(q):
    d, _ = post_json("/api/ask", {"question": q, "use_live_serp": True}, timeout=120)
    cits = d.get("citations", [])
    by_kind = {}
    for c in cits:
        by_kind[c.get("kind","?")] = by_kind.get(c.get("kind","?"),0)+1
    detail = (f"total={len(cits)} | opinions={by_kind.get('opinion',0)} | "
              f"statutes={by_kind.get('statute',0)} | live_web={by_kind.get('live_web',0)} | "
              f"web={d.get('web_data_provider','none')} | "
              f"graph={d.get('graph_provider','none')} | "
              f"{d.get('total_duration_ms',0)}ms")
    # Must have opinions AND statutes AND BD
    ok = (by_kind.get('opinion',0) > 0 and
          by_kind.get('statute',0) > 0 and
          d.get('web_data_provider') == 'brightdata')
    return ok, detail
check("/api/ask GBS 349", lambda: ask_test("What does General Business Law 349 prohibit?"))

# === Report ===
print()
print("=" * 78)
print(" LEX.NY DEMO SMOKE TEST")
print("=" * 78)
passed = sum(1 for c in CHECKS if c["ok"])
failed = sum(1 for c in CHECKS if not c["ok"])
print(f"  {passed}/{len(CHECKS)} passed · {failed} failed")
print()
for c in CHECKS:
    icon = "OK  " if c["ok"] else "FAIL"
    print(f"  [{icon}] {c['ms']:>6}ms  {c['name']:38s}  {c['detail'][:90]}")

if "--json" in sys.argv:
    print()
    print(json.dumps(CHECKS, indent=2))

sys.exit(0 if failed == 0 else 1)
