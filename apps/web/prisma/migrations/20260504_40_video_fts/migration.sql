-- Phase 40: Postgres FTS for Video local-index per-article matching (D-D1 + Q-02).
-- Mirrors Phase 38 pattern at apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql.
-- Uses 'simple' config (NOT 'english'/'german'/'french') because the curated YouTube
-- channel set is multilingual (PBS NewsHour EN, DW EN+DE, France 24 FR, NHK World EN,
-- ARD-aktuell DE, etc.) and uniform tokenization without language-specific stemming
-- gives more predictable cross-language matches.

ALTER TABLE "Video"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX video_search_tsv_idx
  ON "Video" USING GIN (search_tsv);
