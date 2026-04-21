---
phase: 08-data-pipeline-service-tests
plan: 05
subsystem: backend-services
tags: [unit-tests, focus-suggestions, news-analysis, tdd]
dependency_graph:
  requires: [focusSuggestionEngine.ts, newsAggregator.ts, FOCUS_PRESETS]
  provides: [focusSuggestionEngine.test.ts]
  affects: [test-coverage]
tech_stack:
  added: []
  patterns: [vitest-mocking, fake-timers, singleton-reset, factory-pattern]
key_files:
  created:
    - server/services/focusSuggestionEngine.test.ts
  modified: []
decisions:
  - D-06 mock NewsAggregator.getInstance() for controlled article sets
  - D-07 fake timers for time-based analysis (tension spikes, breaking news)
  - D-13 singleton reset in afterEach
metrics:
  duration: 3m33s
  completed: 2026-04-21T09:19:31Z
  test_count: 25
  coverage: 100%
---

# Phase 08 Plan 05: FocusSuggestionEngine Tests Summary

Comprehensive unit tests for FocusSuggestionEngine achieving 100% statement/line/function coverage with 25 tests covering tension spike detection, breaking news analysis, coverage gap detection, and relevance score sorting.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write focusSuggestionEngine unit tests | fa1baaf | server/services/focusSuggestionEngine.test.ts |

## Test Coverage

```
focusSuggestionEngine.ts | 100% Stmts | 95.45% Branch | 100% Funcs | 100% Lines
```

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| singleton pattern | 2 | getInstance returns same instance, reset creates new |
| generateSuggestions | 3 | Combines suggestions, sorts by relevanceScore, limits to 5 |
| analyzeTensionSpikes | 5 | Detects >30% sentiment spike, requires 3+ articles, finds presets |
| analyzeBreakingNews | 4 | Detects >50% topic spike, 11x baseline normalization |
| analyzeCoverageGaps | 5 | Detects <75% region coverage, requires 10+ articles |
| calculateRegionTension | 3 | Groups by perspective, calculates average negative score |
| calculateTopicFrequency | 3 | Counts occurrences, sorts by spike, handles new topics |

## Implementation Details

### Mock Strategy (per D-06)
```typescript
const mockGetArticles = vi.fn();
vi.mock('./newsAggregator', () => ({
  NewsAggregator: {
    getInstance: vi.fn(() => ({
      getArticles: mockGetArticles,
    })),
  },
}));
```

### Time Control (per D-07)
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
});
```

### Singleton Reset (per D-13)
```typescript
afterEach(() => {
  (FocusSuggestionEngine as any).instance = null;
  vi.clearAllMocks();
  vi.useRealTimers();
});
```

## Key Test Scenarios

1. **Tension Spike Detection**: Articles with -0.8 sentiment in last 6h vs -0.1 baseline trigger suggestion
2. **Breaking News Detection**: 10 articles with 'military' topic in 2h vs 2 in baseline (11x normalized)
3. **Coverage Gap Detection**: 15 articles from 1 region (1/13 = 7.7% coverage) triggers suggestion
4. **Relevance Sorting**: Multiple suggestion types combined and sorted by score descending
5. **Threshold Enforcement**: Tests verify minimum article counts and spike percentages

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
npm run test -- server/services/focusSuggestionEngine.test.ts --coverage
# 25 tests passed, 100% statement coverage
```

## Self-Check: PASSED

- [x] File exists: server/services/focusSuggestionEngine.test.ts
- [x] Contains: describe('FocusSuggestionEngine'
- [x] Contains: vi.mock('./newsAggregator'
- [x] Contains: describe('analyzeTensionSpikes'
- [x] Contains: describe('analyzeBreakingNews'
- [x] Contains: describe('analyzeCoverageGaps'
- [x] Contains: vi.useFakeTimers()
- [x] Contains: vi.setSystemTime(
- [x] Contains: (FocusSuggestionEngine as any).instance = null
- [x] Coverage >= 80% (actual: 100%)
- [x] Commit exists: fa1baaf
