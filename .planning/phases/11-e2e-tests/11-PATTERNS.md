# Phase 11: E2E Tests - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 9 (new/modified files)
**Analogs found:** 8 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `e2e/auth.setup.ts` | setup | request-response | `e2e/auth.spec.ts` | role-match |
| `e2e/dashboard.spec.ts` | test | request-response | `e2e/monitor.spec.ts` | exact |
| `e2e/analysis.spec.ts` | test | request-response | `e2e/monitor.spec.ts` | exact |
| `e2e/community.spec.ts` | test | request-response | `e2e/event-map.spec.ts` | exact |
| `e2e/profile.spec.ts` | test | request-response | `e2e/monitor.spec.ts` | exact |
| `e2e/bookmarks.spec.ts` | test | request-response | `e2e/monitor.spec.ts` | exact |
| `e2e/settings.spec.ts` | test | request-response | `e2e/event-map.spec.ts` | exact |
| `e2e/history.spec.ts` | test | request-response | `e2e/timeline.spec.ts` | exact |
| `playwright.config.ts` | config | -- | `playwright.config.ts` | exact (modify existing) |

## Pattern Assignments

### `e2e/auth.setup.ts` (setup, request-response)

**Analog:** `e2e/auth.spec.ts` (lines 1-104) + Playwright docs

**Imports pattern** (lines 1):
```typescript
import { test as setup, expect } from '@playwright/test';
```

**Setup structure pattern** (based on Playwright storageState docs + auth.spec.ts modal interaction):
```typescript
// Pattern: Global auth setup that logs in once and saves storageState
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to app
  await page.goto('/');

  // Open login modal (from auth.spec.ts lines 13-22)
  await page.click('button:has-text("Anmelden")');

  // Wait for modal
  await expect(page.locator('input[type="email"]')).toBeVisible();

  // Fill credentials
  await page.fill('input[type="email"]', 'e2e-test@newshub.test');
  await page.fill('input[type="password"]', 'test-password-123');

  // Submit (from auth.spec.ts line 98)
  await page.locator('form button[type="submit"]').click();

  // Wait for successful login - modal closes
  await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
```

---

### `e2e/dashboard.spec.ts` (test, request-response)

**Analog:** `e2e/monitor.spec.ts` + `e2e/navigation.spec.ts`

**Imports pattern** (lines 1):
```typescript
import { test, expect } from '@playwright/test';
```

**Test structure pattern** (monitor.spec.ts lines 3-15):
```typescript
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
});
```

**View toggle pattern** (monitor.spec.ts lines 54-71):
```typescript
test('should toggle between views', async ({ page }) => {
  // Default view check
  const firstButton = page.locator('button').first();
  await expect(firstButton).toHaveClass(/active/);

  // Click alternate view
  const secondButton = page.locator('button').nth(1);
  await secondButton.click();

  // Wait for view transition
  await page.waitForTimeout(500);

  // Verify state change
  await expect(secondButton).toHaveClass(/active/);
  await expect(firstButton).not.toHaveClass(/active/);
});
```

**Filter button pattern** (monitor.spec.ts lines 91-101):
```typescript
test('should filter by category', async ({ page }) => {
  // Click on filter button
  const filterButton = page.locator('button', { hasText: 'FilterName' }).first();
  await filterButton.click();

  // Wait for filter to apply
  await page.waitForTimeout(300);

  // Button should have active styling (border color change)
  // Note: This is checking for style changes, actual filtering depends on data
});
```

**Navigation from sidebar pattern** (monitor.spec.ts lines 103-111):
```typescript
test('should navigate from sidebar', async ({ page }) => {
  await page.goto('/');

  // Click link in sidebar
  const navLink = page.locator('a[href="/target"]');
  await navLink.click();

  await expect(page).toHaveURL('/target');
});
```

---

### `e2e/analysis.spec.ts` (test, request-response)

**Analog:** `e2e/monitor.spec.ts`

