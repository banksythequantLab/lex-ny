-- Just the statutes function
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
AS $func$
  WITH ann AS (
    SELECT
      e.content_id AS statute_id,
      MIN(e.embedding <=> query_embedding) AS distance
    FROM embeddings e
    WHERE e.content_kind = 'statute'
    GROUP BY e.content_id
    ORDER BY MIN(e.embedding <=> query_embedding)
    LIMIT match_limit * 3
  ),
  vector_hits AS (
    SELECT statute_id, (1 - distance) AS vector_score FROM ann
  ),
  keyword_hits AS (
    SELECT
      s.id AS statute_id,
      similarity(COALESCE(s.title, '') || ' ' || COALESCE(s.text, ''), query_text) AS keyword_score
    FROM statutes s
    WHERE s.doc_type = 'SECTION'
      AND (s.title ILIKE '%' || query_text || '%' OR s.text ILIKE '%' || query_text || '%')
    LIMIT match_limit * 3
  ),
  combined AS (
    SELECT
      COALESCE(v.statute_id, k.statute_id) AS statute_id,
      COALESCE(v.vector_score, 0) AS vector_score,
      COALESCE(k.keyword_score, 0) AS keyword_score,
      COALESCE(v.vector_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3 AS combined_score
    FROM vector_hits v
    FULL OUTER JOIN keyword_hits k ON v.statute_id = k.statute_id
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
  WHERE s.doc_type = 'SECTION'
  ORDER BY c.combined_score DESC
  LIMIT match_limit;
$func$;
