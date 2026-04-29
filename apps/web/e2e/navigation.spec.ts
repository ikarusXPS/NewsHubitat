import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard page', async ({ page }) => {
    // Dashboard is the news feed - check for main content area
    await expect(page).toHaveURL('/');
    // Wait for page to load and check for news feed elements
    await page.waitForLoadState('domcontentloaded');
    // Should have search input in header with English placeholder
    const searchInput = page.locator('input[placeholder*="Search signals"]');
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to Timeline page', async ({ page }) => {
    await page.click('a[href="/timeline"]');
    await expect(page).toHaveURL('/timeline');
    await expect(page.locator('h1')).toContainText('Ereignis-Timeline');
  });

  test('should navigate to Map page via direct URL', async ({ page }) => {
    // Note: /map route exists but has no sidebar link
    await page.goto('/map');
    await expect(page).toHaveURL('/map');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText('Konflikt-Karte');
  });

  test('should navigate to Analysis page', async ({ page }) => {
    await page.click('a[href="/analysis"]');
    await expect(page).toHaveURL('/analysis');
    await expect(page.locator('h1')).toContainText(/PERSPEKTIVEN-ANALYSE/i);
  });

  test('should navigate to Bookmarks page', async ({ page }) => {
    await page.click('a[href="/bookmarks"]');
    await expect(page).toHaveURL('/bookmarks');
    await expect(page.locator('h1')).toContainText('Gespeicherte Artikel');
  });

  test('should navigate to Monitor page', async ({ page }) => {
    await page.click('a[href="/monitor"]');
    await expect(page).toHaveURL('/monitor');
    await expect(page.locator('h1')).toContainText('THE MONITOR');
  });

  test('should navigate to Event Map page', async ({ page }) => {
    await page.click('a[href="/events"]');
    await expect(page).toHaveURL('/events');
    await expect(page.locator('h1')).toContainText('EVENT MAP');
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL('/settings');
    // Settings page loads - heading may vary based on auth state
    await page.waitForLoadState('domcontentloaded');
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Check Dashboard is active initially (uses "active" class)
    const dashboardLink = page.locator('a[href="/"]');
    await expect(dashboardLink).toHaveClass(/active/);

    // Navigate to Timeline and check it becomes active
    await page.click('a[href="/timeline"]');
    const timelineLink = page.locator('a[href="/timeline"]');
    await expect(timelineLink).toHaveClass(/active/);

    // Dashboard should no longer be active
    await expect(dashboardLink).not.toHaveClass(/active/);
  });
});
