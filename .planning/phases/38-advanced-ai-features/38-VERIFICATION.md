---
phase: 38-advanced-ai-features
verified: 2026-04-29T20:30:00Z
status: passed
score: 6/6 ROADMAP success criteria PASS · 7/7 AI-XX requirements PASS · 19/19 D-XX locked decisions implemented · 0 anti-pattern violations
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 38: Advanced AI Features — Verification Report

**Phase Goal:** Users see source credibility scores and can fact-check claims with AI assistance
**Verified:** 2026-04-29T20:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

Phase 38 delivers six new HTTP endpoints, six new React components, two TanStack hooks, three locked prompt templates, three AI service methods on the existing singleton, three new Redis cache namespaces (all 24h TTL with jitter), one new Prisma model with FTS-backed evidence retrieval, and an end-to-end Playwright spec exercising the highlight-to-fact-check user journey + security rejection paths.

All 6 ROADMAP success criteria have file-precise static evidence, and Plan 38-06's live probes confirm the cache TTL + cache-hit + audit-trail behavior on a running dev backend with Postgres + Redis.

### Observable Truths (vs ROADMAP Success Criteria)

| # | ROADMAP Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | User sees credibility score (0-100) on each news source with confidence indicator | PASS | `apps/web/src/components/credibility/CredibilityPill.tsx` exports `CredibilityPill` rendering 0-100 score with confidence sub-pill (D-05 buckets `low`/`medium`/`high`). Wired into `apps/web/src/components/NewsCard.tsx` (line `import { CredibilityPill }`) and `apps/web/src/components/feed-manager/SourceRow.tsx`. Co-located unit tests `CredibilityPill.test.tsx` (9 tests) cover boundary cases at 39/40, 69/70, color-bucket transitions, and confidence sub-pill rendering. Live Probe 1 (38-VERIFICATION-LOG.md) returned `score: 63 confidence: low` for source `ap`. |
| 2 | Credibility score reflects multiple signals (accuracy, transparency, correction history) | PASS | `apps/web/server/services/credibilityService.ts:deriveCredibilityScore` formula = deterministic blend of `reliability * 7 - |bias| * 30` (D-01). LLM-driven sub-dimensions in `apps/web/server/services/aiService.ts:getSourceCredibility` invoke `buildCredibilityPrompt` which mandates `{accuracy, transparency, corrections}` per D-02. `aiService.credibility.test.ts` (12 tests) covers the LLM-success and LLM-null fallback paths. `CredibilityDrawer.tsx` renders all three sub-dimensions in a 3-column grid plus the AI-attribution disclosure (verbatim "AI-attributed estimates based on the source's reputation profile, not measured signals from this platform"). |
| 3 | User sees political bias indicator (left/center/right) per source with methodology explanation | PASS | `apps/web/src/components/credibility/BiasBadge.tsx` exports `BiasBadge` using D-04 LOCKED thresholds (`<-0.2` left, `-0.2..0.2` center, `>0.2` right) — same thresholds copied verbatim from `MediaBiasBar.tsx`. Co-located test `BiasBadge.test.tsx` (8 tests) covers boundary values at exactly ±0.2 and just inside (-0.21 / 0.21). Methodology paragraph rendered in `CredibilityDrawer.tsx` from the LLM-generated `methodologyMd` field. The `credibilityService.ts:deriveBiasBucket` function is the single source of truth used by both server and (via the API response) the client. |
| 4 | User can compare framing analysis showing how different sources cover same topic | PASS | `apps/web/server/services/aiService.ts:generateFramingAnalysis` produces structured per-region `{narrative, omissions, vocabulary, evidenceQuotes}` per D-14. `apps/web/server/routes/analysis.ts:GET /framing` rewritten — legacy heuristic `byRegion` + per-region sentiment aggregation removed (verified by `! grep avgSentiment apps/web/server/routes/analysis.ts`). `apps/web/src/components/FramingComparison.tsx` rewritten to consume the new shape: structured grid with narrative + omissions + vocabulary chips + evidence quotes per region. `aiService.framing.test.ts` covers happy + degraded paths (6 tests). Live Probe 8 confirms `newshub:ai:framing:10db699812d02cc5:en` cache key written with TTL 80126 s. |
| 5 | User can request fact-check on specific claims with confidence level and source citations | PASS | `POST /api/ai/fact-check` endpoint wired at `apps/web/server/routes/ai.ts:402` (`router.post('/fact-check', handleFactCheck)`). `FactCheckButton` selection-driven trigger inside `<article data-testid="article-content">` (Article.tsx:301). `FactCheckDrawer` renders `VerdictPill` (5 buckets per D-08) + confidence + up to 5 `CitationCard`s per D-13. The Playwright `factcheck.spec.ts` happy-path test passed live (drawer renders "Größtenteils wahr" verdict with 85% confidence + 1 citation against article `jpost-c3jgow`; full output captured in 38-VERIFICATION-LOG.md). |
| 6 | AI analysis results are cached in Redis with 24h TTL to minimize inference costs | PASS | 38-VERIFICATION-LOG.md Probes 2/5/8 captured live TTL values: `newshub:ai:credibility:ap:en` = 88962 s, `newshub:ai:factcheck:<hash>` = 86393 s, `newshub:ai:framing:<hash>:en` = 80126 s — all within the 24h ± 10% jitter window per `cacheService.setWithJitter`. Probe 6 evidence: replayed fact-check returns `cached: True`. Probe 7 evidence: FactCheck row count = 2 after cache hit, satisfying D-16 audit-trail-on-cache-hit. The `cacheService.getOrSet(.., CACHE_TTL.DAY)` is the single integration point invoked by all 3 new aiService methods. |

