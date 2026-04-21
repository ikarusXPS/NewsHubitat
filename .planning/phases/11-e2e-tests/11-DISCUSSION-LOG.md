# Phase 11: E2E Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 11-e2e-tests
**Areas discussed:** Test scope priority, Test data strategy, Auth-required flows, Failure & edge cases

---

## Test Scope Priority

| Option | Description | Selected |
|--------|-------------|----------|
| New only (Recommended) | Focus on 7 uncovered pages. Existing Monitor/EventMap/Timeline tests are sufficient. | ✓ |
| Extend existing | Add more tests to Monitor/EventMap/Timeline before tackling new pages. | |
| Comprehensive | Both extend existing AND add all new pages. Higher effort, better coverage. | |

**User's choice:** New only (Recommended)
**Notes:** Existing coverage for Monitor (17 tests), EventMap (15 tests), Timeline (8 tests) deemed sufficient.

---

## Dashboard Page Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Feed basics | Article cards render, grid/list toggle, region filter pills work, view mode persists | |
| Full interactions | Above + infinite scroll loading, article click opens detail, read marking works | ✓ |
| Minimal | Just verify page loads with articles — unit tests already cover filter logic | |

**User's choice:** Full interactions
**Notes:** Dashboard is a core page; comprehensive E2E coverage justified.

---

## Analysis Page (AI Q&A) Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Happy path only (Recommended) | Submit question, verify response appears with citations. Don't test AI quality. | ✓ |
| With follow-ups | Test follow-up questions maintain context, coverage gap alerts display | |
| Skip AI tests | Too flaky — AI responses vary. Just test cluster view and topic selection. | |

**User's choice:** Happy path only (Recommended)
**Notes:** AI response quality is inherently variable; focus on UI flow, not content assertions.

---

## Test Data Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Real backend (Recommended) | Dev server with SQLite. Tests run against real API. Simpler, but slower and data-dependent. | ✓ |
| API interception | Use Playwright route.fulfill() to mock API responses. Fast, deterministic, but more setup. | |
| Hybrid | Real backend for most tests, intercept specific flaky endpoints (like AI responses). | |

**User's choice:** Real backend (Recommended)
**Notes:** No API mocking — tests hit actual dev server with SQLite database.

---

## Data Seeding Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Test-time setup | Each test creates its own data via API calls in beforeEach. Clean isolation. | |
| Pre-seeded DB | Script seeds dev.db before test run. Tests assume data exists. Faster but coupled. | |
| You decide | Claude picks the pragmatic approach per test suite. | ✓ |

**User's choice:** You decide
**Notes:** Claude has flexibility to choose test-time API setup vs pre-seeded DB per test suite.

---

## Authentication Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Login via UI | Each test logs in through auth modal. Realistic, but slow and repetitive. | |
| storageState (Recommended) | Run login once in setup, save session to file, reuse in subsequent tests. Fast. | ✓ |
| Direct token injection | Set JWT in localStorage before navigation. Fastest, but bypasses auth UI entirely. | |

**User's choice:** storageState (Recommended)
**Notes:** Playwright's storageState feature enables fast auth-required tests without repeating login UI.

---

## Test User Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated test user | Create e2e-test@newshub.test during setup. Predictable email, isolated from manual testing. | ✓ |
| Existing dev user | Use whatever user is in dev.db. Less setup, but may conflict with manual testing. | |
| Environment variable | Read E2E_TEST_EMAIL and E2E_TEST_PASSWORD from .env. Flexible per environment. | |

**User's choice:** Dedicated test user
**Notes:** `e2e-test@newshub.test` created during global setup.

---

## Failure & Edge Case Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Key empty states | Test "no bookmarks", "no history", "no search results" empty states render correctly. | |
| Plus API errors | Above + test graceful degradation when backend returns 500 or is unreachable. | |
| Minimal | Skip failure testing — happy paths only. Failures are covered by unit tests. | |
| You decide | Claude picks pragmatic approach | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion to test key empty states where relevant; skip API error testing.

---

## Claude's Discretion

- Specific test assertions per page
- Test grouping and describe block organization
- Data seeding approach per test suite (test-time vs pre-seeded)
- Empty state testing where relevant

## Deferred Ideas

None — discussion stayed within phase scope
