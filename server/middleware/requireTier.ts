/**
 * Subscription Tier Authorization Middleware
 * Server-side feature gating by subscription tier
 * Per CONTEXT.md: Server-side only (secure), enum field on User model
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from '../services/cacheService';

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED';

export interface TierRequest extends Request {
  user?: { userId: string; email: string };
  userTier?: SubscriptionTier;
  userSubscriptionStatus?: SubscriptionStatus;
}

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

/**
 * Middleware factory: Require minimum subscription tier
 * Returns 403 if user's tier is below required tier or subscription not active
 */
export function requireTier(minTier: SubscriptionTier) {
  return async (req: TierRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const cacheService = CacheService.getInstance();
    const cacheKey = `user:tier:${req.user.userId}`;

    // Try cache first for performance
    let cached = await cacheService.get<{
      tier: SubscriptionTier;
      status: SubscriptionStatus;
    }>(cacheKey);

    if (!cached) {
      // Fetch from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      cached = {
        tier: user.subscriptionTier as SubscriptionTier,
        status: user.subscriptionStatus as SubscriptionStatus,
      };

      // Cache for 5 minutes (CACHE_TTL.MEDIUM)
      await cacheService.set(cacheKey, cached, CACHE_TTL.MEDIUM);
    }

    // Check status is active (not past_due, canceled, paused)
    // Per CONTEXT.md: 7-day grace period for PAST_DUE, but still allow access
    if (cached.status === 'CANCELED' || cached.status === 'PAUSED') {
      res.status(403).json({
        success: false,
        error: 'Active subscription required',
        subscriptionStatus: cached.status,
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Check tier hierarchy
    const userTierLevel = TIER_HIERARCHY[cached.tier];
    const requiredLevel = TIER_HIERARCHY[minTier];

    if (userTierLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: `${minTier} subscription required`,
        currentTier: cached.tier,
        requiredTier: minTier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Attach tier info to request for downstream use
    req.userTier = cached.tier;
    req.userSubscriptionStatus = cached.status;

    next();
  };
}

/**
 * Middleware: Attach user tier to request without enforcing
 * Used when tier affects behavior but doesn't block access
 */
export async function attachUserTier(
  req: TierRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    req.userTier = 'FREE';
    req.userSubscriptionStatus = 'ACTIVE';
    next();
    return;
  }

  const cacheService = CacheService.getInstance();
  const cacheKey = `user:tier:${req.user.userId}`;

  let cached = await cacheService.get<{
    tier: SubscriptionTier;
    status: SubscriptionStatus;
  }>(cacheKey);

  if (!cached) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    cached = {
      tier: (user?.subscriptionTier as SubscriptionTier) || 'FREE',
      status: (user?.subscriptionStatus as SubscriptionStatus) || 'ACTIVE',
    };

    await cacheService.set(cacheKey, cached, CACHE_TTL.MEDIUM);
  }

  req.userTier = cached.tier;
  req.userSubscriptionStatus = cached.status;
  next();
}

/**
 * Check if user has a specific tier (for conditional logic)
 */
export function hasTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Invalidate tier cache for user (called after subscription changes)
 */
export async function invalidateTierCache(userId: string): Promise<void> {
  const cacheService = CacheService.getInstance();
  await cacheService.del(`user:tier:${userId}`);
}
