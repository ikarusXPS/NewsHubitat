---
phase: 09-extension-service-tests
plan: 01
subsystem: backend-services
tags: [testing, unit-tests, persona-service, ai-integration]
dependency_graph:
  requires: []
  provides: [personaService-tests]
  affects: [test-coverage]
tech_stack:
  added: []
  patterns: [vitest-mocking, singleton-test-pattern, globalThis-mock-access]
key_files:
  created:
    - server/services/personaService.test.ts
  modified: []
decisions:
  - "Used globalThis to pass mock function into vi.mock factory for hoisting compatibility"
  - "Added callWithFallback to mock AIService since personaService.ts extends prototype"
metrics:
  duration_minutes: 5
  completed_at: "2026-04-21T12:25:54Z"
---

# Phase 09 Plan 01: PersonaService Unit Tests Summary

Comprehensive unit tests for PersonaService achieving 100% statement coverage and 89% branch coverage.

## One-Liner

PersonaService tests covering singleton, persona retrieval, keyword suggestions, user state, and AI integration with mocked AIService.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create personaService unit tests | 1d794d2 | server/services/personaService.test.ts |

## Test Coverage Results

```
-------------------|---------|----------|---------|---------
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|---------
personaService.ts  |     100 |    89.18 |     100 |     100
-------------------|---------|----------|---------|---------
```

- **38 tests** in 7 describe blocks
- **Statements:** 100% (52/52)
- **Branches:** 89.18% (66/74)
- **Functions:** 100% (13/13)
- **Lines:** 100% (50/50)

## Test Suites Implemented

1. **Singleton Pattern** (2 tests)
   - Same instance on multiple calls
   - Initialize with 8 default personas

2. **Persona Retrieval** (5 tests)
   - Get all public personas
   - Get persona by ID
   - Return null for unknown ID
   - Get default persona (neutral-analyst)
   - Fallback to first persona if default missing

3. **User Active Persona** (4 tests)
   - Return default for new user
   - Set valid persona returns true
   - Set invalid persona returns false
   - Retrieve set persona correctly

4. **Custom Personas** (2 tests)
   - Add new custom persona
   - Reject duplicate ID

5. **Prompt Generation** (2 tests)
   - Combine persona prompt with user prompt
   - Use default persona for unknown ID

6. **Keyword-Based Suggestion** (15 tests)
   - economist: wirtschaft, sanktion, handel, markt
   - historian: geschichte, historisch, fruher
   - humanitarian: fluchtling, humanitar, zivilisten, menschenrecht
   - media-critic: medien, berichterstattung, propaganda, framing
   - geopolitical-strategist: strateg, macht, interessen, geopolit
   - explainer: erklar, versteh, was ist, warum
   - devil-advocate: kritisch, hinterfrag, wirklich
   - default: no keyword match

7. **AI Analysis Integration** (4 tests)
   - Call AIService.analyzeText with proper prompt
   - Return response with persona object
   - Use default persona for unknown ID
   - Return fallback message when AI returns null

8. **Persona Properties** (4 tests)
   - All personas have required properties
   - Only neutral-analyst is default
   - All IDs are unique
   - All expected persona IDs exist

## Technical Implementation

### Mock Strategy

The AIService mock required special handling due to personaService.ts extending `AIService.prototype.analyzeText`:

```typescript
vi.mock('./aiService', () => {
  class MockAIService {
    static instance: MockAIService | null = null;

    static getInstance() { /* singleton pattern */ }

    // Required: personaService.ts extends prototype with analyzeText
    // that calls callWithFallback internally
    async callWithFallback(prompt: string) {
      return globalThis.__mockAnalyzeText(prompt);
    }

    async analyzeText(prompt: string) {
      return globalThis.__mockAnalyzeText(prompt);
    }
  }
  return { AIService: MockAIService };
});

// Expose mock function globally for hoisted vi.mock access
globalThis.__mockAnalyzeText = mockAnalyzeText;
```

### Singleton Reset Pattern

```typescript
afterEach(() => {
  (PersonaService as unknown as { instance: PersonaService | null }).instance = null;
  vi.clearAllMocks();
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
npm run test -- server/services/personaService.test.ts --coverage
# All 38 tests pass
# Coverage: 100% statements, 89% branches
```

## Self-Check: PASSED

- [x] File `server/services/personaService.test.ts` exists
- [x] Commit `1d794d2` verified in git log
- [x] All 38 tests pass
- [x] Coverage exceeds 80% threshold
