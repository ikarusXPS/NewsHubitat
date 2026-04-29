/**
 * stripeWebhookService Integration Tests
 * Tests webhook event handling with mocked Prisma and real SubscriptionService
 *
 * TDD RED phase: these tests MUST fail before the handler fix is applied.
 * The real SubscriptionService runs; only I/O (Prisma, Cache) is mocked.
 */

// Set required env vars BEFORE any imports
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.APP_URL = 'http://localhost:5173';
process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// Mock Stripe as a class constructor (mirror subscriptionService.test.ts pattern)
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      subscriptions = { retrieve: vi.fn() };
      webhooks = { constructEvent: vi.fn() };
      constructor() {}
    },
  };
});

// Mock Prisma — includes processedWebhookEvent stubs required by processWebhookIdempotently
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    processedWebhookEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock CacheService so processWebhookIdempotently fast-path is disabled (cache miss = run handler)
vi.mock('./cacheService', () => ({
  CacheService: {
    getInstance: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(null), // cache miss — always run handler
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    }),
  },
  CACHE_TTL: {
    FIVE_MINUTES: 300,
    MEDIUM: 300,
    DAY: 86400,
  },
}));

// Mock logger so we can spy on logger.error calls
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// NOTE: SubscriptionService is NOT mocked — real code runs against mocked Prisma.
// This ensures the test exercises the actual handler/service logic.

import { handleStripeWebhook } from './stripeWebhookService';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';
import { SubscriptionService } from './subscriptionService';

// Helper to build a minimal Stripe subscription.created event
function makeSubscriptionCreatedEvent(overrides?: Partial<Stripe.Subscription>): Stripe.Event {
  const subscription: Partial<Stripe.Subscription> = {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    items: {
      object: 'list',
      data: [{ price: { id: 'price_monthly' } } as Stripe.SubscriptionItem],
      has_more: false,
      url: '/v1/subscription_items',
    },
    current_period_end: Math.floor(Date.now() / 1000) + 86400,
    cancel_at: null,
    ...overrides,
  };

  return {
    id: 'evt_test_1',
    type: 'customer.subscription.created',
    data: { object: subscription },
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

describe('handleStripeWebhook — customer.subscription.created', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset SubscriptionService singleton between tests
    (SubscriptionService as unknown as { instance: undefined }).instance = undefined;

    // processWebhookIdempotently: insert succeeds (no duplicate), handler runs
    vi.mocked(prisma.processedWebhookEvent.create).mockResolvedValue({
      id: 'evt_test_1',
      eventType: 'customer.subscription.created',
      processedAt: new Date(),
    } as never);

    // processedWebhookEvent.delete is called on handler failure — default success
    vi.mocked(prisma.processedWebhookEvent.delete).mockResolvedValue({} as never);

    // prisma.user.update should succeed when called by updateUserSubscription
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user_abc',
      subscriptionTier: 'PREMIUM',
    } as never);
  });

  describe('scenario (i) — checkout.session.completed processed first (POST-CHECKOUT REPLAY)', () => {
    it('should complete without error when user is already linked via prior checkout', async () => {
      // User already linked from checkout.session.completed (findUserBySubscriptionId returns user)
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user_abc',
      } as never);

      const mockEvent = makeSubscriptionCreatedEvent();

      // Should not throw
      await expect(handleStripeWebhook(mockEvent)).resolves.not.toThrow();

      // prisma.user.update MUST have been called with the correct userId
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_abc' },
        })
      );

      // logger.error MUST NOT have been called during the invocation
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('scenario (ii) — ISOLATED SUBSCRIPTION.CREATED (no prior checkout)', () => {
    it('should update user via customer lookup when subscription ID not found', async () => {
      // findUserBySubscriptionId returns null (no prior checkout link) on first call
      // findUserByCustomerId finds user on second call
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce(null) // first call: findUserBySubscriptionId
        .mockResolvedValueOnce({ id: 'user_xyz' } as never); // second call: findUserByCustomerId

      const mockEvent = makeSubscriptionCreatedEvent();

      // Should not throw
      await expect(handleStripeWebhook(mockEvent)).resolves.not.toThrow();

      // prisma.user.update MUST have been called with the correct userId
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_xyz' },
        })
      );

      // logger.error MUST NOT have been called during the invocation
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
