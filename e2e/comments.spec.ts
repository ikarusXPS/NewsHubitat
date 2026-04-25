import { test, expect } from './fixtures';

/**
 * Comments System E2E Tests
 *
 * Tests run in chromium-auth project (authenticated user) by default.
 * Test 7 explicitly logs out to test unauthenticated state.
 */
test.describe('Comments System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click first article to open article detail view
    // Articles are displayed as cards - look for the article link
    const firstArticle = page.locator('[data-testid="article-card"], .article-card, a[href^="/article/"]').first();

    // If no dedicated article cards, click the "Read More" or article title link
    // The Article page will show article content with comments section below
    if (await firstArticle.count() === 0) {
      // Alternative: look for news cards with links to article detail
      const newsCard = page.locator('.rounded-lg.border.border-gray-700').first();
      await newsCard.click();
    } else {
      await firstArticle.click();
    }

    // Wait for article page or detail view to load
    await page.waitForURL(/.*article.*/);
    await page.waitForLoadState('networkidle');
  });

  test('authenticated user can post a comment', async ({ page }) => {
    // Scroll to comment section
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Type comment
    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');
    await textarea.fill('This is a test comment from E2E');

    // Verify character counter shows current count
    const charCounter = page.locator('text=/\\d+\\s*\\/\\s*5000/');
    await expect(charCounter).toBeVisible();

    // Click Post Comment button
    const postButton = page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")');
    await postButton.click();

    // Verify comment appears (optimistic update)
    await expect(page.locator('text=This is a test comment from E2E')).toBeVisible();

    // Verify textarea cleared after successful post
    await expect(textarea).toHaveValue('');
  });

  test('posted comment appears immediately via optimistic update', async ({ page }) => {
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');
    await textarea.fill('Optimistic update test comment');

    const postButton = page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")');
    await postButton.click();

    // Comment should appear immediately (before server response)
    // Use short timeout to verify optimistic behavior
    await expect(page.locator('text=Optimistic update test comment')).toBeVisible({ timeout: 500 });
  });

  test('user can reply to a comment creating 2-level thread', async ({ page }) => {
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Post root comment first
    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]').first();
    await textarea.fill('Root comment for reply test');
    await page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")').click();
    await page.waitForTimeout(500); // Wait for comment to appear

    // Click Reply button on the comment
    const replyButton = page.locator('button:has-text("Reply"), button:has-text("Antworten")').first();
    await replyButton.click();

    // Reply textarea should appear
    const replyTextarea = page.locator('textarea').nth(1); // Second textarea (reply input)
    await expect(replyTextarea).toBeVisible();
    await replyTextarea.fill('This is a reply');

    // Post reply
    await page.locator('button:has-text("Post"), button:has-text("posten")').nth(1).click();

    // Verify reply appears under root comment (should be indented)
    await expect(page.locator('text=This is a reply')).toBeVisible();
  });

  test('user can edit their own comment within 15 minutes', async ({ page }) => {
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Post comment
    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');
    await textarea.fill('Original comment text');
    await page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")').click();
    await page.waitForTimeout(500);

    // Click Edit button on own comment
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Bearbeiten")').first();
    await editButton.click();

    // Edit textarea should appear with original text
    const editTextarea = page.locator('textarea').nth(1);
    await expect(editTextarea).toBeVisible();

    // Change text
    await editTextarea.fill('Edited comment text');

    // Save edit
    await page.locator('button:has-text("Save"), button:has-text("Speichern")').click();

    // Verify edited text appears
    await expect(page.locator('text=Edited comment text')).toBeVisible();

    // Verify "(edited)" indicator
    await expect(page.locator('text=/\\(edited\\)|\\(bearbeitet\\)/')).toBeVisible();
  });

  test('user can delete their own comment (soft delete)', async ({ page }) => {
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Post comment
    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');
    await textarea.fill('Comment to be deleted');
    await page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")').click();
    await page.waitForTimeout(500);

    // Click Delete button
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Loschen")').first();

    // Set up dialog handler before clicking delete
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await deleteButton.click();

    // Wait for deletion to process
    await page.waitForTimeout(500);

    // Verify comment replaced with placeholder
    await expect(page.locator('text=/\\[Comment deleted\\]|\\[Kommentar geloscht\\]/')).toBeVisible();

    // Verify original text no longer visible
    await expect(page.locator('text=Comment to be deleted')).not.toBeVisible();
  });

  test('character counter shows red when over 5000 characters', async ({ page }) => {
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');

    // Type 5001 characters
    const longText = 'a'.repeat(5001);
    await textarea.fill(longText);

    // Verify character counter shows red color (text-[#ff0044] or similar red)
    const charCounter = page.locator('text=/\\d+\\s*\\/\\s*5000/');
    await expect(charCounter).toBeVisible();

    // Check that counter has red styling
    const counterColor = await charCounter.evaluate(el => getComputedStyle(el).color);
    // Should be red - #ff0044 = rgb(255, 0, 68)
    expect(counterColor).toMatch(/rgb\(255,\s*0,\s*(44|68)\)|rgb\(220,\s*38,\s*38\)/);

    // Verify Post button is disabled
    const postButton = page.locator('button:has-text("Post Comment"), button:has-text("Kommentar posten")');
    await expect(postButton).toBeDisabled();
  });

  test('comment input disabled for unauthenticated users', async ({ page }) => {
    // Clear auth state to become unauthenticated
    await page.evaluate(() => {
      localStorage.removeItem('newshub-auth-token');
      localStorage.removeItem('newshub-auth-user');
    });

    // Navigate to article page again after clearing auth
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click first article
    const firstArticle = page.locator('[data-testid="article-card"], .article-card, a[href^="/article/"]').first();
    if (await firstArticle.count() === 0) {
      const newsCard = page.locator('.rounded-lg.border.border-gray-700').first();
      await newsCard.click();
    } else {
      await firstArticle.click();
    }

    await page.waitForURL(/.*article.*/);
    await page.waitForLoadState('networkidle');

    // Scroll to comment section
    await page.locator('text=Comments').scrollIntoViewIfNeeded();

    // Verify auth gate message shown
    await expect(page.locator('text=/Sign in to join the discussion|Melde dich an, um mitzudiskutieren/')).toBeVisible();

    // Verify comment input textarea NOT visible
    const textarea = page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="Gedanken"]');
    await expect(textarea).not.toBeVisible();
  });
});
