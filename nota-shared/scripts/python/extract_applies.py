"""extract_applies.py

Stream the 50GB CourtListener opinions text dump, regex-extract NY statute
citations per opinion, write to opinion_applies_statute table. Then sync
that as (:Opinion)-[:APPLIES]->(:Statute) edges in Neo4j.

Strategy:
  1. We already have a opinion_to_cluster.json map from the earlier Stage 1
     work. Skip it - opinions-*.csv has cluster_id directly.
  2. We have opinions table keyed by source_id = cluster_id.
  3. Filter rows whose cluster_id is in our NY opinions set.
  4. For each NY opinion, regex-extract statute citations.
  5. Resolve each citation to a Statute (law_id, location_id) pair that
     exists in our statutes table.
  6. Bulk insert.

Citation patterns we extract (loose, high-recall, dedupe later):
  Penal Law § 400.00           -> ('PEN', '400.00')
  Penal L § 400                -> ('PEN', '400')
  CPLR 3211                    -> ('CVP', '3211')
  CPLR 3211(a)(7)              -> ('CVP', '3211')        (paragraph stripped)
  GBL § 349 / General Business Law § 349 -> ('GBS', '349')
  RPAPL 711                    -> ('RPA', '711')
  EPTL 3-3.1                   -> ('EPT', '3-3.1')
  Labor Law § 240              -> ('LAB', '240')
  VTL § 1192 / Vehicle and Traffic Law § 1192 -> ('VAT', '1192')
  ... (full list below)

Uses backslash-escape CSV reader (CL opinions file has \\\" inside text fields).

Resume-safe: skips opinions already in opinion_applies_statute.
"""
import sys, os, re, time, bz2, csv, html
import psycopg2
from psycopg2.extras import execute_values

