# Phase 10: Frontend Hook & Library Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 10-frontend-hook-library-tests
**Areas discussed:** Hook Testing Strategy, Browser API Mocking, Library Edge Cases, Test Isolation

---

## Hook Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| renderHook with wrapper (Recommended) | Use @testing-library/react-hooks renderHook() with a custom wrapper that provides mock contexts — existing testUtils.tsx pattern | ✓ |
| Component wrapper tests | Create minimal test components that consume the hook and render output — more integration-style | |
| Let Claude decide | Claude picks approach per hook based on complexity | |

**User's choice:** renderHook with wrapper (Recommended)
**Notes:** Matches existing testUtils.tsx pattern. Provides clean isolation for hooks that depend on Auth, Store, or Query contexts.

---

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock react-router-dom (Recommended) | Mock useNavigate to return a vi.fn() spy — verify navigation calls without real router. Simpler and faster. | ✓ |
| MemoryRouter wrapper | Use MemoryRouter with initialEntries — actually navigate and check location. More realistic but more setup. | |
| Let Claude decide | Claude picks based on what each hook needs | |

**User's choice:** vi.mock react-router-dom (Recommended)
**Notes:** Keeps tests fast and focused on handler logic. MemoryRouter would be overkill for verifying navigate() calls.

---

## Browser API Mocking

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock socket.io-client (Recommended) | Mock the io() function to return a fake socket object with on/off/emit/disconnect methods. Matches Phase 9 websocketService pattern. | ✓ |
| Event emitter shim | Create a minimal EventEmitter that mimics socket behavior — more realistic event flow but more code | |
| Let Claude decide | Claude picks the simplest approach that covers the hook logic | |

**User's choice:** vi.mock socket.io-client (Recommended)
**Notes:** Consistent with Phase 9 server-side websocketService tests. Same mock pattern, different side of the socket.

---

| Option | Description | Selected |
|--------|-------------|----------|
| fireEvent.keyDown (Recommended) | @testing-library fireEvent.keyDown(document, { key: '1' }) — simple, direct, tests handler logic | ✓ |
| userEvent.keyboard | @testing-library userEvent.keyboard('{1}') — more realistic but overkill for handler unit tests | |
| Let Claude decide | Claude picks based on test complexity | |

**User's choice:** fireEvent.keyDown (Recommended)
**Notes:** fireEvent is sufficient for verifying keyboard handler logic. userEvent adds unnecessary complexity for unit tests.

---

## Library Edge Cases

| Option | Description | Selected |
|--------|-------------|----------|
| Empty/cold start paths (Recommended) | Focus on empty arrays, cold start (< threshold), no matches — these are the most likely production failures | ✓ |
| Boundary conditions | Focus on exact thresholds: 10 articles, 7-day window, score tiebreakers — ensures algorithm correctness | |
| Both equally | Cover both empty paths and boundary conditions with similar depth | |
| Let Claude decide | Claude prioritizes based on code complexity | |

**User's choice:** Empty/cold start paths (Recommended)
**Notes:** Empty inputs and cold start scenarios are the most common edge cases in production. Boundary conditions are secondary priority.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sample-based (Recommended) | Test 5-10 representative keywords in each language — proves the logic works without exhaustive stop word coverage | ✓ |
| Exhaustive stop words | Test all stop words in both languages are properly filtered — complete but verbose | |
| Let Claude decide | Claude balances thoroughness with test maintainability | |

**User's choice:** Sample-based (Recommended)
**Notes:** Exhaustive stop word testing would create brittle tests. Sample-based approach proves the filtering logic without maintaining a comprehensive test set.

---

## Test Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock the store (Recommended) | Mock useAppStore to return controlled state per test — full isolation, matches Phase 7-9 singleton pattern | ✓ |
| Store reset function | Call store.setState(initialState) in beforeEach — uses real store but requires reset discipline | |
| Let Claude decide | Claude picks based on which hooks need store access | |

**User's choice:** vi.mock the store (Recommended)
**Notes:** Consistent with Phase 7-9 pattern for singleton mocking. Full isolation prevents state leakage between tests.

---

## Claude's Discretion

- Specific mock data structures for articles, history entries, socket events
- Test grouping and describe block organization
- Balance between exhaustive edge cases vs representative sampling
- Timer advancement increments for polling/debounce tests

## Deferred Ideas

None — discussion stayed within phase scope
