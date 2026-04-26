import { Router, Request, Response } from 'express';
import type { PerspectiveRegion, Sentiment } from '../../src/types';
import type { NewsAggregator } from '../services/newsAggregator';

export const newsRoutes = Router();

newsRoutes.get('/', (req: Request, res: Response) => {
  console.log('[DEBUG] GET /api/news - Request received');
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;

  const regions = req.query.regions
    ? (req.query.regions as string).split(',') as PerspectiveRegion[]
    : undefined;
  const topics = req.query.topics
    ? (req.query.topics as string).split(',')
    : undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = req.query.search as string | undefined;
  const sentiment = req.query.sentiment as Sentiment | undefined;

  console.log('[DEBUG] Calling aggregator.getArticles...');
  const { articles, total } = aggregator.getArticles({
    regions,
    topics,
    limit,
    offset,
    search,
    sentiment,
  });

  console.log(`[DEBUG] Got ${articles.length} articles, sending response...`);

  // Cache for 5 minutes - news changes frequently
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: articles,
    meta: {
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total,
    },
  });
  console.log('[DEBUG] Response sent');
});

newsRoutes.get('/sources', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;

  // Cache for 24 hours - sources rarely change
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: aggregator.getSources(),
  });
});

newsRoutes.get('/sentiment', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;

  // Cache for 5 minutes - sentiment updates with news
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: aggregator.getSentimentByRegion(),
  });
});

newsRoutes.get('/:id', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const article = aggregator.getArticleById(req.params.id);

  if (!article) {
    res.status(404).json({
      success: false,
      error: 'Article not found',
    });
    return;
  }

  // Cache individual articles for 10 minutes
  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: article,
  });
});

// Translate a specific article on-demand
newsRoutes.post('/:id/translate', async (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const { targetLang } = req.body;

  if (!targetLang || !['de', 'en'].includes(targetLang)) {
    res.status(400).json({
      success: false,
      error: 'Invalid targetLang. Must be "de" or "en"',
    });
    return;
  }

  try {
    const article = await aggregator.translateArticle(req.params.id, targetLang);
    if (!article) {
      res.status(404).json({
        success: false,
        error: 'Article not found',
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
    });
  }
});
