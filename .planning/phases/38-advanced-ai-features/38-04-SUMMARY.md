---
phase: 38-advanced-ai-features
plan: 04
subsystem: ui
tags: [phase-38, i18n, locales, react-i18next, factcheck, credibility, fr-locale-creation]

# Dependency graph
requires:
  - phase: 36.4-i18n-pwa-mobile
    provides: i18next + i18next-icu setup, namespace-loading via http-backend, DE/EN/FR supportedLngs config
provides:
  - apps/web/public/locales/{de,en,fr}/factcheck.json (verdict labels, button, drawer, error, unverified)
  - apps/web/public/locales/{de,en,fr}/credibility.json (pill, drawer, bias, confidence, framing)
  - apps/web/src/i18n/i18n.ts namespace registration for factcheck + credibility
affects: [38-05, 38-06, future fr-locale-completion phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Namespace split: factcheck.* keys in factcheck.json; credibility.* / bias.* / confidence.* / framing.* in credibility.json (per RESEARCH.md namespace-split recommendation)"
    - "FR locale carve-out: only factcheck + credibility translated this phase; auth/common/dashboard/etc. fall back to English via i18next fallbackLng: 'en' (planner-acknowledged scope discipline, NOT silent omission)"
    - "ICU-style score interpolation: '{{score}}/100' in credibility.drawer.score across all three locales"

key-files:
  created:
    - apps/web/public/locales/en/factcheck.json
    - apps/web/public/locales/de/factcheck.json
    - apps/web/public/locales/fr/factcheck.json
    - apps/web/public/locales/en/credibility.json
    - apps/web/public/locales/de/credibility.json
    - apps/web/public/locales/fr/credibility.json
  modified:
    - apps/web/src/i18n/i18n.ts

key-decisions:
  - "Followed RESEARCH.md namespace-split recommendation: credibility.json owns bias, confidence, and framing keys (not just credibility-prefixed keys), keeping the related media-bias surface co-located"
  - "FR locale scope discipline preserved: only factcheck + credibility translated this phase; existing FR namespaces (auth, common, dashboard, settings) intentionally NOT backfilled — fallbackLng: 'en' handles missing keys"
  - "Verdict keys named 'mostly-true' (kebab-case) in JSON to align with VerdictSchema enum values consumed by Plan 38-05 components"

patterns-established:
  - "Phase 38 i18n surface: t('factcheck:verdicts.<key>') and t('credibility:<group>.<key>') resolve to localized strings in DE/EN/FR"
  - "UTF-8 preservation gate: per-file grep verification that DE umlauts (Größtenteils, Schließen, Glaubwürdigkeit) and FR accents (Plutôt, Méthodologie, Crédibilité, élevée, Généré) are stored as literal multi-byte sequences, not transliterated to ASCII"

requirements-completed: [AI-01, AI-03, AI-05, AI-06]

# Metrics
duration: 2m30s
completed: 2026-04-29
---

# Phase 38 Plan 04: i18n Locale Files for Fact-Check + Credibility Summary

**Six new JSON locale files (factcheck.json + credibility.json across DE/EN/FR) plus i18next namespace registration so Plan 38-05 components can resolve `t('factcheck:verdicts.true')` / `t('credibility:bias.left')` without falling through to raw keys**

## Performance

- **Duration:** 2m 30s
- **Started:** 2026-04-29T19:29:08Z
- **Completed:** 2026-04-29T19:31:38Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 edited)

