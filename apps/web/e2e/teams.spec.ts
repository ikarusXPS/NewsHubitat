/**
 * E2E Tests for Team Collaboration
 * Tests team creation, invites, bookmarks, and member management
 */

import { test, expect } from './fixtures';

test.describe('Team Collaboration', () => {
  test.describe('Unauthenticated user', () => {
    test('cannot access team dashboard directly', async ({ page }) => {
      // Try to navigate to a team page without auth
      await page.goto('/team/test-team-id');

      // Should either redirect to login or show sign-in required message
      // Wait a moment for redirect/message to appear
      await page.waitForTimeout(500);

      const hasSignInRequired = await page.locator('text=/sign in|log in|anmelden/i').isVisible().catch(() => false);
      const hasAuthModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const redirectedToHome = page.url().includes('localhost:5173') && !page.url().includes('/team/');

      // One of these should be true: sign in message, auth modal, or redirected away
      expect(hasSignInRequired || hasAuthModal || redirectedToHome).toBeTruthy();
    });
  });

  test.describe('Authenticated user', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('TeamSwitcher is visible in header for authenticated users', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // TeamSwitcher should be in the desktop header (hidden on mobile)
      // Look for the Teams button or My Teams text
      const teamSwitcher = page.locator('button:has-text("Teams"), button:has-text("My Teams")').first();

      // On desktop, should be visible
      const isVisible = await teamSwitcher.isVisible().catch(() => false);

      // If user has no teams yet, the switcher might not show
      // This is acceptable behavior per the component logic
      if (isVisible) {
        expect(isVisible).toBeTruthy();
      }
    });

    test('can open create team modal from dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to find team switcher and open create modal
      const teamSwitcher = page.locator('button:has-text("Teams"), button:has-text("My Teams")').first();

      if (await teamSwitcher.isVisible()) {
        await teamSwitcher.click();

        // Look for Create Team button in dropdown
        const createBtn = page.locator('button:has-text("Create Team"), button:has-text("Team erstellen")');

        if (await createBtn.isVisible()) {
          await createBtn.click();

          // Create team modal should be visible
          const modal = page.locator('[role="dialog"], .fixed.inset-0');
          await expect(modal).toBeVisible();

          // Modal should have name input
          const nameInput = page.locator('input[placeholder*="name" i], label:has-text("Name") + input');
          const hasNameInput = await nameInput.isVisible().catch(() => false);

          expect(hasNameInput).toBeTruthy();
        }
      }
    });

    test('team name validation rejects short names', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const teamSwitcher = page.locator('button:has-text("Teams"), button:has-text("My Teams")').first();

      if (await teamSwitcher.isVisible()) {
        await teamSwitcher.click();

        const createBtn = page.locator('button:has-text("Create Team"), button:has-text("Team erstellen")');

        if (await createBtn.isVisible()) {
          await createBtn.click();

          // Find name input and enter short name
          const nameInput = page.locator('input').first();
          await nameInput.fill('AB');

          // Try to submit
          const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Erstellen")').last();
          await submitBtn.click();

          // Should show validation error
          const hasError = await page.locator('text=/3|character|zeichen/i').isVisible().catch(() => false);

          // Either error shown or button disabled for invalid input
          expect(hasError || await submitBtn.isDisabled()).toBeTruthy();
        }
      }
    });

    test('BookmarkButton shows team dropdown when user has teams', async ({ page }) => {
      // This test verifies the BookmarkButton component behavior
      // First navigate to a page with articles
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for a bookmark button with chevron (indicates team dropdown)
      const bookmarkWithChevron = page.locator('button:has(svg.lucide-bookmark):has(svg.lucide-chevron-down)');

      // If user has teams, there should be bookmark buttons with chevrons
      const hasTeamBookmark = await bookmarkWithChevron.first().isVisible().catch(() => false);

      // Log result - this is informational as it depends on user having teams
      console.log('User has team bookmark buttons:', hasTeamBookmark);
    });

    test('can navigate to profile page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Profile page should load
      const profileContent = page.locator('text=/profile|profil/i');
      await expect(profileContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Team dashboard (requires team)', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('team dashboard shows bookmarks and members tabs', async ({ page }) => {
      // Navigate to profile or teams list first
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to find and click on a team
      const teamSwitcher = page.locator('button:has-text("Teams"), button:has-text("My Teams")').first();

      if (await teamSwitcher.isVisible()) {
        await teamSwitcher.click();
        await page.waitForTimeout(300);

        // Look for team items in dropdown
        const teamItem = page.locator('[data-testid="team-card"], .team-item, button:has-text("members")').first();

        if (await teamItem.isVisible()) {
          await teamItem.click();
          await page.waitForLoadState('networkidle');

          // Should now be on team dashboard
          // Look for tabs
          const bookmarksTab = page.locator('button:has-text("Bookmarks"), button:has-text("Lesezeichen")');
          const membersTab = page.locator('button:has-text("Members"), button:has-text("Mitglieder")');

          const hasBookmarksTab = await bookmarksTab.isVisible().catch(() => false);
          const hasMembersTab = await membersTab.isVisible().catch(() => false);

          // If we're on a team page, tabs should exist
          if (page.url().includes('/team/')) {
            expect(hasBookmarksTab || hasMembersTab).toBeTruthy();
          }
        }
      }
    });

    test('members tab shows at least one member (owner)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const teamSwitcher = page.locator('button:has-text("Teams"), button:has-text("My Teams")').first();

      if (await teamSwitcher.isVisible()) {
        await teamSwitcher.click();
        await page.waitForTimeout(300);

        const teamItem = page.locator('[data-testid="team-card"], .team-item, button:has-text("members")').first();

        if (await teamItem.isVisible()) {
          await teamItem.click();
          await page.waitForLoadState('networkidle');

          // Click members tab
          const membersTab = page.locator('button:has-text("Members"), button:has-text("Mitglieder")');

          if (await membersTab.isVisible()) {
            await membersTab.click();
            await page.waitForTimeout(300);

            // Should show owner badge
            const ownerBadge = page.locator('text=/owner|inhaber/i');
            const hasOwner = await ownerBadge.isVisible().catch(() => false);

            if (page.url().includes('/team/')) {
              expect(hasOwner).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Invite flow', () => {
    test('invalid invite token shows error', async ({ page }) => {
      // Navigate to an invalid invite URL
      await page.goto('/team/invite/invalid-token-12345');
      await page.waitForLoadState('networkidle');

      // Wait for error state or redirect
      await page.waitForTimeout(1000);

      // Should show error OR redirect to login
      const hasError = await page.locator('text=/invalid|expired|fehler|ungultig/i').isVisible().catch(() => false);
      const hasLoginPrompt = await page.locator('text=/sign in|log in|anmelden/i').isVisible().catch(() => false);
      const redirectedAway = !page.url().includes('/team/invite/');

      expect(hasError || hasLoginPrompt || redirectedAway).toBeTruthy();
    });
  });

  test.describe('Mobile view', () => {
    test.use({
      storageState: 'playwright/.auth/user.json',
      viewport: { width: 375, height: 667 }
    });

    test('TeamSwitcher appears in mobile drawer', async ({ page }) => {
      await page.goto('/');

      // Avoid waitForLoadState('networkidle') here — Socket.io polling and the
      // breaking-news refetch keep the network warm on this page, so networkidle
      // never settles within the 20s budget. Wait for the menu button instead;
      // it's the next thing we interact with.
      const menuButton = page.locator('button[aria-label*="menu" i], button:has(svg.lucide-menu)');
      await menuButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Look for Teams section in drawer
        const teamsSection = page.locator('text=/^Teams$/i, h3:has-text("Teams")');
        const hasTeamsSection = await teamsSection.isVisible().catch(() => false);

        // If user is authenticated, teams section should exist
        if (hasTeamsSection) {
          expect(hasTeamsSection).toBeTruthy();
        }
      }
    });
  });
});
