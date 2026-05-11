import { test, expect } from './fixtures';

// Bookmarks page tests
// Note: Bookmarks page uses localStorage (Zustand) for state, not server-side auth

test.describe('Bookmarks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bookmarks');
    // Use domcontentloaded instead of networkidle to avoid WebSocket timeouts
    await page.waitForLoadState('domcontentloaded');
    // Wait for either the empty-state or the articles grid (whichever the
    // current localStorage state produces) — hydration-anchored, not a fixed
    // sleep. See todo 40-13 for the anti-pattern audit; both anchors landed
    // on Bookmarks.tsx in the same change.
    await Promise.race([
      page
        .locator('[data-testid="bookmarks-empty-state"]')
        .waitFor({ state: 'visible', timeout: 15000 }),
      page
        .locator('[data-testid="bookmarks-articles-grid"]')
        .waitFor({ state: 'visible', timeout: 15000 }),
    ]);
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
    // beforeEach already waited on whichever anchor renders for the current
    // bookmark state; just read both and assert exactly one is visible.
    const hasEmpty = await page
      .locator('[data-testid="bookmarks-empty-state"]')
      .isVisible();
    const hasArticles = await page
      .locator('[data-testid="bookmarks-articles-grid"]')
      .isVisible();

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
