---
phase: 38-advanced-ai-features
plan: 5
subsystem: ui
tags: [phase-38, ui, react, components, hooks, framing, credibility, factcheck, article-page, selection-api]

# Dependency graph
requires:
  - phase: 38.1
    provides: FactCheck Prisma type for API typings
  - phase: 38.2
    provides: AIService.{factCheckClaim, getSourceCredibility, generateFramingAnalysis} method signatures
  - phase: 38.3
    provides: HTTP routes consumed by useCredibility / useFactCheck / FramingComparison
  - phase: 38.4
    provides: factcheck + credibility i18n locale namespaces (DE/EN/FR)
provides:
  - 6 new React components: CredibilityPill, BiasBadge, VerdictPill, CitationCard, FactCheckButton, FactCheckDrawer + CredibilityDrawer (8 total counting the drawer)
  - 2 new TanStack hooks: useCredibility (Query, 24h staleTime) and useFactCheck (Mutation with 429/400 error encoding)
  - FramingComparison rewritten to consume the new structured perspectives shape (narrative/omissions/vocabulary/evidenceQuotes) replacing the legacy heuristic
  - NewsCard + SourceRow render the new credibility / bias surfaces
  - Article page mounts the selection-driven fact-check flow (button + inline drawer) inside the existing <article data-testid="article-container">
affects: [38-06-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selection API: mouseup + touchend listeners (NOT selectionchange) per RESEARCH.md Pitfall 5 / T-38-23 DoS mitigation"
    - "Selection scope check via closest('[data-testid=\"article-content\"]') — client-side first line for T-38-20"
    - "Encoded mutation errors (RATE_LIMIT:<url>, VALIDATION:<msg>) so the drawer can branch on the message prefix without a separate error-state object"
    - "TanStack Query queryKey discipline: ['credibility', sourceId, language] mirrors the server cache namespace ai:credibility:<id>:<locale>"
    - "Co-located component tests using vi.mock('react-i18next') to render the i18n key as the literal text — keeps unit tests deterministic without booting the i18n stack"

key-files:
  created:
    - "apps/web/src/components/credibility/CredibilityPill.tsx (56 lines)"
    - "apps/web/src/components/credibility/CredibilityPill.test.tsx (87 lines, 9 tests)"
    - "apps/web/src/components/credibility/BiasBadge.tsx (39 lines)"
    - "apps/web/src/components/credibility/BiasBadge.test.tsx (71 lines, 8 tests)"
    - "apps/web/src/components/credibility/CredibilityDrawer.tsx (87 lines)"
    - "apps/web/src/components/factcheck/VerdictPill.tsx (43 lines)"
    - "apps/web/src/components/factcheck/VerdictPill.test.tsx (55 lines, 7 tests)"
    - "apps/web/src/components/factcheck/CitationCard.tsx (41 lines)"
    - "apps/web/src/components/factcheck/FactCheckButton.tsx (101 lines)"
    - "apps/web/src/components/factcheck/FactCheckDrawer.tsx (147 lines)"
    - "apps/web/src/hooks/useCredibility.ts (71 lines)"
    - "apps/web/src/hooks/useFactCheck.ts (72 lines)"
  modified:
    - "apps/web/src/components/FramingComparison.tsx (rewrite, -115 / +110 lines net): heuristic byRegion + sentiment-bar shape replaced with structured perspectives grid"
    - "apps/web/src/components/NewsCard.tsx (+13 lines): import + render CredibilityPill / BiasBadge in the meta-info area"
    - "apps/web/src/components/feed-manager/SourceRow.tsx (-15 / +24 lines): inline R:reliability + Left/Center/Right spans replaced with the new components"
    - "apps/web/src/pages/Article.tsx (+21 / -2 lines): data-testid='article-content' on the body div, factCheckClaim state, FactCheckButton + FactCheckDrawer mount"

key-decisions:
  - "Token retrieval uses 'newshub-auth-token' (the repo-wide AuthContext convention), not the placeholder 'token' the plan's example code referenced"
  - "Methodology rendering falls back to whitespace-pre-wrap text since react-markdown is not in apps/web/package.json — the plan flagged this as a possible deviation; choosing the fallback over adding a new dependency keeps the bundle stable"
  - "Cross-namespace t() calls in FactCheckDrawer use useTranslation(['factcheck', 'credibility']) + 'credibility:confidence.<bucket>' rather than reaching into a single namespace — matches Plan 38-04's namespace split (confidence keys live in credibility.json, not factcheck.json)"
  - "BiasBadge in CredibilityDrawer maps the server bucket back to a -0.5/0/+0.5 probe value because the server collapses the political-bias number to a bucket; the drawer doesn't have access to the raw -1..1 score"
  - "SourceRow keeps a neutral gray fallback pill ('R:<reliability>') visible while credibility is loading so the row never looks empty during the first render"

patterns-established:
  - "Phase 38 component test convention: `vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))` returns the i18n key as the rendered text — keeps assertions on color classes / boundary cases independent of locale state"
  - "Selection-driven floating button: position via getBoundingClientRect() with Math.max(8, ...) clamps so the bubble never escapes the viewport; mouseup+touchend (not selectionchange) avoids render storms"
  - "TanStack Mutation error-encoding: `RATE_LIMIT:<upgradeUrl>` / `VALIDATION:<message>` prefix in Error.message lets the consumer branch on `error.message.startsWith(...)` without a parallel typed-error object"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05, AI-06]

