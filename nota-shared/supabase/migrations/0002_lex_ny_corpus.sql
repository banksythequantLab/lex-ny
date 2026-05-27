-- ============================================================
--  Lex.NY - NY law corpus schema
--
--  This migration adds the case-law and statute corpus tables
--  that power lex.nota.lawyer. Designed to layer on top of the
--  existing 0001 schema (auth, filings, payments).
--
--  Storage model:
--    - opinions are stored once with full text
--    - judges are normalized into a separate table with M:N join
--    - statutes are stored hierarchically (parent_id self-FK)
--    - embeddings live in their own table keyed by content_id+kind
--      so we can re-embed without touching source rows
--
--  pgvector is required. Supabase has it pre-installed; for
--  self-hosted Postgres you'd: CREATE EXTENSION IF NOT EXISTS vector;
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for fuzzy keyword search


-- ---------------------------------------------------------------
--  Courts (small reference table - 5-10 rows total for NY scope)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courts (
  id              TEXT PRIMARY KEY,                   -- 'ny', 'nyappdiv1', etc.
  full_name       TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  citation_string TEXT NOT NULL,                       -- 'NY' or 'AD1' etc.
  url             TEXT,
  level           TEXT NOT NULL CHECK (level IN ('appellate_high', 'appellate_mid', 'trial', 'specialty')),
  established     DATE
);

-- Seed the NY appellate courts we'll be scraping
INSERT INTO courts (id, full_name, short_name, citation_string, url, level) VALUES
  ('ny',         'New York Court of Appeals',                          'NY CoA',  'NY',  'https://www.nycourts.gov/ctapps/',          'appellate_high'),
  ('nyappdiv1',  'New York Supreme Court, Appellate Division, First',  'AD1',     'AD1', 'https://www.nycourts.gov/courts/ad1/',      'appellate_mid'),
  ('nyappdiv2',  'New York Supreme Court, Appellate Division, Second', 'AD2',     'AD2', 'https://www.nycourts.gov/courts/ad2/',      'appellate_mid'),
  ('nyappdiv3',  'New York Supreme Court, Appellate Division, Third',  'AD3',     'AD3', 'https://www.nycourts.gov/courts/ad3/',      'appellate_mid'),
  ('nyappdiv4',  'New York Supreme Court, Appellate Division, Fourth', 'AD4',     'AD4', 'https://www.nycourts.gov/courts/ad4/',      'appellate_mid')
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------
--  Judges (normalized so we can ask "all decisions by Judge X")
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  normalized_name TEXT NOT NULL,                       -- lowercase, no titles, "wilson rowan d"
  cl_person_id    INTEGER UNIQUE,                      -- CourtListener person.id if known
  court_id        TEXT REFERENCES courts(id),          -- primary court they sit on (nullable, judges sit on multiple)
  bio_url         TEXT,
  date_of_birth   DATE,
  start_date      DATE,
  end_date        DATE,
  source_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS judges_normalized_name_idx ON judges (normalized_name);
CREATE INDEX IF NOT EXISTS judges_court_idx ON judges (court_id);
CREATE INDEX IF NOT EXISTS judges_cl_person_id_idx ON judges (cl_person_id);


