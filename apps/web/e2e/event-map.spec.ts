import { test, expect } from './fixtures';

// Skip map rendering tests in CI - Leaflet requires full browser rendering
const isCI = !!process.env.CI;

test.describe('Event Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load the Event Map page', async ({ page }) => {
    await expect(page).toHaveURL('/events');

    // Check for header - text is in a nested span
    const heading = page.locator('h1:has-text("EVENT MAP")');
    await expect(heading).toBeVisible();
  });

  test.skip(isCI, 'should display map container', async ({ page }) => {
    // Skip in CI - Leaflet map container may not render in headless mode
    const mapContainer = page.locator('.leaflet-container, .leaflet-cyber');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display stats bar', async ({ page }) => {
    // Check for stats boxes
    const statsBoxes = page.locator('.stat-box');
    await expect(statsBoxes.first()).toBeVisible();

    // Should have at least 4 stat boxes (Total, Critical, High Priority, AI Extracted)
    // Note: There might be Medium stat box too, so checking for at least 4
    const count = await statsBoxes.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should show recent events list', async ({ page }) => {
    // Wait for events to load
    await page.waitForSelector('.signal-label:has-text("Recent Events")');

    const eventsList = page.locator('.signal-label:has-text("Recent Events")').locator('..');
    await expect(eventsList).toBeVisible();
  });

  test('should have AI Extract button', async ({ page }) => {
    const aiButton = page.locator('button:has-text("AI Extract")');
    await expect(aiButton).toBeVisible();
  });

  test.skip(isCI, 'should have filter toggle button', async ({ page }) => {
    // Skip in CI - depends on map rendering which may not work in headless
    const filterButton = page.locator('button[aria-label*="filter"], button:has(svg)').nth(2);
    await expect(filterButton).toBeVisible({ timeout: 10000 });
  });

  test.skip(isCI, 'should toggle filter panel', async ({ page }) => {
    // Skip in CI - depends on map rendering
    const severityLabel = page.locator('text=Severity');
    await expect(severityLabel).not.toBeVisible();

    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();

    await page.waitForTimeout(500);
    await expect(severityLabel).toBeVisible({ timeout: 5000 });
  });

  test.skip(isCI, 'should display severity filters when panel is open', async ({ page }) => {
    // Skip in CI - depends on filter panel
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();
    await page.waitForTimeout(500);

    const severityLabel = page.locator('text=Severity');
    await expect(severityLabel).toBeVisible({ timeout: 5000 });

    await expect(page.locator('button:has-text("Critical")').first()).toBeVisible();
    await expect(page.locator('button:has-text("High")').first()).toBeVisible();
  });

  test.skip(isCI, 'should display category filters when panel is open', async ({ page }) => {
    // Skip in CI - depends on filter panel
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();
    await page.waitForTimeout(500);

    const categoryLabel = page.locator('text=Category');
    await expect(categoryLabel).toBeVisible({ timeout: 5000 });

    await expect(page.locator('button:has-text("Conflict")').first()).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(refreshButton).toBeVisible();
  });

  test.skip(isCI, 'should click AI Extract button without errors', async ({ page }) => {
    // Skip in CI - AI extraction requires API keys
    const aiButton = page.locator('button:has-text("AI Extract")');
    await aiButton.click();
    await expect(page.locator('text=Extracting...')).toBeVisible({ timeout: 2000 });
  });

  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/');

    // Click Event Map link in sidebar
    const eventMapLink = page.locator('a[href="/events"]');
    await eventMapLink.click();

    await expect(page).toHaveURL('/events');
  });

  test.skip(isCI, 'should show AI badge in sidebar', async ({ page }) => {
    // Skip in CI - sidebar badge rendering may differ
    await page.goto('/');
    const eventMapLink = page.locator('a[href="/events"]');
    const aiBadge = eventMapLink.locator('text=AI');
    await expect(aiBadge).toBeVisible({ timeout: 5000 });
  });
});
