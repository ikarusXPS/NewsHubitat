---
phase: 38-advanced-ai-features
plan: 3
subsystem: routes
tags: [phase-38, routes, openapi, zod, fact-check, framing, credibility, prompt-injection-rejection, bearer-auth]

# Dependency graph
requires:
  - phase: 38.1
    provides: NewsArticle.search_tsv tsvector + GIN index; FactCheck Prisma model + regenerated client
  - phase: 38.2
    provides: AIService.{factCheckClaim, getSourceCredibility, generateFramingAnalysis} singleton methods
provides:
  - POST /api/ai/fact-check HTTP endpoint (Zod-validated + prompt-injection-rejected)
  - GET /api/ai/source-credibility/:sourceId HTTP endpoint
  - GET /api/analysis/framing HTTP endpoint (rewritten — heuristic replaced by LLM-driven)
  - 8 new Zod schemas in openapi/schemas.ts (4 enums + 4 endpoint shapes)
  - BearerAuth security component + 3 path registrations in openapi/generator.ts
  - Regenerated public/openapi.json with the 3 new paths + BearerAuth
  - 13-case integration test suite for the new handlers
affects: [38-05-ui, 38-06-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Belt-and-suspenders prompt-injection defense: Zod 10-500 char cap (layer 1) + INJECTION_PATTERN regex at route entry (layer 2) + <<<CLAIM>>> delimiter in prompt template (layer 3, from Plan 38-02)"
    - "Exported route-handler functions (handleFactCheck, handleSourceCredibility) for direct unit test invocation without supertest dep — matches the req/res mock pattern from server/middleware/requireTier.test.ts"
    - "Code-first OpenAPI: Zod schemas drive both runtime validation in routes AND OpenAPI doc generation"
    - "Auth chain inheritance: routes mount under /api/ai chain at index.ts:167 (authMiddleware + aiTierLimiter); per-route authMiddleware is the documented anti-pattern"

key-files:
  created:
    - "apps/web/server/routes/ai.factCheck.test.ts (329 lines, 13 integration tests)"
  modified:
    - "apps/web/server/openapi/schemas.ts (+89 lines: 4 enums + 4 endpoint shapes including FactCheckRequest with 10-500 char cap)"
    - "apps/web/server/openapi/generator.ts (+120 lines: BearerAuth component + 3 registerPath blocks + 2 new tag descriptions)"
    - "apps/web/server/routes/ai.ts (+97 lines: AIService import, INJECTION_PATTERN, handleFactCheck, handleSourceCredibility, router.post/get registrations)"
    - "apps/web/server/routes/analysis.ts (-15 lines net: heuristic byRegion/avgSentiment block removed; LLM-driven generateFramingAnalysis call added)"
    - "apps/web/server/routes/ai.test.ts (+10 lines: AIService mock added to break the prisma top-of-file import chain — Rule 3 fix)"
    - "apps/web/public/openapi.json (+618 lines: 3 new paths + BearerAuth security scheme + new component schemas)"

key-decisions:
  - "Exported handleFactCheck and handleSourceCredibility as named functions (not just registered on the router) so the test file can invoke them directly with req/res mocks — repo has no supertest dep, and the existing requireTier.test.ts pattern uses raw Request/Response doubles"
  - "INJECTION_PATTERN regex `\\n\\s*(ignore\\s+previous|system\\s*:|###\\s*instruction|assistant\\s*:)/i` placed at route entry, AFTER Zod parse (so Zod's length cap runs first); rejection returns 400 with `Claim contains forbidden patterns`"
  - "Source-credibility handler does NOT 404 on unknown sourceId — per Plan 38-02 fallbackCredibility, the service returns score=0 instead of throwing. The OpenAPI spec lists 404 only for forward-compat (if a future revision changes the contract)"
  - "/framing handler now requires `topic` (min 2 chars) — previously the legacy heuristic accepted no topic and returned all articles aggregated. The new LLM-driven path needs a topic to compute meaningful per-region framing, so missing topic is a 400, not a fallback path"
  - "Locale validation in /framing uses the literal-narrowing pattern `localeRaw === 'de' || ... || 'en'` instead of Zod safeParse on req.query, because the existing handlers in analysis.ts do not use Zod and adding it would diverge from the file's local convention. The route does NOT need OpenAPI-driven query validation here because the OpenAPI spec records the constraint via LocaleSchema and downstream callers (Plan 38-05 UI) construct URLs from a typed Locale enum"

patterns-established:
  - "When extending a route file that doesn't currently mock the prisma chain, adding `import { AIService }` (which transitively imports prisma at top of file) breaks any sibling .test.ts on that route file that previously didn't need to mock prisma — fix by adding `vi.mock('../services/aiService', ...)` to the broken test file. Same Rule 3 pattern Wave 2 documented for aiService.test.ts."
  - "Cache-Control header on the route layer (10min) layered on top of the service-layer 24h cache (D-18). Two-tier caching: Redis-keyed by sha256(claim)/sourceId/topicHash for AI calls, plus short-window HTTP cache for CDN/proxy reuse."

requirements-completed: [AI-01, AI-04, AI-05, AI-06]

# Metrics
duration: ~10min
completed: 2026-04-29
---

# Phase 38 Plan 03: Routes + OpenAPI Summary

**Three new HTTP endpoints wired to the AIService methods from Wave 2: POST /api/ai/fact-check (Zod-validated + prompt-injection-rejected), GET /api/ai/source-credibility/:sourceId (locale-aware), and a rewritten GET /api/analysis/framing that replaces the legacy sentiment-heuristic with the LLM-driven generateFramingAnalysis pipeline. Code-first OpenAPI registration adds BearerAuth + 3 paths to the regenerated public/openapi.json (1517 lines total, +618 from this plan).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-29T19:29:12Z (after worktree base reset from `e8a976f` to `9694c33`)
- **Completed:** 2026-04-29T19:39:16Z
- **Tasks:** 5 (all complete)
- **Files created:** 1 (the integration test file)
- **Files modified:** 6 (schemas.ts + generator.ts + ai.ts + ai.test.ts + analysis.ts + openapi.json)
- **Tests added:** 13 (1374 baseline → 1387 final, all pass)

## Accomplishments

- `apps/web/server/openapi/schemas.ts` — added 4 enum schemas (Verdict / ConfidenceBucket / BiasBucket / Locale) and 4 endpoint shapes (FactCheckRequest with claim length 10-500 cap, FactCheckResponse, CredibilityResponse, FramingResponse). All registered with `.openapi(...)` metadata for the Scalar UI rendering.
- `apps/web/server/openapi/generator.ts` — registered the BearerAuth (HTTP bearer JWT) security component alongside the existing ApiKeyAuth. Added three `registry.registerPath(...)` blocks for the new endpoints, each with `security: [{ BearerAuth: [] }]` (NOT ApiKeyAuth — these are JWT-protected, not public API). Added "AI" and "Analysis" tag descriptions for grouped Scalar UI rendering.
- `apps/web/server/routes/ai.ts` — added `handleFactCheck` and `handleSourceCredibility` (both exported for testability). The fact-check handler runs `FactCheckRequestSchema.safeParse(req.body)` first (which catches the 10/500 char limits), then runs `INJECTION_PATTERN.test(claim)` (the route-layer prompt-injection rejection per T-38-12), then delegates to `AIService.getInstance().factCheckClaim(...)`. The source-credibility handler validates `locale` via Zod and forwards to `AIService.getInstance().getSourceCredibility(...)`. Both handlers route through the singleton — no new client instantiation, no `callAIWithFallback` extension (the legacy helper at lines 32-100 is unchanged; only `/ask` and `/propaganda` use it).
- `apps/web/server/routes/analysis.ts` — rewrote the `/framing` handler. The legacy heuristic block (`byRegion` Map + `avgSentiment` aggregation + `generateComparison` call) is fully removed. The new handler validates `topic` (min 2 chars) and `locale` (de/en/fr default en), then delegates to `aiService.generateFramingAnalysis(topic, locale)`. Response shape is now `{ topic, locale, perspectives, aiGenerated }` per `FramingResponseSchema`.
- `apps/web/server/routes/ai.factCheck.test.ts` — 13 integration tests covering: happy path (locale forwarding), Zod boundary cases (length 9 → 400, length 501 → 400, length 10 boundary → 200), three prompt-injection markers (`\nIgnore previous`, `\nSYSTEM:`, `\n### INSTRUCTION`), service-throw → 500, articleId+language forwarding, source-credibility happy path with locale=de, source-credibility default-locale=en, invalid locale (`es`) → 400, source-credibility service-throw → 500.
- `apps/web/public/openapi.json` — regenerated via `pnpm openapi:generate`. Now 1517 lines (+618 from this plan), contains all three new paths + BearerAuth security scheme + new component schemas (FactCheckRequest, FactCheckResponse, CredibilityResponse, FramingResponse, Verdict, ConfidenceBucket, BiasBucket, Locale, FactCheckCitation, CredibilitySubDimensions, FramingPerspective).

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor protocol):