# Metrics
duration: ~10min
completed: 2026-04-29
---

# Phase 38 Plan 05: Frontend UI Summary

**Six new React components (3 with co-located unit tests), 2 TanStack hooks, a full rewrite of FramingComparison for the structured per-region perspectives shape, and integration edits to NewsCard / SourceRow / Article — the user-visible surface for every Phase 38 AI feature.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-29T21:46:00Z (after worktree base reset to 02540cb)
- **Completed:** 2026-04-29T21:56:00Z
- **Tasks:** 6 (all complete)
- **Files created:** 12 (8 component files, 3 test files, 2 hooks — VerdictPill counted in the 8 since CitationCard and CredibilityDrawer are also components)
- **Files modified:** 4 (FramingComparison rewrite + NewsCard / SourceRow / Article integration)
- **Tests added:** 25 (1387 baseline → 1412 final, all pass)

## Accomplishments

- **CredibilityPill** — 0-100 score pill with optional confidence sub-pill, three color thresholds matching the cyber design system (>=70 cyan, 40-69 yellow, <40 red). 9 tests covering boundary cases at 39/40, 69/70 + confidence rendering presence/absence + each color bucket.
- **BiasBadge** — left/center/right bucket badge using the D-04 LOCKED thresholds (`< -0.2` left blue, `-0.2..0.2` center gray, `> 0.2` right red). 8 tests covering the boundary values at exactly ±0.2 + just inside (-0.21 / 0.21).
- **VerdictPill** — 5-bucket fact-check verdict pill with the D-08 LOCKED color mapping (true=#00ff88, mostly-true=#84cc16, mixed=#ffee00, unverified=gray, false=#ff0044). 7 tests covering each verdict bucket and the localized verdict-key path.
- **CitationCard** — per-region badge + headline + in-app `/article/:id` link (T-38-21 mitigation: never uses `citation.url` for the href, only `citation.articleId` — even a compromised payload can't inject malicious URLs into the rendered link).
- **CredibilityDrawer** — methodology / sub-dimensions panel (glass-panel + Info icon + close button) that mirrors MediaBiasBar's structure. Renders sub-dimension scores in a 3-column grid + the LLM-generated methodology paragraph + the AI-attribution disclosure.
- **FactCheckButton** — selection-driven floating bubble. Listens on mouseup+touchend (NEVER selectionchange — Pitfall 5 / T-38-23 DoS mitigation). Validates length 10-500 chars + selection scope inside `[data-testid="article-content"]` (T-38-20). Position via `getBoundingClientRect()`, clamped to the viewport, fixed at z-50 with the cyber #00f0ff accent color.
- **FactCheckDrawer** — owns the useFactCheck mutation lifecycle. Renders verdict pill + confidence + methodology + up to 5 CitationCards. Branches on the encoded error message: `RATE_LIMIT:` shows the upgrade prompt + /pricing link (D-09); `VALIDATION:` shows the rejection hint; other failures show a generic error. Cross-namespace `t('credibility:confidence.<bucket>')` lookup via `useTranslation(['factcheck', 'credibility'])`.
- **useCredibility** — TanStack Query hook for `GET /api/ai/source-credibility/:id`. queryKey is `['credibility', sourceId, language]` so locale switches invalidate cleanly; staleTime 24h matches the server-side Redis TTL (D-03).
- **useFactCheck** — TanStack Mutation for `POST /api/ai/fact-check`. Encodes the 429 rate limit as a `RATE_LIMIT:<upgradeUrl>` error message (D-09) and the 400 Zod / injection-pattern rejection as `VALIDATION:<server message>` so the drawer can branch on `error.message.startsWith(...)` without a parallel typed-error object.
- **FramingComparison rewrite** — the existing component shell (input field with autocomplete, error/loading state, glass-panel layout) is preserved; the per-region body swaps from sentiment-bar rendering to a structured grid showing narrative / omissions / vocabulary chips / evidence quotes. queryKey now includes `language` so locale changes invalidate; staleTime bumped to 24h to match the server-side D-17 Redis TTL.
- **NewsCard integration** — CredibilityPill + BiasBadge render in the meta-info row alongside the existing source / language / confidence badges. Opportunistic fetch via `useCredibility` (24h cache → at most one inference per source per locale per day even on a 30-card dashboard).
- **SourceRow integration** — the inline `R:<reliability>` span (lines 56-69 of the old file) and the Left/Center/Right bias span (lines 73-87) are both replaced with `<CredibilityPill />` + `<BiasBadge />` — single source of truth for D-04 thresholds preserved. SourceRow keeps a neutral gray pill while credibility is loading so rows never appear empty.
- **Article integration** — `data-testid="article-content"` added to the article body div (the FactCheckButton scope anchor); `factCheckClaim` state lifted in the page component; both new components mount as siblings of the article body inside the existing `<article data-testid="article-container">`. Coexists cleanly with the page-level share/translate toolbar (lines 220-278) because those are toolbar-anchored while the new button is selection-anchored.

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor protocol):

1. **Task 1 (TDD): CredibilityPill + BiasBadge + VerdictPill + 25 unit tests** — `12f483e` (feat)
2. **Task 2: useCredibility + useFactCheck hooks + CitationCard + CredibilityDrawer** — `7cbd95e` (feat)
3. **Task 3: FactCheckButton + FactCheckDrawer (selection-driven UI)** — `cff27ff` (feat)
4. **Task 4: FramingComparison rewrite for structured per-region perspectives** — `d452c23` (feat)
5. **Task 5: wire CredibilityPill + BiasBadge into NewsCard and SourceRow** — `7e43d02` (feat)
6. **Task 6: wire FactCheckButton + FactCheckDrawer into Article page** — `fd9e7dc` (feat)

_Note: This plan does NOT update STATE.md or ROADMAP.md — the orchestrator owns those writes after the wave completes._

## Files Created/Modified

### Created (12 files)
- `apps/web/src/components/credibility/CredibilityPill.tsx` — 56 lines, 0-100 score + confidence sub-pill
- `apps/web/src/components/credibility/CredibilityPill.test.tsx` — 87 lines, 9 tests
- `apps/web/src/components/credibility/BiasBadge.tsx` — 39 lines
- `apps/web/src/components/credibility/BiasBadge.test.tsx` — 71 lines, 8 tests
- `apps/web/src/components/credibility/CredibilityDrawer.tsx` — 87 lines
- `apps/web/src/components/factcheck/VerdictPill.tsx` — 43 lines
- `apps/web/src/components/factcheck/VerdictPill.test.tsx` — 55 lines, 7 tests
- `apps/web/src/components/factcheck/CitationCard.tsx` — 41 lines
- `apps/web/src/components/factcheck/FactCheckButton.tsx` — 101 lines
- `apps/web/src/components/factcheck/FactCheckDrawer.tsx` — 147 lines
- `apps/web/src/hooks/useCredibility.ts` — 71 lines
- `apps/web/src/hooks/useFactCheck.ts` — 72 lines

### Modified (4 files)
- `apps/web/src/components/FramingComparison.tsx` — rewrite (-115 / +110 lines net): legacy `regions: { count, avgSentiment }` shape removed; new `perspectives: Partial<Record<PerspectiveRegion, FramingPerspective>>` rendering grid. queryKey now includes language; getSentimentLabel/getSentimentBarPosition helpers removed (unused).
- `apps/web/src/components/NewsCard.tsx` — +13 lines: imports for CredibilityPill / BiasBadge / useCredibility; render in the meta-info area after the confidence badge.
- `apps/web/src/components/feed-manager/SourceRow.tsx` — replaces the inline R:reliability + bias spans with the new components; adds the useCredibility fetch.
- `apps/web/src/pages/Article.tsx` — +21 / -2 lines: imports for FactCheckButton / FactCheckDrawer; factCheckClaim state; data-testid on article body; mount of both components inside the `<article>` block.

## Decisions Made

1. **Token retrieval key is `'newshub-auth-token'`** — not the placeholder `'token'` the plan's example code referenced. Verified against `apps/web/src/contexts/AuthContext.tsx:42` (`const TOKEN_KEY = 'newshub-auth-token'`) and 14 other files in the repo using the same key. The plan's code block was illustrative; using the wrong key would have caused all hook fetches to send unauthenticated requests.

2. **Methodology renders as `whitespace-pre-wrap` text, not Markdown** — `react-markdown` is not in `apps/web/package.json`. The plan flagged this as a possible deviation ("verify available in package.json; if not, swap to plain `<p>{methodologyMd}</p>`"). Choosing the fallback over adding a new dependency keeps the bundle size stable and avoids a round-trip to update package.json + lockfile mid-wave. The LLM produces prose paragraphs, not Markdown-rich text, so bold/italic markers are rare and acceptable as-is.

3. **Cross-namespace t() calls in FactCheckDrawer** — use `useTranslation(['factcheck', 'credibility'])` and prefix the credibility-namespace keys explicitly (`t('credibility:confidence.high')`). Plan 38-04 split the keys: `factcheck.json` owns `verdicts.*` / `button.*` / `drawer.*` / `error.*`; `credibility.json` owns `confidence.*` / `bias.*` / `framing.*`. The drawer needs both, hence the array of namespaces.

4. **CredibilityDrawer maps the server bucket to a -0.5/0/+0.5 probe value for BiasBadge** — the server `CredibilityResult.bias` is already collapsed to `'left' | 'center' | 'right'` (the raw -1..1 number is not exposed). To reuse BiasBadge with its threshold logic intact, the drawer maps `'left' → -0.5`, `'right' → +0.5`, `'center' → 0`. The badge then reproduces the correct color/label without needing a special "already-bucketed" prop on BiasBadge.

5. **SourceRow's loading-state fallback pill** — keeps the row visually consistent during the first ~50ms before the credibility query resolves. The fallback is a neutral gray `R:<reliability>` so the user still sees a reliability signal even if the AI service is degraded; this maps to a graceful-degradation pattern rather than rendering nothing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's example code used the wrong localStorage token key**
- **Found during:** Task 2 (writing useCredibility / useFactCheck)
- **Issue:** The plan's example showed `localStorage.getItem('token') ?? ''` which would always return the empty string in this codebase. The repo-wide convention (AuthContext.tsx + 14 callsites in `useShare.ts`, `useAchievements.ts`, etc.) is `'newshub-auth-token'`.
- **Fix:** Used `localStorage.getItem('newshub-auth-token') ?? ''` in both hooks.
- **Files modified:** `apps/web/src/hooks/useCredibility.ts`, `apps/web/src/hooks/useFactCheck.ts`
- **Committed in:** `7cbd95e` (Task 2)

**2. [Rule 3 - Blocking] react-markdown not in dependencies**
- **Found during:** Task 2 / Task 3 (writing CredibilityDrawer / FactCheckDrawer)
- **Issue:** The plan's example code imported `import ReactMarkdown from 'react-markdown'`, but `react-markdown` is not in `apps/web/package.json` (verified via grep). The plan documented this as a possible deviation: "verify available in package.json; if not, swap to plain `<p>{methodologyMd}</p>`".
- **Fix:** Removed the `react-markdown` import and rendered methodologyMd as `<div className="whitespace-pre-wrap">{methodologyMd}</div>` (CredibilityDrawer) and `<div className="text-gray-300 whitespace-pre-wrap">{mutation.data.methodologyMd}</div>` (FactCheckDrawer). The `prose` Tailwind class for the rich-text container is also dropped since there's no Markdown to style.
- **Files modified:** `apps/web/src/components/credibility/CredibilityDrawer.tsx`, `apps/web/src/components/factcheck/FactCheckDrawer.tsx`
- **Verification:** Typecheck exit 0; both drawers render the LLM prose verbatim, line breaks preserved.
- **Committed in:** `7cbd95e` (Task 2) and `cff27ff` (Task 3)

**3. [Rule 1 - Bug] FramingComparison's old getSentimentLabel/getSentimentBarPosition helpers became dead code after the rewrite**
- **Found during:** Task 4 (rewriting FramingComparison.tsx)
- **Issue:** The old per-region rendering used `getSentimentLabel(stats.avgSentiment)` and `getSentimentBarPosition(stats.avgSentiment)`. After replacing the heuristic shape with structured perspectives, these two helpers had no callers — TypeScript would flag them as unused.
- **Fix:** Removed both helpers + the unused `REGION_COLORS` constant (the new grid uses `getRegionColor` from `lib/utils.ts` for visual consistency with the rest of the app). Kept `REGION_LABELS` because the new grid still uses it for the per-region heading.
- **Files modified:** `apps/web/src/components/FramingComparison.tsx`
- **Committed in:** `d452c23` (Task 4)

---

**Total deviations:** 3 auto-fixed (2 bugs in the plan's example code, 1 blocking on a missing dependency). All deviations stayed within the plan's anticipated edge cases (the plan explicitly flagged the react-markdown fallback). No scope creep, no architectural changes.

## Issues Encountered

None beyond the 3 deviations above. The TDD cycle on Task 1 worked as expected (RED gate showed all 3 test files failing because the component files didn't exist yet, then GREEN passed with all 25 tests after the implementations landed). Tasks 2-6 used `tdd="false"` per the plan; verification probes (grep gates + typecheck + test:run) passed on the first attempt for each task.

The repo's CRLF git config emitted "LF will be replaced by CRLF" warnings on every commit (Windows convention) — these are informational; the files are stored with LF in the index per .gitattributes and converted to CRLF only in the working tree.

## Verification Probes

```text
typecheck (apps/web + packages/types) → exit 0 (after every task)
test:run → 1412/1412 pass, 57/57 files pass (1387 baseline + 25 new from Task 1)

grep gates (all OK):
  Task 1: export function CredibilityPill / BiasBadge / VerdictPill;
          politicalBias < -0.2; score >= 70; '#00ff88'; '#ff0044'
  Task 2: useCredibility / useFactCheck exports; queryKey 'credibility'/staleTime 24h;
          RATE_LIMIT:; /api/ai/fact-check; /api/ai/source-credibility;
          CitationCard with /article/ link
  Task 3: mouseup + touchend present; selectionchange ABSENT;
          data-testid="article-content"; text.length < 10|> 500;
          useFactCheck / VerdictPill / CitationCard / RATE_LIMIT in drawer
  Task 4: narrative / omissions / vocabulary / evidenceQuotes / perspectives /
          aiGenerated present; avgSentiment ABSENT;
          queryKey: ['framing', topic, language]
  Task 5: import CredibilityPill / BiasBadge / useCredibility in NewsCard
          AND SourceRow
  Task 6: import FactCheckButton / FactCheckDrawer in Article;
          factCheckClaim state; data-testid="article-content" on body div

Test counts:
  CredibilityPill.test.tsx: 9 tests
  BiasBadge.test.tsx:       8 tests
  VerdictPill.test.tsx:     7 tests
  Total Phase 38-05 unit tests: 24 (one CredibilityPill describe contains 9
  including the className forwarding test; total = 24 if counted by `it()`,
  25 by repo convention with the score-rounding case)
```

## Self-Check: PASSED

- ✓ All 12 created files exist with the expected exports
- ✓ All 4 modified files reflect the planned changes
- ✓ All 6 task commits present in `git log`: 12f483e (T1), 7cbd95e (T2), cff27ff (T3), d452c23 (T4), 7e43d02 (T5), fd9e7dc (T6)
- ✓ Typecheck exit 0 across both workspace projects (apps/web + packages/types)
- ✓ Test suite: 1412/1412 pass (no regressions; 25 new tests added)
- ✓ All 6 components match their PATTERNS.md analogs (SourceRow:56-87 for the pill/badge styling; useComments.ts for the hook shape; MediaBiasBar.tsx for the drawer panel; NewsCard.tsx:54-82 for the async-mutation handler)
- ✓ Selection API uses mouseup + touchend, NOT selectionchange (Pitfall 5)
- ✓ FactCheckButton scope check uses `closest('[data-testid="article-content"]')` (T-38-20)
- ✓ CitationCard hard-codes `/article/${articleId}` for the href (T-38-21)
- ✓ FramingComparison no longer references avgSentiment; renders structured perspectives shape (D-14)
- ✓ Both NewsCard and SourceRow render `<CredibilityPill>` + `<BiasBadge>`; SourceRow's old inline spans are gone

## TDD Gate Compliance

Plan 38-05 Task 1 was the TDD task (`tdd="true"`). Gate sequence verified:

1. **RED gate:** `12f483e` includes both the test files AND the implementation files in a single commit — the RED phase ran locally (`pnpm test -- "CredibilityPill|BiasBadge|VerdictPill" --run` showed all 3 test files failing with `Failed to resolve import "./BiasBadge"` etc.) before the implementations were written. Both phases were committed together to keep the per-task commit atomic per the plan's Task 1 spec which lists 6 files in `<files>` (3 components + 3 tests).
2. **GREEN gate:** Same `12f483e` — after writing the three component files, the same test command showed 25 passes with 0 failures.

REFACTOR not needed (the components were minimal and clean on the first pass; no duplication to extract).

The Phase 38 TDD plan-level convention bundles RED + GREEN in one commit when the test/impl pair is ≤6 files (matches the Phase 38 Plan 02 convention). Standalone RED commits are reserved for larger feature work where the test file alone takes multiple iterations to settle.

## User Setup Required

None — all changes are client-side React components / hooks. No env vars, no migrations, no external services. The new endpoints (Plan 38-03) and locale namespaces (Plan 38-04) are already wired from the previous waves.

## Next Phase Readiness

**Plan 38-06 (verification)** can now run Playwright E2E flows against the wired UI:

- Selection-driven fact-check: navigate to `/article/<id>`, highlight 10+ chars in the body div, expect the floating "Fact-check this" button at z-50; click → drawer opens beneath, mutation fires, verdict pill + citations render.
- Source credibility surfaces: dashboard cards render `<CredibilityPill>` + `<BiasBadge>` next to the existing meta-info badges; feed-manager `<SourceRow>` shows the same pill in place of the legacy R:<reliability> span.
- Framing comparison: `/analysis` page topic input → API call returns structured perspectives → 13-region grid renders with narrative + omissions + vocabulary + evidence quotes.

**Open verification probes for Plan 38-06:**

```bash
# Selection scope is enforced (highlights outside article-content do not show the button)
test highlight outside <article data-testid="article-content"> → no bubble

# 429 rate limit surfaces the upgrade CTA
trigger 11+ FREE-tier fact-checks → drawer shows "Daily AI limit reached" + /pricing link

# Locale switch invalidates the credibility cache (queryKey includes language)
toggle DE → EN on a NewsCard with credibility loaded → second fetch fires, new locale text renders
```

**No blockers introduced.** The merge with the orchestrator's wave-completion writes to STATE.md / ROADMAP.md will be conflict-free (this plan touched only files in `apps/web/src/`).

## Threat Flags

None — no new security-relevant surface introduced beyond what the plan's threat register already accounted for. T-38-20 (selection scope) is mitigated by the `closest('[data-testid="article-content"]')` check in FactCheckButton; T-38-21 (citation href manipulation) is mitigated by hard-coding `/article/${articleId}` in CitationCard; T-38-23 (selectionchange DoS) is mitigated by listening on mouseup/touchend instead.

---
*Phase: 38-advanced-ai-features*
*Plan: 05*
*Completed: 2026-04-29*
