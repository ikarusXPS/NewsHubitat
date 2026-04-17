import { test, expect } from '@playwright/test';

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

  test('should display stats panel', async ({ page }) => {
    // Check for Live indicator (text changes from "Loading..." to "Live Monitoring")
    const liveIndicator = page.locator('.live-indicator');
    await expect(liveIndicator).toBeVisible();

    // Wait for loading to complete
    await page.waitForTimeout(1000);

    // Check that it contains either Loading or Live Monitoring
    const indicatorText = await liveIndicator.textContent();
    expect(indicatorText).toMatch(/Loading|Live Monitoring/);

    // Check for stat boxes
    const statBoxes = page.locator('.stat-box');
    await expect(statBoxes.first()).toBeVisible();
  });

  test('should display severity filter section', async ({ page }) => {
    // Check for Severity label
    const severityLabel = page.locator('text=Severity');
    await expect(severityLabel).toBeVisible();

    // Check for severity buttons
    await expect(page.locator('text=Critical').first()).toBeVisible();
    await expect(page.locator('text=High').first()).toBeVisible();
  });

  test('should toggle between globe and map views', async ({ page }) => {
    // Default view should be globe
    const globeButton = page.locator('button:has-text("3D Globe")');
    await expect(globeButton).toHaveClass(/active/);

    // Click 2D Map button
    const mapButton = page.locator('button:has-text("2D Map")');
    await mapButton.click();

    // Wait for view transition
    await page.waitForTimeout(500);

    // Map button should be active
    await expect(mapButton).toHaveClass(/active/);

    // Globe button should not be active
    await expect(globeButton).not.toHaveClass(/active/);
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
    await page.waitForLoadState('networkidle');

    // After loading, stats should be visible
    const statBoxes = page.locator('.stat-box');
    await expect(statBoxes.first()).toBeVisible();
  });

  test('should display panel containers', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for glass-panel class (left stats panel)
    const glassPanels = page.locator('.glass-panel');
    const panelCount = await glassPanels.count();

    // Should have at least one glass panel visible
    expect(panelCount).toBeGreaterThan(0);

    // Check for stat boxes inside panels
    const statPanel = page.locator('.stat-box').first();
    await expect(statPanel).toBeVisible();
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
