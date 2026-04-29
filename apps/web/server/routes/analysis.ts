import { Router, Request, Response } from 'express';
import * as newsReadService from '../services/newsReadService';
import { AIService } from '../services/aiService';
import logger from '../utils/logger';

export const analysisRoutes = Router();

const aiService = AIService.getInstance();

// Get article clusters with optional AI summaries
analysisRoutes.get('/clusters', async (req: Request, res: Response) => {
  const includeSummaries = req.query.summaries === 'true';

  const { articles } = await newsReadService.getArticles({ limit: 200 });
  const clusters = aiService.clusterArticles(articles);

  if (!includeSummaries) {
    // Cache for 10 minutes - cluster analysis
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: clusters.map((c) => ({
        topic: c.topic,
        articleCount: c.articles.length,
        regions: [...new Set(c.articles.map((a) => a.perspective))],
        articles: c.articles.slice(0, 5).map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source.name,
          perspective: a.perspective,
          sentiment: a.sentiment,
          url: a.url,
        })),
      })),
    });
    return;
  }

  // Generate summaries for each cluster
  const clustersWithSummaries = await Promise.all(
    clusters.map(async (cluster) => {
      const summary = await aiService.generateClusterSummary(cluster);
      return {
        topic: cluster.topic,
        articleCount: cluster.articles.length,
        regions: [...new Set(cluster.articles.map((a) => a.perspective))],
        articles: cluster.articles.slice(0, 5).map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source.name,
          perspective: a.perspective,
          sentiment: a.sentiment,
          url: a.url,
        })),
        summary,
      };
    })
  );

  // Cache for 10 minutes - AI-generated summaries
  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: clustersWithSummaries,
    meta: {
      aiAvailable: aiService.isAvailable(),
    },
  });
});

// Generate summary for a specific topic
analysisRoutes.post('/summarize', async (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic) {
    res.status(400).json({
      success: false,
      error: 'Topic is required',
    });
    return;
  }

  // Search for articles with this topic
  const { articles } = await newsReadService.getArticles({ search: topic, limit: 50 });

  if (articles.length < 2) {
    res.status(404).json({
      success: false,
      error: 'Not enough articles found for this topic',
    });
    return;
  }

  const cluster = { topic, articles };
  const summary = await aiService.generateClusterSummary(cluster);

  if (!summary) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
    });
    return;
  }

  res.json({
    success: true,
    data: summary,
  });
});

// Get framing comparison (Phase 38 D-14: replaced the legacy heuristic
// per-region sentiment aggregation with the LLM-driven
// aiService.generateFramingAnalysis pipeline).
analysisRoutes.get('/framing', async (req: Request, res: Response) => {
  try {
    const topic = req.query.topic as string | undefined;
    const localeRaw = req.query.locale as string | undefined;

    if (!topic || topic.trim().length < 2) {
      res.status(400).json({ success: false, error: 'topic is required (min 2 chars)' });
      return;
    }

    const locale: 'de' | 'en' | 'fr' =
      localeRaw === 'de' || localeRaw === 'en' || localeRaw === 'fr' ? localeRaw : 'en';

    const analysis = await aiService.generateFramingAnalysis(topic.trim(), locale);

    // Cache for 10 minutes - framing analysis (the AI service caches 24h
    // internally; the HTTP layer adds short-window CDN/proxy caching).
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Vary', 'Accept-Encoding');

    res.json({
      success: true,
      data: {
        topic: analysis.topic,
        locale: analysis.locale,
        perspectives: analysis.perspectives,
        aiGenerated: analysis.aiGenerated,
      },
    });
  } catch (err) {
    logger.error('Framing analysis error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate framing analysis' });
  }
});

// Coverage gap detection
analysisRoutes.get('/coverage-gaps', async (req: Request, res: Response) => {
  const { articles } = await newsReadService.getArticles({ limit: 500 });

  // All possible perspectives
  const allPerspectives = [
    'western',
    'middle-east',
    'turkish',
    'russian',
    'chinese',
    'alternative',
    'afrika',
    'asien',
    'deutschland',
    'europa',
    'kanada',
    'lateinamerika',
    'nahost',
    'ozeanien',
    'tuerkei',
    'usa',
  ];

  // Count articles by perspective
  const coverageByPerspective: Record<string, number> = {};
  for (const perspective of allPerspectives) {
    coverageByPerspective[perspective] = 0;
  }

  for (const article of articles) {
    if (coverageByPerspective[article.perspective] !== undefined) {
      coverageByPerspective[article.perspective]++;
    }
  }

  // Calculate statistics
  const counts = Object.values(coverageByPerspective);
  const totalArticles = counts.reduce((sum, count) => sum + count, 0);
  const avgCoverage = totalArticles / allPerspectives.length;
  const maxCoverage = Math.max(...counts);

  // Identify gaps (perspectives with <40% of average coverage)
  const gapThreshold = avgCoverage * 0.4;
  const gaps = Object.entries(coverageByPerspective)
    .filter(([, count]) => count < gapThreshold)
    .sort((a, b) => a[1] - b[1])
    .map(([perspective, count]) => ({
      perspective,
      currentCount: count,
      expectedCount: Math.round(avgCoverage),
      deficit: Math.round(avgCoverage - count),
      severity: count === 0 ? 'critical' : count < avgCoverage * 0.2 ? 'high' : 'medium',
    }));

  // Identify over-represented perspectives (>150% of average)
  const overRepresented = Object.entries(coverageByPerspective)
    .filter(([, count]) => count > avgCoverage * 1.5)
    .sort((a, b) => b[1] - a[1])
    .map(([perspective, count]) => ({
      perspective,
      count,
      percentageOfTotal: Math.round((count / totalArticles) * 100),
    }));

  // Cache for 10 minutes - coverage analysis
  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: {
      totalArticles,
      avgCoveragePerPerspective: Math.round(avgCoverage * 10) / 10,
      maxCoverage,
      coverageDistribution: coverageByPerspective,
      gaps: {
        count: gaps.length,
        details: gaps,
        recommendations: gaps.map((gap) => ({
          perspective: gap.perspective,
          recommendation:
            gap.currentCount === 0
              ? `Keine Artikel aus ${gap.perspective}-Perspektive vorhanden. Quellen hinzufügen empfohlen.`
              : `${gap.perspective}: Nur ${gap.currentCount} Artikel (${gap.deficit} weniger als Durchschnitt). Mehr Quellen empfohlen.`,
        })),
      },
      overRepresented: {
        count: overRepresented.length,
        details: overRepresented,
      },
    },
  });
});

// Health check for AI service
analysisRoutes.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      aiAvailable: aiService.isAvailable(),
    },
  });
});