**Page load pattern** (monitor.spec.ts lines 9-15):
```typescript
test('should load the Analysis page', async ({ page }) => {
  await expect(page).toHaveURL('/analysis');

  // Check for header (Analysis.tsx has "PERSPEKTIVEN-ANALYSE" in h1)
  const heading = page.locator('h1');
  await expect(heading).toContainText('PERSPEKTIVEN-ANALYSE');
});
```

**Panel visibility pattern** (monitor.spec.ts lines 126-140):
```typescript
test('should display panel containers', async ({ page }) => {
  // Wait for page to load
  await page.waitForTimeout(1000);

  // Check for glass-panel class
  const glassPanels = page.locator('.glass-panel');
  const panelCount = await glassPanels.count();

  // Should have at least one glass panel visible
  expect(panelCount).toBeGreaterThan(0);
});
```

**Modal interaction pattern** (from Analysis.tsx CompareMode modal):
```typescript
test('should open compare mode modal', async ({ page }) => {
  const compareBtn = page.locator('button:has-text("Artikel vergleichen")');
  await compareBtn.click();

  // Modal should appear (based on auth.spec.ts line 17-18)
  const modal = page.locator('[role="dialog"], .fixed.inset-0');
  await expect(modal).toBeVisible();
});
```

---

### `e2e/community.spec.ts` (test, request-response)

**Analog:** `e2e/event-map.spec.ts`

**Tab switching pattern** (based on Community.tsx tab structure):
```typescript
test('should switch between tabs', async ({ page }) => {
  // Check tabs are visible (Community.tsx lines 386-405)
  const contributeTab = page.locator('button:has-text("Contribute")');
  const badgesTab = page.locator('button:has-text("Badges")');
  const leaderboardTab = page.locator('button:has-text("Leaderboard")');

  await expect(contributeTab).toBeVisible();
  await expect(badgesTab).toBeVisible();
  await expect(leaderboardTab).toBeVisible();

  // Click badges tab
  await badgesTab.click();
  await page.waitForTimeout(300);

  // Badge content should be visible
  await expect(badgesTab).toHaveClass(/bg-\[#00f0ff\]/);
});
```

**Contribution type selection pattern** (similar to event-map.spec.ts filter toggle):
```typescript
test('should select contribution type', async ({ page }) => {
  // Click on Submit News contribution type
  const newsType = page.locator('button:has-text("Submit News")').first();
  await newsType.click();

  // Form should appear in the form panel
  await page.waitForTimeout(300);
  // Form content should be visible based on selection
});
```

---

### `e2e/profile.spec.ts` (test, request-response) - AUTH REQUIRED

**Analog:** `e2e/monitor.spec.ts`

**Authenticated page pattern** (Profile.tsx requires auth):
```typescript
// These tests run with storageState from auth.setup.ts
test.describe('Profile Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should display user profile', async ({ page }) => {
    // Profile.tsx line 208-209
    const heading = page.locator('h1:has-text("PROFILE")');
    await expect(heading).toBeVisible();
  });
});
```

**Stats display pattern** (Profile.tsx lines 239-263):
```typescript
test('should show user stats', async ({ page }) => {
  // Check for stats grid (Bookmarks count, Articles Read)
  const bookmarksLabel = page.locator('text=Bookmarks').first();
  await expect(bookmarksLabel).toBeVisible();

  const articlesLabel = page.locator('text=Articles Read').first();
  await expect(articlesLabel).toBeVisible();
});
```

**Quick actions pattern** (Profile.tsx lines 275-327):
```typescript
test('should navigate via quick actions', async ({ page }) => {
  // Click Settings quick action
  const settingsBtn = page.locator('button:has-text("Settings")');
  await settingsBtn.click();

  await expect(page).toHaveURL('/settings');
});
```

---

### `e2e/bookmarks.spec.ts` (test, request-response) - AUTH REQUIRED

**Analog:** `e2e/monitor.spec.ts`

**Empty state pattern** (Bookmarks.tsx lines 65-81):
```typescript
test('should show empty state when no bookmarks', async ({ page }) => {
  // Bookmarks.tsx shows empty state with Bookmark icon
  const emptyIcon = page.locator('svg.h-16.w-16');
  const emptyText = page.locator('text=Keine gespeicherten Artikel');

  // If empty, these should be visible
  // Note: May need to clear bookmarks first in test setup
});
```

