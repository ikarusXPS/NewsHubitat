/**
 * Social Sharing API Routes
 */

import { Router, type Request } from 'express';
import { SharingService, type Platform } from '../services/sharingService';
import { authMiddleware } from '../services/authService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();
const sharingService = SharingService.getInstance();

/**
 * GET /api/share/my
 * Get current user's shares (requires auth)
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const shares = await sharingService.getUserShares(userId);

    // Include analytics for each share
    const sharesWithAnalytics = await Promise.all(
      shares.map(async (share) => {
        const analytics = await sharingService.getAnalytics(share.shareCode);
        return {
          ...share,
          analytics: analytics || { views: share.viewCount, clicks: [], topReferrers: [] },
        };
      })
    );

    res.json({ success: true, data: sharesWithAnalytics });
  } catch (err) {
    logger.error('Error fetching user shares:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch shares' });
  }
});

/**
 * POST /api/share/article
 * Create shareable link for an article
 */
router.post('/article', async (req, res) => {
  try {
    const { article, userId } = req.body;
    if (!article || !article.id || !article.title) {
      return res.status(400).json({ success: false, error: 'Article with id and title required' });
    }

    const urls = await sharingService.shareArticle(article, userId);
    res.json({ success: true, data: urls });
  } catch (err) {
    logger.error('Error creating article share:', err);
    res.status(500).json({ success: false, error: 'Failed to create share' });
  }
});

/**
 * POST /api/share/cluster
 * Create shareable link for cluster analysis
 */
router.post('/cluster', async (req, res) => {
  try {
    const { topic, articleCount, summary, clusterId, userId } = req.body;
    if (!topic || !clusterId) {
      return res.status(400).json({ success: false, error: 'topic and clusterId required' });
    }

    const urls = await sharingService.shareCluster(
      topic,
      articleCount || 0,
      summary || '',
      clusterId,
      userId
    );
    res.json({ success: true, data: urls });
  } catch (err) {
    logger.error('Error creating cluster share:', err);
    res.status(500).json({ success: false, error: 'Failed to create share' });
  }
});

/**
 * POST /api/share/comparison
 * Create shareable link for comparison
 */
router.post('/comparison', async (req, res) => {
  try {
    const { topics, regions, comparisonId, userId } = req.body;
    if (!topics || !regions || !comparisonId) {
      return res.status(400).json({
        success: false,
        error: 'topics, regions, and comparisonId required',
      });
    }

    const urls = await sharingService.shareComparison(topics, regions, comparisonId, userId);
    res.json({ success: true, data: urls });
  } catch (err) {
    logger.error('Error creating comparison share:', err);
    res.status(500).json({ success: false, error: 'Failed to create share' });
  }
});

/**
 * GET /api/share/:code
 * Get shared content by code
 */
router.get('/:code', async (req, res) => {
  try {
    const shared = await sharingService.getByCode(req.params.code);
    if (!shared) {
      return res.status(404).json({ success: false, error: 'Share not found or expired' });
    }

    // Increment view count
    await sharingService.incrementViews(req.params.code);

    // Get share URLs
    const urls = sharingService.getShareUrls(shared.shareCode, shared.title, shared.description);

    res.json({
      success: true,
      data: {
        ...shared,
        urls,
      },
    });
  } catch (err) {
    logger.error('Error fetching share:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch share' });
  }
});

/**
 * GET /api/share/:code/og
 * Get Open Graph meta tags for shared content
 */
router.get('/:code/og', async (req, res) => {
  try {
    const shared = await sharingService.getByCode(req.params.code);
    if (!shared) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    const ogTags = sharingService.getOpenGraphTags(shared);
    res.json({ success: true, data: ogTags });
  } catch (err) {
    logger.error('Error fetching OG tags:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch OG tags' });
  }
});

/**
 * POST /api/share/:code/click
 * Track share click
 */
router.post('/:code/click', async (req, res) => {
  try {
    const shared = await sharingService.getByCode(req.params.code);
    if (!shared) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    const { platform } = req.body;
    if (!platform) {
      return res.status(400).json({ success: false, error: 'platform required' });
    }

    await sharingService.trackClick({
      sharedContentId: shared.id,
      platform: platform as Platform,
      referrer: req.get('Referer'),
      userAgent: req.get('User-Agent'),
      ipHash: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Error tracking click:', err);
    res.status(500).json({ success: false, error: 'Failed to track click' });
  }
});

/**
 * GET /api/share/:code/analytics
 * Get share analytics (requires ownership)
 */
router.get('/:code/analytics', async (req, res) => {
  try {
    const analytics = await sharingService.getAnalytics(req.params.code);
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Share not found' });
    }

    res.json({ success: true, data: analytics });
  } catch (err) {
    logger.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/share/trending
 * Get trending shared content
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const trending = await sharingService.getTrendingShares(limit);
    res.json({ success: true, data: trending });
  } catch (err) {
    logger.error('Error fetching trending:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch trending' });
  }
});

export default router;
