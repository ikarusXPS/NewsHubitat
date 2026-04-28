/**
 * Subscription Service
 * Handles Stripe subscription operations: checkout sessions, portal sessions, tier sync
 */

import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import { STRIPE_CONFIG, PRICE_TO_TIER, type SubscriptionTier } from '../config/stripe';
import logger from '../utils/logger';

/**
 * Thrown when an action requires the user to have a Stripe customer
 * record but none exists yet (e.g., they never completed checkout).
 * Routes use `instanceof NoStripeCustomerError` to remap to a 400
 * with a friendly message instead of leaking the raw error string.
 *
 * Replaces the previous fragile `message.includes('No Stripe customer')`
 * categorization (see WR-04 in 36.3-REVIEW.md): renaming the message
 * for diagnostics — e.g., adding `userId` — would have silently broken
 * the categorization, demoting the expected 400 into a leaky 500.
 */
export class NoStripeCustomerError extends Error {
  constructor(userId: string) {
    super(`No Stripe customer found for user ${userId}`);
    this.name = 'NoStripeCustomerError';
  }
}

export class SubscriptionService {
  private static instance: SubscriptionService;
  private stripe: Stripe | null;
  private cacheService: CacheService;

  private constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('[SubscriptionService] STRIPE_SECRET_KEY not set - service will be unavailable');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_CONFIG.apiVersion,
      });
      console.log('[SubscriptionService] Initialized with Stripe API');
    }
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Check if service is available (Stripe configured)
   */
  isAvailable(): boolean {
    return !!this.stripe;
  }

  /**
   * Create Stripe Checkout Session for subscription
   * Per CONTEXT.md: Stripe Checkout (hosted), immediate proration, Stripe Tax enabled
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    customerEmail: string
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Check if user already has a Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: user?.stripeCustomerId || undefined,
      customer_email: user?.stripeCustomerId ? undefined : customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      client_reference_id: userId, // Link to internal user
      metadata: { userId }, // Available in webhooks
      automatic_tax: { enabled: true }, // Stripe Tax for EU VAT per CONTEXT.md
      allow_promotion_codes: false, // Deferred per CONTEXT.md
      subscription_data: {
        metadata: { userId },
      },
    });

    logger.info(`[SubscriptionService] Created checkout session for user ${userId}`);
    return session.url!;
  }

  /**
   * Create Stripe Customer Portal session for subscription management
   * Per CONTEXT.md: Hybrid approach - Portal for sensitive actions
   */
  async createPortalSession(userId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new NoStripeCustomerError(userId);
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/settings`,
    });

    logger.info(`[SubscriptionService] Created portal session for user ${userId}`);
    return session.url;
  }

  /**
   * Get user's subscription status from cache or database
   */
  async getSubscriptionStatus(userId: string): Promise<{
    tier: SubscriptionTier;
    status: string;
    endsAt: Date | null;
  }> {
    const cacheKey = `user:subscription:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get<{
      tier: SubscriptionTier;
      status: string;
      endsAt: string | null;
    }>(cacheKey);

    if (cached) {
      return {
        tier: cached.tier,
        status: cached.status,
        endsAt: cached.endsAt ? new Date(cached.endsAt) : null,
      };
    }

    // Fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!user) {
      return { tier: 'FREE', status: 'ACTIVE', endsAt: null };
    }

    const result = {
      tier: (user.subscriptionTier ?? 'FREE') as SubscriptionTier,
      status: user.subscriptionStatus ?? 'ACTIVE',
      endsAt: user.subscriptionEndsAt,
    };

    // Cache for 5 minutes (CACHE_TTL.MEDIUM = 300 seconds)
    await this.cacheService.set(cacheKey, {
      tier: result.tier,
      status: result.status,
      endsAt: result.endsAt?.toISOString() || null,
    }, CACHE_TTL.MEDIUM);

    return result;
  }

  /**
   * Invalidate subscription cache for user
   */
  async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `user:subscription:${userId}`;
    await this.cacheService.del(cacheKey);
  }

  /**
   * Update user subscription from Stripe subscription object
   * Called by webhook handlers
   */
  async updateUserSubscription(
    userId: string,
    subscription: Stripe.Subscription,
    customerId: string
  ): Promise<void> {
    const priceId = subscription.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] || 'PREMIUM';

    const statusMap: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED'> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      paused: 'PAUSED',
      unpaid: 'PAST_DUE',
      incomplete: 'PAST_DUE',
      incomplete_expired: 'CANCELED',
      trialing: 'ACTIVE',
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionTier: tier,
        subscriptionStatus: statusMap[subscription.status] || 'ACTIVE',
        subscriptionEndsAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : new Date(subscription.current_period_end * 1000),
      },
    });

    // Invalidate cache
    await this.invalidateCache(userId);

    logger.info(`[SubscriptionService] Updated subscription for user ${userId}: ${tier}`);
  }

  /**
   * Downgrade user to FREE tier
   * Called when subscription is deleted/canceled
   */
  async downgradeToFree(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'CANCELED',
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
    });

    await this.invalidateCache(userId);
    logger.info(`[SubscriptionService] Downgraded user ${userId} to FREE tier`);
  }

  /**
   * Find user by Stripe subscription ID
   */
  async findUserBySubscriptionId(subscriptionId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });
    return user?.id || null;
  }

  /**
   * Find user by Stripe customer ID
   */
  async findUserByCustomerId(customerId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return user?.id || null;
  }

  /**
   * Get Stripe subscription details
   */
  async getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;

    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      logger.error('[SubscriptionService] Failed to retrieve subscription:', error);
      return null;
    }
  }
}

export default SubscriptionService;
