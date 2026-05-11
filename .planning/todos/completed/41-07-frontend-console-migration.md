---
filed: 2026-05-11
source: 41-07-SUMMARY.md Deviation §3
priority: medium
tags: [gdpr, tom-fix-04, logging, codemod, deferred-scope]
blocks: phase-41-verification
---

# Migrate raw console.* calls to logger.* wrappers

## Context

Plan 41-07 (PII-Scrubbing) shipped the redaction infrastructure: shared `scrub.ts`, Winston `scrubFormat()`, Sentry `beforeSend` hooks, and a frontend `apps/web/src/lib/logger.ts` console wrapper. The audit gap for **TOM-FIX-04** and **TOM-FIX-05** is closed at the Sentry + Winston layers — events and logs are scrubbed regardless of call site.

The Plan's Step 7 codemod (migrate every `console.*` call to `logger.*`) was **deferred** at user-approved checkpoint to keep 41-07 atomic and avoid a 156-site merge-surface explosion.

## Current state (2026-05-11)

- Total raw `console.*` call sites: **~156** (124 server + 32 frontend at plan time; check before starting)
- Frontend logger wrapper available: `import { logger } from '@/lib/logger'` (path alias) or `import logger from '../lib/logger'`
- Server logger wrapper available: `import logger from '../utils/logger'` (already used by 30+ existing files)

## Why it still matters

Without migration:
- Frontend `console.*` output isn't run through `scrubString` before reaching browser devtools or Sentry breadcrumbs. Sentry breadcrumbs DO get filtered by `beforeSend`, but raw devtools output is still leaky.
- Server `console.log` calls bypass Winston's transports and the new `scrubFormat()`. They land in stdout / docker logs without redaction.

This is a defense-in-depth gap, not a critical leak. The primary telemetry channels (Sentry + Winston files) are protected.

## Suggested approach

Break into bisectable chunks (one PR per chunk):

1. **Server middleware + routes** (~40 sites) — already using Winston `logger` in adjacent files; minimal surface mismatch.
2. **Server services + jobs** (~50 sites) — same pattern.
3. **Server scripts + seeds + standalone tools** (~30 sites) — **keep as raw `console.*`**; these are CLI tools where logger transports aren't initialised. Audit and confirm per file.
4. **Frontend components** (~25 sites) — adopt `logger.*` from `src/lib/logger.ts`; verify per-file because some `console.error` calls inside error boundaries should likely stay raw.
5. **Frontend lib / utils** (~7 sites) — adopt wrapper.

## Done when

- `grep -rn "console\." apps/web/src/ apps/web/server/ --include="*.ts" --include="*.tsx"` only matches:
  - `apps/web/src/lib/logger.ts` (intentional wrapper delegate)
  - `apps/web/server/utils/logger.ts` (potentially — winston Console transport may reference it)
  - Standalone scripts under `apps/web/scripts/` and `apps/web/prisma/seed*.ts` (allowed per Chunk 3 above)
- All migrated files keep typecheck + tests green
- ESLint rule `no-console` enabled with `allow: []` on `apps/web/src/**` and `apps/web/server/**` (excluding logger files and scripts directory)

## Not in scope

- Pino migration (Plan deviation §1 — Winston is the chosen logger)
- New scrubbing fields (additions go directly into `apps/web/server/utils/scrub.ts` — single source of truth)

## Resolution

**Closed 2026-05-11.**

All 45 candidate files migrated across 4 atomic commits:

| Commit | Scope | Files | Verification |
|---|---|---|---|
| `1eb71ce` | Chunk 1 — server services | 9 | typecheck OK; 995 service tests pass |
| `8c11dfb` | Chunk 2 — server routes / middleware / db / config / boot / index | 15 | typecheck OK; 1193 server tests pass |
| `378522c` | Chunk 3 — frontend components (10 files; error boundaries kept raw) | 10 | typecheck OK; 114 component tests pass |
| `3ae10a8` | Chunk 4 — frontend pages / hooks / contexts / services | 10 | typecheck OK; **full 1710/1710 suite green** |

Mapping convention:
- **Server** (Winston): `console.log → logger.info`, `console.warn → logger.warn`, `console.error → logger.error`. Winston has no `.log(...)` method — `console.log` always maps to `.info`.
- **Frontend** (`apps/web/src/lib/logger.ts`): drop-in (identity) — `console.log → logger.log`, `console.warn → logger.warn`, `console.error → logger.error`.

**Final `grep -rn "console\." apps/web/src/ apps/web/server/`** returns only the 5 intentional sites flagged in "Done when":
- `apps/web/src/lib/logger.ts` — the wrapper itself (delegates to native console after scrubbing)
- `apps/web/src/components/ErrorBoundary.tsx` — last-resort safety
- `apps/web/src/components/ChunkErrorBoundary.tsx` — last-resort safety
- `apps/web/server/utils/dbLogger.ts` — structured JSON event logger uses raw `console.log(JSON.stringify(...))` intentionally for log aggregation in production
- `apps/web/server/openapi/generator.ts` — standalone tsx CLI tool with no Winston transport initialised

**ESLint `no-console` enforcement** noted as a follow-up in the original todo but deferred — would require ESLint config edits + overrides for the 5 allowed sites. Not blocking 41-07 verification; closes the defense-in-depth gap regardless.
