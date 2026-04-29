<!-- generated-by: gsd-doc-writer -->
# Testing

NewsHub uses a two-layer test pyramid: Vitest for unit/integration tests against the React frontend and Express backend, and Playwright for end-to-end tests across the full stack. All commands assume `pnpm` (this is a `pnpm` monorepo — `npm` is not used).

## Test Pyramid

| Layer | Framework | Location | Scope |
|-------|-----------|----------|-------|
| Unit / integration | Vitest 4 + jsdom | `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/server/**/*.test.{ts,tsx}` | Pure functions, hooks, components, services |
| End-to-end | Playwright 1.58 | `apps/web/e2e/*.spec.ts` | Full-stack browser flows against `http://localhost:5173` (frontend) + `http://127.0.0.1:3001` (backend) |
| Load | k6 | `apps/web/k6/load-test.js` | Performance benchmarks (manual) |

NewsHub's test suite is large (1,300+ unit tests as of v1.6, 20 Playwright spec files across `chromium` and `chromium-auth` projects). Treat new features as a contract: a unit test for the logic, plus an E2E spec for the user-visible flow if it crosses HTTP/UI boundaries.

## Test Framework and Setup

### Unit Testing: Vitest

- **Framework:** `vitest@^4.0.18` with `@vitest/coverage-v8` for coverage
- **Environment:** `jsdom` (browser APIs simulated in Node)
- **Setup file:** `apps/web/src/test/setup.ts` — sets `JWT_SECRET`, registers `@testing-library/jest-dom` matchers, mocks `matchMedia` / `ResizeObserver` / `IntersectionObserver`, and runs cleanup after each test
- **Pool:** `forks` (isolated process per test file)
- **Per-test timeout:** 10 seconds
- **Config:** `apps/web/vitest.config.ts` (single source of truth — the root `vitest.config.ts` re-exports it)

### E2E Testing: Playwright

- **Framework:** `@playwright/test@^1.58.2`
- **Test directory:** `apps/web/e2e/`
- **Browser:** Chromium (Desktop Chrome device profile)
- **Base URL:** `http://localhost:5173`
- **Web server:** Auto-starts via `npm run dev` (defined in `playwright.config.ts`); reuses an existing dev server outside CI
- **Workers:** 4 in CI, CPU-based locally
- **Retries:** 1 in CI, 0 locally
- **Timeouts:** 30 s per test, 10 s for `expect`, 10 s action, 20 s navigation, 120 s web-server startup
- **Artifacts on failure:** Screenshot + trace (`trace: 'on-first-retry'`)

### Prerequisites Before Running E2E

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start backing services
docker compose up -d postgres redis

# 3. Generate Prisma client + push schema
cd apps/web && npx prisma generate && npx prisma db push

# 4. Seed badges + AI personas
pnpm seed
```

The `auth.setup.ts` project polls `http://127.0.0.1:3001/api/health` for up to 30 seconds before registering the test user — if the backend never becomes ready, every authenticated spec fails with a cascading login error. Make sure the backend can actually start (env vars, DB reachable) before debugging individual specs.

## Running Tests

### Unit Tests (Vitest)

```bash
pnpm test               # Watch mode (interactive)
pnpm test:run           # Single run (CI mode, no watch)
pnpm test:coverage      # Single run + coverage report (html + json + text)
```

Run a single file or pattern:

```bash
pnpm test -- apps/web/src/lib/utils.test.ts   # Single file
pnpm test -- -t "mapCentering"                # Tests whose name matches the pattern
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e           # Headless (default)
pnpm test:e2e:headed    # Visible browser
pnpm test:e2e:ui        # Interactive Playwright UI
```

Run a single E2E file (must `cd` into the workspace package — Playwright is not exposed as a root pnpm script for arbitrary args):

```bash
cd apps/web && npx playwright test e2e/auth.spec.ts
```

### Pre-Commit Verification

The canonical green-light command before pushing:

```bash
pnpm typecheck && pnpm test:run && pnpm build
```

E2E is not part of the pre-commit chain — it runs in CI on top of build artifacts.

## Playwright Project Structure

`apps/web/playwright.config.ts` defines three projects:

| Project | Storage State | Test Match | Purpose |
|---------|---------------|------------|---------|
| `setup` | none (writes state) | `*.setup.ts` | Runs `auth.setup.ts`, registers + logs in test user, saves auth to `playwright/.auth/user.json` |
| `chromium` | none | All `*.spec.ts` except profile/settings/history | Unauthenticated specs (auth flow, dashboard, navigation, search, bookmarks, etc.) |
| `chromium-auth` | `playwright/.auth/user.json` | `profile.spec.ts`, `settings.spec.ts`, `history.spec.ts`, `comments.spec.ts`, `teams.spec.ts` | Authenticated specs; depends on `setup` |

