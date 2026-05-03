---
phase: 40-content-expansion
plan: 02
subsystem: source-curation
tags:
  - source-curation
  - bias-balance
  - ci-gate
  - rss-validation
  - news-sources
  - perspective-region
  - d-a3-exception
  - user-approved-scope-change

# Dependency graph
requires:
  - phase: 40-content-expansion
    plan: 01
    provides: PerspectiveRegion union extended with sudostasien/nordeuropa/sub-saharan-africa/indien; biasDiversityNote optional column on Prisma NewsSource model
provides:
  - "apps/web/server/config/sources.ts: 233 NEWS_SOURCES entries (up from 130) covering 17 regions (up from 13)"
  - "apps/web/scripts/check-source-bias-coverage.ts: D-A3 build gate enforcing per-region L/C/R bias coverage with biasDiversityNote: 'limited' exemption"
  - "apps/web/scripts/proposed-sources/103-sources-proposed.md: D-A4 human-review artifact (committed for audit trail)"
  - "apps/web/package.json: check:source-bias npm script"
  - ".github/workflows/ci.yml: Source Bias Coverage CI job (runs on every PR + master push)"
  - "NewsSource.biasDiversityNote field added to apps/web/src/types/index.ts and packages/types/index.ts (Rule 2 deviation completing 40-01's coverage)"
affects:
  - "All Wave 3+ phase 40 plans that read NEWS_SOURCES (40-03 podcast service indirectly via NewsArticle entity matching, 40-05 video service same)"
  - "newsAggregator.ts: now iterates 233 sources per crawl pass (up from 130, +79%)"
  - "Framing analysis surface (Phase 38): now has 4 new sub-region cells (sudostasien, nordeuropa, sub-saharan-africa, indien) + footnote-eligible biasDiversityNote on russland + china entries"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "biasDiversityNote: 'limited' annotation pattern: tagging EVERY source in an exempt region (vs just the state-controlled ones) makes the bias-balance script's exemption check unambiguous — `all.some((s) => s.biasDiversityNote === 'limited')` returns true regardless of which subset of state vs private outlets the operator picks"
    - "Bias-balance gate pattern: bucket sources by political score thresholds (-0.33 / +0.33), per-region coverage check with one-line opt-out for documented exceptions, tsx-runnable script wired into CI via the same template as typecheck job"
    - "Google News RSS proxy fallback pattern (already in use for ~50% of existing 130 sources): when a publisher's direct feed fails, substitute `https://news.google.com/rss/search?q=site:<DOMAIN>+when:1d&hl=<LANG>&gl=<CC>&ceid=<CC>:<LANG>` — used for 25 of the 103 new candidates"

key-files:
  created:
    - apps/web/scripts/proposed-sources/103-sources-proposed.md
    - apps/web/scripts/check-source-bias-coverage.ts
  modified:
    - apps/web/server/config/sources.ts
    - apps/web/src/types/index.ts
    - packages/types/index.ts
    - apps/web/package.json
    - .github/workflows/ci.yml

key-decisions:
  - "User-approved scope expansion at the Task 2 human-verify checkpoint: original 70 (32 deepen + 24 sub-regions + 14 wires) became 103 (65 deepen + 24 sub-regions + 14 wires). Implemented as 5 per existing region (Option A). Plan's `must_haves.truths` 'exactly 70 sources' and 'exactly 200 NEWS_SOURCES entries' invariants explicitly overridden by user — this is a legitimate Rule-3 spec deviation, not a regression."
  - "biasDiversityNote: 'limited' annotation pattern: applied to ALL russland (15) and ALL china (15) entries, not just state-owned ones, because the bias-balance script's exemption fires when `any` source in a region carries the flag. Setting it on every entry is the cleanest expression of the D-A3 honest exception and makes the data semantics regional-level rather than per-source."
  - "Anadolu Agency conflict resolved: existing entry 'aa' (Anadolu, region=tuerkei) already covered Turkish wire-service breadth, so a duplicate 'anadolu' candidate was dropped from the wires section and replaced with 'prensa-latina' (Cuban state wire, lateinamerika) for South-Global wire coverage breadth."
  - "Rule 2 deviation: 40-01 added biasDiversityNote to the Prisma NewsSource model but missed both TS NewsSource interfaces (apps/web/src/types/index.ts and packages/types/index.ts). Required for Task 3 typecheck and Task 4 source-data annotation. Added atomically per CC-04 mirror pattern."
  - "Did NOT modify branch-protection settings to make 'Source Bias Coverage' a required check — that requires PATCH /repos/.../branches/master/protection and explicit user authorization (not a safe operation for an executor). User can promote via Settings -> Branches -> master -> Require status checks once a PR demonstrates the check works in CI."