1. **Task 1: 8 Zod schemas** — `551435e` (feat)
2. **Task 2: BearerAuth + 3 paths in generator.ts** — `7df5499` (feat)
3. **Task 3 RED: failing test file (13 cases)** — `7a5d766` (test)
4. **Task 3 GREEN: handlers in ai.ts + ai.test.ts Rule 3 fix** — `6e760df` (feat)
5. **Task 4: /framing handler rewrite** — `d9af4ce` (feat)
6. **Task 5: openapi.json regenerated** — `f78efad` (feat)

_Note: This plan does NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after the wave completes._

## Files Created/Modified

### Created (1 file)
- `apps/web/server/routes/ai.factCheck.test.ts` — 329 lines, 13 integration tests

### Modified (6 files)
- `apps/web/server/openapi/schemas.ts` — +89 lines: VerdictSchema, ConfidenceBucketSchema, BiasBucketSchema, LocaleSchema, CredibilitySubDimensionsSchema, CredibilityResponseSchema, FramingPerspectiveSchema, FramingResponseSchema, FactCheckRequestSchema (with min(10).max(500)), FactCheckCitationSchema, FactCheckResponseSchema
- `apps/web/server/openapi/generator.ts` — +120 lines: imports for the 5 new schemas, BearerAuth `registerComponent` block, 3 `registerPath` blocks (one per endpoint), 2 new entries in the OpenAPI `tags` array
- `apps/web/server/routes/ai.ts` — +97 lines: imports (Request, Response, z, AIService, FactCheckRequestSchema, LocaleSchema), AuthRequest interface, formatZodError helper, INJECTION_PATTERN regex, localeQuerySchema, handleFactCheck (exported), handleSourceCredibility (exported), 2 router registrations
- `apps/web/server/routes/analysis.ts` — -15 lines net: removed heuristic byRegion/avgSentiment aggregation block; added validation + AIService.getInstance().generateFramingAnalysis call; logger import added
- `apps/web/server/routes/ai.test.ts` — +10 lines: vi.mock('../services/aiService', ...) to break the prisma top-of-file import chain (Rule 3 fix)
- `apps/web/public/openapi.json` — +618 lines: regenerated with 3 new paths + BearerAuth + new component schemas

