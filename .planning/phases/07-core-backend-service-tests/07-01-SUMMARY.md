---
phase: 07-core-backend-service-tests
plan: 01
subsystem: backend-services
tags:
  - unit-testing
  - aiService
  - provider-fallback
  - caching
  - tdd
dependency_graph:
  requires: []
  provides:
    - aiService unit tests with 80%+ coverage
  affects:
    - UNIT-01 requirement completion
tech_stack:
  added:
    - vitest mocking patterns for SDK constructors
  patterns:
    - vi.mock() with constructor functions for external SDKs
    - vi.useFakeTimers() for TTL cache testing
    - Singleton reset pattern for test isolation
key_files:
  created:
    - server/services/aiService.test.ts (808 lines, 37 tests)
  modified: []
decisions:
  - decision: "Use vi.fn(function() {}) constructor pattern instead of arrow functions"
    rationale: "Vitest requires actual function/class constructors for proper mocking, arrow functions cause 'not a constructor' errors"
    alternatives: ["vi.spyOn", "manual dependency injection"]
    outcome: "All SDK mocks (Anthropic, OpenAI, GoogleGenerativeAI) work correctly"
  - decision: "Test keyword fallback as final safety net, not error case"
    rationale: "When all AI providers fail, keyword-based analysis ensures service never throws, aligning with graceful degradation pattern"
    alternatives: ["Throw errors when AI unavailable"]
    outcome: "Tests verify neutral sentiment returned when all providers fail"
  - decision: "Use real timers for batch delay test instead of fake timers"
    rationale: "vi.runAllTimersAsync() caused infinite loop with async setTimeout in batchAnalyzeSentiment"
    alternatives: ["Mock setTimeout directly", "Skip delay test"]
    outcome: "Batch processing test verifies 7 articles across 2 batches without timeout issues"
metrics:
  duration_seconds: 629
  completed_date: "2026-04-20"
  tasks_completed: 1
  files_created: 1
  tests_added: 37
  coverage_achieved:
    statements: 92.6
    branches: 80.5
    functions: 97.56
    lines: 93.38
---

# Phase 07 Plan 01: aiService Unit Tests Summary

**One-liner:** Comprehensive aiService unit tests with 37 test cases covering provider fallback chain (OpenRouter → Gemini → Anthropic → keyword), cache TTL expiration, and edge cases achieving 80.5% branch coverage.

## What Was Built

Created `server/services/aiService.test.ts` with 37 comprehensive unit tests covering all critical aiService functionality:

**Test Coverage Areas:**
1. **Singleton Pattern** (1 test) - Verifies getInstance() returns same instance
2. **Provider Priority** (6 tests) - Tests priority chain: OpenRouter > Gemini > Anthropic > none
3. **Clustering** (6 tests) - Article grouping, conflict entity prioritization, filtering rules
4. **Summary Generation with Cache** (4 tests) - TTL caching, cache expiration with fake timers
5. **Fallback Chain** (5 tests) - Provider failure cascade, rate limit handling, keyword fallback
6. **Shutdown** (1 test) - Cache clearing and timer cleanup
7. **Topic Classification** (7 tests) - AI vs keyword fallback, cache behavior, invalid response handling
8. **Sentiment Analysis** (5 tests) - Batch processing, JSON parsing, error handling
9. **Comparison Generation** (2 tests) - Framing by region, neutral/positive/negative sentiment ranges

**Coverage Achieved:**
- Statements: 92.6% (238/257)
- Branches: 80.5% (95/118) ✓ Exceeds 80% threshold
- Functions: 97.56% (40/41)
- Lines: 93.38% (226/242)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SDK constructor mocking approach**
- **Found during:** Task 1, initial test run
- **Issue:** vi.mock() with arrow functions `() => ({})` caused "not a constructor" errors when aiService.ts called `new GoogleGenerativeAI()`
- **Fix:** Changed to proper constructor function pattern: `vi.fn(function() { return {...}; })`
- **Files modified:** server/services/aiService.test.ts
- **Commit:** 2c91bdb

**2. [Rule 1 - Bug] Fixed infinite loop in fake timers test**
- **Found during:** Task 1, batch delay test
- **Issue:** vi.runAllTimersAsync() caused infinite loop with setTimeout in async Promise chain
- **Fix:** Removed fake timers from batch delay test, verified multi-batch processing instead
- **Files modified:** server/services/aiService.test.ts
- **Commit:** 2c91bdb

**3. [Rule 2 - Missing Functionality] Added edge case tests to reach 80% branch coverage**
- **Found during:** Task 1, coverage validation (initial 72%, then 76%, then 79.66%)
- **Issue:** Missing tests for: AI parse errors, invalid JSON responses, OpenRouter non-fallback errors, neutral framing, Anthropic 429 errors
- **Fix:** Added 10 additional tests covering error paths and edge cases
- **Files modified:** server/services/aiService.test.ts
- **Commit:** 2c91bdb

## Test Strategy Highlights

**Mocking Pattern:**
```typescript
// Mock at file top with constructor functions
const mockGeminiModel = { generateContent: vi.fn() };
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return { getGenerativeModel: () => mockGeminiModel };
  })
}));
```

**Singleton Reset Pattern (per D-09):**
```typescript
afterEach(() => {
  (AIService as unknown as { instance: AIService | null }).instance = null;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
```

**Cache TTL Testing with Fake Timers (per D-07):**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
});

// Test cache hit
await service.generateClusterSummary(cluster);
expect(mockModel.generateContent).toHaveBeenCalledTimes(1);

// Advance time beyond TTL (30 min)
vi.advanceTimersByTime(31 * 60 * 1000);

// Test cache miss
await service.generateClusterSummary(cluster);
expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
```

## Known Stubs

None. All tests use properly mocked AI SDKs and return realistic response structures.

## Threat Flags

None. Test file does not introduce security-relevant surface. Uses mocked environment variables for API keys, never real credentials.

## Self-Check: PASSED

**Created files:**
- FOUND: server/services/aiService.test.ts (808 lines, 37 tests)

**Commits:**
- FOUND: 2c91bdb (test(07-01): add comprehensive aiService unit tests with 80%+ coverage)

**Test execution:**
- PASSED: All 37 tests pass
- PASSED: Coverage 80.5% branches (exceeds 80% threshold)

## Completion Evidence

```
Test Files  1 passed (1)
      Tests  37 passed (37)
   Duration  3.35s

Coverage Summary:
Statements   : 92.6% ( 238/257 )
Branches     : 80.5% ( 95/118 )
Functions    : 97.56% ( 40/41 )
Lines        : 93.38% ( 226/242 )
```

## Next Steps

This plan completes UNIT-01 requirement for aiService. Remaining Phase 07 plans:
- Plan 02: authService tests (JWT, bcrypt, email verification)
- Plan 03: cacheService tests (Redis wrapper, TTL)
- Plan 04: emailService + cleanupService tests (Nodemailer, account lifecycle)
