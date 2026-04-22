# Phase 11: E2E Tests - Research

**Researched:** 2026-04-22
**Domain:** Playwright E2E Testing for React/Express Application
**Confidence:** HIGH

## Summary

Phase 11 requires E2E test coverage for 10 pages (E2E-01 through E2E-10). The project already has a mature Playwright setup with 6 existing spec files covering Monitor (17 tests), EventMap (15 tests), Timeline (8 tests), Auth (7 tests), Navigation (9 tests), and Search (5 tests). This phase focuses on adding E2E tests for the 7 uncovered pages: Dashboard, Analysis, Community, Profile, Bookmarks, Settings, and ReadingHistory.

The existing test infrastructure follows established patterns: `test.describe()` for grouping, `test.beforeEach()` for page navigation with `networkidle` wait, and text/CSS selectors for element targeting. Per CONTEXT.md decisions, this phase uses real backend with dev server (no API mocking) and Playwright storageState for authentication reuse.

**Primary recommendation:** Create 7 new spec files following the established project patterns, implement storageState-based auth for the 4 auth-required pages (Profile, Bookmarks, Settings, ReadingHistory), and focus on UI interaction verification rather than API response assertions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Focus on 7 uncovered pages: Dashboard, Analysis, Community, UserProfile, BookmarksPage, SettingsPage, ReadingHistory
- **D-02:** Existing E2E coverage for Monitor (17 tests), EventMap (15 tests), Timeline (8 tests) is sufficient -- no extension needed
- **D-03:** Auth modal already covered in auth.spec.ts -- reuse existing tests
- **D-04:** Full interactions: article cards, grid/list toggle, region filter pills, view mode persistence
- **D-05:** Include infinite scroll loading, article click behavior, read marking
- **D-06:** Happy path only for AI Q&A: submit question, verify response appears with citations
- **D-07:** Don't test AI response quality -- too flaky. Focus on UI flow.
- **D-08:** Test cluster view and topic selection without AI assertions
- **D-09:** Real backend with dev server and SQLite -- no API mocking
- **D-10:** Claude's discretion for data seeding: test-time API setup vs pre-seeded DB per test suite
- **D-11:** Prefer test-time setup for isolation when practical; pre-seed for performance-critical suites
- **D-12:** Use Playwright storageState for auth: login once in global setup, save session to file, reuse in tests
- **D-13:** Dedicated test user: `e2e-test@newshub.test` created during setup
- **D-14:** Auth-required tests depend on storageState file existing
- **D-15:** Claude's discretion: test key empty states ("no bookmarks", "no history", "no search results") where relevant
- **D-16:** Skip API error testing -- happy paths prioritized, failures covered by unit tests