**Article grid pattern** (Bookmarks.tsx lines 125-133):
```typescript
test('should display bookmarked articles in grid', async ({ page }) => {
  // Wait for articles to load
  await page.waitForLoadState('networkidle');

  // Check for article cards grid
  const articleGrid = page.locator('.grid.gap-4');
  await expect(articleGrid).toBeVisible();
});
```

**Clear all button pattern** (Bookmarks.tsx lines 104-112):
```typescript
test('should have clear all button', async ({ page }) => {
  const clearBtn = page.locator('button:has-text("Alle entfernen")');
  // Button only visible when bookmarks exist
  // Note: Conditional visibility check
});
```

---

### `e2e/settings.spec.ts` (test, request-response) - AUTH REQUIRED

**Analog:** `e2e/event-map.spec.ts`

**Toggle pattern** (Settings.tsx theme toggle lines 479-503):
```typescript
test('should toggle theme', async ({ page }) => {
  // Settings.tsx has Dark Mode / Light Mode buttons
  const darkModeBtn = page.locator('button:has-text("Dark Mode")').first();
  const lightModeBtn = page.locator('button:has-text("Light Mode")').first();

  await expect(darkModeBtn).toBeVisible();
  await expect(lightModeBtn).toBeVisible();

  // Click light mode
  await lightModeBtn.click();
  await page.waitForTimeout(300);

  // Check for active state change
  await expect(lightModeBtn).toHaveClass(/border-blue-500/);
});
```

**Language toggle pattern** (Settings.tsx lines 506-532):
```typescript
test('should toggle language', async ({ page }) => {
  const deutschBtn = page.locator('button:has-text("Deutsch")');
  const englishBtn = page.locator('button:has-text("English")');

  await deutschBtn.click();
  await page.waitForTimeout(300);

  await expect(deutschBtn).toHaveClass(/border-blue-500/);
});
```

**Export/Import pattern** (Settings.tsx lines 824-850):
```typescript
test('should have export settings button', async ({ page }) => {
  const exportBtn = page.locator('button:has-text("Einstellungen exportieren")');
  await expect(exportBtn).toBeVisible();
});
```

---

### `e2e/history.spec.ts` (test, request-response) - AUTH REQUIRED

**Analog:** `e2e/timeline.spec.ts`

**Timeline group pattern** (ReadingHistory.tsx lines 260-284, similar to Timeline.tsx):
```typescript
test('should display timeline groups', async ({ page }) => {
  await page.waitForLoadState('networkidle');

  // ReadingHistory.tsx shows groups: Today, Yesterday, This Week, Older
  const todayGroup = page.locator('h2:has-text("Today"), h2:has-text("Heute")');
  // May or may not be visible depending on data

  // Check for group labels
  const groupLabels = page.locator('h2.text-sm.font-mono');
  // Should have at least one group if history exists
});
```

**Filter pattern** (timeline.spec.ts lines 31-42, ReadingHistory.tsx filters):
```typescript
test('should filter by date preset', async ({ page }) => {
  await page.waitForLoadState('networkidle');

  // ReadingHistory has date preset buttons via HistoryFilters component
  const todayFilter = page.locator('button:has-text("Today")');
  if (await todayFilter.isVisible()) {
    await todayFilter.click();
    await page.waitForTimeout(300);
    // Verify filter applied
  }
});
```

**Clear history pattern** (ReadingHistory.tsx lines 239-245):
```typescript
test('should have clear history button', async ({ page }) => {
  const clearBtn = page.locator('button:has-text("Clear History"), button:has-text("Verlauf loschen")');
  await expect(clearBtn).toBeVisible();
});
```

**Empty state pattern** (ReadingHistory.tsx lines 185-207):
```typescript
test('should show empty state message', async ({ page }) => {
  // If no history exists
  const emptyIcon = page.locator('.h-16.w-16');
  const emptyText = page.locator('text=No Reading History');
  // Conditional check based on actual history state
});
```

---

### `playwright.config.ts` (config, modify existing)

**Analog:** `playwright.config.ts` (current, lines 1-27)