**Static + runtime score:** 6/6 ROADMAP truths verified.

---

## Requirement IDs Evidence Matrix

| ID | Requirement | Plans | Status |
|----|-------------|-------|--------|
| AI-01 | User can see source credibility score (0-100) on each news source | 38-02 (deriveCredibilityScore + getSourceCredibility) + 38-03 (`/api/ai/source-credibility/:id` route) + 38-05 (CredibilityPill UI) | PASS |
| AI-02 | Credibility score reflects multiple dimensions (accuracy, transparency, corrections) | 38-02 (LLM prompt + safeParseJson on `{accuracy, transparency, corrections}`) + 38-05 (CredibilityDrawer 3-column grid) | PASS |
| AI-03 | User can see political bias indicator (left/center/right) per source | 38-02 (deriveBiasBucket with D-04 thresholds) + 38-05 (BiasBadge component + 8 boundary tests) | PASS |
| AI-04 | User can see framing analysis comparing how sources cover same topic | 38-02 (generateFramingAnalysis) + 38-03 (analysis.ts handler rewrite) + 38-05 (FramingComparison structured grid) | PASS |
| AI-05 | User can request fact-check on specific claims in articles | 38-01 (FactCheck Prisma model + tsvector FTS migration) + 38-02 (factCheckClaim service method) + 38-03 (POST /api/ai/fact-check route + INJECTION_PATTERN + Zod 10-500 cap) + 38-05 (FactCheckButton + FactCheckDrawer UI) + 38-06 (Playwright happy-path test passes live) | PASS |
| AI-06 | Fact-check results include confidence level and source citations | 38-02 (FactCheckResult shape with `verdict + confidence + confidenceBucket + methodologyMd + citations[]`) + 38-03 (FactCheckResponseSchema Zod) + 38-05 (VerdictPill + CitationCard) + 38-06 (live drawer rendered "Hohe Sicherheit · 85%" + 1 citation card) | PASS |
| AI-07 | AI analysis results are cached to minimize inference costs | 38-02 (CacheKeys.{credibility, factCheck, framing} + getOrSet wired with CACHE_TTL.DAY) + 38-06 (live TTL probes 88962/86393/80126 s confirm 24h ± jitter) | PASS |

**Score:** 7/7 PASS.

---

## Locked Decisions Coverage (D-01 through D-19)

