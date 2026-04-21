# Phase 11: E2E Tests - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Critical user flow verification end-to-end using Playwright. Cover 10 pages per requirements E2E-01 through E2E-10. Focus on new test coverage for uncovered pages; existing Monitor/EventMap/Timeline tests are sufficient.

</domain>

<decisions>
## Implementation Decisions

### Test Scope Priority
- **D-01:** Focus on 7 uncovered pages: Dashboard, Analysis, Community, UserProfile, BookmarksPage, SettingsPage, ReadingHistory
- **D-02:** Existing E2E coverage for Monitor (17 tests), EventMap (15 tests), Timeline (8 tests) is sufficient — no extension needed
- **D-03:** Auth modal already covered in auth.spec.ts — reuse existing tests

### Dashboard Tests
- **D-04:** Full interactions: article cards, grid/list toggle, region filter pills, view mode persistence
- **D-05:** Include infinite scroll loading, article click behavior, read marking

### Analysis Page Tests
- **D-06:** Happy path only for AI Q&A: submit question, verify response appears with citations
- **D-07:** Don't test AI response quality — too flaky. Focus on UI flow.
- **D-08:** Test cluster view and topic selection without AI assertions

### Test Data Strategy
- **D-09:** Real backend with dev server and SQLite — no API mocking
- **D-10:** Claude's discretion for data seeding: test-time API setup vs pre-seeded DB per test suite
- **D-11:** Prefer test-time setup for isolation when practical; pre-seed for performance-critical suites

### Authentication Strategy
- **D-12:** Use Playwright storageState for auth: login once in global setup, save session to file, reuse in tests
- **D-13:** Dedicated test user: `e2e-test@newshub.test` created during setup
- **D-14:** Auth-required tests depend on storageState file existing

### Failure & Edge Cases
- **D-15:** Claude's discretion: test key empty states ("no bookmarks", "no history", "no search results") where relevant
- **D-16:** Skip API error testing — happy paths prioritized, failures covered by unit tests

### Claude's Discretion
- Specific test assertions per page beyond the decisions above
- Test grouping and describe block organization
- Whether to mock specific flaky endpoints (like AI responses) via route.fulfill()
- Balance between test isolation and speed for data-dependent tests

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Patterns
- `.planning/codebase/TESTING.md` — Vitest/Playwright patterns, E2E test structure, selectors
- `.planning/phases/07-core-backend-service-tests/07-CONTEXT.md` — Mocking patterns (for comparison, E2E uses real backend)
- `.planning/phases/10-frontend-hook-library-tests/10-CONTEXT.md` — Factory pattern for test data

### Existing E2E Tests (patterns to follow)
- `e2e/auth.spec.ts` — Auth modal flow, form validation (7 tests)
- `e2e/monitor.spec.ts` — Complex page with toggles, filters, stats (17 tests)
- `e2e/event-map.spec.ts` — Map interactions, filter panel toggle (15 tests)
- `e2e/navigation.spec.ts` — Page routing, sidebar active states (9 tests)
- `e2e/search.spec.ts` — Search input, query filtering (5 tests)
- `e2e/timeline.spec.ts` — Category filters, refresh (8 tests)

### Pages Under Test
- `src/pages/Dashboard.tsx` — News feed with NewsFeed component
- `src/pages/Analysis.tsx` — AI Q&A, AskAI component, cluster view
- `src/pages/Community.tsx` — Social features
- `src/pages/Profile.tsx` — UserProfile with badges, reading stats
- `src/pages/Bookmarks.tsx` — Saved articles list
- `src/pages/Settings.tsx` — Preferences, data export
- `src/pages/ReadingHistory.tsx` — History list, filters, insights

### Playwright Config
- `playwright.config.ts` — Base URL, webServer, browser settings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `e2e/*.spec.ts` — 6 existing spec files with established patterns
- `src/test/factories.ts` — Mock data factories (may use for API seeding)
- Playwright storageState support in config

### Established Patterns
- `test.describe()` groups related tests by page/feature
- `test.beforeEach()` navigates to page, waits for `networkidle`
- Text selectors preferred: `button:has-text("Anmelden")`
- CSS class selectors for styled elements: `.glass-panel`, `.stat-box`
- `page.waitForTimeout()` for animations, `waitForLoadState()` for data

### Integration Points
- Auth required pages: Profile, Bookmarks, Settings, ReadingHistory
- API endpoints: `/api/news`, `/api/ai/ask`, `/api/auth/*`, `/api/bookmarks`, `/api/history`
- Zustand store persists to localStorage under `newshub-storage`

### Page Complexity Summary
| Page | Auth Required | Key Interactions |
|------|---------------|------------------|
| Dashboard | No | Grid/list toggle, filters, infinite scroll |
| Analysis | No | AI Q&A submit, cluster expand, topic select |
| Community | No | Verify queue, social features |
| UserProfile | Yes | Badge display, stats, achievements |
| BookmarksPage | Yes | Save/unsave, list pagination |
| SettingsPage | Yes | Preference toggles, export button |
| ReadingHistory | Yes | History list, filters, insights |

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard Playwright patterns within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-e2e-tests*
*Context gathered: 2026-04-21*
