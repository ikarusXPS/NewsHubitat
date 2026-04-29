/**
 * requireTier Middleware Unit Tests
 *
 * Validates the contract documented in CLAUDE.md "Subscription Tiers (Stripe)":
 *  - FREE -> PREMIUM access yields 403 + upgradeUrl
 *  - PAST_DUE keeps access (7-day grace per CLAUDE.md)
 *  - CANCELED / PAUSED hard-block with 403 + upgradeUrl
 *  - hasTier respects FREE < PREMIUM < ENTERPRISE hierarchy
 *  - attachUserTier never enforces (defaults to FREE/ACTIVE when no user)
 *  - invalidateTierCache evicts the user:tier:<userId> key
 *
 * Mocks follow the same pattern as apps/web/server/services/subscriptionService.test.ts:
 *   top-level vi.mock for module paths, then top-level imports, then vi.mocked() to type the stubs.
 *
 * Plan: 36.4-04 / Task 1
 * Implementation under test: ./requireTier.ts (recovered in Plan 36.4-01)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';

// Mock the prisma module — supplies user.findUnique stub.
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock the cacheService module — getInstance returns a configurable cache stub.
vi.mock('../services/cacheService', () => ({
  CacheService: {
    getInstance: vi.fn(),
  },
  CACHE_TTL: {
    MEDIUM: 300,
    FIVE_MINUTES: 300,
    DAY: 86400,
  },
}));

// Imports must come AFTER vi.mock so the mocked modules are wired up at evaluation time.
import {
  requireTier,
  attachUserTier,
  hasTier,
  invalidateTierCache,
  type TierRequest,
} from './requireTier';
import { prisma } from '../db/prisma';
import { CacheService } from '../services/cacheService';

// Build a minimal Response double with chainable status/json mocks.
function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res as Response);
  res.json = vi.fn().mockReturnValue(res as Response);
  return res as Response;
}

// Reusable cache stub with the methods requireTier touches.
function makeCacheStub() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

describe('requireTier middleware', () => {
  let mockNext: NextFunction;
  let mockCache: ReturnType<typeof makeCacheStub>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
    mockCache = makeCacheStub();
    vi.mocked(CacheService.getInstance).mockReturnValue(
      mockCache as unknown as ReturnType<typeof CacheService.getInstance>
    );
  });

  it('returns 403 with upgradeUrl when FREE user requests PREMIUM-only resource', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE',
    } as never);

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        upgradeUrl: '/pricing',
        currentTier: 'FREE',
        requiredTier: 'PREMIUM',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next() and attaches tier when PREMIUM user has ACTIVE status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
    } as never);

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.userTier).toBe('PREMIUM');
    expect(req.userSubscriptionStatus).toBe('ACTIVE');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('grants 7-day grace period for PAST_DUE — calls next() (no 403)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'PAST_DUE',
    } as never);

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.userSubscriptionStatus).toBe('PAST_DUE');
  });

  it('blocks CANCELED status with 403 + upgradeUrl', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'CANCELED',
    } as never);

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        upgradeUrl: '/pricing',
        subscriptionStatus: 'CANCELED',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('blocks PAUSED status with 403 + upgradeUrl', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'PREMIUM',
      subscriptionStatus: 'PAUSED',
    } as never);

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        upgradeUrl: '/pricing',
        subscriptionStatus: 'PAUSED',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is undefined', async () => {
    const req = {} as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when DB has no user record for the authenticated userId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = { user: { userId: 'u-missing', email: 'g@h.i' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('uses cached tier without hitting prisma when cache is warm', async () => {
    mockCache.get.mockResolvedValueOnce({ tier: 'PREMIUM', status: 'ACTIVE' });

    const req = { user: { userId: 'u1', email: 'a@b.c' } } as TierRequest;
    const res = makeRes();

    await requireTier('PREMIUM')(req, res, mockNext);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.userTier).toBe('PREMIUM');
  });
});

describe('attachUserTier middleware', () => {
  let mockNext: NextFunction;
  let mockCache: ReturnType<typeof makeCacheStub>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
    mockCache = makeCacheStub();
    vi.mocked(CacheService.getInstance).mockReturnValue(
      mockCache as unknown as ReturnType<typeof CacheService.getInstance>
    );
  });

  it('defaults to FREE/ACTIVE and calls next() when req.user is undefined', async () => {
    const req = {} as TierRequest;
    const res = makeRes();

    await attachUserTier(req, res, mockNext);

    expect(req.userTier).toBe('FREE');
    expect(req.userSubscriptionStatus).toBe('ACTIVE');
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('attaches the actual tier from prisma when req.user is present (cache miss)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
    } as never);

    const req = { user: { userId: 'u9', email: 'e@e.e' } } as TierRequest;
    const res = makeRes();

    await attachUserTier(req, res, mockNext);

    expect(req.userTier).toBe('ENTERPRISE');
    expect(req.userSubscriptionStatus).toBe('ACTIVE');
    expect(mockNext).toHaveBeenCalledTimes(1);
    // Non-enforcing: never sends a response.
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('hasTier helper', () => {
  it('PREMIUM >= FREE returns true', () => {
    expect(hasTier('PREMIUM', 'FREE')).toBe(true);
  });

  it('FREE >= PREMIUM returns false', () => {
    expect(hasTier('FREE', 'PREMIUM')).toBe(false);
  });

  it('ENTERPRISE >= PREMIUM returns true', () => {
    expect(hasTier('ENTERPRISE', 'PREMIUM')).toBe(true);
  });

  it('FREE >= FREE returns true (equal-tier check)', () => {
    expect(hasTier('FREE', 'FREE')).toBe(true);
  });
});

describe('invalidateTierCache', () => {
  it('calls cacheService.del with user:tier:<userId> key', async () => {
    const cache = makeCacheStub();
    vi.mocked(CacheService.getInstance).mockReturnValue(
      cache as unknown as ReturnType<typeof CacheService.getInstance>
    );

    await invalidateTierCache('user-123');

    expect(cache.del).toHaveBeenCalledWith('user:tier:user-123');
    expect(cache.del).toHaveBeenCalledTimes(1);
  });
});
