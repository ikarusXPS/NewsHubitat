/**
 * Email Subscription API Routes
 */

import { Router, Request } from 'express';
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';
import { EmailService } from '../services/emailService';
import { CacheService } from '../services/cacheService';
import { MetricsService } from '../services/metricsService';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';
import type { SendGridEvent, BounceClassification } from '../types/sendgrid';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();
const emailService = EmailService.getInstance();
const cacheService = CacheService.getInstance();
const metricsService = MetricsService.getInstance();

// In-memory storage for subscriptions (replace with DB in production)
const subscriptions = new Map<
  string,
  {
    userId: string;
    email: string;
    frequency: 'daily' | 'weekly' | 'realtime';
    regions: string[];
    topics: string[];
    minSeverity: string;
    isActive: boolean;
    lastSentAt?: Date;
    createdAt: Date;
  }
>();

/**
 * GET /api/email/status
 * Check if email service is available
 */
router.get('/status', async (req, res) => {
  const isAvailable = emailService.isAvailable();
  const verified = isAvailable ? await emailService.verify() : false;

  res.json({
    success: true,
    data: {
      available: isAvailable,
      verified,
    },
  });
});

/**
 * GET /api/email/subscription
 * Get user's email subscription
 */
router.get('/subscription', (req, res) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = (req as AuthenticatedRequest).userId || req.query.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    logger.error('Error fetching subscription:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/email/subscription
 * Create or update email subscription
 */
router.post('/subscription', (req, res) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = (req as AuthenticatedRequest).userId || req.body.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { email, frequency, regions, topics, minSeverity } = req.body;

    if (!email || !frequency) {
      return res.status(400).json({ success: false, error: 'email and frequency required' });
    }

    if (!['daily', 'weekly', 'realtime'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: 'frequency must be daily, weekly, or realtime',
      });
    }

    const subscription = {
      userId,
      email,
      frequency: frequency as 'daily' | 'weekly' | 'realtime',
      regions: regions || [],
      topics: topics || [],
      minSeverity: minSeverity || 'medium',
      isActive: true,
      createdAt: new Date(),
    };

    subscriptions.set(userId, subscription);

    res.json({ success: true, data: subscription });
  } catch (err) {
    logger.error('Error creating subscription:', err);
    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  }
});

/**
 * PUT /api/email/subscription
 * Update email subscription settings
 */
