CREATE OR REPLACE FUNCTION match_embeddings_ann(
  p_content_kind TEXT,
  p_query_embedding vector(1024),
  p_limit INTEGER DEFAULT 30
) RETURNS TABLE (content_id UUID, similarity REAL)
LANGUAGE SQL STABLE AS $$
  SELECT content_id, (1 - (embedding <=> p_query_embedding))::REAL
  FROM embeddings
  WHERE content_kind = p_content_kind
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
$$;
