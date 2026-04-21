---
phase: "09"
plan: "04"
subsystem: translation
tags: [unit-tests, translation, providers, caching, vitest]
dependency_graph:
  requires: []
  provides: [translationService-tests]
  affects: [translationService.ts]
tech_stack:
  added: []
  patterns: [provider-mocking, fake-timers, singleton-reset]
key_files:
  created:
    - server/services/translationService.test.ts
  modified: []
decisions:
  - Use undefined (not null) for optional sourceLang parameter in DeepL mock assertions
metrics:
  duration_minutes: 4
  completed: "2026-04-21T12:26:15Z"
---

# Phase 09 Plan 04: TranslationService Tests Summary

Comprehensive unit tests for TranslationService with 94% statement coverage, testing all 4 translation providers and their fallback chain.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 4dfb701 | test | Add translationService unit tests with 94% coverage |

## Implementation Details

### Test Coverage Achieved

| Metric | Target | Actual |
|--------|--------|--------|
| Statements | 80% | 94.3% |
| Branches | 80% | 87.71% |
| Functions | 80% | 100% |
| Lines | 80% | 97.32% |

### Test Suites Implemented (45 tests)

1. **Singleton Pattern** (2 tests)
   - Same instance on multiple calls
   - Env vars read at construction time

2. **Provider Initialization** (5 tests)
   - DeepL when DEEPL_API_KEY set
   - Claude when ANTHROPIC_API_KEY set
   - Google when GOOGLE_TRANSLATE_API_KEY set
   - LibreTranslate always as fallback
   - getUsageStats lists all providers

3. **Provider Priority and Fallback** (6 tests)
   - DeepL first when available
   - Google fallback when DeepL fails
   - LibreTranslate fallback when Google fails
   - Claude fallback when LibreTranslate fails
   - Original text when all providers fail
   - quality=0 when all fail

4. **DeepL Translation** (4 tests)
   - Target language mapping (en->en-GB, de->de)
   - Quality 0.95 for DeepL
   - Character count tracking for rate limiting
   - Skip when monthly limit reached

5. **Google Translation** (3 tests)
   - Correct API params
   - Quality 0.90
   - Error handling

6. **LibreTranslate** (3 tests)
   - Correct POST body
   - Quality 0.75
   - Custom URL from env

7. **Claude Translation** (3 tests)
   - Anthropic prompt format
   - Quality 0.85
   - Non-text response handling

8. **Caching** (5 tests with fake timers)
   - Cache hit within 7-day TTL
   - cached=true flag
   - Regenerate when expired
   - getCacheSize()
   - clearCache()

9. **Batch Translation** (3 tests)
   - Parallel processing
   - 10-item batch size
   - Results for all texts

10. **Language Detection** (6 tests)
    - Cyrillic -> ru
    - Arabic -> ar
    - Chinese -> zh
    - Hebrew -> he
    - Turkish -> tr
    - Default -> en

11. **Provider Order** (1 test)
    - Priority: DeepL -> Claude -> Google -> LibreTranslate

12. **Edge Cases** (4 tests)
    - Empty text
    - Long text (hash-based cache key)
    - Source language passthrough
    - Detected source language return

### Mocking Strategy

```typescript
// DeepL mock via vi.mock('deepl-node')
const mockDeeplTranslate = vi.fn();

// Anthropic mock via vi.mock('@anthropic-ai/sdk')
const mockAnthropicCreate = vi.fn();

// Google/LibreTranslate via global.fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

### Singleton Reset Pattern

```typescript
afterEach(() => {
  (TranslationService as unknown as { instance: TranslationService | null }).instance = null;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
```

### Fake Timers for Cache TTL

```typescript
describe('Caching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  // ... tests can advance time by 8 days to test expiry
});
```

## Verification

```bash
npm run test -- server/services/translationService.test.ts --coverage
# 45 passed, 0 failed
# Coverage: 94.3% statements, 87.71% branches
```

## Self-Check: PASSED

- [x] File exists: server/services/translationService.test.ts
- [x] Commit exists: 4dfb701
- [x] All 45 tests pass
- [x] Coverage exceeds 80% threshold