### Claude's Discretion
- Specific test assertions per page beyond the decisions above
- Test grouping and describe block organization
- Whether to mock specific flaky endpoints (like AI responses) via route.fulfill()
- Balance between test isolation and speed for data-dependent tests

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| E2E-01 | Dashboard page has E2E tests for core interactions | Dashboard renders NewsFeed with grid/list toggle, region filters, trend analysis buttons, infinite scroll |
| E2E-02 | Analysis page has E2E tests for core interactions | Analysis has ClusterSummary, SentimentChart, FramingComparison, Compare Mode modal |
| E2E-03 | Monitor page has E2E tests for core interactions | COVERED: 17 existing tests in monitor.spec.ts |
| E2E-04 | Timeline page has E2E tests for core interactions | COVERED: 8 existing tests in timeline.spec.ts |
| E2E-05 | EventMap page has E2E tests for core interactions | COVERED: 15 existing tests in event-map.spec.ts |
| E2E-06 | Community page has E2E tests for core interactions | Community has tabs (contribute/badges/leaderboard), contribution forms, verify queue |
| E2E-07 | UserProfile page has E2E tests for core interactions | Profile shows user stats, quick actions, password change form; requires auth |
| E2E-08 | BookmarksPage has E2E tests for core interactions | Bookmarks shows saved articles, clear all button, empty state; requires auth |
| E2E-09 | SettingsPage has E2E tests for core interactions | Settings has theme toggle, language, region selection, export/import; requires auth |
| E2E-10 | ReadingHistory page has E2E tests for core interactions | ReadingHistory shows timeline groups, filters, clear history; requires auth |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| E2E Test Execution | Browser/Client | -- | Playwright runs tests in browser context |
| Authentication State | Browser/Client | API/Backend | storageState captures cookies/localStorage, backend validates JWT |
| Page Rendering | Frontend Server (SSR) | Browser/Client | Vite dev server serves pages, browser hydrates |
| API Data | API/Backend | Database/Storage | Express endpoints serve from SQLite via Prisma |
| Test Assertions | Browser/Client | -- | Playwright expect() validates DOM state |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.58.2 | E2E test framework | [VERIFIED: package.json] Already installed, project standard |
| Chromium | (bundled) | Browser for tests | Default browser in playwright.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright/.auth/ | -- | Auth state storage dir | storageState persistence |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Real backend | MSW/route.fulfill | Per D-09: real backend chosen for integration confidence |
| Per-test login | storageState | Per D-12: storageState for speed |

**Installation:**
```bash
# Already installed - no additional packages needed
# Auth directory will be created by setup
mkdir -p playwright/.auth
```

**Version verification:** @playwright/test v1.58.2 installed [VERIFIED: package.json line 100]. npm registry shows v1.59.1 available [VERIFIED: npm registry] but current version is adequate.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Playwright Test Runner                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ auth.setup   │───▶│ storageState │───▶│ chromium     │          │
│  │ (global)     │    │ user.json    │    │ project      │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                  │                   │
│                                                  ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    E2E Test Specs                             │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  dashboard.spec.ts  │  analysis.spec.ts  │  community.spec.ts │  │
│  │  profile.spec.ts    │  bookmarks.spec.ts │  settings.spec.ts  │  │
│  │  history.spec.ts    │                    │                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                  │                                   │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Browser (Chromium)                               │
├─────────────────────────────────────────────────────────────────────┤
│  page.goto() ──▶ Load React App ──▶ Assert DOM State                │
│                                                                      │
│  localStorage: newshub-storage (Zustand)                            │
│  cookies: JWT auth token                                             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Dev Server (webServer)                           │
├─────────────────────────────────────────────────────────────────────┤
│  Vite (5173)  ◀──────────────────▶  Express (3001)                  │
│  React App                            API Endpoints                  │
│                                       /api/news, /api/auth, etc.    │
│                                              │                       │
└──────────────────────────────────────────────┼───────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │  SQLite (dev.db) │
                                    │  via Prisma      │
                                    └──────────────────┘
```

### Recommended Project Structure
```
e2e/
├── auth.spec.ts          # (existing) Authentication flows
├── navigation.spec.ts    # (existing) Page routing
├── search.spec.ts        # (existing) Search functionality
├── monitor.spec.ts       # (existing) Monitor page
├── event-map.spec.ts     # (existing) EventMap page
├── timeline.spec.ts      # (existing) Timeline page
├── dashboard.spec.ts     # NEW: Dashboard/NewsFeed interactions
├── analysis.spec.ts      # NEW: Analysis page, clusters, charts
├── community.spec.ts     # NEW: Community tabs, forms, leaderboard
├── profile.spec.ts       # NEW: User profile, stats, password change
├── bookmarks.spec.ts     # NEW: Bookmarks list, clear all
├── settings.spec.ts      # NEW: Preferences, theme, language
├── history.spec.ts       # NEW: Reading history, filters
└── auth.setup.ts         # NEW: Global auth setup for storageState
playwright/
└── .auth/
    └── user.json         # NEW: Persisted auth state
