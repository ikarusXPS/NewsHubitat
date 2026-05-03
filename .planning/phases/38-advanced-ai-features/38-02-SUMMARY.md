---
phase: 38-advanced-ai-features
plan: 2
subsystem: services
tags: [phase-38, ai-service, services, credibility, framing, factcheck, cache, prompts, zod, postgres-fts]

# Dependency graph
requires:
  - phase: 38.1
    provides: NewsArticle.search_tsv tsvector + GIN index; FactCheck Prisma model + regenerated client
provides:
  - credibilityService.ts pure functions (deriveCredibilityScore / deriveBiasBucket / bucketConfidence)
  - factCheckReadService.ts Postgres FTS read layer (searchClaimEvidence + mergeAndDedup)
  - Three LLM prompt builders (credibility / framing / factCheck) with prompt-injection mitigation
  - Three new methods on AIService singleton (getSourceCredibility / generateFramingAnalysis / factCheckClaim)
  - safeParseJson<T>(raw, schema) helper exported from aiService.ts (defensive LLM JSON extract)
  - CacheKeys namespaces: credibility / factCheck / framing (with new 2-arg signature for framing)
affects: [38-03-routes, 38-05-ui, 38-06-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defensive LLM JSON parsing: regex `/\\{[\\s\\S]*\\}/` extract + Zod safeParse + null fallback (Pitfall 1: free OpenRouter/Gemma models do not honor response_format)"
    - "vi.hoisted shared mock state for prisma + translationService + factCheckReadService cross-test mocks"
    - "Postgres FTS via $queryRaw + websearch_to_tsquery('simple', $1) + ts_rank against generated tsvector column"
    - "Three-layer LLM-call fallback: empty articles / null LLM / malformed JSON → typed-safe degraded result, never throws"
    - "Cache-hit-still-writes-audit-row pattern (D-16): every call lands a FactCheck row regardless of cache hit"

key-files:
  created:
    - "apps/web/server/services/credibilityService.ts (70 lines)"
    - "apps/web/server/services/credibilityService.test.ts (119 lines, 19 tests)"
    - "apps/web/server/services/factCheckReadService.ts (87 lines)"
    - "apps/web/server/services/factCheckReadService.test.ts (151 lines, 11 tests)"
    - "apps/web/server/prompts/credibilityPrompt.ts (42 lines)"
    - "apps/web/server/prompts/framingPrompt.ts (53 lines)"
    - "apps/web/server/prompts/factCheckPrompt.ts (69 lines)"
    - "apps/web/server/services/aiService.credibility.test.ts (268 lines, 12 tests)"
    - "apps/web/server/services/aiService.framing.test.ts (312 lines, 6 tests)"
    - "apps/web/server/services/aiService.factCheck.test.ts (392 lines, 7 tests)"
  modified:
    - "apps/web/server/services/aiService.ts (+602 lines: safeParseJson + 3 new types + 3 new methods + 5 private helpers)"
    - "apps/web/server/services/cacheService.ts (+12 lines: framing rename to 2-arg + new credibility/factCheck keys)"
    - "apps/web/server/services/cacheService.test.ts (+12 lines: updated framing test, added credibility/factCheck tests)"
    - "apps/web/server/services/aiService.test.ts (+37 lines: vi.mock entries for newsReadService/translationService/prisma/factCheckReadService — Rule 3 fixes)"

key-decisions:
  - "FR translation falls through to original claim text since translationService.TargetLang is 'de' | 'en' only — graceful degradation, FTS 'simple' config tokenizes any input language so multi-language search still works on the de/en branches"
  - "FactCheck audit row written on EVERY factCheckClaim call (cache hit AND miss) per D-16 — analytics + audit case 'most fact-checked claims this week' demands every user request lands a row"
  - "Existing CacheKeys.framing(topic) only consumer was the cacheService.test.ts test itself — analysis.ts route uses HTTP Cache-Control header, not Redis directly — so the rename to (topicHash, locale) is safe within this wave"
  - "Bias bucket is set to deriveBiasBucket(source.bias.political) for normal results but defaults to 'center' in fallbackCredibility (sourceNotFound path) to keep type-safe shape consistent"
  - "Out-of-range citationIndices are silently skipped (continue), not errors — prompt-engineering noise should not surface to user"

patterns-established:
  - "When extending aiService.ts to import new modules (newsReadService / prisma / translationService / factCheckReadService), update ALL existing aiService test files with matching vi.mock entries — top-of-module imports trigger the prisma module-load chain and break tests that don't mock it"
  - "Use vi.hoisted to share mock state between vi.mock factories and test setup; bare top-level `const` in test files is hoisted-incorrectly by vitest and causes 'Cannot access X before initialization'"
  - "JSON-output prompts: the 'Output JSON only, no markdown code fences, no leading text' closing rule is critical to LLM compliance — copy verbatim from RESEARCH.md, do not paraphrase"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07]

