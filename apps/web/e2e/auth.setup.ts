import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

// Test credentials - password meets validation requirements:
// min 12 chars, 1 uppercase, 1 lowercase, 1 number
const TEST_EMAIL = 'e2e-test@newshub.test';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'E2E Test User';

setup('authenticate', async ({ page, request }) => {
  // Mock /api/focus/suggestions to return an empty list. With many suggestions
  // active, the bottom-right toast stack overflows upward and intercepts pointer
  // events on the header's Sign In button. fixtures.ts applies the same mock
  // for regular tests; auth.setup.ts runs separately and must mock it itself.
  await page.route('**/api/focus/suggestions', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { count: 0, generatedAt: new Date().toISOString() },
      }),
    });
  });

  // Playwright's webServer waits for the frontend (5173) but the backend (3001)
  // starts in parallel via `npm run dev` and isn't always ready when this setup
  // runs. Without a wait, the first registration call hits ECONNREFUSED, the
  // user is never created, and login fails — cascading to ~30 authenticated
  // tests. Poll the backend health endpoint up to 30 s before continuing.
  for (let i = 0; i < 30; i++) {
    try {
      const health = await request.get('http://127.0.0.1:3001/api/health', { timeout: 1000 });
      if (health.ok()) break;
    } catch {
      // backend still booting — retry
    }
    if (i === 29) throw new Error('Backend did not become ready within 30 s');
    await new Promise((r) => setTimeout(r, 1000));
  }

  // First, ensure test user exists by attempting registration via API
  // This is idempotent - will succeed on first run, fail silently if user exists
  // Use Playwright's request context (not page.evaluate) to avoid navigation race conditions
  try {
    const registerResponse = await request.post('http://127.0.0.1:3001/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
    });
    const registerData = await registerResponse.json();
    console.log('Registration attempt:', { status: registerResponse.status(), ...registerData });
  } catch (err) {
    console.log('Registration attempt failed (user may already exist):', err);
  }

  // Bypass blocking modals so the login button is reachable:
  //   - FocusOnboarding (z-90) renders when hasCompletedOnboarding is false (zustand persist)
  //   - ConsentBanner    (z-100) renders when newshub-consent is null
  // Both must be neutralized; otherwise either covers the Sign In button.
  await page.addInitScript(() => {
    localStorage.setItem('newshub-storage', JSON.stringify({
      state: {
        hasCompletedOnboarding: true,
        theme: 'dark',
        language: 'en',
      },
      version: 0,
    }));
    localStorage.setItem('newshub-consent', JSON.stringify({
      essential: true,
      preferences: true,
      analytics: false,
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
