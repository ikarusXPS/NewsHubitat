import { test, expect } from './fixtures';

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

  test('should display map container', async ({ page }) => {
    // Check for map container
    const mapContainer = page.locator('.leaflet-cyber');
    await expect(mapContainer).toBeVisible();
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

  test('should have filter toggle button', async ({ page }) => {
    // Filter button is between AI Extract and Refresh buttons
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await expect(filterButton).toBeVisible();
  });

  test('should toggle filter panel', async ({ page }) => {
    // Filter panel should not be visible initially
    const severityLabel = page.locator('.signal-label:has-text("Severity")');
    await expect(severityLabel).not.toBeVisible();

    // Click filter toggle button (third button with icons - after MapPin and AI Extract)
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();

    // Wait for animation and check if filter panel appears
    await page.waitForTimeout(300); // Wait for framer-motion animation
    await expect(severityLabel).toBeVisible();
  });

  test('should display severity filters when panel is open', async ({ page }) => {
    // Open filter panel
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Wait for Severity label to be visible first
    const severityLabel = page.locator('.signal-label:has-text("Severity")');
    await expect(severityLabel).toBeVisible();

    // Should have severity filter buttons with specific text
    const criticalBtn = page.locator('button:has-text("Critical")').first();
    const highBtn = page.locator('button:has-text("High")').first();
    const mediumBtn = page.locator('button:has-text("Medium")').first();
    const lowBtn = page.locator('button:has-text("Low")').first();

    await expect(criticalBtn).toBeVisible();
    await expect(highBtn).toBeVisible();
    await expect(mediumBtn).toBeVisible();
    await expect(lowBtn).toBeVisible();
  });

  test('should display category filters when panel is open', async ({ page }) => {
    // Open filter panel
    const filterButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await filterButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Wait for Category label to be visible first
    const categoryLabel = page.locator('.signal-label:has-text("Category")');
    await expect(categoryLabel).toBeVisible();

    // Should have category filter buttons
    const conflictBtn = page.locator('button:has-text("Conflict")').first();
    const humanitarianBtn = page.locator('button:has-text("Humanitarian")').first();
    const politicalBtn = page.locator('button:has-text("Political")').first();

    await expect(conflictBtn).toBeVisible();
    await expect(humanitarianBtn).toBeVisible();
    await expect(politicalBtn).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(refreshButton).toBeVisible();
  });

  test('should click AI Extract button without errors', async ({ page }) => {
    const aiButton = page.locator('button:has-text("AI Extract")');
    await aiButton.click();

    // Button should change to "Extracting..."
    await expect(page.locator('text=Extracting...')).toBeVisible({ timeout: 1000 });
  });

  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/');

    // Click Event Map link in sidebar
    const eventMapLink = page.locator('a[href="/events"]');
    await eventMapLink.click();

    await expect(page).toHaveURL('/events');
  });

  test('should show AI badge in sidebar', async ({ page }) => {
    await page.goto('/');

    // Event Map link should have AI badge
    const eventMapLink = page.locator('a[href="/events"]');
    const aiBadge = eventMapLink.locator('text=AI');
    await expect(aiBadge).toBeVisible();
  });
});
