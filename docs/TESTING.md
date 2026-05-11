<!-- generated-by: gsd-doc-writer -->
# Testing

NewsHub uses a layered test strategy: Vitest for unit/integration tests against the React frontend and Express backend, Playwright for end-to-end browser tests, and a separate Docker Compose harness (`pnpm test:fanout`) for cross-replica WebSocket verification. All commands assume `pnpm` (this is a `pnpm` monorepo — `npm` is not used).

## Test Pyramid

| Layer | Framework | Location | Scope |
|-------|-----------|----------|-------|
| Unit / integration | Vitest 4 + jsdom | `apps/web/src/**/*.test.{ts,tsx}`, `apps/web/server/**/*.test.{ts,tsx}` | Pure functions, hooks, components, services |
| End-to-end | Playwright 1.58 | `apps/web/e2e/*.spec.ts` | Full-stack browser flows against `http://localhost:5173` (frontend) + `http://127.0.0.1:3001` (backend) |
| Cross-replica fanout | Vitest + Docker Compose | `e2e-stack/ws-fanout.test.ts` | Phase 37 INFRA-04 / WS-04 gate — boots 2× app behind Traefik and asserts Socket.IO events fan out via the Redis adapter |
| Load | k6 | `apps/web/k6/load-test.js` | Performance benchmarks (manual) |

NewsHub's test suite is large (1,400+ unit tests as of v1.6, 19 Playwright spec files across `chromium` and `chromium-auth` projects). Treat new features as a contract: a unit test for the logic, plus an E2E spec for the user-visible flow if it crosses HTTP/UI boundaries.

## Test Framework and Setup

### Unit Testing: Vitest

- **Framework:** `vitest@^4.0.18` with `@vitest/coverage-v8` for coverage
- **Environment:** `jsdom` (browser APIs simulated in Node)
- **Setup file:** `apps/web/src/test/setup.ts` — sets `JWT_SECRET`, registers `@testing-library/jest-dom` matchers, mocks `matchMedia` / `ResizeObserver` / `IntersectionObserver`, and runs cleanup after each test
- **Pool:** `forks` (isolated process per test file)
- **Per-test timeout:** 10 seconds
- **Config:** `apps/web/vitest.config.ts` is the single source of truth for actually-running tests, because `pnpm test` proxies to that workspace. A second `vitest.config.ts` exists at the repo root as an independent duplicate (not a re-export) and the two have already diverged — the root file pins `branches: 80` while `apps/web/vitest.config.ts` pins `branches: 71`. Treat the root file as stale and edit `apps/web/vitest.config.ts` for any threshold change.

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

### Cross-Replica Fanout: `pnpm test:fanout`

Phase 37 added a horizontal-scaling topology where multiple web replicas fan Socket.IO events to each other through `@socket.io/redis-adapter`. **Mocked-adapter unit tests do not satisfy the WS-04 gate** — only a real two-replica boot does. The `e2e-stack/` directory provides that harness.

- **Entry point:** `pnpm test:fanout` (calls `bash e2e-stack/run-fanout-test.sh`)
- **Stack:** `e2e-stack/docker-compose.test.yml` boots `postgres:17` + `redis:7.4-alpine` + `traefik:v3.3` + 2× app (`app-1`, `app-2`) behind Traefik on host port 8000
- **Schema:** A one-shot `db-init` container runs `prisma db push` against the empty Postgres before the app replicas start (gated via `service_completed_successfully`)
- **Sticky sessions:** Traefik issues a `nh_sticky` cookie matching the production `stack.yml` configuration, so individual sessions pin to one replica while the test asserts cross-replica fanout
- **Test logic:** `e2e-stack/ws-fanout.test.ts` (Vitest) emits a Socket.IO event on replica A and asserts a client on replica B receives it within budget
- **Teardown:** The script runs `docker compose down -v` to drop volumes — never reuse Postgres state across runs

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

### Cross-Replica Fanout

```bash
pnpm test:fanout        # Boots the 2-replica Docker stack and runs the WS-04 verification
```

Expect a 30-60 s warm-up while Postgres/Redis/Traefik come healthy and the app images build (cached after first run).

### Pre-Commit Verification

The canonical green-light command before pushing:

```bash
pnpm typecheck && pnpm test:run && pnpm build
```

E2E and the fanout harness are not part of the pre-commit chain — E2E runs in CI on top of build artifacts; fanout runs on demand for Phase 37 changes that touch WebSocket / Redis-adapter code paths.

