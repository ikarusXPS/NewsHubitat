-- Partial index for active teams (D-06, DB-02 - Phase 34)
-- Excludes soft-deleted teams from index, improving query performance
-- for queries that filter WHERE deletedAt IS NULL
--
-- Run with: npx prisma db execute --file ./prisma/migrations/partial_index_team.sql
-- Use CONCURRENTLY to avoid blocking writes (Pitfall 5 from RESEARCH.md)

-- Check if index already exists to make migration idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_team_active'
  ) THEN
    -- Create index concurrently to avoid write locks
    -- Note: CONCURRENTLY cannot run inside a transaction block
    -- When running via prisma db execute, it runs in a transaction
    -- So we use standard CREATE INDEX here; for production, run directly via psql
    CREATE INDEX idx_team_active
    ON "Team" (id, name)
    WHERE "deletedAt" IS NULL;
  END IF;
END
$$;

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Team' AND indexname = 'idx_team_active';