```

### Pattern 1: Project Dependencies for Auth

**What:** Use Playwright project dependencies to run auth setup before authenticated tests.
**When to use:** For pages requiring login (Profile, Bookmarks, Settings, ReadingHistory).
**Example:**
```typescript
// Source: https://playwright.dev/docs/test-global-setup-teardown
// playwright.config.ts (updated)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project - runs first, creates auth state
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    // Unauthenticated tests (no dependencies)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/profile.spec.ts', '**/bookmarks.spec.ts', '**/settings.spec.ts', '**/history.spec.ts'],
    },
    // Authenticated tests (depend on setup)
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: ['**/profile.spec.ts', '**/bookmarks.spec.ts', '**/settings.spec.ts', '**/history.spec.ts'],
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Pattern 2: Auth Setup File

**What:** Global setup that logs in once and saves storageState.
**When to use:** Run once before all authenticated test suites.
**Example:**
```typescript
// Source: https://playwright.dev/docs/auth
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to app and open login modal
  await page.goto('/');
  await page.click('button:has-text("Anmelden")');

  // Wait for modal
  await expect(page.locator('input[type="email"]')).toBeVisible();

  // Fill credentials (test user per D-13)
  await page.fill('input[type="email"]', 'e2e-test@newshub.test');
  await page.fill('input[type="password"]', 'test-password-123');

  // Submit
  await page.click('form button[type="submit"]');

  // Wait for successful login - modal closes, user menu appears
  await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

  // Verify auth succeeded by checking for auth-only UI element
  await page.goto('/profile');
  await expect(page.locator('h1:has-text("PROFILE")')).toBeVisible();

  // Save storage state
  await page.context().storageState({ path: authFile });
});
```

### Pattern 3: Existing Test Structure

**What:** Follow established project patterns from existing specs.
**When to use:** All new test files.
**Example:**
```typescript
// Source: e2e/monitor.spec.ts (existing project pattern)
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the Dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/');
    // Check for main content
    const searchInput = page.locator('input[placeholder*="Search signals"]');
    await expect(searchInput).toBeVisible();
  });

  test('should toggle between grid and list views', async ({ page }) => {
    // Find view toggle buttons
    const gridButton = page.locator('.glass-panel button').filter({ has: page.locator('svg') }).first();
    const listButton = page.locator('.glass-panel button').filter({ has: page.locator('svg') }).nth(1);

    // Click list view
    await listButton.click();
    await page.waitForTimeout(300); // Animation

    // Verify grid changes
    const articleContainer = page.locator('.grid');
    await expect(articleContainer).toHaveClass(/grid-cols-1/);
  });
});
```

### Anti-Patterns to Avoid
- **Testing AI response quality:** Per D-07, AI responses are flaky. Test that UI shows response, not response content.
- **API mocking in E2E:** Per D-09, use real backend. Mocking defeats integration testing purpose.
- **Per-test login:** Per D-12, use storageState to avoid slow repeated logins.
- **Implicit waits:** Always use explicit `waitForLoadState('networkidle')` or `waitForTimeout()` for animations.
- **Brittle CSS selectors:** Prefer text selectors (`button:has-text()`) over deep CSS paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state persistence | Custom cookie handling | Playwright storageState | [CITED: playwright.dev/docs/auth] Built-in, handles all storage types |
| Test retries | Manual retry loops | Playwright config retries | Framework handles flakiness |
| Parallel test isolation | Manual state cleanup | Playwright contexts | Each test gets fresh browser context |
| Screenshot on failure | Manual screenshot code | Playwright screenshot: 'only-on-failure' | Configured in playwright.config.ts |

**Key insight:** Playwright's built-in features (storageState, retries, parallel contexts) solve common E2E testing problems better than custom solutions.

## Common Pitfalls

### Pitfall 1: Stale Authentication State
**What goes wrong:** Tests fail with "not authenticated" errors despite setup running.
**Why it happens:** JWT token expires, session cookies become invalid over time.
**How to avoid:** Delete and regenerate storageState file periodically; setup should verify login succeeded before saving.
**Warning signs:** Tests pass locally but fail in CI; tests fail after long idle periods.

