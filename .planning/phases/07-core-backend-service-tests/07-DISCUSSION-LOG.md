# Phase 7: Core Backend Service Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 07-core-backend-service-tests
**Areas discussed:** Mocking strategy, Test file location, Coverage priorities, Test isolation

---

## Mocking Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock at top (Recommended) | Module-level vi.mock() calls. Simple, standard Vitest pattern. Each test file mocks what it needs. | ✓ |
| Shared mock factories | Create reusable mocks in server/test/mocks/. More setup, but consistent across tests. | |
| In-test manual mocks | Mock inside each test with vi.spyOn. Verbose but explicit per-test control. | |

**User's choice:** vi.mock at top (Recommended)
**Notes:** Standard Vitest pattern, each test file mocks its dependencies at top

---

### Prisma Mocking Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Mock prisma object (Recommended) | vi.mock('../db/prisma') returning mock methods. Fast, no DB needed. | ✓ |
| Test database | Use separate SQLite test DB with real Prisma. Slower but catches schema issues. | |
| You decide | Let Claude choose based on test requirements. | |

**User's choice:** Mock prisma object (Recommended)
**Notes:** No test database needed for unit tests

---

### AI SDK Mock Depth Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal response mocks | Return simple success/error responses. Focus on testing service logic, not SDK behavior. | ✓ |
| Realistic SDK responses | Mock full SDK response shapes. More work but catches parsing issues. | |
| You decide per test | Use minimal for happy path, realistic for edge cases. | |

**User's choice:** Minimal response mocks
**Notes:** Focus on service logic, not SDK behavior

---

## Test File Location

| Option | Description | Selected |
|--------|-------------|----------|
| Co-located (Recommended) | server/services/aiService.test.ts next to aiService.ts. Matches frontend pattern, easy to find. | ✓ |
| Dedicated test folder | server/tests/services/aiService.test.ts. Keeps source clean, common in backend projects. | |
| You decide | Let Claude choose based on conventions. | |

**User's choice:** Co-located (Recommended)
**Notes:** Matches existing frontend test file convention

---

## Coverage Priorities

### AI Service Fallback Chain

| Option | Description | Selected |
|--------|-------------|----------|
| Provider failure cascade | Test: OpenRouter fails -> Gemini -> Anthropic -> keyword fallback. The core reliability promise. | ✓ |
| Partial responses | Test: Provider returns empty, malformed, or truncated responses. | |
| Rate limiting | Test: Provider returns 429, service backs off correctly. | |
| All of the above | Cover all three scenario types. | |

**User's choice:** Provider failure cascade
**Notes:** Focus on core reliability promise of fallback chain

---

### Auth Service Token Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Expired/invalid tokens (Recommended) | JWT expiry, malformed tokens, wrong signature. Core security. | ✓ |
| Token version mismatch | Session invalidation via tokenVersion field change. | |
| Both | Cover expiry, format, and version edge cases. | |

**User's choice:** Expired/invalid tokens (Recommended)
**Notes:** Focus on core security edge cases

---

### Cache Service TTL Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Fake timers (Recommended) | vi.useFakeTimers() to simulate time passing. Fast, deterministic. | ✓ |
| Short real TTLs | Set 100ms TTLs in tests and actually wait. Slower but tests real behavior. | |
| You decide | Let Claude pick based on test requirements. | |

**User's choice:** Fake timers (Recommended)
**Notes:** Fast and deterministic testing

---

### Email Service Template Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| HTML output contains variables (Recommended) | Check rendered HTML includes user name, verification link, etc. Simple string assertions. | ✓ |
| Full HTML structure | Snapshot test entire email template output. More brittle but catches layout issues. | |
| You decide | Let Claude determine appropriate assertion depth. | |

**User's choice:** HTML output contains variables (Recommended)
**Notes:** Simple string assertions for variable presence

---

## Test Isolation

### Singleton Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Reset static instance (Recommended) | Add resetInstance() method or set Service.instance = null in afterEach. Clean slate per test. | ✓ |
| Mock getInstance entirely | vi.mock the service, return fresh mock each test. Never use real singleton. | |
| Accept shared state | Run tests serially, carefully manage state. Simpler code, fragile tests. | |

**User's choice:** Reset static instance (Recommended)
**Notes:** Clean slate per test for isolation

---

### Reset Method Location

| Option | Description | Selected |
|--------|-------------|----------|
| Test-only reset (Recommended) | Use (Service as any).instance = null in tests. No production code change. | ✓ |
| Add resetInstance to services | Export resetInstance() for testing. Clean API but adds unused prod code. | |
| You decide | Let Claude pick based on service complexity. | |

**User's choice:** Test-only reset (Recommended)
**Notes:** No changes to production service code

---

## Claude's Discretion

- cleanupService deletion grace period testing approach
- Specific mock data structures beyond minimal requirements
- Test grouping and describe block organization

## Deferred Ideas

None - discussion stayed within phase scope