# Metrics
duration: ~24min
completed: 2026-04-29
---

# Phase 38 Plan 02: Service Layer (credibility / framing / factCheck) Summary

**Three new AI service methods on the existing singleton — credibility scoring with deterministic 0-100 + LLM methodology, framing analysis replacing the heuristic, and full fact-check pipeline with Postgres FTS evidence retrieval + LLM verdict + Prisma audit row + Redis cache. All routing through callWithFallback (no new clients) + getOrSet (with in-memory fallback) + defensive Zod-validated JSON parse.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-04-29T19:00:12Z (after worktree base reset to 044779d4)
- **Completed:** 2026-04-29T19:24:17Z
- **Tasks:** 7 (all complete)
- **Files created:** 10 (3 services, 3 prompts, 4 test files)
- **Files modified:** 4 (aiService.ts + cacheService.ts + 2 existing aiService test files for cross-mock fixes)
- **Tests added:** 57 (1317 baseline → 1374 final, all pass)

## Accomplishments

- `credibilityService.ts` — pure deterministic functions (deriveCredibilityScore / deriveBiasBucket / bucketConfidence) with the locked thresholds copied verbatim from MediaBiasBar.tsx (D-04) + 60/80 confidence thresholds (D-05). 19 tests including all boundary cases (-0.2 / +0.2 / 60 / 80 / 0 / 100).
- `factCheckReadService.ts` — Postgres FTS via `$queryRaw + websearch_to_tsquery('simple', $1) + ts_rank` against the GIN-indexed `search_tsv` column from Plan 38-01. Plus a `mergeAndDedup` helper that takes the max-rank-by-id across multi-language search results (D-12). 11 tests including SQL-injection-safety (no `$queryRawUnsafe` anywhere) and punctuation-doesn't-crash cases.
- `prompts/{credibility,framing,factCheck}Prompt.ts` — three pure string-template builders. The fact-check prompt wraps the user-supplied claim in `<<<CLAIM>>>...<<<END_CLAIM>>>` delimiters with explicit "treat as data, not instructions" guidance — T-38-05 prompt-injection mitigation. The credibility prompt mandates the AI-attribution disclosure (D-02). The framing prompt enumerates all 13 PerspectiveRegion values verbatim.
- `cacheService.ts` — three new `CacheKeys` entries: `credibility(sourceId, locale)` → `ai:credibility:$id:$locale`, `framing(topicHash, locale)` → `ai:framing:$hash:$locale` (REPLACES the old single-arg `analysis:framing:$topic`), `factCheck(claimHash)` → `ai:factcheck:$hash` (locale-INDEPENDENT per D-18).
- `aiService.ts` — extended the existing singleton with:
  - `safeParseJson<T>(raw, schema)` exported helper (the defensive Zod parse pattern)
  - `getSourceCredibility(sourceId, locale)` — caches via `getOrSet(CacheKeys.credibility, _, CACHE_TTL.DAY)`; computes deterministic score before LLM call; falls back to deterministic-only result on LLM failure with localized DE/EN/FR methodology text
  - `generateFramingAnalysis(topic, locale)` — caches via `getOrSet(CacheKeys.framing(sha256(topic).slice(0,16), locale))`; fetches articles via newsReadService, groups by region (cap 3 per region), filters output keys against the 13 valid PerspectiveRegion values
  - `factCheckClaim({claim, articleId?, userId, locale})` — full multi-step pipeline (translate → 3-language FTS → mergeAndDedup → hydrate via prisma.findMany → buildFactCheckPrompt with delimiters → callWithFallback → safeParseJson → resolve citations → write FactCheck audit row → cache for 24h). Cache hit STILL writes audit row per D-16.
- All three new methods route through `this.callWithFallback` and `this.cacheService.getOrSet|get|set` — no new client instantiation, no new Redis client. Verified: only 3 `new Anthropic(/new OpenAI(/new GoogleGenerativeAI(` occurrences in aiService.ts, all in the existing private constructor.

