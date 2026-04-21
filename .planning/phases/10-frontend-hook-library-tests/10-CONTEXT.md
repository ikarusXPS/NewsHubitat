# Phase 10: Frontend Hook & Library Tests - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Unit test coverage for 7 React hooks and 3 utility libraries. Each must reach 80%+ coverage with specific edge cases tested per ROADMAP.md success criteria.

**Hooks (7):**
- useAchievements — Badge progression, milestone detection, server persistence
- useBackendStatus — Health check polling, timeout handling, retry logic
- useCachedQuery — TanStack Query wrapper with offline fallback
- useEventSocket — Socket.IO connection lifecycle, event handling
- useKeyboardShortcuts — Keyboard navigation, input field detection
- useMapCenter — Focus preset + filter region map centering
- usePersonalization — Recommendation eligibility, interest extraction

**Libraries (3):**
- articleRelevance.ts — Keyword scoring, recency, diversity selection
- historySummarizer.ts — Topic extraction, conversation compression
- personalization.ts — Interest extraction, article scoring, recommendations

</domain>

<decisions>
## Implementation Decisions

### Hook Testing Strategy
- **D-01:** Use `renderHook()` from @testing-library/react-hooks with custom wrapper for context-dependent hooks
- **D-02:** Extend existing `testUtils.tsx` wrapper to support hook testing with Auth/Store mocks
- **D-03:** Mock `useNavigate` via `vi.mock('react-router-dom')` — return spy function, verify navigation calls

### Browser API Mocking
- **D-04:** Mock Socket.IO via `vi.mock('socket.io-client')` — return fake socket with on/off/emit/disconnect methods (matches Phase 9 websocketService pattern)
- **D-05:** Mock global `fetch` via `vi.stubGlobal('fetch', vi.fn())` — control response/error for useBackendStatus tests
- **D-06:** Use `fireEvent.keyDown(document, { key: '1' })` for keyboard shortcut tests — simpler than userEvent for handler unit tests

### Library Edge Cases
- **D-07:** Prioritize empty/cold start paths — empty arrays, < 10 articles (cold start), no keyword matches
- **D-08:** Sample-based bilingual testing — 5-10 representative DE/EN keywords, not exhaustive stop word coverage
- **D-09:** Test exact thresholds as secondary priority: 10-article minimum, 7-day recency window, score tiebreakers

### Test Isolation (carried from Phase 7-9)
- **D-10:** Mock `useAppStore` via `vi.mock('../store')` — return controlled state per test, full isolation
- **D-11:** Fresh QueryClient per test via `createTestQueryClient()` — no cache carryover
- **D-12:** `vi.useFakeTimers()` with `vi.useRealTimers()` in afterEach — deterministic timing tests
- **D-13:** Co-located test files: `src/hooks/useAchievements.test.ts`, `src/lib/articleRelevance.test.ts`

### Claude's Discretion
- Specific mock data structures for articles, history entries, socket events
- Test grouping and describe block organization
- Balance between exhaustive edge cases vs representative sampling
- Timer advancement increments for polling/debounce tests

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Patterns
- `.planning/codebase/TESTING.md` — Vitest/Playwright patterns, factory pattern, mock utilities
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, error handling patterns
- `.planning/phases/07-core-backend-service-tests/07-CONTEXT.md` — Phase 7 decisions (mocking strategy, singleton reset)
- `.planning/phases/08-data-pipeline-service-tests/08-CONTEXT.md` — Phase 8 decisions (fake timers, sample-based testing)

### Existing Test Examples
- `src/lib/utils.test.ts` — Frontend test pattern with vi.useFakeTimers() for date logic
- `src/test/testUtils.tsx` — Provider wrapper, mock auth context, renderWithProviders
- `src/test/factories.ts` — getMockNewsArticle, getMockGeoEvent factory pattern

### Code Under Test
- `src/hooks/useAchievements.ts` — 152 lines, Auth + Store + fetch
- `src/hooks/useBackendStatus.ts` — 78 lines, fetch + timers
- `src/hooks/useCachedQuery.ts` — 80 lines, TanStack Query + cacheService
- `src/hooks/useEventSocket.ts` — 137 lines, Socket.IO client
- `src/hooks/useKeyboardShortcuts.ts` — 217 lines, DOM events + Router
- `src/hooks/useMapCenter.ts` — 39 lines, Store + useMemo
- `src/hooks/usePersonalization.ts` — 102 lines, Auth + Store + Query + lib
- `src/lib/articleRelevance.ts` — 190 lines, scoring algorithms
- `src/lib/historySummarizer.ts` — 170 lines, text processing
- `src/lib/personalization.ts` — 203 lines, recommendation engine

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/testUtils.tsx` — renderWithProviders, createTestQueryClient, mockFetch, mockFetchError
- `src/test/factories.ts` — getMockNewsArticle, getMockNewsSource, getMockGeoEvent, getMockFilterState
- `src/lib/utils.test.ts` — Pattern for vi.useFakeTimers() with vi.setSystemTime()

### Established Patterns
- Vitest globals configured — no imports needed for describe/it/expect/vi
- `@testing-library/react` for DOM testing, userEvent for interactions
- Factory pattern: `getMockX(overrides?: Partial<X>)` for test data
- Fake timers for date/time-dependent logic

### Integration Points
- Hooks import from `../store` (Zustand), `../contexts/AuthContext`, `@tanstack/react-query`
- Libraries import types from `../types`
- usePersonalization depends on `../lib/personalization` (internal dep)
- useCachedQuery depends on `../services/cacheService` (client-side IndexedDB wrapper)

### Dependency Summary
| File | External Deps | Internal Deps |
|------|---------------|---------------|
| useAchievements | fetch, localStorage | store, AuthContext |
| useBackendStatus | fetch, AbortController | none |
| useCachedQuery | @tanstack/react-query | cacheService, useBackendStatus |
| useEventSocket | socket.io-client | types |
| useKeyboardShortcuts | DOM events | react-router-dom |
| useMapCenter | none | store, mapCentering util |
| usePersonalization | @tanstack/react-query | store, AuthContext, lib/personalization |
| articleRelevance | none | types |
| historySummarizer | none | none |
| personalization | none | types |

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard testing approaches within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-frontend-hook-library-tests*
*Context gathered: 2026-04-21*