### Pitfall 2: Race Conditions with Data Loading
**What goes wrong:** Test asserts on element before data loads, causing flaky failures.
**Why it happens:** Real backend has variable response times; `networkidle` may fire before all data arrives.
**How to avoid:** Use `waitForSelector()` for specific data-dependent elements; add explicit waits for known async operations.
**Warning signs:** Tests pass sometimes but fail intermittently; adding `waitForTimeout()` "fixes" the issue.

### Pitfall 3: Animation Interference
**What goes wrong:** Click or assertion fails because element is animating (framer-motion).
**Why it happens:** This project uses framer-motion extensively; elements may be moving during test.
**How to avoid:** Add `waitForTimeout(300-500)` after navigation or toggle actions; wait for specific visible state.
**Warning signs:** Tests fail with "element not visible" or "element intercepted" errors.

### Pitfall 4: Test User Not Seeded
**What goes wrong:** Auth setup fails because test user doesn't exist in database.
**Why it happens:** Test user `e2e-test@newshub.test` must be created in SQLite before tests run.
**How to avoid:** Add user seeding to auth.setup.ts or use existing dev database with pre-seeded user.
**Warning signs:** Auth setup times out or shows "invalid credentials" error.

### Pitfall 5: Zustand Store State Bleeding
**What goes wrong:** Tests fail due to state from previous tests persisting.
**Why it happens:** Zustand persists to localStorage (`newshub-storage`); Playwright contexts may share storage.
**How to avoid:** Each test context is isolated by default; if sharing context, clear localStorage in beforeEach.
**Warning signs:** Tests pass individually but fail when run together.

## Code Examples

Verified patterns from official sources and project codebase:

### Dashboard Tests (E2E-01)
```typescript
// Based on: e2e/search.spec.ts, src/components/NewsFeed.tsx
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display news feed with articles', async ({ page }) => {
    // Wait for articles to load
    const articleCard = page.locator('[class*="SignalCard"], .glass-panel').first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between grid and list view', async ({ page }) => {
    // Grid button is active by default
    const gridBtn = page.locator('button').filter({ has: page.locator('[class*="LayoutGrid"]') });
    const listBtn = page.locator('button').filter({ has: page.locator('[class*="List"]') });

    await listBtn.click();
    await page.waitForTimeout(300);

    // List mode has max-w-3xl container
    const container = page.locator('.grid.grid-cols-1.max-w-3xl');
    await expect(container).toBeVisible();
  });

  test('should filter by trend analysis', async ({ page }) => {
    // Click Escalation filter
    const escalationBtn = page.locator('button:has-text("Escalation")');
    await escalationBtn.click();

    // Button should become active (has colored border)
    await expect(escalationBtn).toHaveClass(/border-\[#ff0044\]/);
  });
});
```

### Analysis Tests (E2E-02)
```typescript
// Based on: src/pages/Analysis.tsx
import { test, expect } from '@playwright/test';

test.describe('Analysis Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');
  });

  test('should load analysis page with header', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toContainText('PERSPEKTIVEN-ANALYSE');
  });

  test('should display cluster summaries', async ({ page }) => {
    // ClusterSummary component
    const clusterSection = page.locator('text=Themen-Cluster');
    await expect(clusterSection).toBeVisible();
  });

  test('should open compare mode modal', async ({ page }) => {
    const compareBtn = page.locator('button:has-text("Artikel vergleichen")');
    await compareBtn.click();

    // Modal should appear
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible();
  });
});
```