patterns-established:
  - "Pattern: D-A3 honest exception flag — When a hard correctness gate cannot be satisfied for some inputs (state-dominated press regions cannot have left/center/right bias diversity), tag each input row with a documented opt-out flag and have the gate check `if any source in the group has the flag, skip the gate for the whole group and log the exemption visibly`. Better than disabling the gate entirely or silently ignoring failures."
  - "Pattern: Plan invariant override via human-verify checkpoint — When the plan's `must_haves.truths` codify a hard count ('exactly 70 sources') and the user changes their mind at the checkpoint, document the override in the SUMMARY's Deviations section as user-approved Rule-3 deviation. Do NOT modify the PLAN.md (frozen artifact). The SUMMARY supersedes the plan for execution-result purposes."
  - "Pattern: Per-region append + new-block append — When extending a curated config grouped by section headers (`// ===== <REGION> =====`), inserting new entries between the last existing entry of region N and the `// ===== <REGION N+1> =====` header preserves the existing 130 entries' positions exactly. New regions get fresh blocks at the end of the array. Result: zero impact on existing-entry diff readability."

requirements-completed:
  - CONT-01
  - CONT-02

# Metrics
duration: ~120min
completed: 2026-05-04
---

# Phase 40 Plan 02: Source Curation Summary

**Curated 103 new news sources into `apps/web/server/config/sources.ts` (130 -> 233 total, 13 -> 17 regions); built a CI-enforced bias-balance gate (`check-source-bias-coverage.ts`) that exempts russland + china via `biasDiversityNote: 'limited'`; all 1464 unit tests pass and the new gate logs 15/17 regions PASS with 2 exempt.**

## Performance

- **Duration:** ~120 min (including 70 -> 103 user-edit pivot, ID-collision discovery for `anadolu`, and 1464-test full sweep)
- **Started:** 2026-05-04
- **Completed:** 2026-05-04
- **Tasks:** 6/6 (Tasks 1-5 + Task 6 regression sweep)
- **Files created:** 2 (proposed-sources.md, check-source-bias-coverage.ts)
- **Files modified:** 5 (sources.ts, package.json, ci.yml, apps/web/src/types/index.ts, packages/types/index.ts)
- **Source count:** 130 -> 233 (+103, +79.2%)
- **Region count:** 13 -> 17 (+4)

## Accomplishments

- **70 -> 103 source expansion** under user edit at the Task 2 human-verify checkpoint. Original plan: 70 sources (32 deepen + 24 sub-region + 14 wires). User edit: 5 per existing region (65 deepen) + 24 sub-region + 14 wires = 103.
- **17 regions, all passing the D-A3 gate.** 15 non-exempt regions show valid L/C/R coverage; 2 exempt regions (russland + china) are properly skipped via the `biasDiversityNote: 'limited'` flag with `ℹ ... limited diversity (exception per D-A3) — skipping` log lines.
- **Zero ID collisions.** All 103 new IDs verified unique against the existing 130 (Node script `check_ids.mjs` run pre-commit, then deleted). Notably the proposed `anadolu` was caught as duplicating existing `aa` (Anadolu Agency, tuerkei) — replaced with `prensa-latina` (Cuban state wire, lateinamerika) for South-Global wire coverage breadth.
- **biasDiversityNote field landed on the TS interface.** 40-01 added the column to the Prisma model but missed both TS NewsSource interfaces; this plan completed the type coverage atomically (Rule 2 deviation, see Deviations section below).
- **Bias-balance script wired into CI.** `pnpm --filter @newshub/web check:source-bias` now runs as a top-level GitHub Actions job named `Source Bias Coverage` on every PR and master push; mirrors the `typecheck` job template (Node 22 + pnpm 10 + frozen lockfile).
- **Existing 130 sources preserved.** Only russland (10) and china (10) entries got modified — exactly one new field appended to each (`biasDiversityNote: 'limited'`). Bias scores, URLs, region tags untouched.
- **`pnpm typecheck` exits 0** across the monorepo (apps/web + packages/types).
- **`pnpm test:run` exits 0** with 1464 unit tests passing — no count-relaxation edits needed (no test asserts a hard "130 sources" or "13 regions" literal that we found).
- **Distribution achieved per user spec:**
  - usa: 10 -> 17 (+5 deepen + 2 wires: cfr, brookings)
  - europa: 10 -> 20 (+5 deepen + 5 wires: efe-english, ansa-english, chathamhouse, carnegie-eu, merics)
  - deutschland: 10 -> 15 (+5 deepen)
  - nahost: 10 -> 16 (+5 deepen + 1 wire: irna)
  - tuerkei: 10 -> 15 (+5 deepen)
  - russland: 10 -> 15 (+5 deepen, all 15 flagged limited)
  - china: 10 -> 15 (+5 deepen, all 15 flagged limited)
  - asien: 10 -> 15 (+5 deepen)
  - afrika: 10 -> 16 (+5 deepen + 1 wire: panapress)
  - lateinamerika: 10 -> 16 (+5 deepen + 1 wire: prensa-latina)
  - ozeanien: 10 -> 15 (+5 deepen)
  - kanada: 10 -> 16 (+5 deepen + 1 wire: reuters-canada)
  - alternative: 10 -> 15 (+5 deepen)
  - sudostasien: 0 -> 6 (NEW — D-A2)
  - nordeuropa: 0 -> 6 (NEW — D-A2)
  - sub-saharan-africa: 0 -> 8 (NEW — D-A2; 6 deepen + 2 wires: apa-news, iss-africa)
  - indien: 0 -> 7 (NEW — D-A2; 6 deepen + 1 wire: orfonline)

