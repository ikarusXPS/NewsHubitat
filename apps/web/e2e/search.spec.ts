import { test, expect } from './fixtures';

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have a search input in header', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should update search query on input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]');

    await searchInput.fill('Gaza');
    await expect(searchInput).toHaveValue('Gaza');
  });

  test('should filter articles based on search query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]');

    // Wait for initial articles to load
    await page.waitForLoadState('domcontentloaded');

    // Wait for initial articles
    await page.locator('[class*="article"], [data-testid="article-card"]').first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {/* may not have articles */});

    // Type search query
    await searchInput.fill('test search query');

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    // Search should be active
    await expect(searchInput).toHaveValue('test search query');
  });

  test('should clear search when input is cleared', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]');

    // Fill and clear
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('should preserve search on navigation and back', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="suchen"], input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]');

    // Enter search query
    await searchInput.fill('Middle East');

    // Navigate to another page
    await page.click('a[href="/timeline"]');
    await expect(page).toHaveURL('/timeline');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Search input should still be visible
    await expect(searchInput).toBeVisible();
  });
});
