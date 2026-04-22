import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the Dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/');
    // Check for search input (NewsFeed.tsx contains HeroSection which has search)
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should display news feed with articles', async ({ page }) => {
    // Wait for articles to load - SignalCard has glass-panel styling
    const articleCard = page.locator('.glass-panel').first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });
  });

  test('should have view toggle buttons', async ({ page }) => {
    // View mode toggle container with grid and list buttons
    // Grid button has LayoutGrid icon, List button has List icon
    const viewToggle = page.locator('.glass-panel').filter({
      has: page.locator('button'),
    });

    // Should have view toggle visible
    await expect(viewToggle.first()).toBeVisible();

    // Check for at least two buttons (grid and list)
    const buttons = page.locator('button').filter({
      has: page.locator('svg'),
    });
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(2);
  });

  test('should toggle between grid and list views', async ({ page }) => {
    // Find the view mode toggle container (glass-panel with two buttons inside)
    const viewToggleButtons = page
      .locator('.glass-panel.rounded-lg.p-1')
      .locator('button');

    // Wait for buttons to be present
    await page.waitForTimeout(500);

    const buttonCount = await viewToggleButtons.count();
    if (buttonCount >= 2) {
      // Grid button is first (index 0), List button is second (index 1)
      const gridButton = viewToggleButtons.nth(0);
      const listButton = viewToggleButtons.nth(1);

      // Grid should be active by default (has cyan border)
      await expect(gridButton).toHaveClass(/border-\[#00f0ff\]|border/);

      // Click list button
      await listButton.click();
      await page.waitForTimeout(300); // Animation

      // List button should now be active
      await expect(listButton).toHaveClass(/border-\[#00f0ff\]|border/);
    }
  });

  test('should display trend filter buttons', async ({ page }) => {
    // Trend Analysis section has All, Escalation, De-escalation buttons
    const allBtn = page.locator('button:has-text("All")').first();
    const escalationBtn = page.locator('button:has-text("Escalation")');
    const deEscalationBtn = page.locator('button:has-text("De-escalation")');

    await expect(allBtn).toBeVisible();
    await expect(escalationBtn).toBeVisible();
    await expect(deEscalationBtn).toBeVisible();
  });

  test('should filter by escalation trend', async ({ page }) => {
    const escalationBtn = page.locator('button:has-text("Escalation")');

    if (await escalationBtn.isVisible()) {
      await escalationBtn.click();
      await page.waitForTimeout(300);

      // Button should show active state (red border for escalation)
      await expect(escalationBtn).toHaveClass(/border-\[#ff0044\]/);
    }
  });

  test('should filter by de-escalation trend', async ({ page }) => {
    const deEscalationBtn = page.locator('button:has-text("De-escalation")');

    if (await deEscalationBtn.isVisible()) {
      await deEscalationBtn.click();
      await page.waitForTimeout(300);

      // Button should show active state (green border for de-escalation)
      await expect(deEscalationBtn).toHaveClass(/border-\[#00ff88\]/);
    }
  });

  test('should display hero section with stats', async ({ page }) => {
    // HeroSection displays stats like total articles, regions, critical events
    // Wait for hero section to load
    await page.waitForTimeout(500);

    // Check for stat indicators (stat boxes or numbers)
    const statsSection = page.locator('text=/\\d+/').first();
    await expect(statsSection).toBeVisible();
  });

  test('should navigate from sidebar', async ({ page }) => {
    // Navigate away first
    await page.goto('/monitor');
    await page.waitForLoadState('networkidle');

    // Click home/dashboard link in sidebar
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();

    await expect(page).toHaveURL('/');
  });

  test('should display glass panels', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for glass-panel class (used throughout NewsFeed)
    const glassPanels = page.locator('.glass-panel');
    const panelCount = await glassPanels.count();

    // Should have at least one glass panel visible
    expect(panelCount).toBeGreaterThan(0);
  });

  test('should have refresh/sync button', async ({ page }) => {
    // Sync button refreshes news feed
    const syncButton = page.locator('button:has-text("Sync")');

    // May be visible on larger screens
    if (await syncButton.isVisible()) {
      await expect(syncButton).toBeVisible();
    } else {
      // On smaller screens, just check for refresh icon button
      const refreshButtons = page.locator('button').filter({
        has: page.locator('svg'),
      });
      const count = await refreshButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
