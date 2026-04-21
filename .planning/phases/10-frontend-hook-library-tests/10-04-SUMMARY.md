---
phase: 10
plan: 04
subsystem: frontend-hooks
tags: [hooks, testing, memoization, map-center]
dependency_graph:
  requires: []
  provides: [useMapCenter-tests]
  affects: [src/hooks/useMapCenter.ts]
tech_stack:
  added: []
  patterns: [vi.mock-store, vi.mock-utility, renderHook]
key_files:
  created: [src/hooks/useMapCenter.test.ts]
  modified: []
decisions:
  - Mock useAppStore and calculateOptimalMapView to isolate hook logic
  - Test all three priority levels per hook documentation
  - Verify memoization returns same reference when inputs unchanged
metrics:
  duration_minutes: 2
  completed: 2026-04-21T14:59:58Z
---

# Phase 10 Plan 04: useMapCenter Hook Tests Summary

Unit tests for useMapCenter hook with vi.mock for store and utility isolation, achieving 100% coverage across preset priority, region calculation, and global fallback paths.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write useMapCenter unit tests | 6d0ded9 | src/hooks/useMapCenter.test.ts |

## Test Results

```
 RUN  v4.1.4 D:/NewsHub

 Tests:
 - Priority 1: preset mapCenter
   - returns preset mapCenter when activeFocusPreset has mapCenter
   - ignores preset if mapCenter is undefined
 - Priority 2: calculated from regions
   - calculates center from filter regions when no preset
   - calculates center for single region
 - Priority 3: global fallback
   - returns global view when no preset and no regions
   - returns global view when preset exists but has no mapCenter and no regions
   - returns global view when regions is undefined
 - memoization
   - returns same reference when inputs unchanged
   - returns new reference when activeFocusPreset changes
   - returns new reference when regions change

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

## Coverage

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
useMapCenter.ts  |   100%  |   100%   |   100%  |   100%  |
-----------------|---------|----------|---------|---------|-------------------

Statements   : 100% ( 7/7 )
Branches     : 100% ( 6/6 )
Functions    : 100% ( 2/2 )
Lines        : 100% ( 7/7 )
```

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### Test Strategy

1. **Mock Isolation**: Both `useAppStore` and `calculateOptimalMapView` are mocked via `vi.mock()` to test hook logic in isolation without depending on real store state or utility implementation.

2. **Priority Testing**: Tests verify the documented priority order:
   - Priority 1: Preset mapCenter takes precedence over everything
   - Priority 2: When no preset mapCenter, uses calculateOptimalMapView with filter regions
   - Priority 3: Falls back to global view {lat: 30, lng: 0, zoom: 2} when no regions

3. **Edge Cases**: Tests cover:
   - Preset exists but has no mapCenter property (falls through to Priority 2)
   - Empty regions array (global fallback)
   - Undefined regions (global fallback)

4. **Memoization Verification**: Tests confirm useMemo behavior by checking object reference equality across rerenders with same vs changed inputs.

## Self-Check: PASSED

- [x] File exists: src/hooks/useMapCenter.test.ts
- [x] Commit exists: 6d0ded9
- [x] All 10 tests pass
- [x] Coverage >= 80% (achieved 100%)
