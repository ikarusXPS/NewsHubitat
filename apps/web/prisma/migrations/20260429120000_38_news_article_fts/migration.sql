-- Phase 38: Postgres FTS for fact-check corpus retrieval (D-11 + RESEARCH.md Pitfall 2)
-- Closes the gap CONTEXT.md D-11 wrongly assumed: GIN indexes existed only on JSONB topics/entities,
-- never on title/content tsvector. This is the migration the missing index actually needs.
-- Use 'simple' config (NOT 'english'/'german'/'french') because D-12 multi-language merge
-- requires uniform tokenization without language-specific stemming.

ALTER TABLE "NewsArticle"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX news_article_search_tsv_idx
  ON "NewsArticle" USING GIN (search_tsv);
