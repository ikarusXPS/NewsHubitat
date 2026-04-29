/**
 * Unit tests for FocusSuggestionEngine
 * Tests singleton pattern, tension spikes, breaking news, coverage gaps, and relevance scoring
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock NewsAggregator per D-06
const mockGetArticles = vi.fn();
vi.mock('./newsAggregator', () => ({
  NewsAggregator: {
    getInstance: vi.fn(() => ({
      getArticles: mockGetArticles,
    })),
  },
}));

// Mock logger to silence console output
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { FocusSuggestionEngine } from './focusSuggestionEngine';
import { getMockNewsArticle, getMockNegativeArticle, getMockNewsSource } from '../../src/test/factories';
import type { NewsArticle, PerspectiveRegion } from '../../src/types';

describe('FocusSuggestionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set system time to a fixed point for deterministic testing
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    mockGetArticles.mockReset();
    mockGetArticles.mockReturnValue({ articles: [], total: 0 });
  });

  afterEach(() => {
    // Reset singleton per D-13
    (FocusSuggestionEngine as any).instance = null;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = FocusSuggestionEngine.getInstance();
      const instance2 = FocusSuggestionEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('creates new instance after singleton reset', () => {
      const instance1 = FocusSuggestionEngine.getInstance();
      (FocusSuggestionEngine as any).instance = null;
      const instance2 = FocusSuggestionEngine.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('generateSuggestions', () => {
    it('returns empty array when no articles match suggestion criteria', async () => {
      mockGetArticles.mockReturnValue({ articles: [], total: 0 });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      expect(suggestions).toEqual([]);
    });

    it('combines and sorts suggestions by relevanceScore descending', async () => {
      // Create articles that trigger multiple suggestion types
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Recent negative articles for tension spike (last 6h)
      const tensionArticles = createTensionSpikeArticles(now);

      // Recent topic-heavy articles for breaking news (last 2h)
      const breakingArticles = createBreakingNewsArticles(now);

      // Articles with coverage gaps
      const gapArticles = createCoverageGapArticles(now);

      mockGetArticles.mockReturnValue({
        articles: [...tensionArticles, ...breakingArticles, ...gapArticles],
        total: tensionArticles.length + breakingArticles.length + gapArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // Verify sorted by relevanceScore descending
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          suggestions[i].relevanceScore
        );
      }
    });

    it('limits results to top 5 suggestions', async () => {
      // Create many articles to trigger multiple suggestions
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Multiple regions with tension spikes
      const regions: PerspectiveRegion[] = ['nahost', 'russland', 'china', 'usa', 'europa', 'tuerkei', 'asien'];
      const allArticles: NewsArticle[] = [];

      for (const region of regions) {
        // Current period: high negative
        for (let i = 0; i < 5; i++) {
          allArticles.push(
            getMockNegativeArticle({
              publishedAt: new Date(now - i * 30 * 60 * 1000), // Last few hours
              perspective: region,
              source: getMockNewsSource({ region }),
              sentimentScore: -0.8,
            })
          );
        }
        // Baseline: neutral
        for (let i = 0; i < 10; i++) {
          allArticles.push(
            getMockNewsArticle({
              publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000), // 12-22h ago
              perspective: region,
              source: getMockNewsSource({ region }),
              sentiment: 'neutral',
              sentimentScore: 0,
            })
          );
        }
      }

      mockGetArticles.mockReturnValue({
        articles: allArticles,
        total: allArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('analyzeTensionSpikes', () => {
    it('detects >30% negative sentiment spike in a region', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current period (last 6h): very negative sentiment
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        currentArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000), // 0-5 hours ago
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.8,
          })
        );
      }

      // Baseline period (6-24h ago): mostly neutral
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000), // 12-22h ago
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentiment: 'neutral',
            sentimentScore: -0.1, // Slightly negative baseline
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const tensionSuggestion = suggestions.find((s) => s.reason === 'tension-spike');
      expect(tensionSuggestion).toBeDefined();
      expect(tensionSuggestion!.triggerEvent).toContain('nahost');
      expect(tensionSuggestion!.triggerEvent).toContain('increase in negative sentiment');
    });

    it('requires at least 3 articles in current period', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Only 2 articles in current period - should not trigger
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 2; i++) {
        currentArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.9,
          })
        );
      }

      // Baseline with neutral sentiment
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentiment: 'neutral',
            sentimentScore: 0,
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const tensionSuggestion = suggestions.find((s) => s.reason === 'tension-spike');
      expect(tensionSuggestion).toBeUndefined();
    });

    it('does not trigger when spike is below 30%', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current and baseline have similar negative sentiment (low spike)
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        currentArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.3,
          })
        );
      }

      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        baselineArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.28, // Similar to current
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const tensionSuggestion = suggestions.find((s) => s.reason === 'tension-spike');
      expect(tensionSuggestion).toBeUndefined();
    });

    it('calculates relevanceScore from spike percentage + article count', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // High spike with many articles
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        currentArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - i * 30 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.9,
          })
        );
      }

      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentiment: 'neutral',
            sentimentScore: -0.1,
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const tensionSuggestion = suggestions.find((s) => s.reason === 'tension-spike');
      expect(tensionSuggestion).toBeDefined();
      // Score formula: min(100, spike + articleCount * 2)
      expect(tensionSuggestion!.relevanceScore).toBeGreaterThan(0);
      expect(tensionSuggestion!.relevanceScore).toBeLessThanOrEqual(100);
    });

    it('finds matching preset from FOCUS_PRESETS', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Use 'nahost' which should match 'middle-east-turkey' preset
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        currentArticles.push(
          getMockNegativeArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentimentScore: -0.8,
          })
        );
      }

      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
            sentiment: 'neutral',
            sentimentScore: -0.1,
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const tensionSuggestion = suggestions.find((s) => s.reason === 'tension-spike');
      expect(tensionSuggestion).toBeDefined();
      expect(tensionSuggestion!.preset).toBeDefined();
      expect(tensionSuggestion!.preset.regions).toContain('nahost');
    });
  });

  describe('analyzeBreakingNews', () => {
    it('detects >50% topic frequency spike in last 2h', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current period (last 2h): many 'military' topic articles
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000), // Last ~100 minutes
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      // Baseline period (2-24h ago): few 'military' articles (normalized)
      // With 11x normalization, 11 baseline articles = 1 normalized
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 6 * 60 * 60 * 1000 - i * 60 * 60 * 1000), // 6-11h ago
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const breakingSuggestion = suggestions.find((s) => s.reason === 'breaking-news');
      expect(breakingSuggestion).toBeDefined();
      expect(breakingSuggestion!.triggerEvent).toContain('military');
      expect(breakingSuggestion!.triggerEvent).toContain('Breaking');
    });

    it('requires at least 5 articles in current period', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Only 4 articles in current period
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 4; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: currentArticles,
        total: currentArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const breakingSuggestion = suggestions.find((s) => s.reason === 'breaking-news');
      expect(breakingSuggestion).toBeUndefined();
    });

    it('normalizes baseline by time period (11x factor)', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current: 5 articles
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['diplomacy'],
            perspective: 'europa',
            source: getMockNewsSource({ region: 'europa' }),
          })
        );
      }

      // Baseline: 55 articles (should normalize to 5, no spike)
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 55; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 6 * 60 * 60 * 1000 - i * 15 * 60 * 1000),
            topics: ['diplomacy'],
            perspective: 'europa',
            source: getMockNewsSource({ region: 'europa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // With proper normalization: current=5, baseline=55/11=5, spike=0%
      const breakingSuggestion = suggestions.find(
        (s) => s.reason === 'breaking-news' && s.triggerEvent.includes('diplomacy')
      );
      expect(breakingSuggestion).toBeUndefined();
    });

    it('creates suggestion with reason breaking-news', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // High spike scenario
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 8; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['conflict'],
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
          })
        );
      }

      // Low baseline
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 3; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 10 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            topics: ['conflict'],
            perspective: 'nahost',
            source: getMockNewsSource({ region: 'nahost' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const breakingSuggestion = suggestions.find((s) => s.reason === 'breaking-news');
      expect(breakingSuggestion).toBeDefined();
      expect(breakingSuggestion!.reason).toBe('breaking-news');
      expect(breakingSuggestion!.id).toContain('breaking-');
    });
  });

  describe('analyzeCoverageGaps', () => {
    it('detects topics with <75% region coverage', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // All articles from same region for a single topic
      const articles: NewsArticle[] = [];
      for (let i = 0; i < 15; i++) {
        articles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            topics: ['conflict'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const gapSuggestion = suggestions.find((s) => s.reason === 'coverage-gap');
      expect(gapSuggestion).toBeDefined();
      expect(gapSuggestion!.triggerEvent).toContain('conflict');
      expect(gapSuggestion!.triggerEvent).toContain('regions');
    });

    it('requires topics with 10+ articles', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Only 8 articles - below threshold
      const articles: NewsArticle[] = [];
      for (let i = 0; i < 8; i++) {
        articles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            topics: ['niche-topic'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const gapSuggestion = suggestions.find(
        (s) => s.reason === 'coverage-gap' && s.triggerEvent.includes('niche-topic')
      );
      expect(gapSuggestion).toBeUndefined();
    });

    it('lists missing regions in triggerEvent', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // 15 articles all from 'usa' only
      const articles: NewsArticle[] = [];
      for (let i = 0; i < 15; i++) {
        articles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 60 * 60 * 1000),
            topics: ['conflict'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const gapSuggestion = suggestions.find((s) => s.reason === 'coverage-gap');
      expect(gapSuggestion).toBeDefined();
      // Should mention some missing regions
      expect(gapSuggestion!.triggerEvent).toContain('Consider adding');
    });

    it('does not trigger when coverage is adequate (>75%)', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();
      const regions: PerspectiveRegion[] = [
        'usa', 'europa', 'deutschland', 'nahost', 'tuerkei',
        'russland', 'china', 'asien', 'afrika', 'lateinamerika',
      ];

      // Articles from 10 different regions (10/13 = 77%)
      const articles: NewsArticle[] = [];
      for (const region of regions) {
        articles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - Math.random() * 12 * 60 * 60 * 1000),
            topics: ['politics'],
            perspective: region,
            source: getMockNewsSource({ region }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const gapSuggestion = suggestions.find(
        (s) => s.reason === 'coverage-gap' && s.triggerEvent.includes('politics')
      );
      expect(gapSuggestion).toBeUndefined();
    });

    it('requires coverage <60% AND 3+ missing regions for suggestion', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();
      const regions: PerspectiveRegion[] = ['usa', 'europa', 'deutschland', 'nahost', 'tuerkei', 'russland', 'china'];

      // 7 regions covered = 7/13 = 54% (< 60%) but only 6 missing
      const articles: NewsArticle[] = [];
      for (const region of regions) {
        for (let i = 0; i < 2; i++) {
          articles.push(
            getMockNewsArticle({
              publishedAt: new Date(now - i * 60 * 60 * 1000),
              topics: ['economy'],
              perspective: region,
              source: getMockNewsSource({ region }),
            })
          );
        }
      }

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // 7 regions covered, 6 missing - meets criteria
      const gapSuggestion = suggestions.find(
        (s) => s.reason === 'coverage-gap' && s.triggerEvent.includes('economy')
      );
      // Should trigger since <60% and 6 missing regions >= 3
      expect(gapSuggestion).toBeDefined();
    });
  });

  describe('calculateRegionTension', () => {
    it('groups articles by perspective region', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Multiple regions with different sentiment patterns
      const articles: NewsArticle[] = [
        // Region 1: negative
        getMockNegativeArticle({
          publishedAt: new Date(now - 1 * 60 * 60 * 1000),
          perspective: 'nahost',
          source: getMockNewsSource({ region: 'nahost' }),
          sentimentScore: -0.8,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 2 * 60 * 60 * 1000),
          perspective: 'nahost',
          source: getMockNewsSource({ region: 'nahost' }),
          sentimentScore: -0.7,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 3 * 60 * 60 * 1000),
          perspective: 'nahost',
          source: getMockNewsSource({ region: 'nahost' }),
          sentimentScore: -0.6,
        }),
        // Baseline for nahost
        getMockNewsArticle({
          publishedAt: new Date(now - 12 * 60 * 60 * 1000),
          perspective: 'nahost',
          source: getMockNewsSource({ region: 'nahost' }),
          sentiment: 'neutral',
          sentimentScore: -0.1,
        }),
        // Region 2: neutral (no spike)
        getMockNewsArticle({
          publishedAt: new Date(now - 1 * 60 * 60 * 1000),
          perspective: 'europa',
          source: getMockNewsSource({ region: 'europa' }),
          sentiment: 'neutral',
          sentimentScore: 0,
        }),
        getMockNewsArticle({
          publishedAt: new Date(now - 12 * 60 * 60 * 1000),
          perspective: 'europa',
          source: getMockNewsSource({ region: 'europa' }),
          sentiment: 'neutral',
          sentimentScore: 0,
        }),
      ];

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // nahost should have tension spike, europa should not
      const nahostSuggestion = suggestions.find(
        (s) => s.reason === 'tension-spike' && s.triggerEvent.includes('nahost')
      );
      expect(nahostSuggestion).toBeDefined();
    });

    it('calculates average negative sentiment score per region', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current: average -0.7
      const currentArticles: NewsArticle[] = [
        getMockNegativeArticle({
          publishedAt: new Date(now - 1 * 60 * 60 * 1000),
          perspective: 'russland',
          source: getMockNewsSource({ region: 'russland' }),
          sentimentScore: -0.6,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 2 * 60 * 60 * 1000),
          perspective: 'russland',
          source: getMockNewsSource({ region: 'russland' }),
          sentimentScore: -0.8,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 3 * 60 * 60 * 1000),
          perspective: 'russland',
          source: getMockNewsSource({ region: 'russland' }),
          sentimentScore: -0.7,
        }),
      ];

      // Baseline: average -0.2
      const baselineArticles: NewsArticle[] = [
        getMockNewsArticle({
          publishedAt: new Date(now - 12 * 60 * 60 * 1000),
          perspective: 'russland',
          source: getMockNewsSource({ region: 'russland' }),
          sentiment: 'negative',
          sentimentScore: -0.2,
        }),
        getMockNewsArticle({
          publishedAt: new Date(now - 14 * 60 * 60 * 1000),
          perspective: 'russland',
          source: getMockNewsSource({ region: 'russland' }),
          sentiment: 'negative',
          sentimentScore: -0.2,
        }),
      ];

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const russlandSuggestion = suggestions.find(
        (s) => s.reason === 'tension-spike' && s.triggerEvent.includes('russland')
      );
      expect(russlandSuggestion).toBeDefined();
    });

    it('skips regions with no current or baseline articles', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Only current articles, no baseline
      const articles: NewsArticle[] = [
        getMockNegativeArticle({
          publishedAt: new Date(now - 1 * 60 * 60 * 1000),
          perspective: 'afrika',
          source: getMockNewsSource({ region: 'afrika' }),
          sentimentScore: -0.9,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 2 * 60 * 60 * 1000),
          perspective: 'afrika',
          source: getMockNewsSource({ region: 'afrika' }),
          sentimentScore: -0.9,
        }),
        getMockNegativeArticle({
          publishedAt: new Date(now - 3 * 60 * 60 * 1000),
          perspective: 'afrika',
          source: getMockNewsSource({ region: 'afrika' }),
          sentimentScore: -0.9,
        }),
      ];

      mockGetArticles.mockReturnValue({
        articles,
        total: articles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const afrikaSuggestion = suggestions.find(
        (s) => s.reason === 'tension-spike' && s.triggerEvent.includes('afrika')
      );
      // No baseline = no spike calculation possible
      expect(afrikaSuggestion).toBeUndefined();
    });
  });

  describe('calculateTopicFrequency', () => {
    it('counts topic occurrences in current vs baseline', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current: 6 'military' articles
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 6; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      // Baseline: 2 'military' articles (normalized = 2/11 = ~0.18)
      const baselineArticles: NewsArticle[] = [];
      for (let i = 0; i < 2; i++) {
        baselineArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 10 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...currentArticles, ...baselineArticles],
        total: currentArticles.length + baselineArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // current=6, baseline normalized=2/11=0.18
      // spike = (6 - 0.18) / 0.18 * 100 >> 50%
      const breakingSuggestion = suggestions.find(
        (s) => s.reason === 'breaking-news' && s.triggerEvent.includes('military')
      );
      expect(breakingSuggestion).toBeDefined();
    });

    it('sorts frequencies by spike descending', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Topic 1: military - high spike
      const militaryArticles: NewsArticle[] = [];
      for (let i = 0; i < 10; i++) {
        militaryArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 5 * 60 * 1000),
            topics: ['military'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      // Topic 2: economy - lower spike
      const economyArticles: NewsArticle[] = [];
      for (let i = 0; i < 6; i++) {
        economyArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['economy'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }
      // Baseline for economy
      for (let i = 0; i < 10; i++) {
        economyArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - 8 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
            topics: ['economy'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: [...militaryArticles, ...economyArticles],
        total: militaryArticles.length + economyArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      const breakingSuggestions = suggestions.filter((s) => s.reason === 'breaking-news');

      if (breakingSuggestions.length >= 2) {
        // Higher spike should be first
        expect(breakingSuggestions[0].relevanceScore).toBeGreaterThanOrEqual(
          breakingSuggestions[1].relevanceScore
        );
      }
    });

    it('handles new topics with no baseline (divides by 1)', async () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();

      // Current: 5 articles with new topic, no baseline
      const currentArticles: NewsArticle[] = [];
      for (let i = 0; i < 5; i++) {
        currentArticles.push(
          getMockNewsArticle({
            publishedAt: new Date(now - i * 10 * 60 * 1000),
            topics: ['new-emerging-topic'],
            perspective: 'usa',
            source: getMockNewsSource({ region: 'usa' }),
          })
        );
      }

      mockGetArticles.mockReturnValue({
        articles: currentArticles,
        total: currentArticles.length,
      });

      const engine = FocusSuggestionEngine.getInstance();
      const suggestions = await engine.generateSuggestions();

      // No preset matches 'new-emerging-topic', so no suggestion created
      // But the code should not crash
      expect(suggestions).toBeDefined();
    });
  });
});

// Helper functions to create test data

function createTensionSpikeArticles(now: number): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // Current (last 6h): negative
  for (let i = 0; i < 5; i++) {
    articles.push(
      getMockNegativeArticle({
        publishedAt: new Date(now - i * 60 * 60 * 1000),
        perspective: 'nahost',
        source: getMockNewsSource({ region: 'nahost' }),
        sentimentScore: -0.7,
      })
    );
  }

  // Baseline (6-24h): neutral
  for (let i = 0; i < 5; i++) {
    articles.push(
      getMockNewsArticle({
        publishedAt: new Date(now - 12 * 60 * 60 * 1000 - i * 60 * 60 * 1000),
        perspective: 'nahost',
        source: getMockNewsSource({ region: 'nahost' }),
        sentiment: 'neutral',
        sentimentScore: -0.1,
      })
    );
  }

  return articles;
}

function createBreakingNewsArticles(now: number): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // Current (last 2h): many 'military' topic
  for (let i = 0; i < 8; i++) {
    articles.push(
      getMockNewsArticle({
        publishedAt: new Date(now - i * 10 * 60 * 1000),
        topics: ['military'],
        perspective: 'usa',
        source: getMockNewsSource({ region: 'usa' }),
      })
    );
  }

  // Baseline (2-24h): few 'military'
  for (let i = 0; i < 2; i++) {
    articles.push(
      getMockNewsArticle({
        publishedAt: new Date(now - 10 * 60 * 60 * 1000 - i * 2 * 60 * 60 * 1000),
        topics: ['military'],
        perspective: 'usa',
        source: getMockNewsSource({ region: 'usa' }),
      })
    );
  }

  return articles;
}

function createCoverageGapArticles(now: number): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // 12 articles all from same region (low coverage)
  for (let i = 0; i < 12; i++) {
    articles.push(
      getMockNewsArticle({
        publishedAt: new Date(now - i * 60 * 60 * 1000),
        topics: ['conflict'],
        perspective: 'usa',
        source: getMockNewsSource({ region: 'usa' }),
      })
    );
  }

  return articles;
}
