---
phase: 33-caching-improvements
plan: 03
subsystem: backend/tests
tags: [testing, vitest, caching, etag, thundering-herd]
dependency_graph:
  requires: [33-01, 33-02]
  provides: [setWithJitter-tests, etag-middleware-tests]
  affects: [test-coverage]
tech_stack:
  added: []
  patterns: [mock-redis, mock-express-middleware]
key_files:
  created:
    - server/middleware/etagMiddleware.test.ts
  modified:
    - server/services/cacheService.test.ts
decisions:
  - "Add getOrSet setWithJitter integration test to verify internal usage"
  - "Mock req/res objects for middleware testing per existing patterns"
  - "Test both ETag match (304) and mismatch (200) scenarios"
metrics:
  duration: 4m
  completed: 2026-04-25T23:03:00Z
  tasks: 3
  files: 2
---

# Phase 33 Plan 03: Caching Tests and Validation Summary

Unit tests for new caching functionality ensuring setWithJitter and ETag middleware work correctly.

## One-liner

Comprehensive test coverage for setWithJitter thundering herd prevention and ETag conditional caching middleware.

## What Was Built

### CacheService Test Additions

1. **getOrSet setWithJitter integration test** - Verifies that getOrSet uses setWithJitter internally for consistent thundering herd prevention across all cache operations.

### ETag Middleware Tests (21 tests)

New test file `server/middleware/etagMiddleware.test.ts`:

1. **GET request ETag generation** - Verifies weak ETag (W/"...") format with 16-char MD5 hash
2. **304 Not Modified** - Returns 304 when If-None-Match matches current ETag
3. **Stale ETag handling** - Returns full response when ETag doesn't match
4. **Non-GET passthrough** - POST, PUT, DELETE, PATCH requests skip ETag processing
5. **Skip paths** - /health, /readiness, /metrics, /api/health endpoints skip ETag
6. **Consistent ETags** - Same content produces same ETag (deterministic)
7. **Different ETags** - Different content produces different ETags (hash sensitive)
8. **Edge cases** - Empty objects, arrays, null, nested objects all work

## Technical Details

### Test Pattern: Middleware Mocking

```typescript
const mockRequest = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  path: '/api/news',
  get: vi.fn().mockReturnValue(undefined),
  ...overrides,
} as unknown as Request);

const mockResponse = (): Response & { _jsonBody?: unknown } => {
  const res = {
    json: vi.fn(function (body: unknown) {
      this._jsonBody = body;
      return this;
    }),
    set: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { _jsonBody?: unknown };
};
```

### Test Pattern: setWithJitter Spy

```typescript
it('uses setWithJitter internally for consistent thundering herd prevention', async () => {
  const setWithJitterSpy = vi.spyOn(service, 'setWithJitter');
  const computeFn = vi.fn().mockResolvedValue({ computed: true });

  await service.getOrSet('test:key', computeFn, 300);

  expect(setWithJitterSpy).toHaveBeenCalledWith('test:key', { computed: true }, 300);
  setWithJitterSpy.mockRestore();
});
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1f4bbaa | Add getOrSet setWithJitter integration test |
| 2 | 1b8537a | Add ETag middleware tests (21 tests) |
| 3 | — | Verification task (no commit needed) |

## Files Changed

| File | Change |
|------|--------|
| `server/services/cacheService.test.ts` | Added getOrSet setWithJitter integration test |
| `server/middleware/etagMiddleware.test.ts` | Created - 21 tests for ETag middleware |

## Verification Results

```
npm run typecheck  # PASS (0 errors)
npm run test:run   # 1232 tests passing
npm run build      # SUCCESS (frontend + server)
```

## Test Coverage

- **New tests added:** 22 tests total (1 CacheService, 21 ETag middleware)
- **Total tests passing:** 1232/1232
- **Files with new coverage:** etagMiddleware.ts now fully tested

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] server/services/cacheService.test.ts contains 'uses setWithJitter internally'
- [x] server/middleware/etagMiddleware.test.ts exists
- [x] Commit 1f4bbaa verified in git log
- [x] Commit 1b8537a verified in git log
- [x] TypeScript compilation passes
- [x] All 1232 tests pass
- [x] Build succeeds
