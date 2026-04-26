/**
 * SubscriptionService Unit Tests
 * Tests subscription management without hitting Stripe API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionService } from './subscriptionService';

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
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
  })),
}));

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
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for fresh instance
    (SubscriptionService as unknown as { instance: undefined }).instance = undefined;

    // Set required env vars
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.APP_URL = 'http://localhost:5173';
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ID_ANNUAL = 'price_annual';

    subscriptionService = SubscriptionService.getInstance();
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.APP_URL;
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
      // Reset singleton
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for new customer', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const url = await subscriptionService.createCheckoutSession(
        'user_123',
        'price_monthly',
        'test@example.com'
      );

      expect(url).toBe('https://checkout.stripe.com/test');
    });

    it('should use existing customer ID if available', async () => {
      const { prisma } = await import('../db/prisma');
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
      // Reset and create service without Stripe
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();

      await expect(
        service.createCheckoutSession('user_123', 'price_monthly', 'test@example.com')
      ).rejects.toThrow('Stripe not configured');
    });
  });

  describe('createPortalSession', () => {
    it('should create portal session for existing customer', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: 'cus_123',
      } as never);

      const url = await subscriptionService.createPortalSession('user_123');

      expect(url).toBe('https://billing.stripe.com/test');
    });

    it('should throw error for user without customer ID', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: null,
      } as never);

      await expect(
        subscriptionService.createPortalSession('user_123')
      ).rejects.toThrow('No Stripe customer found');
    });

    it('should throw error for non-existent user', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        subscriptionService.createPortalSession('user_123')
      ).rejects.toThrow('No Stripe customer found');
    });

    it('should throw error when Stripe is not configured', async () => {
      // Reset and create service without Stripe
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();

      await expect(service.createPortalSession('user_123')).rejects.toThrow(
        'Stripe not configured'
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return cached status if available', async () => {
      const { CacheService } = await import('./cacheService');
      vi.mocked(CacheService.getInstance().get).mockResolvedValue({
        tier: 'PREMIUM',
        status: 'ACTIVE',
        endsAt: new Date().toISOString(),
      });

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('PREMIUM');
      expect(status.status).toBe('ACTIVE');
    });

    it('should fetch from database if not cached', async () => {
      const { prisma } = await import('../db/prisma');
      const { CacheService } = await import('./cacheService');

      vi.mocked(CacheService.getInstance().get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: null,
      } as never);

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('FREE');
      expect(status.status).toBe('ACTIVE');
    });

    it('should return FREE tier for non-existent user', async () => {
      const { prisma } = await import('../db/prisma');
      const { CacheService } = await import('./cacheService');

      vi.mocked(CacheService.getInstance().get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const status = await subscriptionService.getSubscriptionStatus('user_123');

      expect(status.tier).toBe('FREE');
    });

    it('should cache subscription status after fetching from database', async () => {
      const { prisma } = await import('../db/prisma');
      const { CacheService } = await import('./cacheService');

      vi.mocked(CacheService.getInstance().get).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date(),
      } as never);

      await subscriptionService.getSubscriptionStatus('user_123');

      expect(CacheService.getInstance().set).toHaveBeenCalledWith(
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
    it('should delete cache for user', async () => {
      const { CacheService } = await import('./cacheService');

      await subscriptionService.invalidateCache('user_123');

      expect(CacheService.getInstance().del).toHaveBeenCalledWith(
        'user:subscription:user_123'
      );
    });
  });

  describe('downgradeToFree', () => {
    it('should update user to FREE tier', async () => {
      const { prisma } = await import('../db/prisma');
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
      const { prisma } = await import('../db/prisma');
      const { CacheService } = await import('./cacheService');

      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await subscriptionService.downgradeToFree('user_123');

      expect(CacheService.getInstance().del).toHaveBeenCalledWith(
        'user:subscription:user_123'
      );
    });
  });

  describe('findUserBySubscriptionId', () => {
    it('should return user ID if found', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user_123',
      } as never);

      const userId = await subscriptionService.findUserBySubscriptionId('sub_123');

      expect(userId).toBe('user_123');
    });

    it('should return null if not found', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const userId = await subscriptionService.findUserBySubscriptionId('sub_123');

      expect(userId).toBeNull();
    });
  });

  describe('findUserByCustomerId', () => {
    it('should return user ID if found', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'user_123',
      } as never);

      const userId = await subscriptionService.findUserByCustomerId('cus_123');

      expect(userId).toBe('user_123');
    });

    it('should return null if not found', async () => {
      const { prisma } = await import('../db/prisma');
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const userId = await subscriptionService.findUserByCustomerId('cus_123');

      expect(userId).toBeNull();
    });
  });

  describe('getStripeSubscription', () => {
    it('should return null when Stripe is not configured', async () => {
      // Reset and create service without Stripe
      (SubscriptionService as unknown as { instance: undefined }).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const service = SubscriptionService.getInstance();
      const result = await service.getStripeSubscription('sub_123');

      expect(result).toBeNull();
    });
  });
});
