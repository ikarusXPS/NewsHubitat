/**
 * Stripe Webhook Service
 * Handles webhook events with idempotency (Redis+DB per CONTEXT.md)
 */

import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { CacheService, CACHE_TTL } from './cacheService';
import { SubscriptionService } from './subscriptionService';
import logger from '../utils/logger';

const IDEMPOTENCY_TTL = CACHE_TTL.DAY; // 24 hours per CONTEXT.md

/**
 * Extract a Stripe object ID from a field that may be either a string ID
 * or an expanded object (Stripe SDK union type: string | T | null).
 *
 * Avoids the `as string` cast trap: if a request was made with
 * `expand: ['subscription']` (or Stripe ever changes the default
 * representation), the field is an object and `as string` would coerce
 * it to "[object Object]" — silently breaking lookups.
 */
function extractStripeId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/**
 * Process webhook event with idempotency check
 *
 * Uses an "insert-first, run-handler-second" pattern so the unique
 * constraint on ProcessedWebhookEvent.id acts as the cross-process
 * lock against Stripe's at-least-once delivery (concurrent retries).
 *
 * Dual-storage semantics (Phase 36.2):
 *  - Redis is the fast-path cache for "already processed" lookups.
 *  - DB row is the durable source of truth + the lock holder.
 *
 * Failure model:
 *  - Insert P2002 (duplicate) -> another delivery already claimed
 *    this event. Re-cache and return duplicate.
 *  - Handler throws AFTER successful insert -> delete the row so
 *    Stripe's retry can re-process. Without the delete, the event
 *    would be poisoned (marked processed, never replayed) while the
 *    side-effect was never applied.
 */
export async function processWebhookIdempotently(
  eventId: string,
  eventType: string,
  handler: () => Promise<void>
): Promise<{ processed: boolean; duplicate: boolean }> {
  const cacheService = CacheService.getInstance();
  const cacheKey = `webhook:stripe:${eventId}`;

  // Fast path: Redis hit means definitely processed.
  const cached = await cacheService.get<boolean>(cacheKey);
  if (cached) {
    logger.info(`[Webhook] Event ${eventId} already processed (Redis)`);
    return { processed: false, duplicate: true };
  }

  // Acquire the lock by inserting the row. Unique-PK enforces
  // mutual exclusion across concurrent deliveries.
  try {
    await prisma.processedWebhookEvent.create({
      data: { id: eventId, eventType },
    });
  } catch (err) {
    // P2002 = unique constraint violation = another process already
    // claimed this event. Refresh the cache and return duplicate.
    if ((err as { code?: string }).code === 'P2002') {
      await cacheService.set(cacheKey, true, IDEMPOTENCY_TTL);
      logger.info(`[Webhook] Event ${eventId} already processed (DB lock)`);
      return { processed: false, duplicate: true };
    }
    throw err;
  }

  // We hold the lock. Run the handler.
  try {
    await handler();
    await cacheService.set(cacheKey, true, IDEMPOTENCY_TTL);
    logger.info(`[Webhook] Processed event ${eventId} (${eventType})`);
    return { processed: true, duplicate: false };
  } catch (err) {
    // Handler failed AFTER we claimed the lock. Release the row so
    // Stripe's retry can re-process. (Otherwise the event is poisoned
    // and never replays.)
    await prisma.processedWebhookEvent
      .delete({ where: { id: eventId } })
      .catch(() => {
        /* best effort — DB may already be unreachable */
      });
    throw err;
  }
}

