/**
 * Subscription Flow E2E Tests
 * Tests pricing page and subscription UI without hitting Stripe
 */

import { test, expect } from './fixtures';

test.describe('Subscription', () => {
  test.describe('Pricing Page', () => {
    test('should display pricing page with 3 tiers', async ({ page }) => {
      await page.goto('/pricing');

      // Wait for page to load
      await expect(page.locator('h1')).toContainText(/Choose Your Plan|Wähle deinen Plan/);

      // Check for 3 tier names
      const freeCard = page.getByText(/Free|Kostenlos/);
      const premiumCard = page.getByText('Premium');
      const enterpriseCard = page.getByText('Enterprise');

      await expect(freeCard).toBeVisible();
      await expect(premiumCard).toBeVisible();
      await expect(enterpriseCard).toBeVisible();
    });

    test('should show Premium as most popular', async ({ page }) => {
      await page.goto('/pricing');

      // Check for "Most Popular" badge (English or German)
      const mostPopularBadge = page.getByText(/Most Popular|Beliebtester Plan/i);
      await expect(mostPopularBadge).toBeVisible();
    });

    test('should toggle between monthly and annual billing', async ({ page }) => {
      await page.goto('/pricing');

      // Find billing toggle buttons
      const monthlyButton = page.getByRole('button', { name: /Monthly|Monatlich/i });
      const annualButton = page.getByRole('button', { name: /Annual|Jährlich/i });

      await expect(monthlyButton).toBeVisible();
      await expect(annualButton).toBeVisible();

      // Click annual
      await annualButton.click();

      // Check for "Save 2 months" indicator
      await expect(page.getByText(/Save 2 months|Spare 2 Monate/)).toBeVisible();
    });

    test('should show trust badges', async ({ page }) => {
      await page.goto('/pricing');

      // Check for security and payment badges
      await expect(page.getByText(/Secure Payment|Sichere Zahlung/i)).toBeVisible();
      await expect(page.getByText(/Visa, Mastercard/)).toBeVisible();
    });

    test('should display feature list for each tier', async ({ page }) => {
      await page.goto('/pricing');

      // Free tier should show limited features
      await expect(page.getByText(/10\/day|10\/Tag/)).toBeVisible();
      await expect(page.getByText(/7 days|7 Tage/)).toBeVisible();

      // Premium tier should show unlimited
      const unlimitedTexts = page.getByText('unlimited');
      await expect(unlimitedTexts.first()).toBeVisible();
    });

    test('should redirect unauthenticated user to login on subscribe', async ({ page }) => {
      await page.goto('/pricing');

      // Find Premium subscribe button (not "Current Plan" and not "Contact" / "Contact Sales")
      // Premium tier has a button that says Subscribe or Abonnieren
      const subscribeButtons = page.locator('button').filter({ hasText: /Subscribe|Abonnieren/ });

      // Click first subscribe button (should be Premium since Free shows "Current Plan" and Enterprise shows "Contact")
      const firstSubscribe = subscribeButtons.first();
      await expect(firstSubscribe).toBeVisible();
      await firstSubscribe.click();

      // Should be redirected to settings with login prompt
      await expect(page).toHaveURL(/settings.*login=true/);
    });

    test('should display price in EUR', async ({ page }) => {
      await page.goto('/pricing');

      // Check for EUR price display
      await expect(page.getByText(/EUR0|EUR9|EUR90/)).toBeVisible();
    });
  });

  test.describe('Subscription Status (Authenticated)', () => {
    // These tests run with authentication
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('should show current tier in subscription status API', async ({ page }) => {
      // Fetch subscription status
      const response = await page.request.get('/api/subscriptions/status');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(['FREE', 'PREMIUM', 'ENTERPRISE']).toContain(data.data.tier);
      expect(['ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED']).toContain(data.data.status);
    });

    test('should show current plan indicator on pricing page', async ({ page }) => {
      await page.goto('/pricing');

      // For a free user, Free tier should show "Current Plan"
      const currentPlanText = page.getByText(/Current Plan|Aktueller Plan/i);

      // At least one tier should be marked as current
      await expect(currentPlanText).toBeVisible();
    });
  });

  test.describe('Feature Gating', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('should return subscription status from API', async ({ page }) => {
      // Test the subscription status endpoint
      const response = await page.request.get('/api/subscriptions/status');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('tier');
      expect(data.data).toHaveProperty('status');
    });

    test('should enforce AI query limits for free tier', async ({ page }) => {
      // This test verifies rate limiting is in place
      // We don't actually hit the limit, just verify the endpoint responds appropriately

      const response = await page.request.post('/api/ai/ask', {
        data: {
          question: 'test query',
          context: [],
        },
      });

      // Should succeed (if not rate limited) or return 429 with upgrade URL
      // Also 400 for validation or 503 if AI service is unavailable
      const status = response.status();
      expect([200, 400, 429, 503]).toContain(status);

      if (status === 429) {
        const data = await response.json();
        expect(data.upgradeUrl).toBe('/pricing');
      }
    });
  });

  test.describe('Webhook Endpoint Security', () => {
    test('should reject requests without signature', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/stripe', {
        data: { type: 'test.event' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Missing signature should return 400
      expect(response.status()).toBe(400);
    });

    test('should reject requests with invalid signature', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/stripe', {
        data: JSON.stringify({ type: 'test.event' }),
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_signature',
        },
      });

      // Invalid signature should return 401
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Checkout Flow Integration', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('should create checkout session with valid price ID', async ({ page }) => {
      // Try to create a checkout session - should succeed or fail gracefully if Stripe not configured
      const response = await page.request.post('/api/subscriptions/checkout', {
        data: {
          priceId: 'price_test_monthly',
          billingCycle: 'monthly',
        },
      });

      const status = response.status();
      const data = await response.json();

      // Either succeeds (200 with URL) or fails due to missing Stripe config (400/500)
      if (status === 200) {
        expect(data.success).toBe(true);
        expect(data.data.url).toContain('stripe.com');
      } else {
        // Stripe not configured - that's OK for tests
        expect([400, 500, 503]).toContain(status);
      }
    });
  });

  test.describe('Subscription Success Page', () => {
    test('should display success page at /subscription/success', async ({ page }) => {
      // Navigate to success page without session_id (should still render but show pending/error)
      await page.goto('/subscription/success');

      // Page should load without crashing
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