## Playwright Project Structure

`apps/web/playwright.config.ts` defines three projects:

| Project | Storage State | Test Match | Purpose |
|---------|---------------|------------|---------|
| `setup` | none (writes state) | `*.setup.ts` | Runs `auth.setup.ts`, registers + logs in test user, saves auth to `playwright/.auth/user.json` |
| `chromium` | none | All `*.spec.ts` except `profile.spec.ts`, `settings.spec.ts`, `history.spec.ts` (via `testIgnore`) | Unauthenticated specs (auth flow, dashboard, navigation, search, bookmarks, comments, teams, public API, etc.) |
| `chromium-auth` | `playwright/.auth/user.json` | `profile.spec.ts`, `settings.spec.ts`, `history.spec.ts`, `comments.spec.ts`, `teams.spec.ts` | Authenticated specs; depends on `setup` |

`bookmarks.spec.ts` deliberately runs in `chromium` (unauth) because the bookmarks page is backed by client-side localStorage, not server-side auth. `comments.spec.ts` and `teams.spec.ts` are listed in the `chromium-auth` `testMatch` so the auth state is loaded for them, while still being included in `chromium`'s broader pattern — Playwright runs each spec under whichever project's filter matches.

### Auth Setup (`apps/web/e2e/auth.setup.ts`)

