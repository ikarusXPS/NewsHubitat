import type { PerspectiveRegion, NewsArticle } from '../../src/types';
import type { FocusSuggestion } from '../../src/types/focus';
import { NewsAggregator } from './newsAggregator';
import { FOCUS_PRESETS } from '../../src/config/focusPresets';

interface TensionScore {
  region: PerspectiveRegion;
  currentScore: number;
  baselineScore: number;
  spike: number; // Percentage increase
  articleCount: number;
}

interface TopicFrequency {
  topic: string;
  currentCount: number;
  baselineCount: number;
  spike: number; // Percentage increase
}

interface CoverageGap {
  topic: string;
  coveragePercent: number;
  missingRegions: PerspectiveRegion[];
  articleCount: number;
}

export class FocusSuggestionEngine {
  private static instance: FocusSuggestionEngine;
  private newsAggregator: NewsAggregator;

  private constructor() {
    this.newsAggregator = NewsAggregator.getInstance();
  }

  static getInstance(): FocusSuggestionEngine {
    if (!FocusSuggestionEngine.instance) {
      FocusSuggestionEngine.instance = new FocusSuggestionEngine();
    }
    return FocusSuggestionEngine.instance;
  }

  /**
   * Generate focus suggestions based on current news patterns
   * Returns top 5 suggestions sorted by relevance score
   */
  async generateSuggestions(): Promise<FocusSuggestion[]> {
    const suggestions: FocusSuggestion[] = [];

    // Analyze tension spikes (negative sentiment increases)
    const tensionSuggestions = await this.analyzeTensionSpikes();
    suggestions.push(...tensionSuggestions);

    // Analyze breaking news (emerging topics)
    const breakingSuggestions = await this.analyzeBreakingNews();
    suggestions.push(...breakingSuggestions);

    // Analyze coverage gaps (under-represented perspectives)
    const gapSuggestions = await this.analyzeCoverageGaps();
    suggestions.push(...gapSuggestions);

    // Sort by relevance score (descending) and return top 5
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * Detect regions with significant tension increases
   * Compares last 6h vs previous 18h sentiment scores
   */
  private async analyzeTensionSpikes(): Promise<FocusSuggestion[]> {
    const suggestions: FocusSuggestion[] = [];

    // Get articles from last 24h
    const { articles: recentArticles } = this.newsAggregator.getArticles({
      limit: 1000,
    });

    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Split into current (last 6h) and baseline (6-24h ago)
    const currentArticles = recentArticles.filter(
      (a) => new Date(a.publishedAt).getTime() > sixHoursAgo
    );
    const baselineArticles = recentArticles.filter(
      (a) => {
        const time = new Date(a.publishedAt).getTime();
        return time > twentyFourHoursAgo && time <= sixHoursAgo;
      }
    );

    // Calculate tension scores by region
    const tensions = this.calculateRegionTension(currentArticles, baselineArticles);

    // Create suggestions for regions with >30% tension spike
    for (const tension of tensions) {
      if (tension.spike > 30 && tension.articleCount >= 3) {
        // Find preset that includes this region
        const preset = FOCUS_PRESETS.find((p) => p.regions.includes(tension.region));

        if (preset) {
          const relevanceScore = Math.min(100, tension.spike + tension.articleCount * 2);

          suggestions.push({
            id: `tension-${tension.region}-${Date.now()}`,
            reason: 'tension-spike',
            preset,
            relevanceScore,
            triggerEvent: `${tension.region}: ${Math.round(tension.spike)}% increase in negative sentiment (${tension.articleCount} articles in last 6h)`,
            timestamp: new Date(),
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Detect emerging topics (sudden frequency increases)
   * Compares last 2h vs previous 24h topic frequency
   */
  private async analyzeBreakingNews(): Promise<FocusSuggestion[]> {
    const suggestions: FocusSuggestion[] = [];

    // Get articles from last 24h
    const { articles: recentArticles } = this.newsAggregator.getArticles({
      limit: 1000,
    });

    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Split into current (last 2h) and baseline (2-24h ago)
    const currentArticles = recentArticles.filter(
      (a) => new Date(a.publishedAt).getTime() > twoHoursAgo
    );
    const baselineArticles = recentArticles.filter(
      (a) => {
        const time = new Date(a.publishedAt).getTime();
        return time > twentyFourHoursAgo && time <= twoHoursAgo;
      }
    );

    // Calculate topic frequency
    const frequencies = this.calculateTopicFrequency(currentArticles, baselineArticles);

    // Create suggestions for topics with >50% spike
    for (const freq of frequencies) {
      if (freq.spike > 50 && freq.currentCount >= 5) {
        // Find preset that includes this topic
        const preset = FOCUS_PRESETS.find((p) => p.topics.includes(freq.topic));

        if (preset) {
          const relevanceScore = Math.min(100, freq.spike + freq.currentCount * 3);

          suggestions.push({
            id: `breaking-${freq.topic}-${Date.now()}`,
            reason: 'breaking-news',
            preset,
            relevanceScore,
            triggerEvent: `Breaking: "${freq.topic}" coverage increased ${Math.round(freq.spike)}% (${freq.currentCount} articles in last 2h)`,
            timestamp: new Date(),
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Detect topics with low perspective diversity
   * Suggests adding regions to improve coverage
   */
  private async analyzeCoverageGaps(): Promise<FocusSuggestion[]> {
    const suggestions: FocusSuggestion[] = [];

    // Get articles from last 24h
    const { articles: recentArticles } = this.newsAggregator.getArticles({
      limit: 1000,
    });

    // Group by topic
    const topicMap = new Map<string, typeof recentArticles>();
    for (const article of recentArticles) {
      for (const topic of article.topics) {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, []);
        }
        topicMap.get(topic)!.push(article);
      }
    }

    // Calculate coverage gaps
    const gaps: CoverageGap[] = [];
    const allRegions: PerspectiveRegion[] = [
      'usa', 'europa', 'deutschland', 'nahost', 'tuerkei', 'russland',
      'china', 'asien', 'afrika', 'lateinamerika', 'ozeanien', 'kanada', 'alternative',
    ];

    for (const [topic, articles] of topicMap) {
      if (articles.length >= 10) {
        // Only analyze well-covered topics
        const coveredRegions = new Set(articles.map((a) => a.perspective));
        const coveragePercent = (coveredRegions.size / allRegions.length) * 100;

        if (coveragePercent < 75) {
          const missingRegions = allRegions.filter((r) => !coveredRegions.has(r));

          gaps.push({
            topic,
            coveragePercent,
            missingRegions,
            articleCount: articles.length,
          });
        }
      }
    }

    // Create suggestions for significant gaps
    for (const gap of gaps) {
      if (gap.coveragePercent < 60 && gap.missingRegions.length >= 3) {
        // Find preset that includes missing regions
        const preset = FOCUS_PRESETS.find((p) =>
          gap.missingRegions.some((r) => p.regions.includes(r)) &&
          p.topics.includes(gap.topic)
        );

        if (preset) {
          const relevanceScore = Math.min(
            100,
            (100 - gap.coveragePercent) + gap.articleCount
          );

          suggestions.push({
            id: `gap-${gap.topic}-${Date.now()}`,
            reason: 'coverage-gap',
            preset,
            relevanceScore,
            triggerEvent: `"${gap.topic}" covered by only ${Math.round(gap.coveragePercent)}% of regions. Consider adding ${gap.missingRegions.slice(0, 3).join(', ')}`,
            timestamp: new Date(),
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Calculate tension scores (negative sentiment) by region
   */
  private calculateRegionTension(
    currentArticles: NewsArticle[],
    baselineArticles: NewsArticle[]
  ): TensionScore[] {
    const scores: TensionScore[] = [];

    // Get all regions
    const allRegions = new Set<PerspectiveRegion>();
    [...currentArticles, ...baselineArticles].forEach((a) => allRegions.add(a.perspective));

    for (const region of allRegions) {
      const current = currentArticles.filter((a) => a.perspective === region);
      const baseline = baselineArticles.filter((a) => a.perspective === region);

      if (current.length === 0 || baseline.length === 0) continue;

      // Calculate average negative sentiment (lower is more negative)
      const currentScore = current.reduce((sum, a) => sum + Math.min(0, a.sentimentScore), 0) / current.length;
      const baselineScore = baseline.reduce((sum, a) => sum + Math.min(0, a.sentimentScore), 0) / baseline.length;

      // Calculate spike percentage (more negative = higher spike)
      const spike = baselineScore !== 0
        ? ((Math.abs(currentScore) - Math.abs(baselineScore)) / Math.abs(baselineScore)) * 100
        : 0;

      scores.push({
        region,
        currentScore,
        baselineScore,
        spike,
        articleCount: current.length,
      });
    }

    return scores.sort((a, b) => b.spike - a.spike);
  }

  /**
   * Calculate topic frequency changes
   */
  private calculateTopicFrequency(
    currentArticles: NewsArticle[],
    baselineArticles: NewsArticle[]
  ): TopicFrequency[] {
    const frequencies: TopicFrequency[] = [];

    // Count topic occurrences
    const currentCounts = new Map<string, number>();
    const baselineCounts = new Map<string, number>();

    for (const article of currentArticles) {
      for (const topic of article.topics) {
        currentCounts.set(topic, (currentCounts.get(topic) || 0) + 1);
      }
    }

    for (const article of baselineArticles) {
      for (const topic of article.topics) {
        baselineCounts.set(topic, (baselineCounts.get(topic) || 0) + 1);
      }
    }

    // Calculate spikes
    for (const [topic, currentCount] of currentCounts) {
      const baselineCount = baselineCounts.get(topic) || 1; // Avoid division by zero

      // Normalize by time period (baseline is 11x longer than current)
      const normalizedBaseline = baselineCount / 11;
      const spike = ((currentCount - normalizedBaseline) / normalizedBaseline) * 100;

      frequencies.push({
        topic,
        currentCount,
        baselineCount,
        spike,
      });
    }

    return frequencies.sort((a, b) => b.spike - a.spike);
  }
}
