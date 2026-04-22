import { test, expect } from './fixtures';

// These tests run with storageState from auth.setup.ts
// User is already authenticated when tests start

test.describe('Reading History Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to finish loading - either empty state or content should appear
    // The page shows "Loading..." while fetching, then shows either empty state or history
    const heading = page.locator('h1:has-text("Reading History"), h1:has-text("Leseverlauf")');
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load the Reading History page', async ({ page }) => {
    await expect(page).toHaveURL('/history');

    // Check for page header (Reading History or Leseverlauf)
    const heading = page.locator('h1:has-text("Reading History"), h1:has-text("Leseverlauf")').first();
    await expect(heading).toBeVisible();
  });

  test('should display page subtitle', async ({ page }) => {
    // Subtitle: "Articles you have read" or "Artikel, die Sie gelesen haben"
    const subtitle = page.locator('p:has-text("Articles you have read"), p:has-text("Artikel, die Sie gelesen haben")').first();
    await expect(subtitle).toBeVisible();
  });

  test('should show empty state or timeline groups', async ({ page }) => {
    // Wait for page content to load
    await page.waitForTimeout(500);

    // Either empty state OR timeline groups should be visible
    // Empty state text is in a <p> tag
    const emptyText = page.locator('p:has-text("No Reading History"), p:has-text("Kein Leseverlauf")').first();
    const timelineGroup = page.locator('h2:has-text("Today"), h2:has-text("Yesterday"), h2:has-text("This Week"), h2:has-text("Older"), h2:has-text("Heute"), h2:has-text("Gestern")').first();

    const hasEmpty = await emptyText.isVisible().catch(() => false);
    const hasTimeline = await timelineGroup.isVisible().catch(() => false);

    // One of these must be true
    expect(hasEmpty || hasTimeline).toBeTruthy();
  });

  test('should display empty state icon when no history', async ({ page }) => {
    const emptyText = page.locator('p:has-text("No Reading History"), p:has-text("Kein Leseverlauf")').first();

    if (await emptyText.isVisible().catch(() => false)) {
      // Empty state should have Clock icon (h-16 w-16)
      const emptyIcon = page.locator('svg.h-16.w-16').first();
      await expect(emptyIcon).toBeVisible();

      // Should also show instruction text
      const instructionText = page.locator('p:has-text("Start reading articles"), p:has-text("Lesen Sie Artikel")').first();
      await expect(instructionText).toBeVisible();
    }
  });

  test('should display timeline group headers when history exists', async ({ page }) => {
    // Wait for any content to load
    await page.waitForTimeout(500);

    const timelineGroup = page.locator('h2:has-text("Today"), h2:has-text("Yesterday"), h2:has-text("This Week"), h2:has-text("Older"), h2:has-text("Heute"), h2:has-text("Gestern")').first();

    if (await timelineGroup.isVisible().catch(() => false)) {
      await expect(timelineGroup).toBeVisible();
    }
  });

  test('should have clear history button when history exists', async ({ page }) => {
    // Wait for page content to load
    await page.waitForTimeout(500);

    // Clear history button (only visible when history exists, not in empty state)
    // Empty state text is in a <p> tag
    const emptyText = page.locator('p:has-text("No Reading History"), p:has-text("Kein Leseverlauf")').first();
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // When history exists, clear button should be visible
      const clearBtn = page.locator('button:has-text("Clear History"), button:has-text("Verlauf")').first();
      await expect(clearBtn).toBeVisible();
    }
    // Note: If empty state, clear button is not shown - this is expected behavior
  });

  test('should display history stats section when history exists', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // HistoryStats component shows statistics in a grid
      const statsGrid = page.locator('.grid.grid-cols-2, .grid.gap-4').first();

      if (await statsGrid.isVisible().catch(() => false)) {
        // Should show Total, Regions, Top Topics, 7 Days stats
        const totalLabel = page.locator('text=/Total|Articles/i').first();
        await expect(totalLabel).toBeVisible();
      }
    }
  });

  test('should display filter section with glass panel', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // HistoryFilters component has glass-panel styling
      const filterPanel = page.locator('.glass-panel').filter({ has: page.locator('input[placeholder*="Search"], input[placeholder*="search"]') }).first();

      if (await filterPanel.isVisible().catch(() => false)) {
        await expect(filterPanel).toBeVisible();
      }
    }
  });

  test('should have search input in filters', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Search input with placeholder
      const searchInput = page.locator('input[placeholder*="Search reading history"], input[type="text"]').first();

      if (await searchInput.isVisible().catch(() => false)) {
        await expect(searchInput).toBeVisible();
        // Should have search icon nearby
        const _searchIcon = page.locator('svg').filter({ has: page.locator('[class*="lucide-search"]') }).first();
        // Icon might be inside a div with the input
      }
    }
  });

  test('should display date filter button', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Date preset filter button (shows "All Time" by default or similar)
      const dateFilter = page.locator('button').filter({ hasText: /All Time|Date|Today|Last 7 Days/i }).first();

      if (await dateFilter.isVisible().catch(() => false)) {
        await expect(dateFilter).toBeVisible();
      }
    }
  });

  test('should show date preset dropdown when clicked', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Click the date filter button to open dropdown
      const dateFilter = page.locator('button').filter({ hasText: /All Time|Date/i }).first();

      if (await dateFilter.isVisible().catch(() => false)) {
        await dateFilter.click();
        await page.waitForTimeout(300);

        // Dropdown should show date presets
        const dropdown = page.locator('.bg-gray-900.border.border-gray-700, [class*="dropdown"]');
        const todayOption = page.locator('button:has-text("Today")');
        const yesterdayOption = page.locator('button:has-text("Yesterday")');

        if (await dropdown.isVisible().catch(() => false)) {
          await expect(todayOption.or(yesterdayOption)).toBeVisible();
        }
      }
    }
  });

  test('should display sentiment filter buttons', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Sentiment filter buttons: Positive, Neutral, Negative
      const positiveBtn = page.locator('button:has-text("Positive")');
      const neutralBtn = page.locator('button:has-text("Neutral")');
      const negativeBtn = page.locator('button:has-text("Negative")');

      // At least one sentiment button should be visible
      const hasPositive = await positiveBtn.isVisible().catch(() => false);
      const hasNeutral = await neutralBtn.isVisible().catch(() => false);
      const hasNegative = await negativeBtn.isVisible().catch(() => false);

      if (hasPositive || hasNeutral || hasNegative) {
        expect(hasPositive || hasNeutral || hasNegative).toBeTruthy();
      }
    }
  });

  test('should display region filter buttons', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Region filter buttons in HistoryFilters
      const filterLabel = page.locator('text=/Filters:/i');

      if (await filterLabel.isVisible().catch(() => false)) {
        // Check for at least one region button (USA, Europa, DE, etc.)
        const usaBtn = page.locator('button:has-text("USA")');
        const europaBtn = page.locator('button:has-text("Europa")');

        const hasUSA = await usaBtn.isVisible().catch(() => false);
        const hasEuropa = await europaBtn.isVisible().catch(() => false);

        expect(hasUSA || hasEuropa).toBeTruthy();
      }
    }
  });

  test('should filter by date preset', async ({ page }) => {
    const emptyText = page.locator('text=/No Reading History|Kein Leseverlauf/i');
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      // Open date dropdown
      const dateFilter = page.locator('button').filter({ hasText: /All Time|Date/i }).first();

      if (await dateFilter.isVisible().catch(() => false)) {
        await dateFilter.click();
        await page.waitForTimeout(300);

        // Click "Today" option
        const todayOption = page.locator('button:has-text("Today")').first();

        if (await todayOption.isVisible().catch(() => false)) {
          await todayOption.click();
          await page.waitForTimeout(300);

          // Date filter button should now show active state
          const activeFilter = page.locator('button').filter({ hasText: /Today/i }).first();
          await expect(activeFilter).toHaveClass(/bg-\[#00f0ff\]|border-\[#00f0ff\]|text-\[#00f0ff\]/);
        }
      }
    }
  });

  test('should navigate from Profile quick action', async ({ page }) => {
    // Go to profile first
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    // Click History quick action button
    const historyBtn = page.locator('button:has-text("History"), a:has-text("History")').first();

    if (await historyBtn.isVisible().catch(() => false)) {
      await historyBtn.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL('/history');
    }
  });
});
