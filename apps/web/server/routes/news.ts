import { Router, Request, Response } from 'express';
import type { PerspectiveRegion, Sentiment } from '../../src/types';
import * as newsReadService from '../services/newsReadService';
import { TranslationService } from '../services/translationService';
import { CacheService, CacheKeys } from '../services/cacheService';
import { prisma } from '../db/prisma';

export const newsRoutes = Router();

newsRoutes.get('/', async (req: Request, res: Response) => {
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

  const { articles, total } = await newsReadService.getArticles({
    regions,
    topics,
    limit,
    offset,
    search,
    sentiment,
  });

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
});

newsRoutes.get('/sources', async (_req: Request, res: Response) => {
  const sources = await newsReadService.getSources();

  // Cache for 24 hours - sources rarely change
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: sources,
  });
});

newsRoutes.get('/sentiment', async (_req: Request, res: Response) => {
  const sentiment = await newsReadService.getSentimentByRegion();

  // Cache for 5 minutes - sentiment updates with news
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: sentiment,
  });
});

newsRoutes.get('/:id', async (req: Request, res: Response) => {
  const article = await newsReadService.getArticleById(req.params.id);

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
  const { targetLang } = req.body;

  if (!targetLang || !['de', 'en'].includes(targetLang)) {
    res.status(400).json({
      success: false,
      error: 'Invalid targetLang. Must be "de" or "en"',
    });
    return;
  }

  try {
    // Read directly from Prisma (not cache) since we are about to write
    const row = await prisma.newsArticle.findUnique({
      where: { id: req.params.id },
      include: { source: true },
    });
    if (!row) {
      res.status(404).json({
        success: false,
        error: 'Article not found',
      });
      return;
    }

    const translationService = TranslationService.getInstance();

    // Parse existing translation maps from JSONB columns (legacy double-encoded format)
    const parseJsonField = (val: unknown): Record<string, string> => {
      if (val == null) return {};
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return {}; }
      }
      if (typeof val === 'object') return val as Record<string, string>;
      return {};
    };
    const titleMap = parseJsonField(row.titleTranslated);
    const contentMap = parseJsonField(row.contentTranslated);

    // Translate title if missing
    if (!titleMap[targetLang]) {
      const titleResult = await translationService.translate(
        row.title,
        targetLang as 'de' | 'en',
        row.originalLanguage
      );
      titleMap[targetLang] = titleResult.text;
    }

    // Translate content if missing
    let translationQuality: number | undefined = row.translationQuality ?? undefined;
    if (!contentMap[targetLang]) {
      const contentResult = await translationService.translate(
        row.content,
        targetLang as 'de' | 'en',
        row.originalLanguage
      );
      contentMap[targetLang] = contentResult.text;
      translationQuality = contentResult.quality;
    }

    // Persist back to Postgres
    await prisma.newsArticle.update({
      where: { id: row.id },
      data: {
        titleTranslated: JSON.stringify(titleMap),
        contentTranslated: JSON.stringify(contentMap),
        translationQuality,
      },
    });

    // Invalidate caches so next read sees the translation
    const cache = CacheService.getInstance();
    await cache.del(CacheKeys.newsArticle(row.id));
    await cache.delPattern('news:list:*');

    // Return the freshly translated article
    const updated = await newsReadService.getArticleById(row.id);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
    });
  }
});