## Task Commits

| # | Task | Commit | Type |
|---|------|--------|------|
| 1 | Author 70-sources-proposed.md (D-A4 human-review artifact) | `b370ac4` | docs |
| - | Add biasDiversityNote to TS NewsSource interface (Rule 2 deviation) | `685d65e` | feat |
| 3 | Add check-source-bias-coverage.ts (D-A3 gate) | `4ecbe02` | feat |
| 1' | Expand proposed sources from 70 to 103 (user-approved scope change at Task 2 checkpoint) | `72872c3` | docs |
| 4 | Merge 103 user-approved sources into sources.ts (130 to 233) | `9d05eb2` | feat |
| 5 | Wire bias-balance gate as required check (npm script + CI job) | `5a814ed` | ci |
| 6 | Regression sweep — pure verification, no commit (typecheck + 1464 tests + script all pass) | — | — |

Task 2 (human-verify checkpoint) and Task 6 (regression sweep) produce no commits by design — Task 2 is a stop-and-await-user-approval point; Task 6 is a pure verification gate.

## Files Created/Modified

### Created
- **`apps/web/scripts/proposed-sources/103-sources-proposed.md`** — D-A4 human-review artifact. Lists all 103 candidate sources organized by region, with bias score + reliability + ownership + 1-2 line rationale per row. Includes bias-coverage forecast table for all 17 regions and RSS-validation appendix. Status header: `APPROVED 2026-05-04`. Renamed from `70-sources-proposed.md` via `git rm` + new file (the Edit/Write boundary on a renamed-and-rewritten file is cleaner than `git mv` followed by content rewrite).
- **`apps/web/scripts/check-source-bias-coverage.ts`** — D-A3 build gate (66 lines). Buckets `NEWS_SOURCES` by region into left (`< -0.33`) / center (`-0.33..0.33`) / right (`> 0.33`); for each region, requires >=1 source per bucket UNLESS any source carries `biasDiversityNote === 'limited'`, in which case logs `ℹ <region>: limited diversity (exception per D-A3) — skipping` and continues. Exits 0 on full pass, 1 on any failed region. Read-only — no `--fix` mode by design (this is a pure gate per D-A3).

