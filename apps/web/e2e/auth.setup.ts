import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

// Test credentials - password meets validation requirements:
// min 12 chars, 1 uppercase, 1 lowercase, 1 number
const TEST_EMAIL = 'e2e-test@newshub.test';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'E2E Test User';

setup('authenticate', async ({ page, request }) => {
  // First, ensure test user exists by attempting registration via API
  // This is idempotent - will succeed on first run, fail silently if user exists
  // Use Playwright's request context (not page.evaluate) to avoid navigation race conditions
  try {
    const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
    });
    const registerData = await registerResponse.json();
    console.log('Registration attempt:', { status: registerResponse.status(), ...registerData });
  } catch (err) {
    console.log('Registration attempt failed (user may already exist):', err);
  }

  // Bypass FocusOnboarding modal to access login button
  // Zustand persist format: { state: {...}, version: N }
  await page.addInitScript(() => {
    localStorage.setItem('newshub-storage', JSON.stringify({
      state: {
        hasCompletedOnboarding: true,
        theme: 'dark',
        language: 'en'
      },
      version: 0
    }));
  });

  // Navigate to app
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Wait for Sign In button to be visible
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Anmelden")').first();
  await signInBtn.waitFor({ state: 'visible', timeout: 15000 });

  // Open login modal
  await signInBtn.click();

  // Wait for modal
  await expect(page.locator('input[type="email"]')).toBeVisible();

  // Fill credentials
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Submit
  await page.locator('form button[type="submit"]').click();

  // Wait for successful login - modal closes OR error appears
  // Check both: either modal closes (success) or error message appears (failure)
  const emailInput = page.locator('input[type="email"]');
  const errorMessage = page.locator('text=/fehler|error|ungültig|invalid|incorrect/i');

  // Wait up to 10s for either condition
  const result = await Promise.race([
    emailInput.waitFor({ state: 'hidden', timeout: 10000 }).then(() => 'success'),
    errorMessage.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'error'),
  ]).catch(() => 'timeout');

  if (result === 'error') {
    const errorText = await errorMessage.textContent();
    throw new Error(`Login failed with error: ${errorText}`);
  }

  if (result === 'timeout') {
    throw new Error('Login timeout - modal did not close and no error shown');
  }

  // Save storage state
  await page.context().storageState({ path: authFile });
});