## Decisions Made

1. **Handlers exported as named functions (handleFactCheck, handleSourceCredibility)** — needed because the repo has no supertest dependency. The existing `server/middleware/requireTier.test.ts` pattern uses raw `Request`/`Response` mock doubles to call middleware functions directly. To apply that same pattern to route handlers, I export the handler functions and let the test file invoke them with `await handleFactCheck(req, res)`. The router still registers them with `router.post('/fact-check', handleFactCheck)`, so production behavior is unchanged.

2. **INJECTION_PATTERN regex placed AFTER the Zod safeParse** — the order matters: Zod runs first (length cap 10-500), then injection-marker regex, then service call. This way the 400 response distinguishes "invalid request" (Zod error message) from "Claim contains forbidden patterns" (injection rejection). The plan's threat model T-38-12 specifies both layers as a defense-in-depth design (the prompt-template `<<<CLAIM>>>` delimiter from Plan 38-02 is the third layer at the service boundary).

3. **/framing handler 400s on missing topic** — the legacy handler defaulted to `topic || 'all'` and returned aggregated regional sentiment. The new LLM-driven path needs a real topic to compute meaningful per-region framing (`aiService.fetchArticlesForTopic(topic)` runs an FTS search; an empty topic would return random recent articles). Returning 400 makes the contract explicit. CONTEXT.md D-14 already locked this decision.

