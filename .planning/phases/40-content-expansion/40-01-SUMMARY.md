---
phase: 40-content-expansion
plan: 01
subsystem: database
tags:
  - prisma
  - schema
  - fts
  - tsvector
  - perspective-region
  - i18n
  - stub-pattern
  - cross-cutting-prep

# Dependency graph
requires:
  - phase: 38-advanced-ai-features
    provides: NewsArticle FTS pattern (tsvector + GIN, raw migration) — mirrored verbatim for Video and Transcript
  - phase: 36.4-relocate-plan-03-04-monetization-artifacts
    provides: requireTier / attachUserTier / aiTierLimiter middleware contracts (consumed by Wave 2/3 transcripts + YouTube quota)
  - phase: 37-horizontal-scaling
    provides: app-worker Swarm service with RUN_JOBS=true (Wave 2 podcastFeedPollJob + videoChannelPollJob will run on this)
provides:
  - Prisma schema with Podcast, PodcastEpisode, Video, Transcript models live in dev DB
  - NewsSource.biasDiversityNote optional column for state-dominated press regions (D-A3)
  - Raw FTS migrations 20260504_40_video_fts + 20260504_40_transcript_fts applied (generated tsvector + GIN indexes)
  - PerspectiveRegion union extended with sudostasien, nordeuropa, sub-saharan-africa, indien (D-A2)
  - Shared client types apps/web/src/types/podcasts.ts + videos.ts (consumed by 40-03/40-04/40-05/40-06)
  - apps/web/src/lib/platform.ts::isNativeApp() stub (CC-01) for Phase 39 to expand
  - i18n triple-write: 4 new region keys in DE/EN/FR common.json + 6 empty placeholder JSON namespaces
  - 4 placeholder comments in apps/web/server/index.ts for line-disjoint Wave 2/3 edits
affects:
  - 40-02-sources-curation (consumes biasDiversityNote field; new sub-region tags)
  - 40-03-podcasts-backend (consumes Podcast/PodcastEpisode models, transcriptUrl/transcriptType, podcast routes mount marker)
  - 40-04-podcasts-page (consumes shared podcast types, podcasts i18n namespace)
  - 40-05-videos-backend (consumes Video model, FTS index, video routes mount marker, videos i18n namespace)
  - 40-06-transcripts (consumes Transcript model, transcripts route marker, FTS index for Q-05)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prisma Unsupported("tsvector")? @default(dbgenerated(...)) @map(...) annotation pattern for GENERATED columns (drift-free db push)
    - @@index([searchTsv], map: "...", type: Gin) explicit index name preserves raw-migration index identity
    - Flat contentId String + @@unique([contentType, contentId]) discriminator (vs dual nullable FKs) — sentinel-row-safe
    - Placeholder comment markers in server/index.ts for parallel Wave plan execution (line-disjoint edits)
    - i18n empty placeholder JSON files for namespace pre-creation (consumed by Wave 3)
    - isNativeApp() stub seam pattern for cross-phase platform-detection coupling

key-files:
  created:
    - apps/web/prisma/migrations/20260504_40_video_fts/migration.sql
    - apps/web/prisma/migrations/20260504_40_transcript_fts/migration.sql
    - apps/web/src/types/podcasts.ts
    - apps/web/src/types/videos.ts
    - apps/web/src/lib/platform.ts
    - apps/web/public/locales/fr/common.json (Rule 2 deviation — was missing entirely; full FR mirror created)
    - apps/web/public/locales/{de,en,fr}/podcasts.json
    - apps/web/public/locales/{de,en,fr}/videos.json
  modified:
    - apps/web/prisma/schema.prisma
    - packages/types/index.ts
    - apps/web/src/types/index.ts
    - apps/web/src/config/regionMetadata.ts
    - apps/web/src/components/ClusterSummary.tsx
    - apps/web/src/lib/utils.ts
    - apps/web/server/services/aiService.ts
    - apps/web/server/prompts/framingPrompt.ts
    - apps/web/public/locales/de/common.json
    - apps/web/public/locales/en/common.json
    - apps/web/server/index.ts
    - apps/web/src/generated/prisma/ (regenerated)

