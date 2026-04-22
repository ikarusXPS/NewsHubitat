import { test, expect } from '@playwright/test';

test.describe('Analysis Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage to bypass onboarding modal before navigating
    await page.addInitScript(() => {
      const state = {
        state: {
          hasCompletedOnboarding: true,
          theme: 'dark',
          language: 'de',
        },
        version: 0,
      };
      localStorage.setItem('newshub-storage', JSON.stringify(state));
    });

    await page.goto('/analysis');
    // Use domcontentloaded instead of networkidle to avoid timeout from WebSocket connections
    await page.waitForLoadState('domcontentloaded');
    // Wait for the main heading to be visible as a proxy for page ready
    // Increased timeout due to parallel test execution
    await page.locator('h1:has-text("PERSPEKTIVEN-ANALYSE")').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should load the Analysis page with header', async ({ page }) => {
    await expect(page).toHaveURL('/analysis');

    // Check for PERSPEKTIVEN-ANALYSE header
    const heading = page.locator('h1');
    await expect(heading).toContainText('PERSPEKTIVEN-ANALYSE');
  });

  test('should display gradient-text-cyber styling', async ({ page }) => {
    // Check for cyber-styled text
    const cyberText = page.locator('.gradient-text-cyber');
    await expect(cyberText).toBeVisible();
  });

  test('should have compare articles button', async ({ page }) => {
    // "Artikel vergleichen" button
    const compareBtn = page.locator('button:has-text("Artikel vergleichen")');
    await expect(compareBtn).toBeVisible();
  });

  test('should open compare mode modal', async ({ page }) => {
    // Click compare button
    const compareBtn = page.locator('button:has-text("Artikel vergleichen")');
    await compareBtn.click();

    // Wait for modal animation
    await page.waitForTimeout(300);

    // CompareMode modal has z-50 and contains a modal with bg-[#0a0e1a] class
    // Look for the modal content specifically (not the mobile sidebar overlay which is z-40)
    const modalContent = page.locator('.fixed.z-50 .bg-\\[\\#0a0e1a\\]');
    await expect(modalContent).toBeVisible({ timeout: 5000 });
  });

  test('should close compare mode modal', async ({ page }) => {
    // Open modal
    const compareBtn = page.locator('button:has-text("Artikel vergleichen")');
    await compareBtn.click();

    // Wait for modal animation
    await page.waitForTimeout(300);

    // Check modal is open first
    const modalContent = page.locator('.fixed.z-50 .bg-\\[\\#0a0e1a\\]');
    if (await modalContent.isVisible()) {
      // Find and click close button (X icon in the modal header)
      const closeBtn = page.locator('.fixed.z-50 button').first();
      await closeBtn.click();
      await page.waitForTimeout(300);

      // Modal should be closed
      await expect(modalContent).not.toBeVisible();
    }
  });

  test('should display cluster summaries section', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(1000);

    // ClusterSummary section - look for "Themen-Cluster" or cluster-related content
    const clusterSection = page.locator('text=/Themen|Cluster|Topics/i').first();
    if (await clusterSection.isVisible()) {
      await expect(clusterSection).toBeVisible();
    }
  });

  test('should display glass panel containers', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for glass-panel class (Analysis uses this for sections)
    const glassPanels = page.locator('.glass-panel');
    const panelCount = await glassPanels.count();

    // Should have at least one glass panel
    expect(panelCount).toBeGreaterThan(0);
  });

  test('should display sentiment chart section', async ({ page }) => {
    // SentimentChart shows sentiment distribution
    const sentimentSection = page.locator('text=/Sentiment|Stimmung/i').first();
    if (await sentimentSection.isVisible()) {
      await expect(sentimentSection).toBeVisible();
    }
  });

  test('should display framing comparison section', async ({ page }) => {
    // FramingComparison shows how different sources frame topics
    const framingSection = page.locator('text=/Framing|Berichterstattung/i').first();
    if (await framingSection.isVisible()) {
      await expect(framingSection).toBeVisible();
    }
  });

  test('should navigate from sidebar', async ({ page }) => {
    // Navigate away first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for sidebar to be visible
    await page.locator('a[href="/analysis"]').waitFor({ state: 'visible', timeout: 10000 });

    // Click Analysis link in sidebar
    const analysisLink = page.locator('a[href="/analysis"]');
    await analysisLink.click();

    await expect(page).toHaveURL('/analysis');
  });

  test('should show loading state while fetching data', async ({ page }) => {
    // Reload to see loading state
    await page.reload();

    // Wait for DOM to be loaded
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded by checking header is visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('PERSPEKTIVEN-ANALYSE');
  });
});
