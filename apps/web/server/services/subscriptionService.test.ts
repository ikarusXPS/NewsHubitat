/**
 * SubscriptionService Unit Tests
 * Tests subscription management without hitting Stripe API
 */

// Set required env vars BEFORE any imports
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.APP_URL = 'http://localhost:5173';
process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Stripe as a class constructor
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      }),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        url: 'https://billing.stripe.com/test',
      }),
    },
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: {
        data: [{ price: { id: 'price_test' } }],
      },
    }),
  },
};

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = mockStripeInstance.checkout;
      billingPortal = mockStripeInstance.billingPortal;
      subscriptions = mockStripeInstance.subscriptions;
      constructor() {}
    },
  };
});

// Mock Prisma
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock CacheService
vi.mock('./cacheService', () => ({
  CacheService: {
    getInstance: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
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

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { SubscriptionService } from './subscriptionService';
import { prisma } from '../db/prisma';
import { CacheService } from './cacheService';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for fresh instance
    (SubscriptionService as unknown as { instance: undefined }).instance = undefined;

    subscriptionService = SubscriptionService.getInstance();
  });

  afterEach(() => {
    // Cleanup singleton after each test
    (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SubscriptionService.getInstance();
      const instance2 = SubscriptionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Stripe is configured', () => {
      expect(subscriptionService.isAvailable()).toBe(true);
    });

    it('should return false when Stripe is not configured', () => {
      // Reset singleton and remove secret key
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();
      expect(service.isAvailable()).toBe(false);

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for new customer', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const url = await subscriptionService.createCheckoutSession(
        'user_123',
        'price_monthly',
        'test@example.com'
      );

      expect(url).toBe('https://checkout.stripe.com/test');
    });

    it('should use existing customer ID if available', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: 'cus_existing',
      } as never);

      const url = await subscriptionService.createCheckoutSession(
        'user_123',
        'price_monthly',
        'test@example.com'
      );

      expect(url).toBe('https://checkout.stripe.com/test');
    });

    it('should throw error when Stripe is not configured', async () => {
      // Reset singleton and remove secret key
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();

      await expect(
        service.createCheckoutSession('user_123', 'price_monthly', 'test@example.com')
      ).rejects.toThrow('Stripe not configured');

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe('createPortalSession', () => {
    it('should create portal session for existing customer', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: 'cus_123',
      } as never);

      const url = await subscriptionService.createPortalSession('user_123');

      expect(url).toBe('https://billing.stripe.com/test');
    });

    it('should throw error for user without customer ID', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: null,
      } as never);

      await expect(
        subscriptionService.createPortalSession('user_123')
      ).rejects.toThrow('No Stripe customer found');
    });

    it('should throw error for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        subscriptionService.createPortalSession('user_123')
      ).rejects.toThrow('No Stripe customer found');
    });

    it('should throw error when Stripe is not configured', async () => {
      // Reset singleton and remove secret key
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();

      await expect(
        service.createPortalSession('user_123')
      ).rejects.toThrow('Stripe not configured');

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return cached status if available', async () => {
      const mockCacheService = CacheService.getInstance();
      vi.mocked(mockCacheService.get).mockResolvedValue({
        tier: 'PREMIUM',
        status: 'ACTIVE',
        endsAt: new Date().toISOString(),
      });

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('PREMIUM');
      expect(status.status).toBe('ACTIVE');
    });

    it('should fetch from database if not cached', async () => {
      const mockCacheService = CacheService.getInstance();
      vi.mocked(mockCacheService.get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: null,
      } as never);

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('FREE');
      expect(status.status).toBe('ACTIVE');
      expect(status.endsAt).toBeNull();
    });

    it('should return FREE tier for non-existent user', async () => {
      const mockCacheService = CacheService.getInstance();
      vi.mocked(mockCacheService.get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('FREE');
      expect(status.status).toBe('ACTIVE');
      expect(status.endsAt).toBeNull();
    });

    it('should cache the result after fetching from database', async () => {
      const mockCacheService = CacheService.getInstance();
      vi.mocked(mockCacheService.get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date('2026-05-26'),
      } as never);

      await subscriptionService.getSubscriptionStatus('user_123');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'user:subscription:user_123',
        expect.objectContaining({
          tier: 'PREMIUM',
          status: 'ACTIVE',
        }),
        300 // CACHE_TTL.MEDIUM
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache key for user', async () => {
      const mockCacheService = CacheService.getInstance();

      await subscriptionService.invalidateCache('user_123');

      expect(mockCacheService.del).toHaveBeenCalledWith('user:subscription:user_123');
    });
  });

  describe('downgradeToFree', () => {
    it('should update user to FREE tier', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await subscriptionService.downgradeToFree('user_123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: expect.objectContaining({
          subscriptionTier: 'FREE',
          subscriptionStatus: 'CANCELED',
          stripeSubscriptionId: null,
          subscriptionEndsAt: null,
        }),
      });
    });

    it('should invalidate cache after downgrade', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      const mockCacheService = CacheService.getInstance();

      await subscriptionService.downgradeToFree('user_123');

      expect(mockCacheService.del).toHaveBeenCalledWith('user:subscription:user_123');
    });
  });

  describe('findUserBySubscriptionId', () => {
    it('should return user ID if found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user_123',
      } as never);

      const userId = await subscriptionService.findUserBySubscriptionId('sub_123');

      expect(userId).toBe('user_123');
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const userId = await subscriptionService.findUserBySubscriptionId('sub_123');

      expect(userId).toBeNull();
    });
  });

  describe('findUserByCustomerId', () => {
    it('should return user ID if found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user_456',
      } as never);

      const userId = await subscriptionService.findUserByCustomerId('cus_123');

      expect(userId).toBe('user_456');
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const userId = await subscriptionService.findUserByCustomerId('cus_123');

      expect(userId).toBeNull();
    });
  });

  describe('updateUserSubscription', () => {
    it('should update user with active subscription', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const mockSubscription = {
        id: 'sub_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at: null,
        items: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      } as never;

      await subscriptionService.updateUserSubscription(
        'user_123',
        mockSubscription,
        'cus_123'
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: expect.objectContaining({
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_test',
          subscriptionTier: 'PREMIUM',
          subscriptionStatus: 'ACTIVE',
        }),
      });
    });

    it('should handle past_due status', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const mockSubscription = {
        id: 'sub_test',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at: null,
        items: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      } as never;

      await subscriptionService.updateUserSubscription(
        'user_123',
        mockSubscription,
        'cus_123'
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionStatus: 'PAST_DUE',
          }),
        })
      );
    });

    it('should handle canceled status', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const mockSubscription = {
        id: 'sub_test',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        items: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      } as never;

      await subscriptionService.updateUserSubscription(
        'user_123',
        mockSubscription,
        'cus_123'
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionStatus: 'CANCELED',
          }),
        })
      );
    });

    it('should invalidate cache after update', async () => {
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      const mockCacheService = CacheService.getInstance();

      const mockSubscription = {
        id: 'sub_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000),
        cancel_at: null,
        items: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      } as never;

      await subscriptionService.updateUserSubscription(
        'user_123',
        mockSubscription,
        'cus_123'
      );

      expect(mockCacheService.del).toHaveBeenCalledWith('user:subscription:user_123');
    });
  });

  describe('getStripeSubscription', () => {
    it('should return null when Stripe is not configured', async () => {
      // Reset singleton and remove secret key
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();
      const result = await service.getStripeSubscription('sub_123');

      expect(result).toBeNull();

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });
});