/**
 * Main webhook handler - routes events to specific handlers
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  await processWebhookIdempotently(event.id, event.type, async () => {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.debug(`[Webhook] Unhandled event type: ${event.type}`);
    }
  });
}

/**
 * Handle checkout.session.completed
 * Creates initial subscription for user
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) {
    logger.error('[Webhook] checkout.session.completed: No userId found');
    return;
  }

  const subscriptionId = extractStripeId(session.subscription);
  const customerId = extractStripeId(session.customer);

  if (!subscriptionId) {
    logger.error('[Webhook] checkout.session.completed: No subscription ID');
    return;
  }
  if (!customerId) {
    logger.error('[Webhook] checkout.session.completed: No customer ID');
    return;
  }

  // Fetch subscription details
  const subscriptionService = SubscriptionService.getInstance();
  const subscription = await subscriptionService.getStripeSubscription(subscriptionId);

  if (!subscription) {
    logger.error(`[Webhook] Could not fetch subscription ${subscriptionId}`);
    return;
  }

  await subscriptionService.updateUserSubscription(userId, subscription, customerId);
  logger.info(`[Webhook] User ${userId} subscribed via checkout`);

  // TODO: Send welcome email via emailService
}

/**
 * Handle subscription updates (status changes, upgrades/downgrades)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscription.id);

  const customerId = extractStripeId(subscription.customer);
  if (!customerId) {
    logger.warn(`[Webhook] subscription.updated: No customer ID on subscription ${subscription.id}`);
    return;
  }

  if (!userId) {
    // Try to find by customer ID
    const userByCustomer = await subscriptionService.findUserByCustomerId(customerId);

    if (!userByCustomer) {
      logger.warn(`[Webhook] subscription.updated: No user found for subscription ${subscription.id}`);
      return;
    }

    await subscriptionService.updateUserSubscription(userByCustomer, subscription, customerId);
    return;
  }

  await subscriptionService.updateUserSubscription(userId, subscription, customerId);
}

/**
 * Handle subscription deletion (canceled, not renewed)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscription.id);

  if (!userId) {
    logger.warn(`[Webhook] subscription.deleted: No user found for subscription ${subscription.id}`);
    return;
  }

  await subscriptionService.downgradeToFree(userId);
  logger.info(`[Webhook] User ${userId} subscription deleted, downgraded to FREE`);

  // TODO: Send cancellation email via emailService
}

/**
 * Handle successful invoice payment (subscription renewal)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Stripe SDK v22 dropped `subscription` from Invoice's TypeScript types
  // (deprecated in newer API versions, but Stripe still sends it on the
  // 2024-12-18.acacia wire payload our webhook is configured for).
  // Cast through `unknown` so the runtime access stays explicit.
  const rawSubscription = (invoice as unknown as {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  const subscriptionId = extractStripeId(rawSubscription);
  if (!subscriptionId) return;

  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscriptionId);

  if (!userId) {
    logger.warn(`[Webhook] invoice.paid: No user found for subscription ${subscriptionId}`);
    return;
  }

  // Update subscription end date
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: new Date(invoice.period_end * 1000),
    },
  });

  await subscriptionService.invalidateCache(userId);
  logger.info(`[Webhook] User ${userId} subscription renewed until ${new Date(invoice.period_end * 1000).toISOString()}`);
}

/**
 * Handle failed invoice payment
 * Per CONTEXT.md: 7-day grace period, set to PAST_DUE
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // See note in handleInvoicePaid about the SDK-dropped subscription field.
  const rawSubscription = (invoice as unknown as {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  const subscriptionId = extractStripeId(rawSubscription);
  if (!subscriptionId) return;

  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscriptionId);

  if (!userId) {
    logger.warn(`[Webhook] invoice.payment_failed: No user found for subscription ${subscriptionId}`);
    return;
  }

  // Set to PAST_DUE but don't revoke access yet (7-day grace per CONTEXT.md)
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'PAST_DUE',
    },
  });

  await subscriptionService.invalidateCache(userId);
  logger.info(`[Webhook] User ${userId} payment failed, status set to PAST_DUE`);

  // TODO: Send dunning email via emailService
}

/**
 * Handle subscription pause (per CONTEXT.md: max 3 months)
 */
async function handleSubscriptionPaused(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscription.id);

  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'PAUSED',
      pausedUntil: subscription.pause_collection?.resumes_at
        ? new Date(subscription.pause_collection.resumes_at * 1000)
        : null,
    },
  });

  await subscriptionService.invalidateCache(userId);
  logger.info(`[Webhook] User ${userId} subscription paused`);
}

/**
 * Handle subscription resume
 */
async function handleSubscriptionResumed(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionService = SubscriptionService.getInstance();
  const userId = await subscriptionService.findUserBySubscriptionId(subscription.id);

  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'ACTIVE',
      pausedUntil: null,
    },
  });

  await subscriptionService.invalidateCache(userId);
  logger.info(`[Webhook] User ${userId} subscription resumed`);
}