# ============================================================
# NY law -> CourtListener law_id mapping
# ============================================================
# Maps citation phrase keywords (lowercased) to the law_id used in our
# statutes table. This is the high-recall list of NY law name aliases.
LAW_ALIASES = {
    # Penal
    'penal law': 'PEN', 'penal l.': 'PEN', 'penal l ': 'PEN', 'p.l.': 'PEN',
    # Civil Practice Law and Rules
    'cplr': 'CVP', 'civil practice law and rules': 'CVP', 'c.p.l.r.': 'CVP',
    # General Business
    'general business law': 'GBS', 'gbl': 'GBS', 'gen. bus. law': 'GBS', 'g.b.l.': 'GBS',
    # Family Court Act
    'family court act': 'FCT', 'fca': 'FCT', 'f.c.a.': 'FCT',
    # Domestic Relations
    'domestic relations law': 'DOM', 'drl': 'DOM', 'd.r.l.': 'DOM',
    # Real Property
    'real property law': 'RPP', 'rpl': 'RPP', 'r.p.l.': 'RPP',
    'real property actions and proceedings law': 'RPA', 'rpapl': 'RPA', 'r.p.a.p.l.': 'RPA',
    # Business Corporation
    'business corporation law': 'BSC', 'bcl': 'BSC', 'b.c.l.': 'BSC',
    # Limited Liability
    'limited liability company law': 'LLC',
    # Insurance
    'insurance law': 'ISC', 'ins. law': 'ISC',
    # Workers Comp
    'workers compensation law': 'WKC', 'workers\u2019 compensation law': 'WKC',
    # Labor
    'labor law': 'LAB',
    # Vehicle & Traffic
    'vehicle and traffic law': 'VAT', 'vtl': 'VAT', 'v.t.l.': 'VAT',
    # Public Health
    'public health law': 'PBH', 'phl': 'PBH', 'p.h.l.': 'PBH',
    # Education
    'education law': 'EDN',
    # Banking
    'banking law': 'BNK',
    # Tax
    'tax law': 'TAX',
    # EPTL
    'estates powers and trusts law': 'EPT', 'eptl': 'EPT', 'e.p.t.l.': 'EPT',
    # Executive
    'executive law': 'EXC',
    # General Municipal
    'general municipal law': 'GMU', 'gml': 'GMU', 'gen. mun. law': 'GMU',
    # Town
    'town law': 'TWN',
    # Village
    'village law': 'VIL',
    # Public Officers
    'public officers law': 'PBO', 'pol': 'PBO',
    # Election
    'election law': 'ELN',
    # Judiciary
    'judiciary law': 'JUD',
    # Mental Hygiene
    'mental hygiene law': 'MHY', 'mhl': 'MHY',
    # Social Services
    'social services law': 'SOS', 'ssl': 'SOS',
    # Environmental Conservation
    'environmental conservation law': 'ENV', 'ecl': 'ENV',
    # Agriculture and Markets
    'agriculture and markets law': 'AGM',
    # Surrogate's Court Procedure Act
    'surrogate\u2019s court procedure act': 'SCP', "surrogate's court procedure act": 'SCP', 'scpa': 'SCP',
    # Uniform Commercial Code
    'uniform commercial code': 'UCC', 'u.c.c.': 'UCC',
    # General Obligations
    'general obligations law': 'GOB', 'gol': 'GOB',
    # Criminal Procedure
    'criminal procedure law': 'CPL', 'cpl': 'CPL',
    # Correction
    'correction law': 'COR',
    # Civil Service
    'civil service law': 'CVS', 'csl': 'CVS',
}
# Build a master regex of ALL aliases (longest first so 'Penal Law' wins over 'Penal L')
ALIAS_KEYS = sorted(LAW_ALIASES.keys(), key=len, reverse=True)
# Section number patterns:
#   §, sec., sec, section, s.    followed by digits with optional .number / -letter / -number
NUM_PAT = r'\d+(?:[.\-][0-9a-z]+)*'  # 400.00, 1192, 3-3.1, 240-d
SEPARATOR_PAT = r'(?:\s*(?:\xa7|\xa7\xa7|sec(?:tion)?s?\.?|s\.|\xa7)?\s*)'
def build_master_regex():
    alt = '|'.join(re.escape(k) for k in ALIAS_KEYS)
    # The pattern: alias, then loose stuff, then section marker, then number
    # We need to keep matching reasonable distance - within 60 chars of the alias.
    pat = (
        r'(?P<alias>(?:' + alt + r'))'
        r'(?P<gap>[^\n]{0,40}?)'
        r'(?:\xa7|\u00a7|\xa7\xa7|sec(?:tion)?s?\.?|s\.)\s*'
        r'(?P<num>' + NUM_PAT + r')'
    )
    return re.compile(pat, re.IGNORECASE)

# Simpler back-up pattern for abbreviations that omit the section symbol
# e.g. "CPLR 3211" with no §
ABBREV_PAT = re.compile(
    r'\b(?P<alias>CPLR|RPAPL|EPTL|GBL|VTL|DRL|RPL|RPA|BCL|GML|PHL|EPT|MHL|SSL|ECL|CPL|GOL|VTL|CSL|FCA|POL|SCPA|UCC)\b'
    r'\s+(?P<num>' + NUM_PAT + r')',
    re.IGNORECASE
)
# Map upper-case abbrevs to law_ids
ABBREV_LAW = {
    'CPLR': 'CVP', 'RPAPL': 'RPA', 'EPTL': 'EPT', 'GBL': 'GBS', 'VTL': 'VAT',
    'DRL': 'DOM', 'RPL': 'RPP', 'RPA': 'RPA', 'BCL': 'BSC', 'GML': 'GMU',
    'PHL': 'PBH', 'EPT': 'EPT', 'MHL': 'MHY', 'SSL': 'SOS', 'ECL': 'ENV',
    'CPL': 'CPL', 'GOL': 'GOB', 'CSL': 'CVS', 'FCA': 'FCT', 'POL': 'PBO',
    'SCPA': 'SCP', 'UCC': 'UCC',
}

TAG_RE = re.compile(r'<[^>]+>')

