/**
 * Email Subscription API Routes
 */

import { Router, Request } from 'express';
import { EmailService } from '../services/emailService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();
const emailService = EmailService.getInstance();

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

export default router;