router.put('/subscription', (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId || req.body.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const existing = subscriptions.get(userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const { email, frequency, regions, topics, minSeverity, isActive } = req.body;

    const updated = {
      ...existing,
      ...(email && { email }),
      ...(frequency && { frequency }),
      ...(regions && { regions }),
      ...(topics && { topics }),
      ...(minSeverity && { minSeverity }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    subscriptions.set(userId, updated);

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Error updating subscription:', err);
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

/**
 * DELETE /api/email/subscription
 * Delete email subscription
 */
router.delete('/subscription', (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId || req.query.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const deleted = subscriptions.delete(userId);

    res.json({ success: true, data: { deleted } });
  } catch (err) {
    logger.error('Error deleting subscription:', err);
    res.status(500).json({ success: false, error: 'Failed to delete subscription' });
  }
});

/**
 * POST /api/email/test
 * Send test email (for testing SMTP config)
 */
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email required' });
    }

    if (!emailService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'Email service not configured' });
    }

    const success = await emailService.send(
      email,
      '🧪 NewsHub Test Email',
      `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #00f0ff;">Test Email</h1>
          <p>If you're seeing this, your email configuration is working correctly!</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    );

    if (success) {
      res.json({ success: true, message: 'Test email sent' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send test email' });
    }
  } catch (err) {
    logger.error('Error sending test email:', err);
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

/**
 * POST /api/email/unsubscribe
 * Unsubscribe via token (for email links)
 */
router.post('/unsubscribe', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Unsubscribe token required' });
    }

    // TODO: Validate token and find subscription
    // For now, we'll just return success
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    logger.error('Error unsubscribing:', err);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/email/webhook
 * SendGrid event webhook endpoint (D-08, D-09, D-10)
 * Requires rawBodyParser middleware applied in server/index.ts
 */
router.post('/webhook', async (req, res) => {
  try {
    // D-10: Verify signature
    const signature = req.get(EventWebhookHeader.SIGNATURE());
    const timestamp = req.get(EventWebhookHeader.TIMESTAMP());

    if (!signature || !timestamp) {
      logger.warn('Webhook: Missing signature headers');
      return res.status(400).json({ error: 'Missing signature headers' });
    }

    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    if (!publicKey) {
      logger.error('Webhook: SENDGRID_WEBHOOK_PUBLIC_KEY not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const eventWebhook = new EventWebhook();
    const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);

    // rawBody is set by rawBodyParser middleware
    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    if (!rawBody) {
      logger.error('Webhook: rawBody not available - middleware not applied');
      return res.status(500).json({ error: 'Webhook middleware misconfigured' });
    }

    const isValid = eventWebhook.verifySignature(
      ecPublicKey,
      rawBody,
      signature,
      timestamp
    );

    if (!isValid) {
      logger.warn('Webhook: Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process events
    const events = req.body as SendGridEvent[];

    for (const event of events) {
      // Idempotency check via Redis
      const eventId = event.sg_event_id || `${event.email}-${event.timestamp}`;
      const cacheKey = `webhook:${eventId}`;

      if (await cacheService.get(cacheKey)) {
        logger.debug(`Webhook: Duplicate event ${eventId}, skipping`);
        continue;
      }

      // Mark as processed (24h TTL)
      await cacheService.set(cacheKey, '1', 86400);

      // Route by event type (D-09)
      switch (event.event) {
        case 'bounce':
        case 'dropped':
          await handleBounce(event);
          break;
        case 'spamreport':
        case 'unsubscribe':
          await handleOptOut(event);
          break;
        case 'delivered':
          await handleDelivered(event);
          break;
        default:
          logger.debug(`Webhook: Unhandled event type ${event.event}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook: Processing error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle bounce/dropped events (D-04)
 * Hard bounces: Invalid Address, Content, Reputation, dropped
 * Soft bounces: Technical, Mailbox Unavailable, Frequency/Volume
 */
async function handleBounce(event: SendGridEvent): Promise<void> {
  const hardBounceClassifications: BounceClassification[] = [
    'Invalid Address',
    'Content',
    'Reputation',
  ];

  const isHardBounce =
    event.event === 'dropped' ||
    (event.bounce_classification &&
      hardBounceClassifications.includes(event.bounce_classification));

  if (isHardBounce) {
    try {
      await prisma.user.update({
        where: { email: event.email },
        data: {
          emailBounced: true,
          emailBouncedAt: new Date(),
        },
      });

      metricsService.incrementEmailBounced('unknown', 'hard');
      logger.info(`Webhook: Hard bounce for ${event.email.substring(0, 3)}***`);
    } catch (_err) {
      // User may not exist (external recipient)
      logger.debug(`Webhook: Bounce for non-user ${event.email.substring(0, 3)}***`);
      metricsService.incrementEmailBounced('unknown', 'hard');
    }
  } else {
    // Soft bounce - wait for SendGrid's 72h retry
    logger.info(`Webhook: Soft bounce for ${event.email.substring(0, 3)}***, will retry`);
    metricsService.incrementEmailBounced('unknown', 'soft');
  }
}

/**
 * Handle spam report/unsubscribe events (D-07)
 */
async function handleOptOut(event: SendGridEvent): Promise<void> {
  try {
    await prisma.user.update({
      where: { email: event.email },
      data: {
        emailOptOut: true,
        emailOptOutAt: new Date(),
      },
    });

    metricsService.incrementEmailComplained('unknown');
    logger.info(`Webhook: Opt-out for ${event.email.substring(0, 3)}*** (${event.event})`);
  } catch (_err) {
    // User may not exist
    logger.debug(`Webhook: Opt-out for non-user ${event.email.substring(0, 3)}***`);
    metricsService.incrementEmailComplained('unknown');
  }
}

/**
 * Handle delivered events
 */
async function handleDelivered(event: SendGridEvent): Promise<void> {
  metricsService.incrementEmailDelivered('unknown');
  logger.debug(`Webhook: Delivered to ${event.email.substring(0, 3)}***`);
}

export default router;
