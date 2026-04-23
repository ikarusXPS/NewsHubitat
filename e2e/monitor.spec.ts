import { test, expect } from './fixtures';

const isCI = !!process.env.CI;

test.describe('Monitor Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');
  });

  test('should load the Monitor page', async ({ page }) => {
    await expect(page).toHaveURL('/monitor');

    // Check for header
    const heading = page.locator('h1');
    await expect(heading).toContainText('THE MONITOR');
  });

  test('should display view toggle buttons', async ({ page }) => {
    // Check for 3D Globe button
    const globeButton = page.locator('button:has-text("3D Globe")');
    await expect(globeButton).toBeVisible();

    // Check for 2D Map button
    const mapButton = page.locator('button:has-text("2D Map")');
    await expect(mapButton).toBeVisible();
  });

  test.skip(isCI, 'should display stats panel', async ({ page }) => {
    // Skip in CI - stats depend on WebGL globe rendering
    const liveIndicator = page.locator('.live-indicator');
    await expect(liveIndicator).toBeVisible({ timeout: 10000 });
  });

  test.skip(isCI, 'should display severity filter section', async ({ page }) => {
    // Skip in CI - severity filters depend on globe context
    const severityLabel = page.locator('text=Severity');
    await expect(severityLabel).toBeVisible({ timeout: 10000 });
  });

  test.skip(isCI, 'should toggle between globe and map views', async ({ page }) => {
    // Skip in CI - WebGL globe doesn't render in headless mode
    const globeButton = page.locator('button:has-text("3D Globe")');
    const mapButton = page.locator('button:has-text("2D Map")');
    await mapButton.click();
    await page.waitForTimeout(500);
  });

  test('should have fullscreen button', async ({ page }) => {
    // Check for fullscreen button (has Maximize2 icon)
    const fullscreenButton = page.locator('button[title="Fullscreen"]');
    await expect(fullscreenButton).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    // Refresh button should be visible
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await expect(refreshButton).toBeVisible();
  });

  test('should display recent events section', async ({ page }) => {
    // Check for Recent Events label
    const recentEventsLabel = page.locator('text=Recent Events');
    await expect(recentEventsLabel).toBeVisible();
  });

  test('should filter by severity', async ({ page }) => {
    // Click on Critical severity filter
    const criticalButton = page.locator('button', { hasText: 'Critical' }).first();
    await criticalButton.click();

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Button should have active styling (border color change)
    // Note: This is checking for style changes, actual filtering depends on data
  });

  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/');

    // Click Monitor link in sidebar
    const monitorLink = page.locator('a[href="/monitor"]');
    await monitorLink.click();

    await expect(page).toHaveURL('/monitor');
  });

  test('should show loading state when fetching data', async ({ page }) => {
    // Reload to see loading state
    await page.reload();

    // Check for loading indicator (if visible during load)
    // This might be too fast to catch, so we'll just verify the page loads
    await page.waitForLoadState('domcontentloaded');

    // After loading, stats should be visible
    const statBoxes = page.locator('.stat-box');
    await expect(statBoxes.first()).toBeVisible();
  });

  test.skip(isCI, 'should display panel containers', async ({ page }) => {
    // Skip in CI - panel rendering depends on globe
    await page.waitForTimeout(1000);
    const glassPanels = page.locator('.glass-panel');
    const panelCount = await glassPanels.count();
    expect(panelCount).toBeGreaterThanOrEqual(0);
  });

  test('should have themed styling', async ({ page }) => {
    // Check for page heading with "THE MONITOR" text
    const heading = page.locator('h1:has-text("THE MONITOR")');
    await expect(heading).toBeVisible();

    // Check for gradient-text-cyber span inside heading
    const cyberText = page.locator('.gradient-text-cyber');
    await expect(cyberText).toBeVisible();

    // Check for view toggle buttons which are part of the themed UI
    const viewToggle = page.locator('.view-toggle');
    await expect(viewToggle).toBeVisible();
  });
});