## Task Commits

Each task committed atomically (all `--no-verify` per parallel-executor protocol):

1. **Task 1: credibilityService.ts + tests (TDD)** — `32cc71d` (feat)
2. **Task 2: factCheckReadService.ts + tests (TDD)** — `78a81eb` (feat)
3. **Task 3: 3 prompt templates** — `88a0e88` (feat)
4. **Task 4: extend CacheKeys** — `1d53117` (feat)
5. **Task 5: safeParseJson + getSourceCredibility + tests (TDD)** — `c3effe6` (feat)
6. **Task 6: generateFramingAnalysis + tests (TDD)** — `d236e5a` (feat)
7. **Task 7: factCheckClaim + tests (TDD)** — `d281114` (feat)

_Note: This plan does NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after the wave completes._

## Files Created/Modified

### Created (10 files)
- `apps/web/server/services/credibilityService.ts` — 70 lines, 3 pure exports + 1 type
- `apps/web/server/services/credibilityService.test.ts` — 119 lines, 19 tests
- `apps/web/server/services/factCheckReadService.ts` — 87 lines, searchClaimEvidence + mergeAndDedup
- `apps/web/server/services/factCheckReadService.test.ts` — 151 lines, 11 tests (uses vi.hoisted)
- `apps/web/server/prompts/credibilityPrompt.ts` — 42 lines, buildCredibilityPrompt
- `apps/web/server/prompts/framingPrompt.ts` — 53 lines, buildFramingPrompt
- `apps/web/server/prompts/factCheckPrompt.ts` — 69 lines, buildFactCheckPrompt + FactCheckEvidenceSnippet type
- `apps/web/server/services/aiService.credibility.test.ts` — 268 lines, 12 tests (5 safeParseJson + 7 getSourceCredibility)
- `apps/web/server/services/aiService.framing.test.ts` — 312 lines, 6 tests
- `apps/web/server/services/aiService.factCheck.test.ts` — 392 lines, 7 tests

### Modified (4 files)
- `apps/web/server/services/aiService.ts` — +602 lines net: zod + crypto imports; safeParseJson helper; Locale + CredibilityResult + FramingPerspective + FramingAnalysis + Verdict + FactCheckCitation + FactCheckResult types; 3 new public methods + 8 private helpers; full-import chain for newsReadService / factCheckReadService / translationService / prisma
- `apps/web/server/services/cacheService.ts` — +12 lines: framing renamed (topicHash, locale); credibility(sourceId, locale); factCheck(claimHash)
- `apps/web/server/services/cacheService.test.ts` — +12 lines: updated framing test signature; added credibility/factCheck assertions
- `apps/web/server/services/aiService.test.ts` — +37 lines: vi.mock entries for newsReadService / factCheckReadService / translationService / prisma (Rule 3 fix to keep existing tests passing after aiService.ts gained those imports)

## Decisions Made

1. **`@map`-style Postgres column reference in raw SQL** — confirmed Plan 38-01's deviation: `searchTsv` Prisma field maps to `search_tsv` column. The `$queryRaw` template uses `search_tsv` (snake_case), as documented in 38-01-SUMMARY.md and the file-level docstring of `factCheckReadService.ts`.

2. **FR target falls through in `translateClaimToAllLanguages`** — `translationService.TargetLang` is hard-coded `'de' | 'en'` and the existing service does not accept `'fr'`. Rather than extend `translationService` (out-of-scope architectural change), `factCheckClaim` translates the claim to DE + EN + uses the original claim text for the FR FTS branch. The FTS index uses `'simple'` Postgres config which is language-agnostic; D-12 cross-language search remains satisfied for the DE/EN branches and degrades gracefully for FR. Documented in the `aiService.ts` comments (lines 996-1002 + 1108-1117).

3. **Cache-hit-still-writes-audit-row** — D-16 specifies every fact-check call lands a `FactCheck` row "even cache hits", so analytics queries like "top 10 fact-checked claims this week" reflect actual user activity rather than only fresh inferences. Implemented as: cache-hit branch reads the cached result, calls `writeFactCheckRow` with the cached verdict/confidence/methodology, returns `{...cached, cached: true}`.

4. **`safeParseJson` returns `null`, not throws** — callers provide typed fallbacks (deterministic-only for credibility, empty perspectives for framing, verdict='unverified' for factCheck). This matches the existing `analyzeSentiment` / `classifyTopics` style: errors degrade silently to deterministic / keyword / empty fallbacks rather than propagating to the route layer.