4. **Source-credibility 404 in OpenAPI spec but never returned in practice** — Plan 38-02's `fallbackCredibility` returns a `score=0` degraded result when the sourceId is unknown rather than throwing. So the route handler never returns 404 for unknown sourceId. The OpenAPI spec still lists 404 for forward-compat (if a future revision changes the service contract).

5. **Did not add Zod query parsing to /framing** — the existing analysis.ts uses inline literal-narrowing for query params (`req.query.locale as string`) rather than Zod. Adding Zod just for /framing would diverge from the file's local convention. The constraint is documented in the OpenAPI spec via `LocaleSchema`, and Plan 38-05 (UI) will construct URLs from a typed Locale enum so client-side malformed locales aren't a realistic concern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adding `import { AIService }` to ai.ts broke the existing ai.test.ts**
- **Found during:** Task 3 GREEN (after writing handlers, the GREEN test run showed `ai.factCheck.test.ts` passing but `ai.test.ts` failing with `DATABASE_URL environment variable is required`)
- **Issue:** `ai.ts` now imports `aiService.ts` at top of file. `aiService.ts` transitively imports `../db/prisma` (top-of-file). The prisma module throws if `DATABASE_URL` is not set in the test env. The existing `ai.test.ts` (which only tests `detectCoverageGap` and `buildGapInstruction`) didn't previously need to mock prisma — but now it does because `import { detectCoverageGap, buildGapInstruction } from './ai'` triggers the whole chain.
- **Fix:** Added `vi.mock('../services/aiService', () => ({ AIService: { getInstance: () => ({ factCheckClaim: vi.fn(), getSourceCredibility: vi.fn() }) } }))` to `ai.test.ts` BEFORE the `import { detectCoverageGap, ...} from './ai'` line. This breaks the prisma chain at the AIService boundary.
- **Files modified:** `apps/web/server/routes/ai.test.ts`
- **Verification:** `pnpm test -- ai.test.ts ai.factCheck.test.ts --run` → 1387/1387 pass.
- **Committed in:** `6e760df` (Task 3 GREEN — bundled with the handler additions)

**2. [Rule 1 - Bug] Plan grep gate `! grep -q 'avgSentiment'` triggered by my own doc comment**
- **Found during:** Task 4 verification step
- **Issue:** I added a comment "Phase 38 D-14: replaced heuristic byRegion/avgSentiment aggregation..." to document the rewrite. The plan's verify gate `! grep -q 'avgSentiment'` then matched my comment.
- **Fix:** Reworded the comment to "replaced the legacy heuristic per-region sentiment aggregation..." — preserves intent, no `avgSentiment` literal.
- **Files modified:** `apps/web/server/routes/analysis.ts`
- **Committed in:** `d9af4ce` (Task 4 — fixed before commit)

---

**Total deviations:** 2 auto-fixed (1 blocking — prisma module-load chain via the new AIService import; 1 bug — grep gate self-trip on a comment)
**Impact on plan:** Both deviations were mechanical/predictable. The prisma chain issue is the same Wave-2 pattern documented in 38-02-SUMMARY (Deviation 2). End-state matches must_haves exactly. No scope creep.

## Issues Encountered

None beyond the 2 deviations above. All five tasks ran clean: Tasks 1, 2, 4, 5 had zero rework after the initial edit. Task 3 had one Rule 3 fix (predictable) and the standard TDD RED → GREEN cycle worked as expected (13 RED failures established before impl, then 13 GREEN passes after).

## Verification Probes