`bookmarks.spec.ts` deliberately runs in `chromium` (unauth) because the bookmarks page is backed by client-side localStorage, not server-side auth.

### Auth Setup (`apps/web/e2e/auth.setup.ts`)

- Polls `http://127.0.0.1:3001/api/health` for 30 s before doing anything (avoids ECONNREFUSED races where Playwright's `webServer` is up but the Express backend is still booting)
- Registers the canonical E2E user `e2e-test@newshub.test` via `POST /api/auth/register` (idempotent — silent failure if user already exists)
- Pre-seeds `localStorage` via `addInitScript` to bypass two blocking modals:
  - `FocusOnboarding` (z-90) — gated by `hasCompletedOnboarding` in the `newshub-storage` Zustand persist key
  - `ConsentBanner` (z-100) — gated by the `newshub-consent` localStorage key
- Logs in via the UI, waits for the modal to close (or for an inline error), saves storage state to `playwright/.auth/user.json`

### Fixtures (`apps/web/e2e/fixtures.ts`)

Custom `test` fixture exported from `fixtures.ts` extends `@playwright/test`'s base `test` and:

- Mocks AI / analysis endpoints (`/api/ai/ask`, `/api/ai/propaganda`, `/api/analysis/clusters`, `/api/analysis/summarize`, `/api/analysis/framing`, `/api/analysis/coverage-gaps`) so specs don't burn the FREE-tier 10/day AI quota
- Mocks `/api/events/geo` and `/api/events/timeline` to empty arrays (avoids the EventMap error fallback that strips the page `<h1>` and breaks navigation assertions)
- Mocks `/api/focus/suggestions` to an empty array (prevents focus suggestion overlays from covering header buttons)
- Bypasses `FocusOnboarding` and `ConsentBanner` via the same `addInitScript` strategy as `auth.setup.ts`
- Hides Sonner toast containers via injected CSS so toasts can't intercept clicks

Import this fixture (`import { test, expect } from './fixtures'`) instead of the raw `@playwright/test` import in any spec that touches AI, analysis, or geo-event surfaces.

## Writing New Tests

### File Naming

| Layer | Pattern | Co-located |
|-------|---------|------------|
| Unit (frontend) | `apps/web/src/**/*.test.{ts,tsx}` | Yes — next to the source file |
| Unit (backend) | `apps/web/server/**/*.test.ts` (or `apps/web/server/__tests__/`) | Yes |
| E2E | `apps/web/e2e/*.spec.ts` | No — central directory |
| E2E setup | `apps/web/e2e/*.setup.ts` | No |

### Conventions (CRITICAL — Discovered the Hard Way)

These rules look pedantic but each one corresponds to a real flake or cascading failure. Follow them.

- **Use `domcontentloaded`, not `networkidle`** — Socket.io polls the backend continuously, so the network never goes idle. `await page.waitForLoadState('networkidle')` will time out on every page that mounts a real-time component.
- **Use `127.0.0.1`, not `localhost`, for backend calls** — Node 18+ resolves `localhost` to `::1` (IPv6) first, but the backend listens on IPv4. Hitting `http://localhost:3001` from `request.get(...)` in setup files yields ECONNREFUSED.
- **Authenticated `page.request.*` calls don't auto-inject auth** — `storageState` only restores cookies and localStorage for the *page*. For raw API calls in a spec, manually pull the JWT and pass it:

  ```typescript
  const token = await page.evaluate(() => localStorage.getItem('newshub-token'));
  const res = await page.request.get('http://127.0.0.1:3001/api/account/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
  ```

- **Use `test.describe.configure({ mode: 'serial' })` for module-scoped state** — When a spec file shares state at module scope across `describe` blocks (e.g., `apps/web/e2e/publicApi.spec.ts` provisions an API key once and reuses it across tests), Playwright's default fully-parallel mode will split the file across workers and the state will be undefined in half of them. Force serial mode at the top of the file.
- **Mock AI/analysis endpoints from `fixtures.ts`** — Don't hit the real AI provider. The FREE tier caps at ~10 requests/day, after which every spec touching the dashboard, bookmarks list, or analysis page begins failing because the page renders an error state.

### Currently Skipped Tests (Tracked Debt)

| File | Test(s) | Reason |
|------|---------|--------|
| `apps/web/e2e/settings.spec.ts` | 3 language-toggle tests | UI moved to the header; tests need rewrite to find the new control |
| `apps/web/e2e/analysis.spec.ts` | 2 compare-modal tests (`should open compare mode modal`, `should close compare mode modal`) | Parallel-load race condition in the compare modal mount |
| `apps/web/e2e/publicApi.spec.ts` | Cache Headers + Revocation tests | Self-skip via `test.skip(...)` when the 3-key-per-user API key cap is hit (so the suite degrades gracefully instead of failing) |

These are explicit `test.skip(...)` calls — they show up as "skipped" in the report rather than failures. Re-enable when the underlying issue is fixed.

## Coverage Requirements

Coverage thresholds are enforced by Vitest in `apps/web/vitest.config.ts`. Failing any threshold causes `pnpm test:coverage` (and the CI test job) to exit non-zero.

| Coverage Type | Threshold | Notes |
|---------------|-----------|-------|
| Statements | 80% | Enforced |
| Lines | 80% | Enforced |
| Functions | 80% | Enforced |
| **Branches** | **75%** | **Tracked debt** — temporarily lowered from 80%. Actual: 75.61% (CI run 25107573823). Backfill targets: `routes/ai.ts`, `routes/leaderboard.ts`, `services/webhookService.ts`, `jobs/workerEmitter.ts`, `hooks/useComments.ts`. Goal: raise back to 80%. |

Coverage is provided by `@vitest/coverage-v8` with the following exclusions:

- `node_modules/`
- `src/test/` (test utilities)
- `**/*.d.ts` (TypeScript declarations)
- `**/*.config.*` (config files)
- `**/types/**` (type-only modules)

After running `pnpm test:coverage`, the HTML report is at `apps/web/coverage/index.html`.

## Debugging

### Vitest

```bash
pnpm test                 # Watch mode — re-runs on file change, with REPL controls
cd apps/web && pnpm test:ui   # Vitest UI (browser-based test explorer)
```

### Playwright

```bash
cd apps/web && npx playwright test --debug                 # Step-through debugger (Inspector)
cd apps/web && npx playwright test --ui                    # Interactive UI mode (timeline, locator picker)
cd apps/web && npx playwright test --debug e2e/auth.spec.ts  # Debug a specific file
cd apps/web && npx playwright show-report                  # Open the most recent HTML report
cd apps/web && npx playwright show-trace path/to/trace.zip # Open a trace artifact from a CI failure
```

On failure, Playwright captures:

- **Screenshot:** `screenshot: 'only-on-failure'` — saved next to the test in `test-results/`
- **Trace:** `trace: 'on-first-retry'` — full action timeline, network log, DOM snapshots; downloadable from CI artifacts and openable with `show-trace`

If a spec fails only in CI, download the trace artifact rather than trying to reproduce locally — the trace contains the exact DOM state at each step.

## CI Integration

Tests run in `.github/workflows/ci.yml`:

- **Lint + typecheck + unit tests + build** — Runs on every push and PR. The unit-test step is `pnpm test:coverage` and enforces the thresholds in `vitest.config.ts` (the 80%/80%/80%/75% gate). Failing coverage fails the build.
- **E2E tests** — Run after build succeeds, with PostgreSQL 17 and Redis 7.4-alpine as service containers. Chromium-only browser install (`npx playwright install --with-deps chromium`). The HTML report is uploaded as an artifact.
- **Lighthouse CI** — Runs *after* deploy-staging, **on master only**. Required scores: 90+ for performance, accessibility, best-practices, SEO. Core Web Vitals (LCP / CLS / INP / FCP) are tracked but warn-only.
- **CI workflow validation:** `pnpm validate:ci` (uses `action-validator`) — run this locally before editing `.github/workflows/`.

## Load Testing

k6 scenarios live in `apps/web/k6/load-test.js`.

```bash
pnpm load:smoke   # Quick smoke scenario
pnpm load:full    # Full load scenario
```

For staging-environment load tests, trigger the `load-test.yml` workflow manually via GitHub Actions `workflow_dispatch` against `STAGING_URL`. **It never runs against production** — the workflow is gated to staging only. Test users for load runs come from `pnpm seed:load-test` (creates `loadtest1@example.com` through `loadtest100@example.com` as pre-verified accounts).

Performance budgets validated by k6 + Lighthouse:

| Metric | Threshold |
|--------|-----------|
| News API p95 | < 500ms |
| AI API p95 | < 5s |
| Auth API p95 | < 300ms |
| LCP / CLS / INP / FCP | < 2s / < 0.05 / < 150ms / < 1.5s (warn-only) |

Load test artifacts (JSON + HTML) are retained for 30 days in GitHub Actions.
