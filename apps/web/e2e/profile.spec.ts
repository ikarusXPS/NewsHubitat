import { test, expect } from './fixtures';

// These tests run with storageState from auth.setup.ts
// User is already authenticated when tests start

// Run tests serially to avoid race conditions with auth state
test.describe.configure({ mode: 'serial' });

test.describe('Profile Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // storageState from auth.setup.ts already contains auth token and onboarding flag
    // Do NOT use addInitScript here as it would overwrite the auth state
    await page.goto('/profile');
    // Use domcontentloaded to avoid WebSocket timeout issues
    await page.waitForLoadState('domcontentloaded');
    // Wait for the profile header to appear (indicates page is ready)
    await page.locator('h1').filter({ hasText: 'PROFILE' }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should load the Profile page', async ({ page }) => {
    await expect(page).toHaveURL('/profile');

    // Check for PROFILE header (already waited in beforeEach)
    const heading = page.locator('h1').filter({ hasText: 'PROFILE' });
    await expect(heading).toBeVisible();
  });

  test('should display user info section', async ({ page }) => {
    // User info card shows user name in h2
    const userName = page.locator('h2').first();
    await expect(userName).toBeVisible();

    // Email is displayed
    const email = page.locator('text=e2e-test@newshub.test');
    await expect(email).toBeVisible();
  });

  test('should display bookmarks stat', async ({ page }) => {
    // Stats grid shows Bookmarks count
    const bookmarksLabel = page.locator('text=Bookmarks').first();
    await expect(bookmarksLabel).toBeVisible();
  });

  test('should display articles read stat', async ({ page }) => {
    // Stats grid shows Articles Read count
    const articlesLabel = page.locator('text=/Articles Read|Artikel gelesen/i').first();
    await expect(articlesLabel).toBeVisible();
  });

  test('should have quick action buttons', async ({ page }) => {
    // Quick actions section header
    const quickActionsHeader = page.locator('h3').filter({ hasText: 'Quick Actions' });
    await expect(quickActionsHeader).toBeVisible();

    // View Reading History button
    const historyBtn = page.locator('button').filter({ hasText: /Reading History|Verlauf anzeigen/ });
    await expect(historyBtn.first()).toBeVisible();

    // View Bookmarks button
    const bookmarksBtn = page.locator('button').filter({ hasText: 'View Bookmarks' });
    await expect(bookmarksBtn).toBeVisible();

    // Settings button in quick actions (not sidebar)
    const settingsBtn = page.locator('main button').filter({ hasText: 'Settings' });
    await expect(settingsBtn).toBeVisible();
  });

  test('should navigate to Settings via quick action', async ({ page }) => {
    // Use main content area settings button, not sidebar
    const settingsBtn = page.locator('main button').filter({ hasText: 'Settings' });
    await settingsBtn.click();

    await expect(page).toHaveURL('/settings');
  });

  test('should navigate to Bookmarks via quick action', async ({ page }) => {
    const bookmarksBtn = page.locator('button').filter({ hasText: 'View Bookmarks' });
    await bookmarksBtn.click();

    await expect(page).toHaveURL('/bookmarks');
  });

  test('should navigate to History via quick action', async ({ page }) => {
    const historyBtn = page.locator('button').filter({ hasText: /Reading History|Verlauf anzeigen/ });
    await historyBtn.first().click();

    await expect(page).toHaveURL('/history');
  });

  test('should have password change section', async ({ page }) => {
    // Security section header
    const securityHeader = page.locator('h3').filter({ hasText: 'Security' });
    await expect(securityHeader).toBeVisible();

    // Change Password button
    const changePasswordBtn = page.locator('button').filter({ hasText: 'Change Password' });
    await expect(changePasswordBtn).toBeVisible();
  });

  test('should have logout button', async ({ page }) => {
    // Logout button in quick actions section
    const logoutBtn = page.locator('main button').filter({ hasText: 'Logout' });
    await expect(logoutBtn).toBeVisible();
  });

  test('should display authenticated user name', async ({ page }) => {
    // E2E Test User should be visible in the user info card
    const userName = page.locator('h2').filter({ hasText: 'E2E Test User' });
    await expect(userName).toBeVisible();
  });

  test('should show member since date', async ({ page }) => {
    // Member since text appears in user info card
    const memberSince = page.locator('text=/Member since/i');
    await expect(memberSince).toBeVisible();
  });
});