key-decisions:
  - "Add @default(dbgenerated(...)) annotation to all 3 searchTsv fields (NewsArticle, Video, Transcript) so prisma db push correctly recognizes the columns as GENERATED and does not attempt to drop the default expression — this resolves a pre-existing drift with NewsArticle and was needed for the new tables."
  - "Use map: 'video_search_tsv_idx' / 'transcript_search_tsv_idx' on the @@index declarations to preserve the lowercase index names from the raw migration files (Prisma defaults to PascalCase Model_field_idx otherwise)."
  - "Use flat contentId String + @@unique([contentType, contentId]) on Transcript instead of dual nullable FKs (PodcastEpisode + Video). Loose FK survives content deletion as a sentinel row; 40-06 expects this exact shape."
  - "Created full FR common.json (not just the regions block) because the file did not exist; CC-04 triple-write rule mandates DE/EN/FR parity. Other namespaces still missing in FR are out of scope for this plan."
  - "Added placeholder JSON files for podcasts + videos i18n namespaces in all 3 locales so Wave 3 plans can fill keys without recreating the namespace files."

patterns-established:
  - "Pattern: Prisma GENERATED column declaration — Use Unsupported(\"tsvector\")? @default(dbgenerated(\"<expression>\")) @map(\"<column_name>\") to keep prisma db push drift-free against generated columns. Without the @default(dbgenerated(...)), Prisma tries to drop the default expression on the next push and fails."
  - "Pattern: Raw migration → schema declaration ordering — Run raw migration AFTER prisma db push creates the bare table; the migration ADDs the GENERATED column. Then re-add the searchTsv field declaration with @default(dbgenerated(...)) for type-safe Prisma queries."
  - "Pattern: Flat contentId discriminator — When a model joins to multiple parent types (PodcastEpisode + Video), prefer flat (contentId String, contentType String) + @@unique([contentType, contentId]) over dual nullable FKs. Loose FK survives parent deletion, simplifies app-level integrity, and the @@unique enforces one-to-one across both content types."
  - "Pattern: Placeholder comments for parallel plan execution — When N parallel plans need to edit the same file at non-overlapping locations, the prep plan inserts N marker comments. Each downstream plan replaces ONE comment line. Result: zero git-merge conflicts between parallel plans."
  - "Pattern: isNativeApp() stub seam — When a Phase X feature depends on Phase Y detection that hasn't shipped, ship a stub that returns the safe default and document the future replacement. Future Phase Y replaces the function body verbatim — no consumer changes needed."

requirements-completed:
  - CONT-01
  - CONT-02
  - CONT-03
  - CONT-04
  - CONT-05
  - CONT-06

# Metrics
duration: ~30min
completed: 2026-05-04
---

# Phase 40 Plan 01: Cross-Cutting Prep Summary

**Prisma schema extended with 4 new content models (Podcast / PodcastEpisode / Video / Transcript) + biasDiversityNote on NewsSource; raw FTS migrations applied; PerspectiveRegion union grew from 13 to 17 with 5 runtime consumers updated; shared client types + platform.ts stub + i18n triple-write + index.ts placeholder comments all landed; pnpm typecheck exits 0 against live dev DB.**

## Performance

- **Duration:** ~30 min (including pnpm install, db push retries, schema-drift fix, raw migrations, regen, typecheck)
- **Started:** 2026-05-04 (worktree spawned)
- **Completed:** 2026-05-04
- **Tasks:** 11/11
- **Files modified:** 22 (5 created shared types/locales/platform; 11 modified runtime/schema/i18n; 6 placeholder JSON; +regenerated Prisma client tree)

## Accomplishments