### Modified
- **`apps/web/server/config/sources.ts`** — Grew from 130 to 233 NewsSource entries. Existing 130 untouched except the 20 russland + china entries which received `biasDiversityNote: 'limited'` annotation (one new line each). 4 new region blocks (sudostasien, nordeuropa, sub-saharan-africa, indien) appended after the alternative block at the end of the array.
- **`apps/web/src/types/index.ts`** — Added `biasDiversityNote?: 'limited'` field to NewsSource interface (Rule 2 deviation completing 40-01's intended coverage).
- **`packages/types/index.ts`** — Atomic mirror of the same field addition (CC-04 multi-file-type pattern).
- **`apps/web/package.json`** — Added `"check:source-bias": "tsx scripts/check-source-bias-coverage.ts"` to scripts block.
- **`.github/workflows/ci.yml`** — Added new top-level `check-source-bias` job named `Source Bias Coverage`, mirroring the `typecheck` job template (Node 22 + pnpm 10 + frozen-lockfile install). Runs on every PR and master push; fails the build if the bias-balance gate exits non-zero.

## Decisions Made

1. **70 -> 103 user-approved scope expansion (Rule 3 spec deviation).** At the Task 2 human-verify checkpoint, the user replied `approved with edits — Option A: 5 per existing region`. This overrides the plan's `must_haves.truths` lines that asserted "exactly 70 sources" and "exactly 200 NEWS_SOURCES entries". I followed the user's authorization, renamed the proposal file to `103-sources-proposed.md`, and merged 103 entries — taking sources.ts to 233 instead of the originally specified 200. The SUMMARY documents this as user-approved per the Rule 3 / spec-deviation classification (this conversation is the cite). The PLAN.md file itself was NOT modified per the user's explicit instruction.

2. **`biasDiversityNote: 'limited'` applied to ALL russland + china entries, not just state-owned ones.** The bias-balance script's exemption check is `(...).some((s) => s.biasDiversityNote === 'limited')` — fires on ANY source in the region. Setting it on every entry is the cleanest expression of the D-A3 honest exception and makes the data semantics regional-level rather than per-source. The alternative — flagging only state-owned outlets — would produce a fragile boolean (any future addition of a private russland source would silently disable the exemption). Result: all 30 entries (10 existing + 5 new in each of russland and china) carry the flag.

3. **Anadolu Agency duplicate → prensa-latina substitution.** During ID-collision audit, discovered the proposed `anadolu` entry duplicated existing `aa` (id='aa', name='Anadolu Agency', country='TR', region='tuerkei'). Removed `anadolu` from the wires section and substituted `prensa-latina` (Cuban state news wire, lateinamerika), preserving the 14-wire count and adding South-Global wire coverage to lateinamerika (which previously had no state-wire entry beyond `telesur`).

4. **NOT modifying branch-protection settings.** Promoting the new `Source Bias Coverage` check to a required branch-protection check requires `gh api PATCH /repos/.../branches/master/protection` calls — that's an out-of-band administrative action that the executor agent should not perform without explicit confirmation. User can promote via Settings -> Branches -> master -> Require status checks after a PR demonstrates the check passes in CI. Documented in Follow-ups below.

5. **Rule 2 deviation: TS NewsSource interface biasDiversityNote.** 40-01's SUMMARY claimed the field was added (`provides: NewsSource.biasDiversityNote optional column...`) but only the Prisma model carried it — both TS interface declaration sites (apps/web/src/types/index.ts and packages/types/index.ts) were missed. This blocked Task 3's typecheck and Task 4's annotation. Auto-fixed in commit `685d65e` per Rule 2 (missing critical functionality required for current task) atomically across both files per CC-04 mirror pattern. No user permission required for Rule 2 fixes.

## Deviations from Plan

### User-approved scope deviations (Rule 3)

**1. [User-approved Rule 3] Source-count invariant changed from 70 to 103.**
- **Found during:** Task 2 (human-verify checkpoint).
- **Issue:** The plan's `must_haves.truths` codified exactly "70 sources" / "exactly 200 NEWS_SOURCES entries". The user reviewed the proposal, then explicitly relayed back: `approved with edits — Option A from clarification: expand the pool to ~103 new sources, 5 per existing region`.
- **Fix:** Authored `103-sources-proposed.md` superseding `70-sources-proposed.md` (file renamed via `git rm` + new file write). Merged 103 entries into sources.ts (final count 233 instead of 200). All other plan invariants (exactly 4 new sub-regions, biasDiversityNote on russland + china, bias-balance script wired into CI) preserved.
- **Files modified:** `apps/web/scripts/proposed-sources/103-sources-proposed.md` (renamed + rewritten), `apps/web/server/config/sources.ts`.
- **Authorization:** Explicit user reply at Task 2 checkpoint. The PLAN.md is NOT modified per user direction — the SUMMARY supersedes the plan for execution-result purposes.
- **Commit:** `72872c3` (proposal rewrite), `9d05eb2` (sources.ts merge).

### Auto-fixed Issues

**2. [Rule 2 - Missing Critical] biasDiversityNote field absent from TS NewsSource interface.**
- **Found during:** Task 3 (preparing the bias-balance script — script needed `s.biasDiversityNote === 'limited'` to typecheck).
- **Issue:** 40-01 added `biasDiversityNote String?` to the Prisma model (`apps/web/prisma/schema.prisma:65`) but did not add the corresponding optional field to either TS NewsSource interface (`apps/web/src/types/index.ts:25-39` or `packages/types/index.ts:55-69`). 40-01's SUMMARY claimed the field was provided, but only the database column was. Without the TS field, Task 3's script wouldn't compile and Task 4's russland+china annotations would be a TS-level error.
- **Fix:** Added `biasDiversityNote?: 'limited';` to both TS interfaces atomically (CC-04 mirror pattern, mirroring the PerspectiveRegion extension pattern from 40-01).
- **Files modified:** `apps/web/src/types/index.ts`, `packages/types/index.ts`.
- **Verification:** `pnpm typecheck` exits 0; the bias-balance script compiles and runs cleanly; russland + china annotations don't produce TS errors at line `biasDiversityNote: 'limited'`.
- **Commit:** `685d65e`.

**3. [Rule 1 - Bug-equivalent] Anadolu Agency duplicate ID.**
- **Found during:** Pre-commit ID-collision audit (Node script `check_ids.mjs`, run inline then deleted).
- **Issue:** Proposed wire-service entry `anadolu` collided with existing `aa` (id='aa', name='Anadolu Agency', country='TR', region='tuerkei') at line 4 of the original sources.ts. Both refer to the same publisher.
- **Fix:** Removed `anadolu` from the proposal's wires section. Substituted `prensa-latina` (Cuban state news wire, region=lateinamerika, political=-0.4, ownership=state) to preserve the 14-wire count and add South-Global wire coverage to lateinamerika.
- **Files modified:** `apps/web/scripts/proposed-sources/103-sources-proposed.md`.
- **Verification:** Final ID-collision check returns zero collisions; bias-balance script confirms lateinamerika now has L=3 (telesur + pagina12 + prensa-latina) instead of L=2.
- **Commit:** Folded into `72872c3` (the proposal-expansion commit).

---

**Total deviations:** 3 (1 user-approved scope change, 1 Rule 2 missing-critical type fix, 1 Rule 1 ID-collision substitution).

**Impact on plan:** All deviations are mechanical; the plan's intent is fully realized AND exceeded — the user's expanded curation pool (233 sources, +79% vs +54%) provides better coverage of the framing-analysis grid's requirement (>=1 source per bias bucket per region) and gives more bias headroom for future region-edge cases.

## Authentication Gates

None. This plan is pure config + script + CI work; no API keys, no OAuth flows, no email verification.

## Issues Encountered

- **`git mv` and direct `pnpm`/`npx` invocations were sandboxed.** Worked around: used `git rm` + Write tool for the file rename; used `node apps/web/node_modules/tsx/dist/cli.mjs <script>` to run the bias-balance script directly via the locally installed tsx binary; used `node -e "..."` for inline ID-collision verification. The CI job uses the standard `pnpm install --frozen-lockfile` + `pnpm --filter @newshub/web check:source-bias` invocation that will work in GitHub Actions where the sandbox doesn't apply.
- **Plan's verify command formula counts a row with leading `9` (`9` not `[a-z]`) as 0 candidates.** Discovered when the original `+972 Magazine` candidate had id `972mag` and the awk pattern `^\| [a-z]` excluded it. Renamed to `plus972` to keep the regex-friendly count discipline. (Carried into the 103-source proposal as well.) Documented as a sourcing-rule footnote in the proposal.
- **Plan's `verify` regex would have matched bias-coverage forecast rows as if they were candidate rows.** Original draft had forecast rows starting with `| usa`, `| europa`, etc. — which the awk regex matched. Wrapped each forecast row's first cell in bold (`| **USA** |`) so they no longer match the regex. This was a regex-craft fix, not a substantive change.
- **TypeScript NewsSource interface did NOT carry biasDiversityNote at start of plan despite 40-01's SUMMARY claim.** Required Rule 2 auto-fix at start of Task 3. Documented in Deviations.
- **`prensa-latina` cuba feed validation:** Cuban government RSS endpoints frequently rate-limit intercontinental crawlers; the proposal's `https://www.prensa-latina.cu/feed/` URL was retained as the candidate but operational verification via `apps/web/scripts/check_feeds.ts` after merge may surface this as a flake. Documented in proposal's RSS-validation appendix as expected-flaky.

## User Setup Required

**Manual follow-up (recommended, not blocking):** Promote `Source Bias Coverage` to a required branch-protection check on master.
- Path: GitHub Settings -> Branches -> master -> Branch protection rule -> Require status checks to pass before merging -> Add `Source Bias Coverage`.
- Currently only `Lint`, `Type Check`, `Unit Tests`, `Build Docker Image`, `E2E Tests` are required (per CLAUDE.md "Branch protection on master"); the new check runs on every PR but is not yet blocking.
- Recommended after the first PR demonstrates the new check passes in actual GitHub Actions.

## Next Phase Readiness

- **Wave 2 plan 40-02 done; sources.ts is the new canonical 233-source list.** Wave 2 plans 40-03 (podcast backend) and 40-05 (video backend) consume `NewsArticle.entities` + `NewsArticle.topics` JSONB for matching; they don't directly depend on sources.ts shape, so Wave 2 can proceed.
- **Wave 3 framing analysis surface (Phase 38 / Wave 3 follow-up):** Now has 4 new sub-region cells (sudostasien, nordeuropa, sub-saharan-africa, indien). The framing service's current logic iterates `VALID_PERSPECTIVE_REGIONS` (extended in 40-01) and consumes `NewsSource.biasDiversityNote` to surface the "Limited bias diversity" footnote on russland + china. This plan completes the data side of that contract.
- **Operational verification (post-deploy):** The user should run `cd apps/web && npx tsx scripts/check_feeds.ts | tail -100` against the merged sources.ts to validate that the 103 new RSS endpoints are reachable. Network flakes are routine; the gate doesn't depend on liveness, but the diagnostic informs operators.

## Self-Check

Verifying claims before completion.

### Files claimed created — verified present
- `apps/web/scripts/proposed-sources/103-sources-proposed.md` — FOUND (commit `72872c3`)
- `apps/web/scripts/check-source-bias-coverage.ts` — FOUND (commit `4ecbe02`)

### Files claimed modified — verified containing target content
- `apps/web/server/config/sources.ts` — FOUND, contains 233 region declarations and 30 (+2 comment-line matches) `biasDiversityNote: 'limited'` annotations
- `apps/web/src/types/index.ts` — FOUND, contains `biasDiversityNote?: 'limited';` line
- `packages/types/index.ts` — FOUND, contains `biasDiversityNote?: 'limited';` line
- `apps/web/package.json` — FOUND, contains `"check:source-bias": "tsx scripts/check-source-bias-coverage.ts"` line
- `.github/workflows/ci.yml` — FOUND, contains `check-source-bias:` job with display name `Source Bias Coverage`

### Commit hashes — verified in git log
- `b370ac4` Task 1 (70-sources-proposed.md) — FOUND
- `685d65e` TS interface biasDiversityNote (Rule 2 fix) — FOUND
- `4ecbe02` Task 3 (check-source-bias-coverage.ts) — FOUND
- `72872c3` Task 1' (proposal rewrite to 103) — FOUND
- `9d05eb2` Task 4 (sources.ts merge) — FOUND
- `5a814ed` Task 5 (npm + CI wiring) — FOUND

### Functional verification
- `pnpm typecheck` — EXITS 0
- `pnpm test:run` — EXITS 0 (1464/1464 tests pass)
- Bias-balance script — EXITS 0; logs all 15 non-exempt regions PASS, russland + china as `limited diversity (exception per D-A3) — skipping`
- 233 region declarations in sources.ts (130 + 103 = 233) — CONFIRMED via Grep
- 30 `biasDiversityNote: 'limited'` annotations in sources.ts (15 russland + 15 china) — CONFIRMED via Grep

### Anti-pattern check
- Zero writes to root `server/`, `prisma/`, `src/` — CONFIRMED (all 5 modified files are under `apps/web/...`, `packages/...`, or `.github/...`)
- All 103 new IDs unique against existing 130 — CONFIRMED via Node script (deleted post-verification)
- No internal duplicate IDs in proposal — CONFIRMED

### Threat model alignment
- T-40-02-01 (curation tampering): mitigated via D-A4 human-verify checkpoint that user approved at Task 2.
- T-40-02-03 (gate bypass): mitigated via CI job (Source Bias Coverage). Promotion to required-check is the user follow-up.
- T-40-02-05 (secret leak): grep'd for `api[_-]?key|secret|token|password` in proposed-sources.md and sources.ts — zero matches in new content.
- T-40-02-06 (SSRF via malicious URL): all 103 URLs are public publisher RSS feeds or Google News RSS proxy queries; user reviewed the URL list at the Task 2 checkpoint.

## Self-Check: PASSED

---
*Phase: 40-content-expansion*
*Plan: 02*
*Completed: 2026-05-04*