-- ---------------------------------------------------------------
--  Opinions (the case-law corpus)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opinions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source provenance
  source              TEXT NOT NULL CHECK (source IN ('courtlistener', 'justia', 'nycourts_gov', 'manual')),
  source_id           TEXT NOT NULL,                  -- e.g. CL cluster_id, Justia slug
  source_url          TEXT NOT NULL,
  scraper_provider    TEXT,                            -- 'brightdata' | 'nimble' | 'direct' (set by ingester)
  scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Court / case metadata
  court_id            TEXT NOT NULL REFERENCES courts(id),
  case_name           TEXT NOT NULL,
  case_name_short     TEXT,                            -- normalized for citation lookup
  citation            TEXT,                            -- '2026 NY Slip Op 02437'
  parallel_citations  TEXT[],                          -- ['N.Y. 2d 555', '180 N.E.2d 423']
  docket_number       TEXT,

  -- Date facts
  decision_date       DATE NOT NULL,
  argued_date         DATE,

  -- Disposition / type
  decision_type       TEXT,                            -- 'majority', 'dissent', 'concurrence', 'per_curiam', 'combined'
  precedential_status TEXT,                            -- 'published', 'unpublished', 'errata', 'in-chambers'
  page_count          INTEGER,

  -- Opinion text (we keep both because they're useful for different things)
  text_plain          TEXT,                            -- pre-stripped plain text for embeddings + display
  text_html           TEXT,                            -- 'html_with_citations' from CL when available

  -- LLM-derived summaries (populated by a separate step, not the scraper)
  ai_summary          TEXT,                            -- 1-paragraph plain-English summary
  ai_holding          TEXT,                            -- 1-2 sentence holding
  ai_topics           TEXT[],                          -- ['contract law', 'arbitration', 'CPLR 7503']

  -- Quality / cleanup
  cleanup_status      TEXT NOT NULL DEFAULT 'raw' CHECK (cleanup_status IN ('raw', 'cleaned', 'ai_enriched', 'verified')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS opinions_court_idx ON opinions (court_id);
CREATE INDEX IF NOT EXISTS opinions_decision_date_idx ON opinions (decision_date DESC);
CREATE INDEX IF NOT EXISTS opinions_citation_idx ON opinions (citation);
CREATE INDEX IF NOT EXISTS opinions_case_name_trgm_idx ON opinions USING gin (case_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS opinions_text_trgm_idx ON opinions USING gin (text_plain gin_trgm_ops);


-- ---------------------------------------------------------------
--  M:N - which judges sat on which opinion
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opinion_judges (
  opinion_id  UUID NOT NULL REFERENCES opinions(id) ON DELETE CASCADE,
  judge_id    UUID NOT NULL REFERENCES judges(id),
  role        TEXT NOT NULL DEFAULT 'panel' CHECK (role IN ('author', 'panel', 'concurring', 'dissenting', 'non_participating')),
  PRIMARY KEY (opinion_id, judge_id, role)
);

CREATE INDEX IF NOT EXISTS opinion_judges_judge_idx ON opinion_judges (judge_id);


-- ---------------------------------------------------------------
--  Citation graph - opinion A cites opinion B
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opinion_citations (
  citing_id   UUID NOT NULL REFERENCES opinions(id) ON DELETE CASCADE,
  cited_id    UUID NOT NULL REFERENCES opinions(id),
  cite_count  INTEGER NOT NULL DEFAULT 1,
  -- nullable: sometimes we capture a citation string without linking to a known opinion
  cite_string TEXT,
  PRIMARY KEY (citing_id, cited_id)
);

CREATE INDEX IF NOT EXISTS opinion_citations_cited_idx ON opinion_citations (cited_id);


-- ---------------------------------------------------------------
--  Statutes (NY Consolidated Laws + NYC Admin Code)
--
--  Hierarchical: a statute_section may have a parent_id pointing
--  to its containing article/title/chapter. Top-level (a whole
--  law like 'EDN') has parent_id = NULL.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statutes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source provenance
  source        TEXT NOT NULL CHECK (source IN ('ny_senate_openleg', 'nyc_amlegal', 'nyc_legistar')),
  scraper_provider TEXT,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url    TEXT NOT NULL,

  -- Identification
  jurisdiction  TEXT NOT NULL CHECK (jurisdiction IN ('NY', 'NYC')),
  law_id        TEXT NOT NULL,                       -- 'EDN', 'TAX', 'NYC_ADMIN', etc.
  law_name      TEXT NOT NULL,                       -- 'Education Law'
  law_type      TEXT,                                 -- 'CONSOLIDATED', 'UNCONSOLIDATED', 'NYC_LOCAL', etc.

  -- Hierarchy
  location_id   TEXT NOT NULL,                        -- '-CH16', 'A2', '100', etc.
  doc_type      TEXT NOT NULL,                        -- 'CHAPTER', 'ARTICLE', 'TITLE', 'SECTION'
  doc_level_id  TEXT,                                 -- '16', '2', '100'
  title         TEXT,
  text          TEXT,                                 -- statute body (only meaningful for SECTION-level docs)

  -- Temporal
  active_date   DATE,
  repealed      BOOLEAN NOT NULL DEFAULT FALSE,
  repealed_date DATE,

  -- Hierarchy via self-FK
  parent_id     UUID REFERENCES statutes(id) ON DELETE CASCADE,
  sequence_no   INTEGER,

  -- LLM enrichment
  ai_summary    TEXT,                                 -- plain-English summary of the statute
  ai_topics     TEXT[],

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source, jurisdiction, law_id, location_id)
);

CREATE INDEX IF NOT EXISTS statutes_law_idx ON statutes (jurisdiction, law_id);
CREATE INDEX IF NOT EXISTS statutes_parent_idx ON statutes (parent_id);
CREATE INDEX IF NOT EXISTS statutes_doc_type_idx ON statutes (doc_type);
CREATE INDEX IF NOT EXISTS statutes_text_trgm_idx ON statutes USING gin (text gin_trgm_ops);


-- ---------------------------------------------------------------
--  Embeddings table
--
--  We use one table for all embeddable content (opinions + statutes)
--  with a content_kind discriminator. This lets one vector query
--  return both case law and statute hits in a single index scan.
--
--  Using Ollama mxbai-embed-large (local) (1536 dims). Free (local GPU)
--  and good enough for legal retrieval. We can swap to Voyage law-2 (cloud) or nomic-embed-text (Ollama)
--  later by reindexing.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_kind  TEXT NOT NULL CHECK (content_kind IN ('opinion', 'statute')),
  content_id    UUID NOT NULL,                       -- opinions.id or statutes.id
  chunk_index   INTEGER NOT NULL DEFAULT 0,           -- 0 for whole-doc, >0 for chunks
  chunk_text    TEXT NOT NULL,                        -- the text that was embedded
  embedding     vector(1024) NOT NULL,                -- text-embedding-3-small dims
  embedding_model TEXT NOT NULL DEFAULT 'mxbai-embed-large',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (content_kind, content_id, chunk_index)
);