- Schema is live in dev DB: `Podcast`, `PodcastEpisode`, `Video`, `Transcript` tables exist; `NewsSource.biasDiversityNote` column added; `Video.search_tsv` + `Transcript.search_tsv` GENERATED tsvector columns exist with `video_search_tsv_idx` + `transcript_search_tsv_idx` GIN indexes.
- All schema field invariants honored: nullable `youtubeId String?` + new `vimeoId String? @unique` on Video; `transcriptUrl String?` + `transcriptType String?` on PodcastEpisode (Pitfall 4 short-circuit field name); non-optional `category String` + `reliability Int` on Podcast; flat `contentId String` + `@@unique([contentType, contentId])` on Transcript.
- PerspectiveRegion union extended atomically in BOTH `packages/types/index.ts` and `apps/web/src/types/index.ts` with `sudostasien`, `nordeuropa`, `sub-saharan-africa`, `indien` (Pitfall 1 atomic mirror).
- All 5 known runtime consumers updated: `regionMetadata.ts` (REGION_GEO_METADATA + REGION_DISPLAY_NAMES), `ClusterSummary.tsx` (REGION_COLORS_HEX + REGION_LABELS), `utils.ts` (getRegionColor + getRegionLabel), `aiService.ts` (VALID_PERSPECTIVE_REGIONS runtime array), `framingPrompt.ts` (LLM allowed-region list).
- Shared client types live: `apps/web/src/types/podcasts.ts` exports `PodcastFeed` / `PodcastEpisode` / `MatchedEpisode`; `apps/web/src/types/videos.ts` exports `VideoChannel` / `Video` / `MatchedVideo`. 40-03/40-04/40-05/40-06 import from these instead of redefining shapes.
- `isNativeApp()` stub at `apps/web/src/lib/platform.ts` returning `false` for the duration of Phase 40; Phase 39 replaces the body verbatim when the real Capacitor detection ships.
- i18n triple-write complete: 4 new region keys in DE/EN/FR `common.json`; 6 empty placeholder JSON namespaces (`{de,en,fr}/{podcasts,videos}.json`) ready for Wave 3 to fill.
- 4 placeholder comments in `apps/web/server/index.ts` (`// 40: podcast routes mount here`, `// 40: video routes mount here`, `// 40: transcripts route mount here`, `// 40: worker job starts here`) so 40-03 / 40-05 / 40-06 each replace one line without merge conflict.
- `pnpm typecheck` exits 0 across the monorepo.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with 4 new models + biasDiversityNote** — `eec6d2c` (feat)
2. **Task 2: Raw FTS migration for Video.searchTsv** — `e59785c` (feat)
3. **Task 3: Raw FTS migration for Transcript.searchTsv** — `f37a419` (feat)
4. **Task 4: Extend PerspectiveRegion union in BOTH type files atomically** — `b2a04a0` (feat)
5. **Task 5: Shared client types for podcasts + videos** — `0250925` (feat)
6. **Task 6: Update 5 runtime consumers** — `fc2c744` (feat)
7. **Task 7: Create platform.ts stub** — `1556115` (feat)
8. **Task 8: i18n common.json regions block triple-write** — `225008f` (feat)
9. **Task 9: 6 empty placeholder JSON namespaces** — `ad60435` (feat)
10. **Task 10: 4 placeholder comments in server/index.ts** — `53b1924` (feat)
11. **Task 11: prisma generate + db push + raw migrations + regenerate client** — `ad85a18` (feat)
12. **Index-name fix (post-Task 11):** `50b05e4` (fix) — `map:` annotations to preserve lowercase index names

## Files Created/Modified

### Created
- `apps/web/prisma/migrations/20260504_40_video_fts/migration.sql` — Generated tsvector + GIN index for Video FTS
- `apps/web/prisma/migrations/20260504_40_transcript_fts/migration.sql` — Generated tsvector + GIN index for Transcript FTS
- `apps/web/src/types/podcasts.ts` — Shared client types (PodcastFeed, PodcastEpisode, MatchedEpisode)
- `apps/web/src/types/videos.ts` — Shared client types (VideoChannel, Video, MatchedVideo)
- `apps/web/src/lib/platform.ts` — isNativeApp() stub seam (CC-01)
- `apps/web/public/locales/fr/common.json` — Full FR translation including 4 new region keys (Rule 2 deviation; was missing)
- `apps/web/public/locales/de/podcasts.json`, `apps/web/public/locales/en/podcasts.json`, `apps/web/public/locales/fr/podcasts.json` — Empty `{}` placeholders
- `apps/web/public/locales/de/videos.json`, `apps/web/public/locales/en/videos.json`, `apps/web/public/locales/fr/videos.json` — Empty `{}` placeholders