5. **Bias bucket on fallback** — `fallbackCredibility` (used only in the unknown-source path) sets `bias: 'center'` because there is no political-bias signal to derive from. The LLM-success and LLM-fail-but-source-known paths both compute bias via `deriveBiasBucket(source.bias.political)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vi.hoisted required for top-level mock variables in factCheckReadService.test.ts**
- **Found during:** Task 2 (RED phase ran successfully, but GREEN phase test execution failed with `ReferenceError: Cannot access 'mockQueryRaw' before initialization`)
- **Issue:** Vitest hoists `vi.mock` factory calls to top of file but does NOT hoist bare `const` declarations, so the factory ran before the mock fns were defined.
- **Fix:** Refactored to use `vi.hoisted(() => ({mockQueryRaw, mockLoggerError}))` pattern, matching the existing repo convention (see `aiService.test.ts:58-71`).
- **Files modified:** `apps/web/server/services/factCheckReadService.test.ts`
- **Committed in:** `78a81eb` (Task 2 — fixed before commit)

**2. [Rule 3 - Blocking] aiService.ts new top-of-file imports broke pre-existing tests**
- **Found during:** Task 6 (after adding `import * as newsReadService from './newsReadService'` to aiService.ts, the pre-existing `aiService.test.ts` and `aiService.credibility.test.ts` failed at module-load time with `DATABASE_URL environment variable is required`).
- **Issue:** newsReadService imports prisma at top-of-file, which throws if `DATABASE_URL` is not set in the test env. The existing tests didn't mock newsReadService because they didn't need to — but my new aiService.ts code does, so they now do too.
- **Fix:** Added matching `vi.mock('./newsReadService', ...)` calls + `CACHE_TTL` mock to `aiService.test.ts` (the legacy test) AND `aiService.credibility.test.ts` (Task 5's test). Repeated in Task 7 for `factCheckReadService` / `translationService` / `prisma` after those imports were added.
- **Files modified:** `apps/web/server/services/aiService.test.ts`, `apps/web/server/services/aiService.credibility.test.ts`, `apps/web/server/services/aiService.framing.test.ts`
- **Verification:** Full suite went from 1317 (Plan 38-01 baseline) → 1374 pass (1317 + 57 new tests, no regressions).
- **Committed in:** `d236e5a` (Task 6 — first batch) and `d281114` (Task 7 — additional mocks added)

**3. [Rule 3 - Blocking] translationService.TargetLang is 'de' | 'en' only — plan called for 'fr' translation**
- **Found during:** Task 7 (writing `factCheckClaim` per the plan's explicit code: `translationService.translate(claim, 'fr')`).
- **Issue:** TS error `Argument of type '"fr"' is not assignable to parameter of type '"de" | "en"'`. Extending TargetLang to add 'fr' is an architectural change to the existing translationService (touches DeepL targetLang validation, Google API call, Anthropic prompt, etc.) — out of scope for this plan.
- **Fix:** `translateClaimToAllLanguages` translates only to DE + EN; FR target falls through to the original claim text. The `'simple'` Postgres FTS config is language-agnostic so the FR-branch FTS search still produces sensible matches against multi-language articles. Documented in the method's JSDoc.
- **Files modified:** `apps/web/server/services/aiService.ts` lines 1108-1135
- **Committed in:** `d281114` (Task 7)

**4. [Rule 1 - Bug] Plan grep gate `! grep -q '$queryRawUnsafe'` triggered by my own JSDoc**
- **Found during:** Task 2 verification step
- **Issue:** I wrote `(NOT $queryRawUnsafe)` in the file-level docstring as a safety reminder; the plan's verify gate `! grep -q '\$queryRawUnsafe'` then matched my comment.
- **Fix:** Reworded the JSDoc to describe the unsafe API by name without using the exact `$queryRawUnsafe` literal: "the unsafe string-interpolation variant is intentionally NOT used here".
- **Files modified:** `apps/web/server/services/factCheckReadService.ts`
- **Committed in:** `78a81eb` (Task 2 — fixed before commit)

---

**Total deviations:** 4 auto-fixed (3 blocking — vi.hoisted, prisma module-load chain, fr translation; 1 bug — grep self-trip)
**Impact on plan:** All deviations were caused by patterns the plan didn't anticipate (vitest hoisting semantics, prisma top-of-file init, translationService TargetLang scope). End-state matches must_haves exactly. No scope creep.

## Issues Encountered

None beyond the 4 deviations above. The deterministic functions (Task 1) and prompt builders (Task 3) ran clean. The CacheKeys extension (Task 4) hit one downstream test that needed updating — a clean replace pattern. The three aiService method additions (Tasks 5-7) cascade-broke pre-existing aiService.test.ts in a predictable way (top-of-file imports), each fixed with vi.mock additions.

## Verification Probes

```text
typecheck (apps/web + packages/types) → exit 0
test:run → 1374/1374 pass, 53/53 files pass (1317 baseline + 57 new from this plan)