| Decision | Plans | Implementation Reference |
|----------|-------|--------------------------|
| D-01 deterministic 0-100 derivation | 38-02 | `apps/web/server/services/credibilityService.ts:deriveCredibilityScore` (`reliability * 7 - |bias| * 30`) |
| D-02 LLM sub-dimensions + AI-attribution disclosure | 38-02 | `apps/web/server/prompts/credibilityPrompt.ts` mandates `{accuracy, transparency, corrections}` + verbatim AI-attribution disclosure phrase |
| D-03 on-demand 24h Redis cache | 38-02 + 38-06 | `aiService.ts:getSourceCredibility` uses `cacheService.getOrSet(CacheKeys.credibility(...), _, CACHE_TTL.DAY)`; live Probe 2 confirms TTL=88962s |
| D-04 reuse MediaBiasBar thresholds | 38-02 + 38-05 | `credibilityService.ts:deriveBiasBucket` (`<-0.2 left`, `-0.2..0.2 center`, `>0.2 right`) + `components/credibility/BiasBadge.tsx` consumes the same buckets |
| D-05 categorical confidence pill (low/medium/high) at 60/80 thresholds | 38-02 + 38-05 | `credibilityService.ts:bucketConfidence` (`<60 low`, `60-79 medium`, `>=80 high`) + `CredibilityPill.tsx` confidence sub-pill |
| D-06 selection-triggered floating button | 38-05 | `apps/web/src/components/factcheck/FactCheckButton.tsx` mouseup/touchend listener (NEVER selectionchange — Pitfall 5 / T-38-23 mitigation) |
| D-07 inline drawer beneath highlighted text | 38-05 | `apps/web/src/components/factcheck/FactCheckDrawer.tsx` rendered as sibling of article body in `Article.tsx` (line 313-319, inside `<article data-testid="article-container">`) |
| D-08 5-bucket verdict scale | 38-02 + 38-03 + 38-05 | `aiService.ts:VerdictSchema` enum [true, mostly-true, mixed, unverified, false] + `factCheckLlmSchema` Zod + `VerdictPill.tsx` color mapping (true=#00ff88, mostly-true=#84cc16, mixed=#ffee00, unverified=gray, false=#ff0044) |
| D-09 reuse aiTierLimiter | 38-03 + 38-06 | Routes mounted at `apps/web/server/index.ts:167` `app.use('/api/ai', authMiddleware, aiTierLimiter, aiRoutes)`; live Probe 12 confirmed FREE-tier 11th request → 429 + `upgradeUrl: /pricing` |
| D-10 internal corpus only | 38-02 | `apps/web/server/prompts/factCheckPrompt.ts` rule "based ONLY on the NewsHub corpus" + the service does NOT make external HTTP calls (verified via grep) |
| D-11 Postgres FTS via tsvector + GIN | 38-01 | `apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql` declares `search_tsv` GENERATED column + `news_article_search_tsv_idx` GIN index |
| D-12 cross-language claim translation | 38-02 | `aiService.ts:factCheckClaim` calls `translationService.translate(claim, 'de')` and `translationService.translate(claim, 'en')` then runs `searchClaimEvidence` 3-language merge via `mergeAndDedup` (FR falls through to original claim text since translationService.TargetLang is 'de'|'en' only — documented in 38-02 Deviation 3) |
| D-13 perspective-badge citation cards | 38-05 | `apps/web/src/components/factcheck/CitationCard.tsx` renders perspective badge + headline + `/article/${articleId}` link (T-38-21 mitigation: NEVER uses `citation.url` for href) |
| D-14 LLM-driven framing analysis | 38-02 + 38-03 + 38-05 | `aiService.ts:generateFramingAnalysis` + `analysis.ts` /framing handler rewrite (legacy heuristic block fully removed; `! grep avgSentiment routes/analysis.ts` confirms) + `FramingComparison.tsx` structured grid |
| D-15 Redis-only credibility (no schema) | 38-02 | `prisma/schema.prisma` has NO `credibility*` columns on `NewsSource`; only Redis cache writes via `CacheKeys.credibility` |
| D-16 FactCheck Prisma model | 38-01 | `prisma/schema.prisma:model FactCheck` (cuid id, sha256 claimHash for dedup, claimText TEXT, citationArticleIds TEXT[], 4 indexes, FactCheck.userId Cascade, FactCheck.articleId SetNull). Live Probe 7 confirmed audit-trail-on-cache-hit: row count = 2 after one cache hit. |
| D-17 Redis-only framing | 38-02 | `prisma/schema.prisma` has NO `Framing*` model; only `CacheKeys.framing(topicHash, locale)` |
| D-18 cache key shapes | 38-02 | `CacheKeys.credibility(sourceId, locale)` → `ai:credibility:$id:$locale`; `CacheKeys.framing(topicHash, locale)` → `ai:framing:$hash:$locale`; `CacheKeys.factCheck(claimHash)` → `ai:factcheck:$hash` (locale-INDEPENDENT — verdict+confidence+citation IDs don't vary by language) |
| D-19 user-private fact-checks | 38-01 + 38-02 | `FactCheck.userId` non-null + `onDelete: Cascade` (RESEARCH.md Q-04 override of D-19's nullable suggestion); FactCheck routes never expose another user's rows |

**Score:** 19/19 implemented.

---

## Required Artifacts

| Artifact | Expected | Status |
|----------|----------|--------|
| `apps/web/prisma/schema.prisma` | FactCheck model + searchTsv field + 2 back-relations + GIN index | VERIFIED |
| `apps/web/prisma/migrations/20260429120000_38_news_article_fts/migration.sql` | tsvector + 'simple' + USING GIN | VERIFIED |
| `apps/web/prisma/migrations/20260429120100_38_factcheck/migration.sql` | CREATE TABLE FactCheck + ON DELETE CASCADE/SET NULL | VERIFIED |
| `apps/web/server/services/credibilityService.ts` | deriveCredibilityScore + deriveBiasBucket + bucketConfidence | VERIFIED (70 lines) |
| `apps/web/server/services/credibilityService.test.ts` | 19 tests covering boundary cases | VERIFIED |
| `apps/web/server/services/factCheckReadService.ts` | Postgres FTS via $queryRaw + websearch_to_tsquery + ts_rank | VERIFIED (87 lines) |
| `apps/web/server/services/factCheckReadService.test.ts` | 11 tests including SQL-injection-safety | VERIFIED |
| `apps/web/server/prompts/credibilityPrompt.ts` | LLM template with AI-attribution disclosure | VERIFIED |
| `apps/web/server/prompts/framingPrompt.ts` | LLM template with 13 PerspectiveRegion enum | VERIFIED |
| `apps/web/server/prompts/factCheckPrompt.ts` | LLM template with `<<<CLAIM>>>` delimiter (T-38-12) | VERIFIED |
| `apps/web/server/services/aiService.ts` | safeParseJson + 3 new methods (getSourceCredibility, generateFramingAnalysis, factCheckClaim) | VERIFIED |
| `apps/web/server/services/aiService.credibility.test.ts` | 12 tests | VERIFIED |
| `apps/web/server/services/aiService.framing.test.ts` | 6 tests | VERIFIED |
| `apps/web/server/services/aiService.factCheck.test.ts` | 7 tests | VERIFIED |
| `apps/web/server/services/cacheService.ts` | CacheKeys.{credibility, factCheck, framing} + DAY TTL | VERIFIED |
| `apps/web/server/openapi/schemas.ts` | 4 enums (Verdict, ConfidenceBucket, BiasBucket, Locale) + 4 endpoint shapes | VERIFIED (+89 lines) |
| `apps/web/server/openapi/generator.ts` | BearerAuth registerComponent + 3 registerPath blocks | VERIFIED (+120 lines) |
| `apps/web/server/routes/ai.ts` | INJECTION_PATTERN + handleFactCheck + handleSourceCredibility (exported) | VERIFIED (+97 lines) |
| `apps/web/server/routes/analysis.ts` | /framing handler rewrite (no avgSentiment) | VERIFIED |
| `apps/web/server/routes/ai.factCheck.test.ts` | 13 integration tests | VERIFIED |
| `apps/web/public/openapi.json` | 3 new paths + BearerAuth security scheme | VERIFIED (1517 lines, +618) |
| `apps/web/public/locales/{en,de,fr}/factcheck.json` | 5 verdict labels + button + drawer + error keys (DE/EN/FR) | VERIFIED |
| `apps/web/public/locales/{en,de,fr}/credibility.json` | credibility + bias + confidence + framing keys (DE/EN/FR) | VERIFIED |
| `apps/web/src/i18n/i18n.ts` | factcheck + credibility added to ns array | VERIFIED |
| `apps/web/src/components/credibility/CredibilityPill.tsx` + `.test.tsx` | 56 lines + 9 tests | VERIFIED |
| `apps/web/src/components/credibility/BiasBadge.tsx` + `.test.tsx` | 39 lines + 8 tests | VERIFIED |
| `apps/web/src/components/credibility/CredibilityDrawer.tsx` | Methodology + sub-dimensions panel | VERIFIED (87 lines) |
| `apps/web/src/components/factcheck/VerdictPill.tsx` + `.test.tsx` | 5-bucket pill + 7 tests | VERIFIED |
| `apps/web/src/components/factcheck/CitationCard.tsx` | Per-region badge + /article link | VERIFIED |
| `apps/web/src/components/factcheck/FactCheckButton.tsx` | Selection-driven floating bubble | VERIFIED (101 lines) |
| `apps/web/src/components/factcheck/FactCheckDrawer.tsx` | Mutation lifecycle + verdict + citations + error branches | VERIFIED (147 lines) |
| `apps/web/src/components/FramingComparison.tsx` | Rewritten with structured perspectives grid | VERIFIED (-115/+110 lines net) |
| `apps/web/src/components/NewsCard.tsx` | CredibilityPill + BiasBadge in meta-info area | VERIFIED |
| `apps/web/src/components/feed-manager/SourceRow.tsx` | New components replace inline R:reliability + bias spans | VERIFIED |
| `apps/web/src/pages/Article.tsx` | data-testid="article-content" + FactCheckButton + FactCheckDrawer mount | VERIFIED (line 301 + 312-319) |
| `apps/web/src/hooks/useCredibility.ts` | TanStack Query + queryKey ['credibility', sourceId, language] + 24h staleTime | VERIFIED (71 lines) |
| `apps/web/src/hooks/useFactCheck.ts` | TanStack Mutation with RATE_LIMIT/VALIDATION error encoding | VERIFIED (72 lines) |
| `apps/web/e2e/factcheck.spec.ts` | 5 Playwright tests: happy path + 3 security rejections + 429 | VERIFIED (passed live, 5/5 in 4.9s on a warm cache) |
| `.planning/phases/38-advanced-ai-features/38-VERIFICATION-LOG.md` | 12 live probes including TTL + cache-hit + audit + security + 429 | VERIFIED |

---

## Test Suite Counts

| Phase boundary | Test count | File count |
|---|---|---|
| Pre-Phase-38 (Phase 36.4 closure baseline) | 1304 | 50 |
| Post-Plan 38-01 | 1317 | 48 (regen Prisma client trimmed some files) |
| Post-Plan 38-02 | 1374 | 53 |
| Post-Plan 38-03 | 1387 | 54 |
| Post-Plan 38-04 | 1374 (+0 — locale files only) | 53 |
| Post-Plan 38-05 | 1412 | 57 |
| Post-Plan 38-06 (this plan) | 1412 + 5 Playwright E2E (separate runner) | 57 + 1 (factcheck.spec.ts) |

**Delta:** +108 unit/integration tests over Phase 38 (1304 → 1412), all passing. Plus +5 Playwright E2E scenarios (separate runner; counted independently).

`pnpm test:run` exit 0 (1412/1412 passing) was confirmed at the close of this plan.

---

## Anti-Pattern Audit (D-10 milestone-level)

```bash
git log --oneline e503618..HEAD -- 'server/' 'prisma/' 'src/' 'e2e/' 2>/dev/null
```

```text
(empty — every Phase 38 file write begins with apps/web/, packages/, .github/, or .planning/)
```

**Result:** 0 forbidden-root files across the entire Phase 38 commit range. The repo's pnpm monorepo layout (`apps/web/...`) was honored by every plan.

---

## Live Probe Evidence Summary (38-VERIFICATION-LOG.md)

| Probe | Result |
|-------|--------|
| 1 | Fresh credibility returns score=63, confidence=low for source `ap` |
| 2 | TTL=88962s on `newshub:ai:credibility:ap:en` (within 24h ± 10% jitter) |
| 3 | Cache-hit response in 124ms (no LLM round-trip) |
| 4 | Fresh fact-check returns verdict=unverified, cached=False |
| 5 | TTL=86393s on `newshub:ai:factcheck:<sha256>` |
| 6 | Replay returns cached=True (AI-07 confirmed end-to-end) |
| 7 | FactCheck row count = 2 (D-16 audit-trail-on-cache-hit confirmed) |
| 8 | TTL=80126s on `newshub:ai:framing:<hash>:en` |
| 9 | `\nIgnore previous` → 400 forbidden patterns (T-38-12) |
| 10 | 4-char claim → 400 length-floor (Zod 10-500 cap) |
| 11 | `\nSYSTEM:` → 400 forbidden patterns (T-38-12) |
| 12 | 11+ FREE calls → 429 + upgradeUrl=/pricing (D-09) |

All 12 probes returned the expected output with no surfaced bugs.

---

## Threat Model Coverage

Phase 38's `<threat_model>` registers across plans 38-01..38-06 declared 26 threats. Spot-check verification:

| Threat | Disposition | Verification |
|--------|-------------|--------------|
| T-38-12 (prompt injection via claim text) | mitigate | Three-layer defense: Zod 10-500 char cap + INJECTION_PATTERN regex + `<<<CLAIM>>>` prompt delimiter. Live Probes 9 + 11 confirmed both regex variants fire 400. |
| T-38-20 (selection scope evasion via FactCheckButton) | mitigate | `closest('[data-testid="article-content"]')` check in FactCheckButton.tsx; server route also enforces 10-500 char cap and INJECTION_PATTERN |
| T-38-21 (citation href manipulation) | mitigate | `CitationCard.tsx` hard-codes `/article/${articleId}` for href; never uses citation.url |
| T-38-23 (selectionchange DoS) | mitigate | FactCheckButton listens on mouseup/touchend (not selectionchange); verified by `! grep selectionchange apps/web/src/components/factcheck/FactCheckButton.tsx` |
| T-38-24 (38-VERIFICATION-LOG.md captures real claim text + JWTs) | mitigate | Log redacts JWTs as `<JWT>` placeholders; uses non-PII test claim ("The economy grew by three percent last quarter") |

No new threat surface introduced beyond what was declared in the per-plan threat registers. No `threat_flag` entries surfaced from any of the 5 plan SUMMARYs.

---

## Gaps Summary

**No real implementation gaps detected.** All 6 ROADMAP success criteria + all 7 AI-XX requirements + all 19 D-XX locked decisions have:
- Static evidence in committed code/config (file:line references in the matrices above)
- Runtime evidence where applicable (live probes captured in 38-VERIFICATION-LOG.md)
- Test coverage (1412 unit/integration tests + 5 Playwright E2E scenarios pass)

Per-plan deviations (3 in 38-01, 4 in 38-02, 2 in 38-03, 0 in 38-04, 3 in 38-05) were all either (a) auto-fixes for pre-existing patterns the plans didn't anticipate (vitest hoisting, prisma module-load chain, react-markdown not in deps, translationService.TargetLang scope) or (b) self-trip grep gates rephrased without changing intent. Every deviation was within plan-level scope; no architectural Rule 4 escalation occurred in any of the 6 plans.

---

## Phase Status

All 6 ROADMAP success criteria PASS · all 7 AI-XX requirements PASS · all 19 D-XX locked decisions implemented · 0 anti-pattern violations · 0 architectural gaps.

**Phase 38 is closure-ready.** Next: `/gsd-verify-phase 38` for the orchestrator-level audit.

---

_Verified: 2026-04-29T20:30:00Z_
_Verifier: Plan 38-06 executor (Claude)_