### Modified
- `apps/web/prisma/schema.prisma` — 4 new models + biasDiversityNote field; @default(dbgenerated(...)) on NewsArticle.searchTsv (existing drift fix); searchTsv declarations on Video + Transcript with map: annotation
- `packages/types/index.ts` — PerspectiveRegion union extended (atomic mirror)
- `apps/web/src/types/index.ts` — PerspectiveRegion union extended (atomic mirror)
- `apps/web/src/config/regionMetadata.ts` — REGION_GEO_METADATA + REGION_DISPLAY_NAMES extended
- `apps/web/src/components/ClusterSummary.tsx` — REGION_COLORS_HEX + REGION_LABELS extended (hex picks per CONTEXT.md)
- `apps/web/src/lib/utils.ts` — getRegionColor + getRegionLabel dictionaries extended (Tailwind classes)
- `apps/web/server/services/aiService.ts` — VALID_PERSPECTIVE_REGIONS runtime array extended
- `apps/web/server/prompts/framingPrompt.ts` — LLM allowed-region list extended (line 48)
- `apps/web/public/locales/de/common.json`, `apps/web/public/locales/en/common.json` — 4 new region keys appended
- `apps/web/server/index.ts` — 4 placeholder comments inserted at the mount block + worker-job seam
- `apps/web/src/generated/prisma/` — Regenerated by `prisma generate` (includes new Podcast/PodcastEpisode/Video/Transcript model files)

## Decisions Made

1. **`@default(dbgenerated(...))` annotation on all 3 searchTsv fields** — Without it, `prisma db push` tries to drop the default expression on each subsequent push, which fails because PostgreSQL GENERATED columns don't allow that. The annotation pre-existed in the introspected schema for NewsArticle but had been stripped from the committed schema; restoring it fixed both the existing drift and the new Video + Transcript columns. Pattern documented in this plan's commit messages so future schema authors know.
2. **`map:` annotation on `@@index([searchTsv], type: Gin)`** — Prisma's default index naming is `<Model>_<field>_idx` (PascalCase). The raw migration files use lowercase (`video_search_tsv_idx`, `transcript_search_tsv_idx`). Without `map:`, Prisma renames them on push.
3. **Created full FR common.json (Rule 2 deviation)** — The plan task instruction assumed the file existed; it didn't. CC-04 (DE/EN/FR i18n triple-write) mandated parity. Created a full mirror of EN with proper French translations rather than a partial file with only the regions block.
4. **Schema declared without searchTsv fields temporarily, then re-added post-migration** — The workflow ordering was: (a) declare bare tables in schema → (b) push → (c) raw migration adds GENERATED columns + indexes → (d) re-add searchTsv field declarations with `@default(dbgenerated(...))` → (e) push again to confirm no drift → (f) regen client. Without this ordering, push tries to create plain tsvector columns that collide with the raw migration's GENERATED columns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma schema drift on NewsArticle.searchTsv prevented db push from completing**
- **Found during:** Task 11 first attempt at `npx prisma db push --accept-data-loss`
- **Issue:** The committed schema declares `searchTsv Unsupported("tsvector")? @map("search_tsv")` without the `@default(dbgenerated(...))` annotation. Prisma's drift detection saw the existing DB column has a default expression (the `to_tsvector('simple', ...)` GENERATED ALWAYS expression) and tried to ALTER COLUMN ... DROP DEFAULT. PostgreSQL rejects that on GENERATED columns. The same issue would have hit the new Video and Transcript searchTsv fields.
- **Fix:** Added `@default(dbgenerated("to_tsvector('simple'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(content, ''::text)))"))` to NewsArticle.searchTsv (matching the introspected expression verbatim) and equivalent annotations to Video.searchTsv + Transcript.searchTsv. Also temporarily removed searchTsv declarations from Video + Transcript during the initial push (they get created by the raw migration, not by Prisma), then re-added them post-migration.
- **Files modified:** `apps/web/prisma/schema.prisma`
- **Verification:** `prisma db push --accept-data-loss` now exits 0; `pnpm typecheck` exits 0; the searchTsv field is queryable from generated Prisma client; FTS indexes exist with the expected lowercase names.
- **Committed in:** `ad85a18` (Task 11 commit) and `50b05e4` (index-name fix)