grep gates (all OK):
  Task 1: deriveCredibilityScore, deriveBiasBucket, bucketConfidence, reliability * 7, Math.abs
  Task 2: searchClaimEvidence, websearch_to_tsquery, 'simple', mergeAndDedup, !$queryRawUnsafe
  Task 3: buildCredibilityPrompt, buildFramingPrompt, buildFactCheckPrompt,
          AI-attributed estimates, <<<CLAIM>>>, unverified, NewsHub corpus, "usa, europa, deutschland"
  Task 4: ai:credibility:, ai:framing:, ai:factcheck:
  Task 5: safeParseJson, getSourceCredibility, computeCredibility, CacheKeys.credibility,
          deriveCredibilityScore, this.callWithFallback
  Task 6: generateFramingAnalysis, CacheKeys.framing, buildFramingPrompt, aiGenerated:
  Task 7: factCheckClaim, CacheKeys.factCheck, searchClaimEvidence, mergeAndDedup,
          prisma.factCheck.create, translationService.translate, buildFactCheckPrompt

No new client instantiation outside constructor:
  grep -c '^new Anthropic(\|new OpenAI(\|new GoogleGenerativeAI(' aiService.ts → 2
  (raw count of 2 lines = 3 instances total — Anthropic + OpenAI + Gemini, all inside private constructor)
```

## Self-Check: PASSED

- ✓ All 10 created files exist and contain expected exports
- ✓ All 4 modified files reflect the planned changes
- ✓ Commits b32cc71d / 78a81eb / 88a0e88 / 1d53117 / c3effe6 / d236e5a / d281114 all present in `git log`
- ✓ Typecheck exit 0 (apps/web + packages/types)
- ✓ Test suite: 1374/1374 pass (no regressions; 57 new tests added across 5 new test files + extended cacheService test)
- ✓ All three aiService methods route through `this.callWithFallback` (no new clients)
- ✓ All three aiService methods route through `this.cacheService.getOrSet|get|set` (no new Redis client)
- ✓ All LLM JSON outputs parsed via `safeParseJson` (regex-extract + Zod safeParse + null fallback)
- ✓ All cache keys land in the expected namespaces (`ai:credibility:`, `ai:framing:`, `ai:factcheck:`)

## User Setup Required

None — all changes are server-side; no env vars, no migrations, no external services.

## Next Phase Readiness

**Plan 38-03 (routes) can wire the three endpoints directly to:**
- `POST /api/ai/fact-check` → `AIService.getInstance().factCheckClaim({claim, articleId?, userId, locale})`
- `GET /api/ai/source-credibility/:sourceId` → `AIService.getInstance().getSourceCredibility(sourceId, locale)`
- `GET /api/analysis/framing/:topic` → `AIService.getInstance().generateFramingAnalysis(topic, locale)`

The three exported result interfaces are typed and ready for Plan 38-05 UI consumption: `CredibilityResult`, `FramingAnalysis`, `FactCheckResult`.

**Note for Plan 38-03 (routes):** The `factCheckClaim` service method does NOT enforce tier limits or claim-text validation — those are route-layer concerns (per the threat-model `<accept>` in the plan: "service trusts the args it receives"). Plan 38-03 must add `aiTierLimiter` middleware + Zod claim-text length cap (≤500 chars per RESEARCH.md security row) + regex injection-pattern detection at the route boundary.

**Note for production migration coordination:** This plan ran against the dev DB only (FactCheck row writes go through Prisma against the dev DB). Production DB migration was deferred by Plan 38-01 to v1.6 ship coordination — same applies here; no separate concern.

---

*Phase: 38-advanced-ai-features*
*Completed: 2026-04-29*
