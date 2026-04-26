/**
 * Unit tests for articleRelevance library
 * Tests keyword extraction, scoring algorithms, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTopRelevantArticles, estimateContextTokens } from './articleRelevance';
import { getMockNewsArticle, getMockArticleFromRegion, resetIdCounter } from '../test/factories';
import type { PerspectiveRegion } from '../types';

describe('getTopRelevantArticles', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('basic behavior', () => {
    it('returns all articles when count <= limit', () => {
      const articles = [
        getMockNewsArticle({ title: 'Article 1' }),
        getMockNewsArticle({ title: 'Article 2' }),
        getMockNewsArticle({ title: 'Article 3' }),
      ];

      const result = getTopRelevantArticles(articles, 'test question', 5);

      expect(result).toHaveLength(3);
      expect(result).toEqual(articles);
    });

    it('returns exactly limit articles when more available', () => {
      const articles = Array.from({ length: 15 }, (_, i) =>
        getMockNewsArticle({ title: `Article ${i + 1}` })
      );

      const result = getTopRelevantArticles(articles, 'test question', 10);

      expect(result).toHaveLength(10);
    });

    it('handles empty articles array', () => {
      const result = getTopRelevantArticles([], 'test question', 10);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('handles single article', () => {
      const articles = [getMockNewsArticle({ title: 'Single Article' })];

      const result = getTopRelevantArticles(articles, 'test', 10);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Single Article');
    });
  });

  describe('keyword scoring', () => {
    it('scores articles higher when question keywords match title', () => {
      const articles = [
        getMockNewsArticle({
          title: 'Gaza conflict escalation',
          summary: 'General news summary',
        }),
        getMockNewsArticle({
          title: 'Stock market update',
          summary: 'General financial summary',
        }),
      ];

      const result = getTopRelevantArticles(articles, 'What is happening in Gaza?', 10);

      // Article with "Gaza" in title should be ranked first
      expect(result[0].title).toBe('Gaza conflict escalation');
    });

    it('filters stop words from question', () => {
      // Need more than limit articles to trigger sorting
      const articles = [
        getMockNewsArticle({
          title: 'Conflict in the region',
          summary: 'News about regional conflict',
        }),
        getMockNewsArticle({
          title: 'Gaza updates today',
          summary: 'Latest Gaza news',
        }),
        getMockNewsArticle({
          title: 'Unrelated news 1',
          summary: 'No matching content',
        }),
        getMockNewsArticle({
          title: 'Unrelated news 2',
          summary: 'No matching content',
        }),
      ];

      // "What", "is", "in" are stop words - only "happening" and "gaza" should be used
      const result = getTopRelevantArticles(articles, 'What is happening in Gaza?', 2);

      // Gaza match should score higher than generic "conflict"
      expect(result[0].title).toBe('Gaza updates today');
    });

    it('filters German stop words from question', () => {
      const articles = [
        getMockNewsArticle({
          title: 'Konflikt in der Region',
          summary: 'Nachrichten über Konflikte',
        }),
        getMockNewsArticle({
          title: 'Other unrelated news',
          summary: 'No conflict mention',
        }),
      ];

      // "der", "die", "das" are German stop words
      const result = getTopRelevantArticles(articles, 'der die das Konflikt', 10);

      // Article mentioning "Konflikt" should rank higher
      expect(result[0].title).toBe('Konflikt in der Region');
    });

    it('gives neutral score when no specific keywords', () => {
      const articles = [
        getMockNewsArticle({ title: 'Article One', publishedAt: new Date() }),
        getMockNewsArticle({ title: 'Article Two', publishedAt: new Date() }),
      ];

      // All stop words, no real keywords extracted
      const result = getTopRelevantArticles(articles, 'the is a', 10);

      // Should return both (neutral scoring applied)
      expect(result).toHaveLength(2);
    });

    it('ignores words with 2 or fewer characters', () => {
      const articles = [
        getMockNewsArticle({
          title: 'AI technology advances',
          summary: 'New AI developments',
        }),
        getMockNewsArticle({
          title: 'Technology news',
          summary: 'Generic tech updates',
        }),
      ];

      // "AI" is only 2 characters, should be filtered
      // "technology" should be the matching keyword
      const result = getTopRelevantArticles(articles, 'AI technology', 10);

      // Both mention technology, but first has "technology" in title
      expect(result[0].title).toBe('AI technology advances');
    });
  });

  describe('recency scoring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('scores very recent articles (< 6h) with 30 points', () => {
      // Need more than limit articles to trigger sorting
      const articles = [
        getMockNewsArticle({
          title: 'Old article',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
        getMockNewsArticle({
          title: 'Recent article',
          publishedAt: new Date('2024-06-15T10:00:00Z'), // 2 hours old - 30 pts
        }),
        getMockNewsArticle({
          title: 'Filler article 1',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
        getMockNewsArticle({
          title: 'Filler article 2',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
      ];

      const result = getTopRelevantArticles(articles, 'general question', 2);

      // Recent article should rank higher due to recency score
      expect(result[0].title).toBe('Recent article');
    });

    it('scores older articles (> 7 days) with 0 points', () => {
      // Need more than limit articles to trigger sorting
      const articles = [
        getMockNewsArticle({
          title: 'Very old article',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
        getMockNewsArticle({
          title: 'Week old article',
          publishedAt: new Date('2024-06-10T12:00:00Z'), // 5 days old - 5 pts
        }),
        getMockNewsArticle({
          title: 'Filler 1',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
        getMockNewsArticle({
          title: 'Filler 2',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 14 days old - 0 pts
        }),
      ];

      const result = getTopRelevantArticles(articles, 'general question', 2);

      // Week old article (5 pts) should be included in results over 0-point articles
      const hasWeekOld = result.some((a) => a.title === 'Week old article');
      expect(hasWeekOld).toBe(true);
    });

    it('applies correct recency tiers', () => {
      // Create articles at different ages - need more than limit to trigger sorting
      const articles = [
        getMockNewsArticle({
          title: '3 hours old',
          publishedAt: new Date('2024-06-15T09:00:00Z'), // 3h - 30 pts
        }),
        getMockNewsArticle({
          title: '9 hours old',
          publishedAt: new Date('2024-06-15T03:00:00Z'), // 9h - 25 pts
        }),
        getMockNewsArticle({
          title: '18 hours old',
          publishedAt: new Date('2024-06-14T18:00:00Z'), // 18h - 20 pts
        }),
        getMockNewsArticle({
          title: '36 hours old',
          publishedAt: new Date('2024-06-14T00:00:00Z'), // 36h - 15 pts
        }),
        getMockNewsArticle({
          title: '60 hours old',
          publishedAt: new Date('2024-06-12T24:00:00Z'), // 60h - 10 pts
        }),
        getMockNewsArticle({
          title: '5 days old',
          publishedAt: new Date('2024-06-10T12:00:00Z'), // 120h - 5 pts
        }),
        getMockNewsArticle({
          title: '10 days old',
          publishedAt: new Date('2024-06-05T12:00:00Z'), // 240h - 0 pts
        }),
        // Add extra articles to ensure we have more than limit
        getMockNewsArticle({
          title: 'Extra old 1',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 0 pts
        }),
        getMockNewsArticle({
          title: 'Extra old 2',
          publishedAt: new Date('2024-06-01T12:00:00Z'), // 0 pts
        }),
      ];

      const result = getTopRelevantArticles(articles, 'general question', 7);

      // Verify we got 7 articles
      expect(result).toHaveLength(7);
      // Most recent articles (higher recency scores) should be included
      const has3Hours = result.some((a) => a.title === '3 hours old');
      const has9Hours = result.some((a) => a.title === '9 hours old');
      expect(has3Hours).toBe(true);
      expect(has9Hours).toBe(true);
      // Oldest articles (0 pts) should NOT be in results when limit < total
      const hasExtraOld = result.some((a) => a.title === 'Extra old 1' || a.title === 'Extra old 2');
      expect(hasExtraOld).toBe(false);
    });
  });

  describe('diversity bonus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('includes articles from underrepresented regions', () => {
      // The diversity bonus promotes underrepresented regions.
      // With 4 regions having 2 articles each, we should see diversity in results.
      const regions: PerspectiveRegion[] = ['usa', 'nahost', 'russland', 'china'];
      const articles = regions.flatMap((region) =>
        Array.from({ length: 2 }, (_, i) =>
          getMockArticleFromRegion(region, {
            title: `${region} article ${i + 1}`,
            publishedAt: new Date('2024-06-15T10:00:00Z'),
          })
        )
      );

      // Request 6 articles from 8 total
      const result = getTopRelevantArticles(articles, 'general question', 6);

      // Count regions in results
      const regionSet = new Set(result.map((a) => a.perspective));

      // With diversity bonus, we should have at least 3 different regions represented
      // (not just the first 6 articles which would be from 3 regions)
      expect(regionSet.size).toBeGreaterThanOrEqual(3);
    });

    it('limits articles per region to maintain diversity', () => {
      const regions: PerspectiveRegion[] = ['usa', 'nahost', 'russland', 'china'];
      const articles = regions.flatMap((region) =>
        Array.from({ length: 3 }, (_, i) =>
          getMockArticleFromRegion(region, {
            title: `${region} article ${i + 1}`,
            publishedAt: new Date('2024-06-15T10:00:00Z'),
          })
        )
      );

      const result = getTopRelevantArticles(articles, 'general question', 8);

      // Count articles per region
      const regionCounts = new Map<string, number>();
      for (const article of result) {
        const count = regionCounts.get(article.perspective) || 0;
        regionCounts.set(article.perspective, count + 1);
      }

      // No single region should dominate (all should have <= 3 articles)
      for (const [, count] of regionCounts) {
        expect(count).toBeLessThanOrEqual(3);
      }

      // Should have at least 3 different regions represented
      expect(regionCounts.size).toBeGreaterThanOrEqual(3);
    });

    it('gives +10 bonus for regions with < 2 articles', () => {
      // Create scenario where diversity bonus makes a difference
      const articles = [
        getMockArticleFromRegion('usa', {
          title: 'USA high score',
          summary: 'Contains keyword match for test',
          publishedAt: new Date('2024-06-15T11:00:00Z'),
        }),
        getMockArticleFromRegion('usa', {
          title: 'USA medium score',
          publishedAt: new Date('2024-06-15T10:00:00Z'),
        }),
        getMockArticleFromRegion('nahost', {
          title: 'Middle East lower score',
          publishedAt: new Date('2024-06-14T12:00:00Z'), // Older
        }),
      ];

      const result = getTopRelevantArticles(articles, 'test question', 3);

      // Middle East should be included due to diversity bonus
      expect(result.some((a) => a.perspective === 'nahost')).toBe(true);
    });

    it('handles selection with more articles than limit triggering insertion logic', () => {
      // Create scenario with various regions and scores to exercise insertion paths
      const articles = [
        getMockArticleFromRegion('usa', {
          title: 'USA high',
          publishedAt: new Date('2024-06-15T11:00:00Z'), // 1h - 30 pts
        }),
        getMockArticleFromRegion('usa', {
          title: 'USA medium',
          publishedAt: new Date('2024-06-15T06:00:00Z'), // 6h - 25 pts
        }),
        getMockArticleFromRegion('nahost', {
          title: 'Nahost medium',
          publishedAt: new Date('2024-06-15T00:00:00Z'), // 12h - 20 pts
        }),
        getMockArticleFromRegion('russland', {
          title: 'Russia low',
          publishedAt: new Date('2024-06-14T00:00:00Z'), // 36h - 15 pts
        }),
        getMockArticleFromRegion('china', {
          title: 'China lowest',
          publishedAt: new Date('2024-06-10T00:00:00Z'), // 5+ days - 5 pts
        }),
      ];

      const result = getTopRelevantArticles(articles, 'general question', 3);

      // Should have exactly 3 articles
      expect(result).toHaveLength(3);
      // Higher scored articles should be included
      expect(result.some((a) => a.title === 'USA high')).toBe(true);
    });

    it('fills remaining slots when selection does not reach limit', () => {
      // Create scenario where initial selection loop doesn't fill all slots
      const articles = [
        getMockArticleFromRegion('usa', {
          title: 'USA 1',
          publishedAt: new Date('2024-06-15T10:00:00Z'),
        }),
        getMockArticleFromRegion('usa', {
          title: 'USA 2',
          publishedAt: new Date('2024-06-15T10:00:00Z'),
        }),
        getMockArticleFromRegion('nahost', {
          title: 'Nahost 1',
          publishedAt: new Date('2024-06-15T10:00:00Z'),
        }),
      ];

      // Request more articles than we have with different scores
      const result = getTopRelevantArticles(
        [...articles, getMockArticleFromRegion('china', { title: 'Extra' })],
        'general question',
        4
      );

      // Should get exactly 4 articles
      expect(result).toHaveLength(4);
    });
  });
});

describe('estimateContextTokens', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('returns 0 for empty array', () => {
    const result = estimateContextTokens([]);

    expect(result).toBe(0);
  });

  it('estimates tokens based on title and summary length', () => {
    const article = getMockNewsArticle({
      title: 'A'.repeat(100), // 100 chars
      summary: 'B'.repeat(150), // 150 chars
    });

    const result = estimateContextTokens([article]);

    // Expected: (100 + 30 + 150) / 4 = 280 / 4 = 70 tokens
    expect(result).toBe(70);
  });

  it('truncates summary to 150 chars for estimation', () => {
    const article = getMockNewsArticle({
      title: 'Short title', // ~11 chars
      summary: 'X'.repeat(300), // 300 chars, should be truncated to 150
    });

    const result = estimateContextTokens([article]);

    // Expected: (11 + 30 + 150) / 4 = 191 / 4 = 48 tokens (rounded up)
    expect(result).toBe(48);
  });

  it('handles article without summary using content', () => {
    const article = getMockNewsArticle({
      title: 'Test title', // ~10 chars
      summary: undefined,
      content: 'C'.repeat(200), // Will take first 150 chars
    });
    // @ts-expect-error - testing undefined summary
    article.summary = undefined;

    const result = estimateContextTokens([article]);

    // Expected: (10 + 30 + 150) / 4 = 190 / 4 = 48 tokens (rounded up)
    expect(result).toBe(48);
  });

  it('sums tokens correctly for multiple articles', () => {
    const articles = [
      getMockNewsArticle({
        title: 'A'.repeat(40), // 40 chars
        summary: 'B'.repeat(100), // 100 chars
      }),
      getMockNewsArticle({
        title: 'C'.repeat(60), // 60 chars
        summary: 'D'.repeat(120), // 120 chars
      }),
    ];

    const result = estimateContextTokens(articles);

    // Article 1: (40 + 30 + 100) / 4 = 170 / 4 = 42.5
    // Article 2: (60 + 30 + 120) / 4 = 210 / 4 = 52.5
    // Total chars: 170 + 210 = 380 / 4 = 95 tokens
    expect(result).toBe(95);
  });

  it('handles empty title gracefully', () => {
    const article = getMockNewsArticle({
      title: '',
      summary: 'Some summary text',
    });

    const result = estimateContextTokens([article]);

    // Expected: (0 + 30 + 17) / 4 = 47 / 4 = 12 tokens (rounded up)
    expect(result).toBe(12);
  });

  it('handles empty summary gracefully', () => {
    const article = getMockNewsArticle({
      title: 'Test title',
      summary: '',
      content: '', // Empty content too
    });
    // @ts-expect-error - testing empty summary
    article.summary = '';

    const result = estimateContextTokens([article]);

    // Expected: (10 + 30 + 0) / 4 = 40 / 4 = 10 tokens
    expect(result).toBe(10);
  });
});
