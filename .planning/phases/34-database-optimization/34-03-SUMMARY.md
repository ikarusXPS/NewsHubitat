---
phase: 34
plan: 03
subsystem: database
tags: [performance, indexes, postgresql, optimization]
dependency_graph:
  requires:
    - 34-01-SUMMARY.md (audit findings)
  provides:
    - User_showOnLeaderboard_emailVerified_idx composite index
    - idx_team_active partial index
  affects:
    - prisma/schema.prisma
    - PostgreSQL database indexes
tech_stack:
  added: []
  patterns:
    - Composite B-tree index for multi-column filtering
    - Partial index with WHERE clause for soft deletes
key_files:
  created:
    - prisma/migrations/partial_index_team.sql
  modified:
    - prisma/schema.prisma
decisions:
  - "Composite index order [showOnLeaderboard, emailVerified] matches query predicate order"
  - "Partial index on Team uses DO block for idempotent execution"
  - "Standard CREATE INDEX (not CONCURRENTLY) inside DO block due to transaction constraint"
metrics:
  duration: ~5min
  completed: 2026-04-26
---

# Phase 34 Plan 03: Composite Indexes Summary

Composite and partial indexes created based on EXPLAIN ANALYZE audit findings from Plan 01, improving leaderboard query performance and active team lookups.

## What Was Built

### Task 1: Composite Index for Leaderboard Query
Modified `prisma/schema.prisma` to add composite index on User model:
- Added `@@index([showOnLeaderboard, emailVerified])` to User model
- Index optimizes leaderboard queries filtering on both boolean columns
- Per D-05, DB-02 audit findings showing Seq Scan for leaderboard routes
- Comment documents decision rationale (Phase 34, D-05, DB-02)

### Task 2: Partial Index SQL for Team Soft Deletes
Created `prisma/migrations/partial_index_team.sql` implementing:
- Partial index `idx_team_active` with `WHERE "deletedAt" IS NULL`
- Idempotent execution via DO block with IF NOT EXISTS check
- Covers (id, name) columns for active team queries
- Per D-06, DB-02 for filtering soft-deleted teams efficiently
- Documentation includes usage instructions and production notes

### Task 3: Schema Application and Verification
Applied both indexes to PostgreSQL:
- `npx prisma db push` created User composite index automatically
- `npx prisma db execute --file` applied partial index SQL
- Verified both indexes exist in pg_indexes
- TypeScript compilation and Prisma validation passed

## Key Findings

### Index Verification
| Index Name | Table | Type | Columns | Verified |
|------------|-------|------|---------|----------|
| User_showOnLeaderboard_emailVerified_idx | User | B-tree | showOnLeaderboard, emailVerified | Yes |
| idx_team_active | Team | Partial B-tree | id, name WHERE deletedAt IS NULL | Yes |

### Expected Query Plan Improvement
Before: Leaderboard queries showed `Seq Scan on "User"` with filter
After: Should show `Index Scan using User_showOnLeaderboard_emailVerified_idx`

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 263b4b4 | feat(34-03): add composite index for leaderboard query |
| 2 | 2953f22 | feat(34-03): create partial index SQL for Team soft deletes |

## Files Changed

### Created
- `prisma/migrations/partial_index_team.sql` - Partial index SQL migration (29 lines)

### Modified
- `prisma/schema.prisma` - Added composite index annotation (+4 lines)

## Verification

- [x] `prisma/schema.prisma` contains `@@index([showOnLeaderboard, emailVerified])`
- [x] `prisma/migrations/partial_index_team.sql` exists with CREATE INDEX and WHERE clause
- [x] `npx prisma db push` completes without errors
- [x] `npx prisma db execute --file` executes without errors
- [x] pg_indexes shows User_showOnLeaderboard_emailVerified_idx
- [x] pg_indexes shows idx_team_active with WHERE clause
- [x] `npx prisma validate` passes
- [x] `npm run typecheck` passes

## Deviations from Plan

### [Rule 3 - Blocking Issue] CREATE INDEX CONCURRENTLY Constraint
- **Found during:** Task 2
- **Issue:** CONCURRENTLY cannot run inside a transaction block, and Prisma db execute runs in a transaction
- **Fix:** Used standard CREATE INDEX inside DO block; documented production workaround in SQL comments
- **Files modified:** prisma/migrations/partial_index_team.sql
- **Commit:** 2953f22

## Production Notes

For production deployments with active traffic, run the partial index directly via psql to use CONCURRENTLY:
```bash
psql -U newshub -d newshub -c "CREATE INDEX CONCURRENTLY idx_team_active ON \"Team\" (id, name) WHERE \"deletedAt\" IS NULL;"
```

## Self-Check: PASSED

- [x] `prisma/migrations/partial_index_team.sql` exists
- [x] Commit 263b4b4 found in git log
- [x] Commit 2953f22 found in git log
- [x] Both indexes verified in PostgreSQL pg_indexes
