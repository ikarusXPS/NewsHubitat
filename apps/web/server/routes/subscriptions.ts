/**
 * Subscription API Routes
 * Endpoints for checkout sessions, portal sessions, and subscription status
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { SubscriptionService } from '../services/subscriptionService';
import { STRIPE_CONFIG } from '../config/stripe';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID required'),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// Whitelist of valid price IDs (security: prevent arbitrary price injection)
function isValidPriceId(priceId: string): boolean {
  const validPriceIds = [
    STRIPE_CONFIG.priceIds.monthly,
    STRIPE_CONFIG.priceIds.annual,
  ].filter(Boolean);

  return validPriceIds.includes(priceId);
}

// ============================================================================
// CHECKOUT ENDPOINTS
// ============================================================================

/**
 * POST /api/subscriptions/checkout
 * Create Stripe Checkout session and return URL
 */
router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = checkoutSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const userId = req.user!.userId;
    const email = req.user!.email;
    const { priceId, billingCycle } = result.data;

    // Determine price ID from billing cycle if not provided directly
    const finalPriceId = priceId || (billingCycle === 'annual'
      ? STRIPE_CONFIG.priceIds.annual
      : STRIPE_CONFIG.priceIds.monthly);

    // Validate price ID against whitelist (T-36-01 mitigation)
    if (!isValidPriceId(finalPriceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid price ID',
      });
      return;
    }

    const subscriptionService = SubscriptionService.getInstance();

    if (!subscriptionService.isAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Subscription service unavailable',
      });
      return;
    }

    const checkoutUrl = await subscriptionService.createCheckoutSession(
      userId,
      finalPriceId,
      email
    );

    res.status(200).json({
      success: true,
      data: { url: checkoutUrl },
    });
  } catch (err) {
    // Log full error server-side; return generic message to client
    // (per security checklist: no internal error text in API responses).
    logger.error('[subscriptions.checkout] failed', {
      userId: req.user?.userId,
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
    });
  }
});

/**
 * POST /api/subscriptions/portal
 * Create Stripe Customer Portal session and return URL
 */
router.post('/portal', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const subscriptionService = SubscriptionService.getInstance();

    if (!subscriptionService.isAvailable()) {
      res.status(503).json({
        success: false,
        error: 'Subscription service unavailable',
      });
      return;
    }

    const portalUrl = await subscriptionService.createPortalSession(userId);

    res.status(200).json({
      success: true,
      data: { url: portalUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';

    // Sentinel: user has no Stripe customer yet -> 400 with friendly text.
    // (WR-04 may replace this string-match with a typed error class.)
    if (message.includes('No Stripe customer')) {
      res.status(400).json({
        success: false,
        error: 'No active subscription found',
      });
      return;
    }

    // Generic 500 — log full error, return generic message (CR-03).
    logger.error('[subscriptions.portal] failed', {
      userId: req.user?.userId,
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session',
    });
  }
});

/**
 * GET /api/subscriptions/status
 * Get current subscription status
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const subscriptionService = SubscriptionService.getInstance();

    const status = await subscriptionService.getSubscriptionStatus(userId);

    res.status(200).json({
      success: true,
      data: {
        tier: status.tier,
        status: status.status,
        endsAt: status.endsAt?.toISOString() || null,
      },
    });
  } catch (err) {
    // Log full error server-side; return generic message to client (CR-03).
    logger.error('[subscriptions.status] failed', {
      userId: req.user?.userId,
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status',
    });
  }
});

export default router;