**Current config pattern** (lines 1-27):
```typescript
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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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

**Project dependencies pattern** (from RESEARCH.md, Playwright docs):
```typescript
// Add to projects array for storageState-based auth
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
```

---

## Shared Patterns

### Test File Structure
**Source:** `e2e/monitor.spec.ts` (lines 1-155)
**Apply to:** All new spec files

```typescript
import { test, expect } from '@playwright/test';

test.describe('PageName', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
  });

  test('should load the page', async ({ page }) => {
    await expect(page).toHaveURL('/path');
    // Verify main content
  });

  // Additional tests...
});
```

### Wait for Animation
**Source:** `e2e/event-map.spec.ts` (lines 63-64)
**Apply to:** All tests with framer-motion animations

```typescript
// After toggle/click that triggers animation
await page.waitForTimeout(300); // Wait for framer-motion animation
await expect(element).toBeVisible();
```

### Button with Text Selector
**Source:** `e2e/monitor.spec.ts` (lines 19-24)
**Apply to:** All button interactions

```typescript
// Primary pattern for buttons
const button = page.locator('button:has-text("ButtonText")');
await expect(button).toBeVisible();

// For buttons that appear multiple times
const button = page.locator('button:has-text("ButtonText")').first();
```

### Modal Detection
**Source:** `e2e/auth.spec.ts` (lines 17-22)
**Apply to:** All modal interactions

```typescript
const modal = page.locator('[role="dialog"], .fixed.inset-0');
await expect(modal).toBeVisible();

// Wait for form elements inside modal
await expect(page.locator('input[type="email"]')).toBeVisible();
```

### Class State Verification
**Source:** `e2e/monitor.spec.ts` (lines 57, 67-70)
**Apply to:** All active/inactive state checks

```typescript
// Check for active class
await expect(button).toHaveClass(/active/);

// Check for inactive (not active)
await expect(button).not.toHaveClass(/active/);

// Check for specific styling class
await expect(button).toHaveClass(/bg-blue/);
await expect(button).toHaveClass(/border-\[#00f0ff\]/);
```

### Conditional Element Check
**Source:** `e2e/timeline.spec.ts` (lines 36-41)
**Apply to:** Tests where element visibility depends on data

```typescript
test('should show conditional element', async ({ page }) => {
  await page.waitForLoadState('networkidle');

  const element = page.locator('button:has-text("Text")');
  if (await element.isVisible()) {
    await element.click();
    // Additional assertions
  }
});
```

### Stats Box Pattern
**Source:** `e2e/monitor.spec.ts` (lines 27-42), `e2e/event-map.spec.ts` (lines 23-31)
**Apply to:** Pages with stat boxes (Profile, Community, Analysis)

```typescript
test('should display stats', async ({ page }) => {
  // Check for stat boxes
  const statsBoxes = page.locator('.stat-box');
  await expect(statsBoxes.first()).toBeVisible();

  // Verify minimum count
  const count = await statsBoxes.count();
  expect(count).toBeGreaterThanOrEqual(2);
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have analogs in existing E2E test suite |

**Note:** The existing E2E test suite (`e2e/*.spec.ts`) provides comprehensive patterns for all new test files. The `auth.setup.ts` file follows Playwright's documented storageState pattern rather than an existing project analog.

---

## Metadata

**Analog search scope:** `e2e/*.spec.ts`, `src/pages/*.tsx`
**Files scanned:** 15 (6 existing E2E specs + 9 target page components)
**Pattern extraction date:** 2026-04-22

### Key Patterns Identified

1. **All specs use `test.describe()` with `test.beforeEach()` for page navigation** - Consistent across monitor.spec.ts, event-map.spec.ts, timeline.spec.ts
2. **`waitForLoadState('networkidle')` is standard after navigation** - Used in all existing specs
3. **`waitForTimeout(300-500)` for framer-motion animations** - Used in event-map.spec.ts, monitor.spec.ts
4. **Text selectors preferred over CSS paths** - `button:has-text()` pattern throughout
5. **Conditional checks for data-dependent elements** - Used in timeline.spec.ts for filter assertions