## Accomplishments
- All 5 verdict labels (true / mostly-true / mixed / unverified / false per D-08 LOCKED) translated for DE/EN/FR
- All 3 confidence buckets (low / medium / high per D-05 LOCKED) translated for DE/EN/FR
- All 3 bias buckets (left / center / right per D-04 LOCKED) translated for DE/EN/FR
- All UI labels from RESEARCH.md §i18n String Inventory (lines 950-1000) covered: button labels, drawer labels (title/methodology/citations/close/noCitations/subDimensions/accuracy/transparency/corrections/disclosure/score), error messages (tooShort/tooLong/rateLimit/rejected/generic), unverified explanation, framing aiGenerated badge + 4 sections + noData
- FR locale directory expanded from 1 file (pricing.json only) to 3 files (+ factcheck.json + credibility.json) — explicitly NOT backfilling other FR namespaces this phase per CONTEXT.md scope_reduction_prohibition's "split, don't reduce" boundary
- i18n.ts ns array updated: `['common', 'share', 'teams', 'pricing', 'factcheck', 'credibility']`
- escapeValue: false preserved (T-38-18 mitigation regression probe passes — React handles XSS for `{{score}}` interpolation)

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-executor convention to avoid pre-commit hook contention with concurrent 38-03 worktree):

1. **Task 1: Create three factcheck.json locale files** — `d695ea4` (feat)
2. **Task 2: Create three credibility.json locale files** — `749e41f` (feat)
3. **Task 3: Register factcheck + credibility i18n namespaces** — `17db04d` (feat)

## Files Created/Modified

**Created (6 JSON locale files, all UTF-8 without BOM, LF line endings):**
- `apps/web/public/locales/en/factcheck.json` — English fact-check UI strings (verdicts, button, drawer, error, unverified)
- `apps/web/public/locales/de/factcheck.json` — German fact-check UI strings (verbatim from RESEARCH.md §i18n String Inventory)
- `apps/web/public/locales/fr/factcheck.json` — French fact-check UI strings (NEW namespace for fr/ directory)
- `apps/web/public/locales/en/credibility.json` — English credibility / bias / confidence / framing strings
- `apps/web/public/locales/de/credibility.json` — German credibility namespace
- `apps/web/public/locales/fr/credibility.json` — French credibility namespace (NEW)

**Modified:**
- `apps/web/src/i18n/i18n.ts` — Added `'factcheck'` and `'credibility'` to the `ns:` array on line 16; comment updated to reflect Phase 38 addition. No other config changes (defaultNS, fallbackLng, loadPath, escapeValue all unchanged).

## Decisions Made

- **Namespace split as recommended:** `factcheck.json` owns only `factcheck.*` keys; `credibility.json` owns `credibility.*` + `bias.*` + `confidence.*` + `framing.*` keys (per RESEARCH.md §"Recommended namespace split" lines 1005-1008). This keeps the related media-bias / confidence / framing surface co-located and reduces the namespace count Plan 38-05 components need to subscribe to.
- **FR locale scope discipline:** Created the two new FR namespaces (factcheck + credibility) only. Did NOT backfill the other existing English namespaces (auth, common, dashboard, settings, share, teams) into French. Rationale: per CONTEXT.md scope_reduction_prohibition's "split, don't reduce" boundary, the right place to backfill missing FR translations is a dedicated "FR locale completion" phase, not bolted onto Phase 38. The app does not crash on missing FR keys — `fallbackLng: 'en'` (i18n.ts:14) renders English at runtime for any unresolved key.
- **Kebab-case verdict key `mostly-true`:** JSON key matches the VerdictSchema enum value `mostly-true` so Plan 38-05's `<VerdictPill verdict={response.verdict}>` can do a direct `t(\`factcheck:verdicts.\${verdict}\`)` lookup without re-mapping.

## Deviations from Plan

None — plan executed exactly as written. The plan's locked content blocks (per-locale JSON bodies, single-line ns: edit) were copied verbatim. No Rule 1/2/3 auto-fixes triggered; no Rule 4 architectural questions surfaced.

## Issues Encountered