-- IVFFlat index for fast approximate nearest-neighbor search.
-- 'lists' should be ~ sqrt(num rows). 100 is fine up to ~10K embeddings.
-- For Hackathon scale (~5K opinions = ~25K chunks) this works; revisit at 1M+.
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS embeddings_content_idx ON embeddings (content_kind, content_id);


-- ---------------------------------------------------------------
--  RLS policies
--
--  Corpus tables (opinions, judges, statutes, embeddings, courts) are
--  PUBLIC READ - anyone can search legal data. Writes are service-role
--  only (scrapers run server-side).
-- ---------------------------------------------------------------
ALTER TABLE courts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinion_judges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinion_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings        ENABLE ROW LEVEL SECURITY;

-- Public read on all corpus tables
CREATE POLICY "public read courts" ON courts FOR SELECT USING (TRUE);
CREATE POLICY "public read judges" ON judges FOR SELECT USING (TRUE);
CREATE POLICY "public read opinions" ON opinions FOR SELECT USING (TRUE);
CREATE POLICY "public read opinion_judges" ON opinion_judges FOR SELECT USING (TRUE);
CREATE POLICY "public read opinion_citations" ON opinion_citations FOR SELECT USING (TRUE);
CREATE POLICY "public read statutes" ON statutes FOR SELECT USING (TRUE);
-- embeddings are read internally by the API route, no public SELECT needed
-- but we allow it for transparency / reproducible research
CREATE POLICY "public read embeddings" ON embeddings FOR SELECT USING (TRUE);


-- ---------------------------------------------------------------
--  Search queries log
--
--  Every search question is logged for:
--    - Hackathon "Proof of Usefulness" - shows real usage
--    - Future model fine-tuning
--    - User analytics
--
--  Logged anonymously unless user is authenticated.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lex_search_queries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question      TEXT NOT NULL,
  answer        TEXT,
  cited_opinion_ids UUID[],
  cited_statute_ids UUID[],
  llm_model     TEXT,
  web_data_provider TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lex_search_queries_user_idx ON lex_search_queries (user_id);
CREATE INDEX IF NOT EXISTS lex_search_queries_created_idx ON lex_search_queries (created_at DESC);

