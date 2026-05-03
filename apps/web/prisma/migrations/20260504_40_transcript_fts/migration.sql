-- Phase 40: Postgres FTS for Transcript-excerpt search (Q-05 default — Premium-only feature
-- on /podcasts page two-tier search). Mirrors Phase 38 + 40_video_fts patterns.
-- Indexes the denormalised `fullText` column (concatenated transcript segment text)
-- so cross-episode "find the moment they discussed X" queries hit a GIN index instead
-- of scanning every segment JSONB.
-- Uses 'simple' config (multilingual content; matches Phase 38 + 40_video_fts).

ALTER TABLE "Transcript"
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("fullText", ''))
  ) STORED;

CREATE INDEX transcript_search_tsv_idx
  ON "Transcript" USING GIN (search_tsv);
