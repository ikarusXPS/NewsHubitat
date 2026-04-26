/**
 * Stripe Webhook Route
 * CRITICAL: Uses express.raw() for signature verification
 * Must be mounted BEFORE express.json() middleware in server/index.ts
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../../services/stripeWebhookService';
import logger from '../../utils/logger';

const router = Router();

// Initialize Stripe only if configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events
 *
 * IMPORTANT: This route uses express.raw() to preserve the raw body
 * for HMAC signature verification. The JSON body is parsed manually
 * after verification.
 */
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    // Check if Stripe is configured
    if (!stripe || !webhookSecret) {
      logger.error('[Webhook] Stripe not configured');
      res.status(503).json({ error: 'Stripe webhooks not configured' });
      return;
    }

    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.error('[Webhook] Missing stripe-signature header');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    let event: Stripe.Event;
    try {
      // Verify signature using raw body (Buffer)
      event = stripe.webhooks.constructEvent(
        req.body, // Raw buffer, NOT parsed JSON
        signature,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[Webhook] Signature verification failed:', message);
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Process the event
    try {
      await handleStripeWebhook(event);
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error('[Webhook] Processing error:', err);
      // Return 200 to prevent Stripe retries for processing errors
      // (we've already recorded the event in idempotency store)
      res.status(200).json({ received: true, warning: 'Processing error logged' });
    }
  }
);

export default router;