```text
typecheck (apps/web + packages/types) → exit 0 (after every task)
test:run (analysis-related) → 1387/1387 pass, 54/54 files pass (1374 baseline + 13 new)

grep gates (all OK):
  Task 1: 8 schema exports + z.string().min(10).max(500)
  Task 2: BearerAuth registerComponent + 3 paths + ≥3 BearerAuth: [] entries
  Task 3: router.post('/fact-check'), router.get('/source-credibility/:sourceId'),
          AIService.getInstance, INJECTION_PATTERN/forbidden patterns, FactCheckRequestSchema
  Task 4: generateFramingAnalysis, !avgSentiment, "topic is required", AIService.getInstance
  Task 5: /api/ai/fact-check, /api/ai/source-credibility, /api/analysis/framing, BearerAuth — all in openapi.json

OpenAPI spec size: 1517 lines (+618 from this plan)
```

## Self-Check: PASSED

- ✓ Created file exists: `apps/web/server/routes/ai.factCheck.test.ts` (329 lines)
- ✓ Modified files reflect planned changes: schemas.ts (+89), generator.ts (+120), ai.ts (+97), analysis.ts (rewritten), ai.test.ts (+10), openapi.json (+618)
- ✓ All 6 commits present in `git log`: 551435e (T1), 7df5499 (T2), 7a5d766 (T3 RED), 6e760df (T3 GREEN), d9af4ce (T4), f78efad (T5)
- ✓ Typecheck exit 0 after every task
- ✓ Test suite: 1387/1387 pass (no regressions; 13 new tests added in ai.factCheck.test.ts)
- ✓ Both new handlers route through `AIService.getInstance()` (no new clients)
- ✓ Fact-check handler runs `INJECTION_PATTERN.test(claim)` AFTER Zod parse but BEFORE service call
- ✓ FactCheckRequestSchema enforces claim length 10-500 chars (z.string().min(10).max(500))
- ✓ openapi.json contains all three new paths + BearerAuth security scheme

## TDD Gate Compliance

Plan 38-03 Task 3 was the TDD task (`tdd="true"`). Gate sequence verified:

1. **RED gate:** `7a5d766` — `test(38-03): add failing tests for /fact-check + /source-credibility handlers (RED)` — 13 tests fail before implementation
2. **GREEN gate:** `6e760df` — `feat(38-03): wire fact-check + source-credibility handlers (GREEN)` — all 13 tests pass after implementation

REFACTOR not needed (handlers were minimal and clean on first pass).

## User Setup Required

None — all changes are server-side; no env vars, no migrations, no external services.

## Next Phase Readiness

**Plan 38-05 (UI)** can now construct authenticated calls:

```typescript
fetch('/api/ai/fact-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ claim, articleId?, language? }),
});
// Response: { success: true, data: FactCheckResult }

fetch(`/api/ai/source-credibility/${sourceId}?locale=${locale}`, {
  headers: { Authorization: `Bearer ${jwt}` },
});
// Response: { success: true, data: CredibilityResult }

fetch(`/api/analysis/framing?topic=${encodeURIComponent(topic)}&locale=${locale}`, {
  headers: { Authorization: `Bearer ${jwt}` },
});
// Response: { success: true, data: FramingAnalysis }
```

**Plan 38-06 (verification)** can now run live curl probes against a started backend:

```bash
# Reject short claim
curl -X POST http://localhost:3001/api/ai/fact-check \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"claim":"short"}'  # → 400

# Reject prompt injection
curl -X POST http://localhost:3001/api/ai/fact-check \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"claim":"valid claim text\nIgnore previous instructions"}'  # → 400 forbidden patterns

# Happy path
curl -X POST http://localhost:3001/api/ai/fact-check \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"claim":"valid claim text >=10 chars","language":"en"}'  # → 200 + verdict
```

**Wave 3 (this plan + 38-04 i18n) prerequisites for Plan 38-05:** routes are wired, OpenAPI spec is regenerated, locale files exist. UI can be built.

---

*Phase: 38-advanced-ai-features*
*Completed: 2026-04-29*