- **Worktree base mismatch at startup:** Initial `git merge-base HEAD <expected-base>` returned `e8a976f4...` instead of `9694c333...`. Per the orchestrator's `<worktree_branch_check>` block, hard-reset to the correct base; reset succeeded and HEAD verification passed before any work began. No data lost (working tree was clean prior to reset).
- **Git CRLF warnings (informational):** Git warned `LF will be replaced by CRLF the next time Git touches it` for the six JSON files on commit. This is the standard Windows `core.autocrlf` warning — the files are stored with LF in the index/repo and converted to CRLF only in the working tree for editor convenience. No action needed; on-disk files are LF as required.

## User Setup Required

None — no external service configuration required. Plan 38-05 will exercise these locale files at runtime via the standard `useTranslation('factcheck')` / `useTranslation('credibility')` hooks; no env vars, no API keys, no dashboard config.

## Verification Evidence

- **JSON parse (all 6 files):** `node -e "JSON.parse(require('fs').readFileSync(...))"` exit 0 for every file
- **UTF-8 preservation (DE):** `grep -q 'Größtenteils' de/factcheck.json` → match; `grep -q 'Glaubwürdigkeit' de/credibility.json` → match; `grep -q 'Schließen' de/factcheck.json` → match
- **UTF-8 preservation (FR):** `grep -q 'Plutôt' fr/factcheck.json` → match; `grep -q 'Méthodologie' fr/factcheck.json` → match; `grep -q 'Crédibilité' fr/credibility.json` → match; `grep -q 'élevée' fr/credibility.json` → match; `grep -q 'Généré' fr/credibility.json` → match
- **BOM check (all 6 files):** First 3 bytes are `{ \n  ` — no BOM (`EF BB BF`) present
- **Line endings:** `grep -lU $'\r'` returns empty — pure LF on every file
- **Namespace edit:** `grep -q "ns: \['common', 'share', 'teams', 'pricing', 'factcheck', 'credibility'\]" apps/web/src/i18n/i18n.ts` → match
- **T-38-18 regression probe:** `grep -q "escapeValue: false" apps/web/src/i18n/i18n.ts` → match (XSS-handling assumption preserved)
- **Typecheck:** `pnpm typecheck` exit 0 (apps/web TypeScript strict mode passes)
- **Unit tests:** `pnpm test -- i18n --run` → 1374 tests passing across 53 test files (no i18n-namespace-array assertions broken)

## Self-Check: PASSED

- [x] `apps/web/public/locales/en/factcheck.json` exists
- [x] `apps/web/public/locales/de/factcheck.json` exists
- [x] `apps/web/public/locales/fr/factcheck.json` exists
- [x] `apps/web/public/locales/en/credibility.json` exists
- [x] `apps/web/public/locales/de/credibility.json` exists
- [x] `apps/web/public/locales/fr/credibility.json` exists
- [x] `apps/web/src/i18n/i18n.ts` updated
- [x] Commit `d695ea4` (Task 1) present in git log
- [x] Commit `749e41f` (Task 2) present in git log
- [x] Commit `17db04d` (Task 3) present in git log

## Next Phase Readiness

- Plan 38-05 (React components: CredibilityPill, BiasBadge, VerdictPill, FactCheckButton, FactCheckDrawer, CitationCard, FramingComparison rewrite) can now safely call `useTranslation('factcheck')` and `useTranslation('credibility')` and resolve every key listed in RESEARCH.md §i18n String Inventory without dev-mode missing-key fallthrough.
- Plan 38-06 verification gate's i18n probe (`curl http://localhost:5173/locales/de/factcheck.json | jq '.verdicts.true'` returns `"Wahr"`) will succeed once the dev server is up.
- No blockers introduced. The parallel 38-03 worktree (server routes / OpenAPI) operates on a disjoint file set; merge will be conflict-free.

## Threat Flags

None — no new security-relevant surface introduced. T-38-18 (Tampering of locale JSON → XSS via i18next interpolation) was already in the plan's threat register with disposition `accept`; the regression probe in Task 3 confirms the `escapeValue: false` assumption (which depends on React's auto-escape) holds.

---
*Phase: 38-advanced-ai-features*
*Plan: 04*
*Completed: 2026-04-29*
