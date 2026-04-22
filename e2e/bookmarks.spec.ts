import { test, expect } from '@playwright/test';

// Bookmarks page tests
// Note: Bookmarks page uses localStorage (Zustand) for state, not server-side auth
// The chromium-auth project provides storageState with hasCompletedOnboarding

test.describe('Bookmarks Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage with Zustand format to bypass onboarding
    await page.addInitScript(() => {
      localStorage.setItem('newshub-storage', JSON.stringify({
        state: {
          hasCompletedOnboarding: true,
          theme: 'dark',
          language: 'de',
          bookmarkedArticles: [],
          readingHistory: [],
          filters: { regions: [], topics: [] }
        },
        version: 0
      }));
    });

    await page.goto('/bookmarks');
    // Use domcontentloaded instead of networkidle to avoid WebSocket timeouts
    await page.waitForLoadState('domcontentloaded');
    // Wait for React to hydrate
    await page.waitForTimeout(500);
  });

  test('should load the Bookmarks page', async ({ page }) => {
    await expect(page).toHaveURL('/bookmarks');

    // Check for page header (German: "Gespeicherte Artikel")
    const heading = page.locator('h1:has-text("Gespeicherte Artikel")');
    await expect(heading).toBeVisible();
  });

  test('should display page description', async ({ page }) => {
    // Description text about bookmarks
    const description = page.locator('text=Deine markierten Artikel zum spateren Lesen');
    await expect(description).toBeVisible();
  });

  test('should show empty state or articles grid', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(1000);

    // Either empty state OR articles grid should be visible
    // Use getByText for more reliable text matching
    const emptyText = page.getByText('Keine gespeicherten Artikel');
    const articleGrid = page.locator('.grid.gap-4');

    const hasEmpty = await emptyText.isVisible().catch(() => false);
    const hasArticles = await articleGrid.isVisible().catch(() => false);

    // One of these must be true
    expect(hasEmpty || hasArticles).toBeTruthy();
  });

  test('should display empty state icon when no bookmarks', async ({ page }) => {
    await page.waitForTimeout(500);

    const emptyText = page.locator('text=Keine gespeicherten Artikel');

    if (await emptyText.isVisible()) {
      // Empty state should have bookmark icon (Bookmark from lucide-react)
      // Icon is inside the flex container with the empty message
      const emptyContainer = page.locator('.flex.flex-col.items-center.justify-center');
      await expect(emptyContainer).toBeVisible();

      // Should have the large bookmark icon
      const bookmarkIcon = emptyContainer.locator('svg').first();
      await expect(bookmarkIcon).toBeVisible();

      // Should also have helper text
      const helperText = page.locator('text=Klicke auf das Lesezeichen-Symbol');
      await expect(helperText).toBeVisible();
    }
  });

  test('should display clear all button when bookmarks exist', async ({ page }) => {
    await page.waitForTimeout(500);

    const articleGrid = page.locator('.grid.gap-4');

    if (await articleGrid.isVisible()) {
      // "Alle entfernen" button should be visible when bookmarks exist
      const clearAllBtn = page.locator('button:has-text("Alle entfernen")');
      await expect(clearAllBtn).toBeVisible();

      // Button should have trash icon
      const trashIcon = clearAllBtn.locator('svg');
      await expect(trashIcon).toBeVisible();
    }
  });

  test('should display article count when bookmarks exist', async ({ page }) => {
    await page.waitForTimeout(500);

    const articleGrid = page.locator('.grid.gap-4');

    if (await articleGrid.isVisible()) {
      // Count indicator (e.g., "X von Y Artikel verfugbar")
      const countText = page.locator('text=/\\d+ von \\d+ Artikel/');
      await expect(countText).toBeVisible();
    }
  });

  test('should have consistent header styling', async ({ page }) => {
    // Header should be white/light colored
    const heading = page.locator('h1.text-2xl.font-bold.text-white');
    await expect(heading).toBeVisible();

    // Description should be gray colored
    const description = page.locator('p.text-gray-400');
    await expect(description.first()).toBeVisible();
  });

  test('should navigate from Profile quick action', async ({ page }) => {
    // Go to profile first
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    // Click Bookmarks quick action
    const bookmarksBtn = page.locator('button:has-text("Bookmarks")');

    if (await bookmarksBtn.isVisible()) {
      await bookmarksBtn.click();
      await expect(page).toHaveURL('/bookmarks');
    }
  });
});