def clean(text):
    """Strip HTML, decode entities, collapse whitespace."""
    if not text:
        return ''
    t = TAG_RE.sub(' ', text)
    t = html.unescape(t)
    return t

MASTER_RE = build_master_regex()

def extract_citations(text):
    """Return list of (law_id, normalized_location_id) tuples found in text.
    Dedupes within the opinion."""
    if not text:
        return []
    cleaned = clean(text)
    out = set()

    # Main pattern: "Penal Law § 400.00"
    for m in MASTER_RE.finditer(cleaned):
        alias = m.group('alias').lower().rstrip()
        law_id = LAW_ALIASES.get(alias)
        if not law_id:
            # Try without trailing 's' / period
            law_id = LAW_ALIASES.get(alias.rstrip('s.').strip())
        if not law_id:
            continue
        num = m.group('num').strip().rstrip('.')
        if num:
            out.add((law_id, num))

    # Abbreviation pattern (no §): "CPLR 3211"
    for m in ABBREV_PAT.finditer(cleaned):
        alias = m.group('alias').upper()
        law_id = ABBREV_LAW.get(alias)
        if not law_id:
            continue
        num = m.group('num').strip().rstrip('.')
        if num:
            out.add((law_id, num))

    return list(out)


def main():
    src = r'B:\nota_lawyer_hackathon\cl-bulk\opinions-2026-03-31.csv.bz2'
    if not os.path.exists(src):
        print(f"FATAL: {src} not found. Wait for download to finish.")
        sys.exit(1)

    sz_gb = os.path.getsize(src) / 1024**3
    print(f"Source: {src} ({sz_gb:.1f} GB)")

    PG = dict(host='localhost', port=5432, user='postgres',
              password=os.environ['PGPASSWORD'], dbname='lex')

    # Load NY opinion cluster_id -> opinion_uuid map (1.32M rows)
    print("Loading NY opinion map from Postgres...")
    conn = psycopg2.connect(**PG)
    cur = conn.cursor()
    cur.execute("SELECT source_id, id FROM opinions WHERE source_id IS NOT NULL")
    cluster_to_uuid = {}
    for src_id, uuid in cur.fetchall():
        cluster_to_uuid[str(src_id)] = uuid
    print(f"  loaded {len(cluster_to_uuid):,} NY opinion cluster IDs")

    # Load statutes for citation resolution
    print("Loading statutes for citation resolution...")
    cur.execute("SELECT law_id, location_id, citation_key FROM statutes WHERE doc_type='SECTION'")
    statute_key = {}
    for law_id, loc_id, ckey in cur.fetchall():
        # Index by (law_id, location_id) AND (law_id, location_id without parens)
        statute_key[(law_id, str(loc_id))] = ckey
    print(f"  loaded {len(statute_key):,} statute sections")

    # Create the join table if needed
    cur.execute("""
        CREATE TABLE IF NOT EXISTS opinion_applies_statute (
            opinion_id  UUID NOT NULL REFERENCES opinions(id),
            citation_key TEXT NOT NULL,
            law_id      TEXT NOT NULL,
            location_id TEXT NOT NULL,
            PRIMARY KEY (opinion_id, citation_key)
        )
    """)
    conn.commit()

    # Resume-safe: skip opinions already processed
    cur.execute("SELECT DISTINCT opinion_id FROM opinion_applies_statute")
    done_set = set(row[0] for row in cur.fetchall())
    print(f"  {len(done_set):,} opinions already processed (will skip)")

    # Stream the bz2
    print(f"\nStreaming {src}...")
    start = time.time()
    rows_seen = 0
    ny_seen = 0
    edges_inserted = 0
    no_match = 0

    # Open the bz2 as text, with the same backslash-escape CSV options
    # that worked in Stage 1.
    csv.field_size_limit(sys.maxsize)

    write_conn = psycopg2.connect(**PG)
    write_cur = write_conn.cursor()

    batch = []
    BATCH_SIZE = 5000

    with bz2.open(src, mode='rt', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.reader(f, doublequote=False, escapechar='\\')
        header = next(reader)
        # Find column indices we care about
        col_idx = {name: i for i, name in enumerate(header)}
        # CL opinions table columns include: id, cluster_id, plain_text, html, html_lawbox, html_columbia, etc.
        cluster_col = col_idx.get('cluster_id', col_idx.get('cluster', -1))
        text_cols = [col_idx[c] for c in ['plain_text', 'html', 'html_lawbox', 'html_columbia', 'html_with_citations', 'xml_harvard'] if c in col_idx]
        print(f"  cluster col index: {cluster_col}, text cols: {text_cols}")

        if cluster_col < 0 or not text_cols:
            print("FATAL: required columns missing from CSV header")
            sys.exit(1)

        for row in reader:
            rows_seen += 1
            if rows_seen % 250_000 == 0:
                el = time.time() - start
                print(f"  {rows_seen:>10,} rows scanned, {ny_seen:>9,} NY, "
                      f"{edges_inserted:>9,} APPLIES edges ({rows_seen/el:.0f}/s)",
                      flush=True)

            try:
                cluster_id = row[cluster_col].strip()
            except IndexError:
                continue
            if not cluster_id:
                continue

            opinion_uuid = cluster_to_uuid.get(cluster_id)
            if not opinion_uuid:
                continue  # not a NY opinion
            ny_seen += 1

            if opinion_uuid in done_set:
                continue

            # Pull text - prefer plain_text, fall back to other columns
            text = ''
            for ci in text_cols:
                try:
                    cell = row[ci]
                    if cell and len(cell) > len(text):
                        text = cell
                        break  # first one with content wins
                except IndexError:
                    pass

            if not text or len(text) < 50:
                no_match += 1
                continue

            cites = extract_citations(text)
            if not cites:
                no_match += 1
                continue

            for (law_id, loc_id) in cites:
                ckey = statute_key.get((law_id, loc_id))
                if not ckey:
                    # Try without subdivisions/sub-letters
                    base_num = re.match(r'(\d+(?:\.\d+)?)', loc_id)
                    if base_num:
                        ckey = statute_key.get((law_id, base_num.group(1)))
                if not ckey:
                    continue  # citation resolves to no statute we know
                batch.append((opinion_uuid, ckey, law_id, loc_id))

            if len(batch) >= BATCH_SIZE:
                execute_values(
                    write_cur,
                    "INSERT INTO opinion_applies_statute (opinion_id, citation_key, law_id, location_id) VALUES %s ON CONFLICT DO NOTHING",
                    batch
                )
                write_conn.commit()
                edges_inserted += len(batch)
                batch.clear()

    # Final flush
    if batch:
        execute_values(
            write_cur,
            "INSERT INTO opinion_applies_statute (opinion_id, citation_key, law_id, location_id) VALUES %s ON CONFLICT DO NOTHING",
            batch
        )
        write_conn.commit()
        edges_inserted += len(batch)

    el = time.time() - start
    print(f"\nDONE.")
    print(f"  rows scanned:      {rows_seen:>10,}")
    print(f"  NY opinions seen:  {ny_seen:>10,}")
    print(f"  APPLIES inserted:  {edges_inserted:>10,}")
    print(f"  no-match/no-text:  {no_match:>10,}")
    print(f"  elapsed:           {el:.0f}s  ({rows_seen/el:.0f}/s)")

    # Final count
    write_cur.execute("SELECT COUNT(*) FROM opinion_applies_statute")
    total = write_cur.fetchone()[0]
    write_cur.execute("SELECT COUNT(DISTINCT opinion_id) FROM opinion_applies_statute")
    distinct_ops = write_cur.fetchone()[0]
    write_cur.execute("SELECT COUNT(DISTINCT citation_key) FROM opinion_applies_statute")
    distinct_st = write_cur.fetchone()[0]
    print(f"\nTable totals: {total:,} edges across {distinct_ops:,} opinions -> {distinct_st:,} distinct statutes")

    conn.close()
    write_conn.close()


if __name__ == '__main__':
    main()
