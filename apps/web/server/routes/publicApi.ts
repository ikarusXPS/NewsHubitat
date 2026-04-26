/**
 * Public API Routes (Phase 35, Plan 03)
 *
 * Versioned public API endpoints for external developer access.
 * All routes require API key authentication via apiKeyAuth middleware.
 *
 * D-05: Version API via URL prefix: /api/v1/public/*
 * D-08: Expose read-only endpoints: news, events, sentiment stats
 */
import { Router, Response } from 'express';
import type { ApiKeyRequest } from '../middleware/apiKeyAuth';
import { NewsAggregator } from '../services/newsAggregator';
import { EventsService } from '../services/eventsService';
import { NEWS_SOURCES } from '../config/sources';
import type { PerspectiveRegion, Sentiment, EventCategory, EventSeverity, TimelineEvent } from '../../src/types';

export const publicApiRoutes = Router();

const eventsService = EventsService.getInstance();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate perspectives based on source regions
 */
function calculatePerspectives(sourceIds: string[]): PerspectiveRegion[] {
  const regions = sourceIds
    .map(id => NEWS_SOURCES.find(s => s.id === id)?.region)
    .filter((region): region is PerspectiveRegion => region !== undefined);
  return [...new Set(regions)];
}

/**
 * Calculate confidence score based on event properties
 */
function calculateConfidence(event: TimelineEvent): number {
  let confidence = 0.5;
  if (event.location) confidence += 0.2;
  if (event.sources.length >= 3) confidence += 0.15;
  else if (event.sources.length >= 2) confidence += 0.1;
  if (event.category !== 'other') confidence += 0.15;
  return Math.min(confidence, 1.0);
}

// =============================================================================
// NEWS ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/public/news - List news articles
 *
 * Query parameters:
 * - regions: Comma-separated regions filter (e.g., "usa,europa")
 * - topics: Comma-separated topics filter
 * - sentiment: positive | negative | neutral
 * - search: Full-text search term
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
publicApiRoutes.get('/news', (req: ApiKeyRequest, res: Response) => {
  try {
    const aggregator = req.app.locals.newsAggregator as NewsAggregator;

    // Parse query parameters
    const regions = req.query.regions
      ? (req.query.regions as string).split(',') as PerspectiveRegion[]
      : undefined;
    const topics = req.query.topics
      ? (req.query.topics as string).split(',')
      : undefined;
    const sentiment = req.query.sentiment as Sentiment | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
    const offset = (page - 1) * limit;

    const { articles, total } = aggregator.getArticles({
      regions,
      topics,
      sentiment,
      search,
      limit,
      offset,
    });

    // Cache for 5 minutes (news changes frequently)
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: articles,
      meta: {
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Public API /news error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles',
    });
  }
});

/**
 * GET /api/v1/public/news/:id - Get single article by ID
 */
publicApiRoutes.get('/news/:id', (req: ApiKeyRequest, res: Response) => {
  try {
    const aggregator = req.app.locals.newsAggregator as NewsAggregator;
    const article = aggregator.getArticleById(req.params.id);

    if (!article) {
      res.status(404).json({
        success: false,
        error: 'Article not found',
      });
      return;
    }

    // Cache for 1 hour (individual articles rarely change)
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Public API /news/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article',
    });
  }
});

// =============================================================================
// EVENTS ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/public/events - List geo-located events
 *
 * Returns events with location data for map visualization.
 * Events are extracted from news articles using AI.
 */
publicApiRoutes.get('/events', (req: ApiKeyRequest, res: Response) => {
  try {
    const aggregator = req.app.locals.newsAggregator as NewsAggregator;
    const { articles } = aggregator.getArticles({ limit: 500 });
    const allEvents = eventsService.extractEventsFromArticles(articles);

    // Filter to only events with location data and transform for API response
    const geoEvents = allEvents
      .filter((event) => event.location !== undefined)
      .map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category as EventCategory,
        severity: (event.severity >= 8 ? 'critical' : event.severity >= 6 ? 'high' : event.severity >= 4 ? 'medium' : 'low') as EventSeverity,
        location: event.location!,
        timestamp: event.date,
        sourceArticles: event.relatedArticles,
        aiExtracted: true,
        confidence: calculateConfidence(event),
        perspectives: calculatePerspectives(event.sources),
      }));

    // Cache for 15 minutes (events update less frequently than news)
    res.set('Cache-Control', 'public, max-age=900');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: geoEvents,
      meta: {
        total: geoEvents.length,
      },
    });
  } catch (error) {
    console.error('Public API /events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/public/sentiment - Get sentiment statistics by region
 *
 * Returns positive/negative/neutral counts per geographic region.
 */
publicApiRoutes.get('/sentiment', (req: ApiKeyRequest, res: Response) => {
  try {
    const aggregator = req.app.locals.newsAggregator as NewsAggregator;
    const rawStats = aggregator.getSentimentByRegion();

    // Transform to array format for API response
    const stats = Object.entries(rawStats).map(([region, counts]) => ({
      region: region as PerspectiveRegion,
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      total: counts.count,
    }));

    // Cache for 10 minutes
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Public API /sentiment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment statistics',
    });
  }
});