**2. [Rule 2 - Missing Critical] Created `apps/web/public/locales/fr/common.json` from scratch**
- **Found during:** Task 8 (i18n triple-write of regions block)
- **Issue:** Task 8 instruction assumed all 3 locale common.json files existed and only needed extending. In reality, only DE and EN existed — FR had `factcheck.json`, `credibility.json`, `pricing.json` but no `common.json`. CC-04's triple-write rule (DE/EN/FR for every new user-facing string) cannot hold without the file existing. Calling `t('regions.sudostasien')` from FR locale would return the literal key string.
- **Fix:** Created a full mirror of `apps/web/public/locales/en/common.json` translated to French (all blocks: buttons, errors, status, time, articles, navigation, search, regions, comments, upgrade, ai). The new 4 region keys are included in the regions block alongside the original 13.
- **Files modified:** `apps/web/public/locales/fr/common.json` (created)
- **Verification:** `node -e "JSON.parse(require('fs').readFileSync('apps/web/public/locales/fr/common.json'))"` parses cleanly; all 4 new keys present.
- **Committed in:** `225008f` (Task 8 commit)

**3. [Rule 3 - Blocking] Initial push attempt failed because new Video/Transcript searchTsv declarations would create plain tsvector columns colliding with raw-migration GENERATED columns**
- **Found during:** Task 11 second attempt (after fixing NewsArticle drift)
- **Issue:** Plan Task 1 instructions asserted that `prisma db push` would create the relations and indexes "EXCEPT the searchTsv column itself". This is incorrect — Prisma push creates whatever the schema declares. With `searchTsv Unsupported("tsvector")?` declared on the new tables, Prisma would create plain (non-generated) tsvector columns. Then the raw migration's `ALTER TABLE Video ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (...) STORED` would fail with "column already exists".
- **Fix:** Temporarily removed `searchTsv` field declarations and `@@index([searchTsv], type: Gin)` from Video + Transcript schema models so push only creates the bare tables; ran the raw migrations; re-added the field declarations with `@default(dbgenerated(...))` + `map:` annotations so Prisma sees the GENERATED columns as already present and doesn't try to alter them. Final push confirmed no drift.
- **Files modified:** `apps/web/prisma/schema.prisma`
- **Verification:** `npx prisma db push --accept-data-loss` exits 0 with "Your database is now in sync with your Prisma schema"; `docker exec newshub-db psql -c "\d Video"` confirms the GENERATED column + GIN index; `pnpm typecheck` exits 0; Prisma client generated has type-safe accessors for all 4 new models.
- **Committed in:** `ad85a18` and `50b05e4`

**4. [Rule 3 - Blocking] Worktree was missing pnpm dependencies and apps/web/.env**
- **Found during:** Task 11 (first `npx prisma generate`)
- **Issue:** The worktree was a fresh checkout with no `node_modules` and no `apps/web/.env` (the latter is gitignored, intentionally). Prisma generate failed with "Cannot find module 'prisma/config'". Without `.env`, `DATABASE_URL` was undefined.
- **Fix:** Ran `pnpm install` (resolved 1660 deps from cache; ~34.6s) and copied the main repo's `apps/web/.env` to the worktree (`cp /d/NewsHub/apps/web/.env apps/web/.env`).
- **Files modified:** `apps/web/.env` (copied; gitignored, not committed); `node_modules` (gitignored, not committed)
- **Verification:** `npx prisma generate` and subsequent commands succeed; `apps/web/.env` is correctly excluded by `.gitignore`.
- **Committed in:** N/A (env + node_modules are gitignored)