ALTER TABLE lex_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read their own queries" ON lex_search_queries
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);


-- ---------------------------------------------------------------
--  Helper: hybrid search function
--
--  Combines pgvector cosine similarity with trigram keyword match.
--  Returns top N opinions matching a question + embedding.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION lex_hybrid_search_opinions(
  query_embedding vector(1024),
  query_text TEXT,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  opinion_id    UUID,
  case_name     TEXT,
  citation      TEXT,
  court_id      TEXT,
  decision_date DATE,
  ai_summary    TEXT,
  ai_holding    TEXT,
  vector_score  REAL,
  keyword_score REAL,
  combined_score REAL
)
LANGUAGE SQL STABLE
AS $$
  WITH vector_hits AS (
    SELECT
      o.id,
      1 - (e.embedding <=> query_embedding) AS vector_score
    FROM embeddings e
    JOIN opinions o ON o.id = e.content_id
    WHERE e.content_kind = 'opinion'
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_limit * 3
  ),
  keyword_hits AS (
    SELECT
      o.id,
      similarity(o.case_name || ' ' || COALESCE(o.text_plain, ''), query_text) AS keyword_score
    FROM opinions o
    WHERE o.case_name % query_text OR o.text_plain % query_text
    LIMIT match_limit * 3
  ),
  combined AS (
    SELECT
      COALESCE(v.id, k.id) AS opinion_id,
      COALESCE(v.vector_score, 0) AS vector_score,
      COALESCE(k.keyword_score, 0) AS keyword_score,
      COALESCE(v.vector_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3 AS combined_score
    FROM vector_hits v
    FULL OUTER JOIN keyword_hits k ON v.id = k.id
  )
  SELECT
    c.opinion_id,
    o.case_name,
    o.citation,
    o.court_id,
    o.decision_date,
    o.ai_summary,
    o.ai_holding,
    c.vector_score::REAL,
    c.keyword_score::REAL,
    c.combined_score::REAL
  FROM combined c
  JOIN opinions o ON o.id = c.opinion_id
  ORDER BY c.combined_score DESC
  LIMIT match_limit;
$$;


CREATE OR REPLACE FUNCTION lex_hybrid_search_statutes(
  query_embedding vector(1024),
  query_text TEXT,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  statute_id    UUID,
  law_id        TEXT,
  law_name      TEXT,
  location_id   TEXT,
  doc_type      TEXT,
  title         TEXT,
  text          TEXT,
  jurisdiction  TEXT,
  vector_score  REAL,
  keyword_score REAL,
  combined_score REAL
)
LANGUAGE SQL STABLE
AS $$
  WITH vector_hits AS (
    SELECT
      s.id,
      1 - (e.embedding <=> query_embedding) AS vector_score
    FROM embeddings e
    JOIN statutes s ON s.id = e.content_id
    WHERE e.content_kind = 'statute' AND s.doc_type = 'SECTION'
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_limit * 3
  ),
  keyword_hits AS (
    SELECT
      s.id,
      similarity(COALESCE(s.title, '') || ' ' || COALESCE(s.text, ''), query_text) AS keyword_score
    FROM statutes s
    WHERE s.doc_type = 'SECTION' AND (s.title % query_text OR s.text % query_text)
    LIMIT match_limit * 3
  ),
  combined AS (
    SELECT
      COALESCE(v.id, k.id) AS statute_id,
      COALESCE(v.vector_score, 0) AS vector_score,
      COALESCE(k.keyword_score, 0) AS keyword_score,
      COALESCE(v.vector_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3 AS combined_score
    FROM vector_hits v
    FULL OUTER JOIN keyword_hits k ON v.id = k.id
  )
  SELECT
    c.statute_id,
    s.law_id,
    s.law_name,
    s.location_id,
    s.doc_type,
    s.title,
    s.text,
    s.jurisdiction,
    c.vector_score::REAL,
    c.keyword_score::REAL,
    c.combined_score::REAL
  FROM combined c
  JOIN statutes s ON s.id = c.statute_id
  ORDER BY c.combined_score DESC
  LIMIT match_limit;
$$;
