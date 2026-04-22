---
phase: 13-postgresql-migration
plan: 04
subsystem: database
tags: [prisma, seeding, badges, ai-personas]
dependency_graph:
  requires: [13-02]
  provides: [seed-scripts, npm-seed-command]
  affects: [database-initialization]
tech_stack:
  added: []
  patterns: [upsert-idempotent-seeding, export-function-pattern, standalone-guard]
key_files:
  created:
    - prisma/seed-personas.ts
    - prisma/seed.ts
  modified:
    - prisma/seed-badges.ts
    - package.json
decisions:
  - "Deterministic IDs for AIPersona using slugified name (e.g., 'neutral-analyst')"
  - "Export pattern with standalone execution guard using import.meta.url"
metrics:
  duration_minutes: 5
  completed: "2026-04-22T14:43:24Z"
---

# Phase 13 Plan 04: Seed Scripts Summary

Seed scripts for badges and AI personas with combined npm command for PostgreSQL database initialization.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0024855 | feat | Create AI personas seed script with 5 default personas |
| 8e81ead | refactor | Export seedBadges function for combined seed script |
| 9825cef | feat | Create combined seed script and npm commands |

## What Was Built

### 1. AI Personas Seed Script (prisma/seed-personas.ts)

Created 5 default AI personas for news analysis:

| Persona | Description | Color |
|---------|-------------|-------|
| Neutral Analyst | Balanced, fact-based analysis (default) | #6B7280 |
| Critical Thinker | Questions assumptions, identifies fallacies | #EF4444 |
| Global Context | International and historical context | #3B82F6 |
| Economic Lens | Market and economic impact analysis | #10B981 |
| Human Interest | Human stories and societal impact | #8B5CF6 |

### 2. Refactored seed-badges.ts

- Exported `seedBadges()` function with `Promise<void>` return type
- Added standalone execution guard for backwards compatibility
- Existing 40 badge definitions unchanged

### 3. Combined Seed Script (prisma/seed.ts)

- Imports and calls both `seedBadges()` and `seedPersonas()`
- Proper error handling with process.exit(1) on failure
- Prisma disconnect in finally block

### 4. NPM Scripts (package.json)

```json
"seed": "npx tsx prisma/seed.ts",
"seed:badges": "npx tsx prisma/seed-badges.ts",
"seed:personas": "npx tsx prisma/seed-personas.ts"
```

## Key Implementation Details

### Idempotent Upsert Pattern

Both seed scripts use Prisma's `upsert` for idempotent operations:
- Badges: upsert by unique `name` field
- Personas: upsert by deterministic `id` (slugified name)

### Standalone Execution Guard

```typescript
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFunction()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
```

This allows scripts to be:
1. Run directly: `npm run seed:badges`
2. Imported by combined script: `import { seedBadges } from './seed-badges'`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Note:** Database verification skipped per user request (PostgreSQL not available).

Scripts verified through:
- TypeScript compilation: `npm run typecheck` passes
- File existence: All 3 prisma scripts created
- Import resolution: Combined script imports both functions successfully

When PostgreSQL is available, run:
```bash
docker compose up -d postgres
npx prisma db push
npm run seed
```

Expected results:
- 40 badges seeded
- 5 AI personas seeded

## Self-Check: PASSED

- [x] prisma/seed-personas.ts exists
- [x] prisma/seed-badges.ts exports seedBadges
- [x] prisma/seed.ts exists and imports both functions
- [x] package.json contains "seed" script
- [x] Commit 0024855 found
- [x] Commit 8e81ead found
- [x] Commit 9825cef found
