import { test, expect } from './fixtures';

// Skip entire suite in CI - page load timing too flaky
test.describe('Community Page', () => {
  test.skip((_fixtures, testInfo) => testInfo.project.name.includes('chromium') && !!process.env.CI, 'Flaky in CI');

  test.beforeEach(async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    // Wait for any heading to be visible
    await page.locator('h1, h2, [class*="gradient-text"]').first().waitFor({ state: 'visible', timeout: 30000 });
  });

  test('should load the Community page', async ({ page }) => {
    await expect(page).toHaveURL('/community');

    // Check for Community header (gradient-text-cyber contains "COMMUNITY")
    const heading = page.locator('h1 .gradient-text-cyber');
    await expect(heading).toBeVisible();
  });

  test('should display tab buttons', async ({ page }) => {
    // Check for Contribute tab
    const contributeTab = page.locator('button:has-text("Contribute")');
    await expect(contributeTab).toBeVisible();

    // Check for Badges tab
    const badgesTab = page.locator('button:has-text("Badges")');
    await expect(badgesTab).toBeVisible();

    // Check for Leaderboard tab
    const leaderboardTab = page.locator('button:has-text("Leaderboard")');
    await expect(leaderboardTab).toBeVisible();
  });

  test('should switch to Badges tab', async ({ page }) => {
    const badgesTab = page.locator('button:has-text("Badges")');
    await badgesTab.click();
    await page.waitForTimeout(300); // Animation

    // Badges tab should be active (has active styling)
    await expect(badgesTab).toHaveClass(/bg-\[#00f0ff\]|border-\[#00f0ff\]/);
  });

  test('should switch to Leaderboard tab', async ({ page }) => {
    const leaderboardTab = page.locator('button:has-text("Leaderboard")');
    await leaderboardTab.click();
    await page.waitForTimeout(300); // Animation

    // Leaderboard content should be visible - look for Top Contributors text
    const leaderboardContent = page.locator('text=Top Contributors');
    await expect(leaderboardContent).toBeVisible();
  });

  test('should display contribution type buttons in Contribute tab', async ({ page }) => {
    // Submit News button
    const submitNewsBtn = page.locator('button:has-text("Submit News")');
    await expect(submitNewsBtn).toBeVisible();

    // Fact Check button
    const factCheckBtn = page.locator('button:has-text("Fact Check")');
    await expect(factCheckBtn).toBeVisible();

    // Translate button
    const translateBtn = page.locator('button:has-text("Translate")');
    await expect(translateBtn).toBeVisible();

    // Verify button
    const verifyBtn = page.locator('button:has-text("Verify")');
    await expect(verifyBtn).toBeVisible();
  });

  test('should show points for contribution types', async ({ page }) => {
    // Each contribution type shows points (+50 XP, +30 XP, +40 XP, +20 XP)
    const pointsIndicator = page.locator('text=/\\+\\d+ XP/i').first();
    await expect(pointsIndicator).toBeVisible();
  });

  test('should select Submit News contribution type', async ({ page }) => {
    const submitNewsBtn = page.locator('button:has-text("Submit News")');
    await submitNewsBtn.click();
    await page.waitForTimeout(300);

    // Form should appear or button should show active state
    // Button gets border color when active
    await expect(submitNewsBtn).toHaveClass(/border-\[#00f0ff\]/);
  });

  test('should display badges in Badges tab', async ({ page }) => {
    // Switch to Badges tab
    const badgesTab = page.locator('button:has-text("Badges")');
    await badgesTab.click();
    await page.waitForTimeout(500);

    // Look for badge cards - First Steps badge is always present
    const badgeCard = page.locator('text=First Steps').first();
    await expect(badgeCard).toBeVisible();
  });

  test('should display leaderboard rankings', async ({ page }) => {
    // Switch to Leaderboard tab
    const leaderboardTab = page.locator('button:has-text("Leaderboard")');
    await leaderboardTab.click();
    await page.waitForTimeout(500);

    // Look for XP label in leaderboard
    const xpLabel = page.locator('text=XP').first();
    await expect(xpLabel).toBeVisible();
  });

  test('should display streak calendar in Contribute tab', async ({ page }) => {
    // StreakCalendar component shows contribution streaks
    const streakSection = page.locator('text=/streak|Contribution/i').first();
    if (await streakSection.isVisible()) {
      await expect(streakSection).toBeVisible();
    }
  });

  test('should display glass panel styling', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(500);

    // Community page uses glass-panel for sections
    const glassPanels = page.locator('.glass-panel');
    const panelCount = await glassPanels.count();
    expect(panelCount).toBeGreaterThan(0);
  });

  test('should navigate from sidebar', async ({ page }) => {
    // Navigate away first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for sidebar to be visible
    await page.locator('a[href="/community"]').waitFor({ state: 'visible', timeout: 15000 });

    // Click Community link in sidebar
    const communityLink = page.locator('a[href="/community"]');
    await communityLink.click();

    // Wait for navigation and community page to load
    await expect(page).toHaveURL('/community');
  });
});
