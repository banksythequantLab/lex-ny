"""auto_applies.py

Polls for the download's .DONE marker, then runs:
  1. extract_applies.py  - stream the 50GB bz2, write opinion_applies_statute
  2. sync_applies_neo4j.py - push APPLIES edges to AuraDB

Detached background job. Survives session end. Writes auto_applies.log.

Estimated total time after download finishes:
  extract: 2-4 hours (regex over 10M opinion text bodies, ~750/s)
  sync:    10-20 min (bulk MERGE at ~10K/s, depends on edge count)
"""
import os, time, subprocess, sys

DONE_MARKER = r'B:\nota_lawyer_hackathon\cl-bulk\opinions-2026-03-31.DONE'
LOG = r'B:\nota_lawyer_hackathon\cl-bulk\auto_applies.log'

def log(msg):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def main():
    log("Watcher started. Waiting for download to complete...")
    waited = 0
    while not os.path.exists(DONE_MARKER):
        time.sleep(60)
        waited += 60
        if waited % 600 == 0:
            log(f"  still waiting ({waited//60}m elapsed)...")

    log("DOWNLOAD COMPLETE marker found. Starting extract_applies.py...")
    time.sleep(15)  # give the file system a moment

    env = dict(os.environ)
    # Caller must set PGPASSWORD in env before launching this script.

    # Stage 1: extract APPLIES edges into Postgres
    log("=== EXTRACT START ===")
    t0 = time.time()
    r = subprocess.run(
        [sys.executable, '-u', r'B:\nota_lawyer_hackathon\cl-bulk\extract_applies.py'],
        env=env,
        stdout=open(r'B:\nota_lawyer_hackathon\cl-bulk\extract_applies.log', 'w'),
        stderr=subprocess.STDOUT,
    )
    log(f"=== EXTRACT DONE in {(time.time()-t0)/60:.1f} min, exit code {r.returncode} ===")

    if r.returncode != 0:
        log("Extract failed - aborting.")
        return

    # Stage 2: sync to Neo4j
    log("=== SYNC START ===")
    t0 = time.time()
    r = subprocess.run(
        [sys.executable, '-u', r'B:\nota_lawyer_hackathon\cl-bulk\sync_applies_neo4j.py'],
        env=env,
        stdout=open(r'B:\nota_lawyer_hackathon\cl-bulk\sync_applies.log', 'w'),
        stderr=subprocess.STDOUT,
    )
    log(f"=== SYNC DONE in {(time.time()-t0)/60:.1f} min, exit code {r.returncode} ===")

    log("ALL DONE. top_applied_statutes should now be populated.")

if __name__ == '__main__':
    main()