### Auth-Required Page Tests
```typescript
// Based on: https://playwright.dev/docs/auth
import { test, expect } from '@playwright/test';

// These tests run with storageState from auth.setup.ts

test.describe('Profile Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should display user profile', async ({ page }) => {
    const heading = page.locator('h1:has-text("PROFILE")');
    await expect(heading).toBeVisible();
  });

  test('should show user stats', async ({ page }) => {
    // Bookmarks count stat box
    const bookmarksLabel = page.locator('text=Bookmarks').first();
    await expect(bookmarksLabel).toBeVisible();
  });

  test('should navigate to settings via quick actions', async ({ page }) => {
    const settingsBtn = page.locator('button:has-text("Settings")');
    await settingsBtn.click();

    await expect(page).toHaveURL('/settings');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global setup with globalSetup | Project dependencies | Playwright 1.31+ | Better isolation, parallel-safe auth |
| Cookie manipulation | storageState | Playwright 1.13+ | Captures all storage types |
| Custom retry logic | Built-in retries | Always available | Simpler, more reliable |

**Deprecated/outdated:**
- `test.use({ storageState })` at file level: Still works but project dependencies are cleaner
- globalSetup/globalTeardown files: Still supported but project dependencies preferred for auth

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Test user `e2e-test@newshub.test` can be created in auth.setup.ts | Pattern 2 | Setup would fail; need pre-seeding |
| A2 | Dev server starts quickly enough for webServer timeout (120s) | Architecture | CI may timeout; increase or pre-start |
| A3 | All 7 new pages are accessible without breaking changes | Phase Requirements | Some pages may have changed since context gathering |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **Test User Creation Strategy**
   - What we know: D-13 specifies `e2e-test@newshub.test` as test user
   - What's unclear: Should auth.setup.ts create this user via API, or should it be pre-seeded in dev.db?
   - Recommendation: Per D-10/D-11, prefer test-time setup for isolation. Register user in setup if not exists.

2. **AI Response Testing**
   - What we know: Per D-06/D-07, test AI Q&A flow without asserting response quality
   - What's unclear: Should we use route.fulfill() to mock AI responses for determinism?
   - Recommendation: Per D-09, prefer real backend. Only mock if tests are too flaky.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @playwright/test | E2E tests | Yes | 1.58.2 | -- |
| Chromium | Browser tests | Yes (bundled) | -- | -- |
| Node.js | Test runner | Yes | -- | -- |
| Dev server | webServer | Yes | npm run dev | -- |
| SQLite | Test data | Yes | via Prisma | -- |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Security Domain

> This phase does not introduce new security surfaces. E2E tests verify existing authentication flows.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Tests verify existing auth modal flow |
| V3 Session Management | Yes | storageState captures session correctly |
| V4 Access Control | Yes | Auth-required pages redirect unauthenticated users |
| V5 Input Validation | No | E2E tests input handling but not security validation |
| V6 Cryptography | No | Tests don't touch crypto layer |

### Known Threat Patterns for Playwright E2E

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test credentials in code | Information Disclosure | Use env vars or test-only accounts |
| storageState file leaked | Information Disclosure | Add playwright/.auth/ to .gitignore |
| Test user with elevated privileges | Elevation of Privilege | Test user has same permissions as regular user |

## Sources

### Primary (HIGH confidence)
- [Playwright Authentication Documentation](https://playwright.dev/docs/auth) - storageState, project dependencies
- [Playwright Global Setup Documentation](https://playwright.dev/docs/test-global-setup-teardown) - setup projects
- D:\NewsHub\playwright.config.ts - Existing project configuration [VERIFIED: codebase]
- D:\NewsHub\e2e/*.spec.ts - Existing test patterns [VERIFIED: codebase]
- D:\NewsHub\.planning\codebase\TESTING.md - Project testing conventions [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright Guide](https://www.browserstack.com/guide/playwright-global-setup) - Best practices
- [Checkly Playwright Authentication](https://www.checklyhq.com/docs/learn/playwright/authentication/) - Authentication patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing installed Playwright, documented patterns
- Architecture: HIGH - Project dependencies pattern is well-documented, project has working setup
- Pitfalls: HIGH - Based on project codebase analysis and established patterns

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days - stable framework, mature patterns)