---

**Total deviations:** 4 auto-fixed (1 missing critical i18n file, 3 blocking dev-environment / Prisma-tooling issues)
**Impact on plan:** All deviations were mechanical environment / schema-drift issues, not scope changes. The plan's intent is fully realized: schema is live, FTS indexes exist with the expected names, types compile, all anti-pattern checks pass. The schema-drift fix improves the project beyond the plan because it eliminates a pre-existing NewsArticle drift that would have hit any future schema push.

## Issues Encountered

- **Prisma 7 `db execute` flag rename:** The plan instruction used `--stdin --schema=prisma/schema.prisma`. Prisma 7 dropped `--schema` for `db execute` and the script-input flag is now exclusive (either `--file` or `--stdin`). Resolved by using `--file prisma/migrations/.../migration.sql` (stdin would have worked too via the alternate invocation). Both raw migrations applied successfully on first attempt with the corrected command.
- **Prisma's default index naming overrode the raw-migration index names:** Adding `@@index([searchTsv], type: Gin)` to the schema caused Prisma to rename `video_search_tsv_idx` → `Video_search_tsv_idx` (PascalCase). Fixed with explicit `map:` annotations.

## User Setup Required

None — this plan's database changes ran against the local dev DB only. Production migration is intentionally deferred to a future `PRODUCTION-MIGRATION.md` handoff (T-40-01-02 mitigation, mirrors the Phase 36.2-04 pattern). The user does not need to do anything manually for Wave 2 to start.

## Next Phase Readiness

- **Schema is live in dev DB**, types compile, generated client is current. Wave 2 can begin: 40-02 (sources curation), 40-03 (podcast backend), 40-05 (video backend) all run in parallel.
- **Wave 3 (40-04 podcasts page, 40-06 transcripts)** depends on Wave 2 services landing; the placeholder i18n namespaces and `isNativeApp()` seam are already in place.
- **Production migration** must be authored as a real Prisma migration file (`prisma migrate dev --name 40_content_models`) before deploying to production. Track via separate PRODUCTION-MIGRATION.md handoff doc when the milestone ships.

## Self-Check

Verifying claims before completion.

### Files claimed created — verified present
- `apps/web/prisma/migrations/20260504_40_video_fts/migration.sql` — FOUND
- `apps/web/prisma/migrations/20260504_40_transcript_fts/migration.sql` — FOUND
- `apps/web/src/types/podcasts.ts` — FOUND
- `apps/web/src/types/videos.ts` — FOUND
- `apps/web/src/lib/platform.ts` — FOUND
- `apps/web/public/locales/fr/common.json` — FOUND
- `apps/web/public/locales/{de,en,fr}/podcasts.json` — FOUND
- `apps/web/public/locales/{de,en,fr}/videos.json` — FOUND

### Commit hashes — verified in git log
- `eec6d2c` Task 1 — FOUND
- `e59785c` Task 2 — FOUND
- `f37a419` Task 3 — FOUND
- `b2a04a0` Task 4 — FOUND
- `0250925` Task 5 — FOUND
- `fc2c744` Task 6 — FOUND
- `1556115` Task 7 — FOUND
- `225008f` Task 8 — FOUND
- `ad60435` Task 9 — FOUND
- `53b1924` Task 10 — FOUND
- `ad85a18` Task 11 — FOUND
- `50b05e4` index-name fix — FOUND

### Database state — verified via `docker exec newshub-db psql`
- `Podcast`, `PodcastEpisode`, `Video`, `Transcript` tables — EXIST
- `NewsSource.biasDiversityNote` column — EXISTS
- `Video.search_tsv` GENERATED column + `video_search_tsv_idx` GIN index — EXIST
- `Transcript.search_tsv` GENERATED column + `transcript_search_tsv_idx` GIN index — EXIST

### Anti-pattern check — verified
- No root `server/`, `prisma/`, `src/` directories — CONFIRMED ABSENT

## Self-Check: PASSED

---
*Phase: 40-content-expansion*
*Plan: 01*
*Completed: 2026-05-04*