- Polls `http://127.0.0.1:3001/api/health` for 30 s before doing anything (avoids ECONNREFUSED races where Playwright's `webServer` is up but the Express backend is still booting)
- Registers the canonical E2E user `e2e-test@newshub.test` via `POST /api/auth/register` (idempotent — silent failure if user already exists)
- Mocks `/api/focus/suggestions` to an empty list inside the setup itself (the bottom-right toast stack would otherwise overflow upward and intercept the Sign In button)
- Pre-seeds `localStorage` via `addInitScript` to bypass two blocking modals:
  - `FocusOnboarding` (z-90) — gated by `hasCompletedOnboarding` in the `newshub-storage` Zustand persist key
  - `ConsentBanner` (z-100) — gated by the `newshub-consent` localStorage key
- Logs in via the UI, waits for the modal to close (or for an inline error), saves storage state to `playwright/.auth/user.json`

### Fixtures (`apps/web/e2e/fixtures.ts`)

Custom `test` fixture exported from `fixtures.ts` extends `@playwright/test`'s base `test` and:

- Mocks AI / analysis endpoints (`/api/ai/ask`, `/api/ai/propaganda`, `/api/analysis/clusters`, `/api/analysis/summarize`, `/api/analysis/framing`, `/api/analysis/coverage-gaps`) so specs don't burn the FREE-tier ~10/day AI quota
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
| Cross-replica | `e2e-stack/ws-fanout.test.ts` | No — single file in `e2e-stack/` |

### Conventions (CRITICAL — Discovered the Hard Way)

These rules look pedantic but each one corresponds to a real flake or cascading failure. Follow them.

- **Use `domcontentloaded`, not `networkidle`** — Socket.io polls the backend continuously, so the network never goes idle. `await page.waitForLoadState('networkidle')` will time out on every page that mounts a real-time component.
- **Use `127.0.0.1`, not `localhost`, for backend calls** — Node 18+ resolves `localhost` to `::1` (IPv6) first, but the backend listens on IPv4. Hitting `http://localhost:3001` from `request.get(...)` in setup files yields ECONNREFUSED.
- **Authenticated `page.request.*` calls don't auto-inject auth** — `storageState` only restores cookies and localStorage for the *page*. For raw API calls in a spec, manually pull the JWT and pass it. The localStorage key is `newshub-auth-token`:

  ```typescript
  const token = await page.evaluate(() => localStorage.getItem('newshub-auth-token'));
  const res = await page.request.get('http://127.0.0.1:3001/api/account/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
  ```

- **Use `test.describe.configure({ mode: 'serial' })` for module-scoped state** — When a spec file shares state at module scope across `describe` blocks (e.g., `apps/web/e2e/publicApi.spec.ts` provisions an API key once and reuses it across tests), Playwright's default fully-parallel mode will split the file across workers and the state will be undefined in half of them. Force serial mode at the top of the file.
- **Mock AI/analysis endpoints from `fixtures.ts`** — Don't hit the real AI provider. The FREE tier caps at ~10 requests/day, after which every spec touching the dashboard, bookmarks list, or analysis page begins failing because the page renders an error state.

## Z-Index Ladder

Stacking order within the UI is codified. Violations cause overlays to block interactive elements (the scan-line effect was previously `z-1000` and caused click-through failures in E2E tests).

| Layer | z-index |
|-------|---------|
| scan-line CSS effect | `z-0` (was z-1000 — caused click-through bug) |
| Header | `z-20` |
| AuthModal / Compare modal | `z-50` |
| FocusOnboarding | `z-[90]` |
| ConsentBanner | `z-[100]` |

The `auth.setup.ts` and `fixtures.ts` init scripts both pre-set `hasCompletedOnboarding` and `newshub-consent` in localStorage specifically to prevent `FocusOnboarding` (z-90) and `ConsentBanner` (z-100) from blocking test interactions.

## Currently Skipped Tests (Tracked Debt)

Skips fall into three buckets: dead-UI debt (re-enable after rewriting selectors), CI-environment skips (browser/seed-data shape doesn't match local), and graceful self-skips (the test detects an upstream constraint and reports skipped instead of failing).

| File | Test(s) | Bucket | Reason |
|------|---------|--------|--------|
| `settings.spec.ts` | 3 language-toggle tests | Dead UI | Language toggle moved to header `LanguageSwitcher` (D-04); tests target the old settings-page control |
| `analysis.spec.ts` | 2 compare-modal tests (`should open compare mode modal`, `should close compare mode modal`) | Flake | Parallel-load race condition under 4-worker CI; modal misses 10 s visibility budget |
| `dashboard.spec.ts` | `should have refresh/sync button` | Flake | Fallback assertion `expect(count).toBeGreaterThan(0)` fires before the lazy Dashboard tree mounts in CI. Re-enable once the assertion targets a hydration-anchored selector (e.g. `data-testid="refresh-button"`) |
| `factcheck.spec.ts` | `user highlights a claim and sees a fact-check drawer with verdict + citations` (line 83) | Seed-data | Happy-path requires a seeded article whose content contains a fact-checkable claim; CI seed data is opaque. The other 4 factcheck tests exercise the security/limit surfaces directly via `request` and stay green. Re-enable once the seed pipeline guarantees a known fact-checkable article (or the test mocks the LLM verdict via Playwright route interception) |
| `factcheck.spec.ts` | `test.skip(!articleId, ...)` (line 93), `test.skip(userTier !== 'FREE', ...)` (line 235) | Self-skip | Conditional skips when no seed article is available or when the auth user isn't FREE |
| `comments.spec.ts` | `should be visible after navigating to article` (line 26) | Self-skip | Conditional skip when no internal `/article/` link is rendered in the seeded dataset |
| `community.spec.ts` | Entire `Community Page` describe | Dead UI | Community page is unstable — whole-describe skip via `test.describe.skip` |
| `timeline.spec.ts` | Entire `Timeline` describe | Dead UI | Timeline page is unstable — whole-describe skip via `test.describe.skip` |
| `event-map.spec.ts` | 7 tests (map container, filter toggle, filter panel, severity/category filters, AI Extract, AI badge) | CI-only | All gated by `test.skip(isCI, ...)` — Leaflet/globe rendering is unreliable on CI's headless Chromium |
| `monitor.spec.ts` | 4 tests (stats panel, severity filter, globe/map toggle, panel containers) | CI-only | Same as event-map — `test.skip(isCI, ...)` for visualization-heavy panels |
| `publicApi.spec.ts` | Cache Headers + Revocation tests | Self-skip | Self-skip via `test.skip(...)` when the 3-key-per-user API key cap is hit (so the suite degrades gracefully instead of failing). Covered by upstream auth tests |

These are explicit `test.skip(...)` or `test.describe.skip(...)` calls — they show up as "skipped" in the report rather than failures. Re-enable when the underlying issue is fixed.

## Coverage Requirements

Coverage thresholds are enforced by Vitest in `apps/web/vitest.config.ts`. Failing any threshold causes `pnpm test:coverage` (and the CI test job) to exit non-zero.

| Coverage Type | Threshold | Notes |
|---------------|-----------|-------|
| Statements | 80% | Enforced |
| Lines | 80% | Enforced |
| Functions | 80% | Enforced |
| **Branches** | **71%** | **Tracked debt** — temporarily lowered from 80% in three waiver steps: 80 → 75 (CI run 25107573823, Phase 37/38 expansion); 75 → 74 (PR #4, Phase 38+39+40.1 scaffold); 74 → 71 (Phase 40 gap closures 40-07/40-08/40-10, CI run 25370135629). Actual branch coverage: ~71.11%. See `.planning/todos/pending/40-11-coverage-backfill.md` for the full backfill plan. Goal: raise back to 80%. |

Backfill targets (highest leverage, Phase 40 additions first):

- `apps/web/src/pages/PodcastsPage.tsx` — `isTranscriptSearchActive` gate and `filteredEpisodes` memo branches
- `apps/web/src/components/videos/parseVideoUrl.ts` — YouTube vs Vimeo vs unknown; with/without timestamp; malformed URL early-returns
- `apps/web/server/services/videoIndexService.ts` — catch block at line 192
- `apps/web/src/components/podcasts/PodcastEpisodeCard.tsx` — `autoPlayOnMount` + `hasAttemptedAutoPlay` gating
- `apps/web/server/routes/ai.ts`
- `apps/web/server/routes/leaderboard.ts`
- `apps/web/server/services/webhookService.ts`
- `apps/web/server/services/teamService.ts`
- `apps/web/server/services/metricsService.ts`
- `apps/web/server/jobs/workerEmitter.ts`
- `apps/web/src/hooks/useComments.ts`

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

### Cross-Replica Fanout

If `pnpm test:fanout` fails, `docker compose -f e2e-stack/docker-compose.test.yml logs` shows logs from both app replicas, Postgres, Redis, and Traefik. Common failure modes: stale build cache after Dockerfile changes (rebuild with `--no-cache`), Redis-adapter wiring drift, or sticky-cookie name mismatches between `docker-compose.test.yml` and the production `stack.yml`.

## CI Integration

Tests run in `.github/workflows/ci.yml`:

- **Lint + typecheck + unit tests + build** — Runs on every push and PR. The unit-test step is `pnpm test:coverage` and enforces the thresholds in `vitest.config.ts` (80% statements / lines / functions; **71% branches** — see waiver above). Failing coverage fails the build.
- **E2E tests** — Run after build succeeds, with PostgreSQL 17 and Redis 7.4-alpine as service containers. Chromium-only browser install (`pnpm --filter @newshub/web exec playwright install --with-deps chromium`). The job runs `pnpm --filter @newshub/web exec playwright test --reporter=html` with a 30-minute timeout. The HTML report (`apps/web/playwright-report/`) is uploaded as an artifact with 7-day retention.
- **Lighthouse CI** — Runs *after* `deploy-staging`, **on master only**. `deploy-staging` is currently gated `if: false` (single-env decision 2026-05-05 — see `.planning/todos/pending/40-12-production-deploy-setup.md`), so Lighthouse and `deploy-production` cascade-skip until provisioning happens. When live: 90+ required for performance, accessibility, best-practices, SEO; Core Web Vitals (LCP / CLS / INP / FCP) are tracked but warn-only.
- **Branch protection on `master`:** the required check names are `Lint`, `Type Check`, `Unit Tests`, `Build Docker Image`, `E2E Tests` (display names, not job IDs); strict mode is on and admins are enforced.
- **CI workflow validation:** `pnpm validate:ci` (uses `action-validator`) — run this locally before editing `.github/workflows/`.

The cross-replica fanout harness (`pnpm test:fanout`) is not currently wired into CI; it is run on demand against changes that touch `apps/web/server/services/websocketService.ts`, the Redis adapter, or the production `stack.yml` topology.

## Load Testing

k6 scenarios live in `apps/web/k6/load-test.js`.

```bash
pnpm load:smoke   # Quick smoke scenario
pnpm load:full    # Full load scenario
```

For staging-environment load tests, trigger the `load-test.yml` workflow manually via GitHub Actions `workflow_dispatch` against `STAGING_URL`. **It never runs against production** — the workflow is gated to staging only. The workflow is currently dormant until production infrastructure is provisioned. Test users for load runs come from `pnpm seed:load-test` (creates `loadtest1@example.com` through `loadtest100@example.com` as pre-verified accounts).

Performance budgets validated by k6 + Lighthouse:

| Metric | Threshold |
|--------|-----------|
| News API p95 | < 500ms |
| AI API p95 | < 5s |
| Auth API p95 | < 300ms |
| LCP / CLS / INP / FCP | < 2s / < 0.05 / < 150ms / < 1.5s (warn-only) |

Load test artifacts (JSON + HTML) are retained for 30 days in GitHub Actions.
