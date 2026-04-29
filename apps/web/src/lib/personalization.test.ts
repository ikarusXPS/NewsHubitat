/**
 * Unit tests for personalization library
 * Tests interest extraction, article scoring, and recommendation generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractKeywords,
  extractUserInterests,
  scoreArticleForUser,
  getRecommendations,
  formatTopicBadge,
} from './personalization';
import { getMockNewsArticle, getMockArticleFromRegion, resetIdCounter } from '../test/factories';
import type { NewsArticle } from '../types';

interface HistoryEntry {
  articleId: string;
  timestamp: number;
  readCount?: number;
}

describe('extractKeywords', () => {
  it('removes English stop words', () => {
    const result = extractKeywords('the quick brown fox is running');
    expect(result).not.toContain('the');
    expect(result).not.toContain('is');
    expect(result).toContain('quick');
    expect(result).toContain('brown');
    expect(result).toContain('running');
  });

  it('removes German stop words', () => {
    const result = extractKeywords('der schnelle Hund und die Katze');
    expect(result).not.toContain('der');
    expect(result).not.toContain('und');
    expect(result).not.toContain('die');
    expect(result).toContain('schnelle');
    expect(result).toContain('hund');
    expect(result).toContain('katze');
  });

  it('filters words with 3 or fewer characters', () => {
    const result = extractKeywords('the fox ran far away quickly');
    expect(result).not.toContain('fox'); // 3 chars
    expect(result).not.toContain('ran'); // 3 chars
    expect(result).not.toContain('far'); // 3 chars
    expect(result).toContain('away');
    expect(result).toContain('quickly');
  });

  it('lowercases all words', () => {
    const result = extractKeywords('CLIMATE Change Policy');
    expect(result).toContain('climate');
    expect(result).toContain('change');
    expect(result).toContain('policy');
    expect(result).not.toContain('CLIMATE');
    expect(result).not.toContain('Change');
  });

  it('removes punctuation', () => {
    const result = extractKeywords('hello, world! testing: punctuation.');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('testing');
    expect(result).toContain('punctuation');
    expect(result).not.toContain('hello,');
    expect(result).not.toContain('world!');
  });

  it('handles empty string', () => {
    const result = extractKeywords('');
    expect(result).toEqual([]);
  });

  it('handles string with only stop words', () => {
    const result = extractKeywords('the and or with for');
    expect(result).toEqual([]);
  });
});

describe('extractUserInterests', () => {
  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cold start per D-07', () => {
    it('returns empty interests for empty history', () => {
      const history: HistoryEntry[] = [];
      const articles = new Map<string, NewsArticle>();

      const result = extractUserInterests(history, articles);

      expect(result.topics.size).toBe(0);
      expect(result.regions.size).toBe(0);
      expect(result.recentTopics.size).toBe(0);
    });

    it('returns empty topTopics array', () => {
      const history: HistoryEntry[] = [];
      const articles = new Map<string, NewsArticle>();

      const result = extractUserInterests(history, articles);

      expect(result.topTopics).toEqual([]);
    });
  });

  describe('interest extraction per D-09, D-10', () => {
    it('extracts keywords from article titles', () => {
      const article = getMockNewsArticle({
        id: 'article-1',
        title: 'Climate Policy Discussion Continues',
      });
      const articles = new Map<string, NewsArticle>([['article-1', article]]);
      const history: HistoryEntry[] = [
        { articleId: 'article-1', timestamp: Date.now() },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.topics.has('climate')).toBe(true);
      expect(result.topics.has('policy')).toBe(true);
      expect(result.topics.has('discussion')).toBe(true);
      expect(result.topics.has('continues')).toBe(true);
    });

    it('tracks region preferences', () => {
      const article = getMockArticleFromRegion('nahost', {
        id: 'article-1',
        title: 'Regional News Update',
      });
      const articles = new Map<string, NewsArticle>([['article-1', article]]);
      const history: HistoryEntry[] = [
        { articleId: 'article-1', timestamp: Date.now() },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.regions.has('nahost')).toBe(true);
      expect(result.regions.get('nahost')).toBeGreaterThan(0);
    });

    it('extracts and weights article topics array', () => {
      const article = getMockNewsArticle({
        id: 'article-1',
        title: 'News Update',
        topics: ['technology', 'innovation'],
      });
      const articles = new Map<string, NewsArticle>([['article-1', article]]);
      const history: HistoryEntry[] = [
        { articleId: 'article-1', timestamp: Date.now() },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.topics.has('technology')).toBe(true);
      expect(result.topics.has('innovation')).toBe(true);
    });

    it('ignores history entries with missing articles', () => {
      const articles = new Map<string, NewsArticle>();
      const history: HistoryEntry[] = [
        { articleId: 'nonexistent', timestamp: Date.now() },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.topics.size).toBe(0);
    });
  });

  describe('recency weighting per D-15 (7-day window)', () => {
    it('weights recent articles 2x', () => {
      // Use unique keywords not in stop words (avoid "today", "news", "report")
      const recentArticle = getMockNewsArticle({
        id: 'recent',
        title: 'Blockchain Innovation Updates',
        topics: [], // Clear default topics to isolate title keywords
      });
      const oldArticle = getMockNewsArticle({
        id: 'old',
        title: 'Blockchain Development Framework',
        topics: [], // Clear default topics
      });
      const articles = new Map<string, NewsArticle>([
        ['recent', recentArticle],
        ['old', oldArticle],
      ]);

      const now = Date.now();
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

      const history: HistoryEntry[] = [
        { articleId: 'recent', timestamp: now },
        { articleId: 'old', timestamp: eightDaysAgo },
      ];

      const result = extractUserInterests(history, articles);

      // Recent article weight = 2, old article weight = 1
      // "blockchain" appears in both, so total = 3
      // "innovation" only in recent = 2
      // "framework" only in old = 1
      expect(result.topics.get('innovation')).toBe(2); // Recent = 2x weight
      expect(result.topics.get('framework')).toBe(1); // Old = 1x weight
      expect(result.topics.get('blockchain')).toBe(3); // Both = 2 + 1 = 3
    });

    it('tracks recent topics separately', () => {
      const article = getMockNewsArticle({
        id: 'recent',
        title: 'Breaking Technology News',
      });
      const articles = new Map<string, NewsArticle>([['recent', article]]);

      const history: HistoryEntry[] = [
        { articleId: 'recent', timestamp: Date.now() },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.recentTopics.has('breaking')).toBe(true);
      expect(result.recentTopics.has('technology')).toBe(true);
    });

    it('excludes old articles from recentTopics', () => {
      const article = getMockNewsArticle({
        id: 'old',
        title: 'Breaking Technology News',
      });
      const articles = new Map<string, NewsArticle>([['old', article]]);

      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const history: HistoryEntry[] = [
        { articleId: 'old', timestamp: eightDaysAgo },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.recentTopics.size).toBe(0);
      expect(result.topics.has('breaking')).toBe(true); // Still in general topics
    });

    it('handles exact 7-day boundary', () => {
      const article = getMockNewsArticle({
        id: 'boundary',
        title: 'Boundary Testing Article',
      });
      const articles = new Map<string, NewsArticle>([['boundary', article]]);

      // Exactly 7 days ago - should NOT be recent
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const history: HistoryEntry[] = [
        { articleId: 'boundary', timestamp: sevenDaysAgo },
      ];

      const result = extractUserInterests(history, articles);

      // At exactly 7 days, timestamp === sevenDaysAgo, not > sevenDaysAgo
      expect(result.recentTopics.size).toBe(0);
    });
  });

  describe('topTopics per D-12', () => {
    it('returns top 3 topics sorted by weight', () => {
      // Clear default topics to isolate title keyword extraction
      const article1 = getMockNewsArticle({
        id: 'a1',
        title: 'Blockchain Blockchain Blockchain Blockchain', // 4 occurrences
        topics: [],
      });
      const article2 = getMockNewsArticle({
        id: 'a2',
        title: 'Cryptocurrency Cryptocurrency Cryptocurrency', // 3 occurrences
        topics: [],
      });
      const article3 = getMockNewsArticle({
        id: 'a3',
        title: 'Innovation Innovation', // 2 occurrences
        topics: [],
      });

      const articles = new Map<string, NewsArticle>([
        ['a1', article1],
        ['a2', article2],
        ['a3', article3],
      ]);

      const now = Date.now();
      const history: HistoryEntry[] = [
        { articleId: 'a1', timestamp: now },
        { articleId: 'a2', timestamp: now },
        { articleId: 'a3', timestamp: now },
      ];

      const result = extractUserInterests(history, articles);

      expect(result.topTopics.length).toBeLessThanOrEqual(3);
      // blockchain: 4 occurrences * 2 weight = 8
      // cryptocurrency: 3 occurrences * 2 weight = 6
      // innovation: 2 occurrences * 2 weight = 4
      expect(result.topTopics[0]).toBe('blockchain');
      expect(result.topTopics[1]).toBe('cryptocurrency');
      expect(result.topTopics[2]).toBe('innovation');
    });

    it('respects readCount for weighting', () => {
      const article = getMockNewsArticle({
        id: 'multi-read',
        title: 'Favorite Article Topic',
      });
      const articles = new Map<string, NewsArticle>([['multi-read', article]]);

      const history: HistoryEntry[] = [
        { articleId: 'multi-read', timestamp: Date.now(), readCount: 5 },
      ];

      const result = extractUserInterests(history, articles);

      // Recent article with readCount 5 = 5 * 2 = 10 weight per keyword
      expect(result.topics.get('favorite')).toBe(10);
      expect(result.topics.get('article')).toBe(10);
      expect(result.topics.get('topic')).toBe(10);
    });
  });
});

describe('scoreArticleForUser', () => {
  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero score for no interest overlap', () => {
    const interests = extractUserInterests([], new Map());
    const article = getMockNewsArticle({
      title: 'Random Article Without Match',
      publishedAt: new Date(),
    });

    const result = scoreArticleForUser(article, interests);

    expect(result.score).toBe(0);
    expect(result.matchedTopic).toBeNull();
  });

  it('scores higher for topic matches', () => {
    // Clear default topics to isolate title keyword matching
    const historyArticle = getMockNewsArticle({
      id: 'history-1',
      title: 'Blockchain Technology Discussion',
      topics: [], // Clear default topics
    });
    const articles = new Map<string, NewsArticle>([['history-1', historyArticle]]);
    const history: HistoryEntry[] = [
      { articleId: 'history-1', timestamp: Date.now() },
    ];
    const interests = extractUserInterests(history, articles);

    const matchingArticle = getMockNewsArticle({
      title: 'Blockchain Innovation Updates',
      topics: [], // Clear default topics
      publishedAt: new Date(),
    });
    const nonMatchingArticle = getMockNewsArticle({
      title: 'Sports Basketball Game',
      topics: [], // Clear default topics
      publishedAt: new Date(),
    });

    const matchingScore = scoreArticleForUser(matchingArticle, interests);
    const nonMatchingScore = scoreArticleForUser(nonMatchingArticle, interests);

    expect(matchingScore.score).toBeGreaterThan(nonMatchingScore.score);
    expect(matchingScore.matchedTopic).toBe('blockchain');
  });

  it('applies 1.5x weight for recent topic matches', () => {
    // Clear default topics to isolate title keyword matching
    const article1 = getMockNewsArticle({
      id: 'recent',
      title: 'Blockchain Innovation',
      topics: [], // Clear default topics
    });
    const article2 = getMockNewsArticle({
      id: 'old',
      title: 'Cryptocurrency Trading',
      topics: [], // Clear default topics
    });

    const articles = new Map<string, NewsArticle>([
      ['recent', article1],
      ['old', article2],
    ]);

    const now = Date.now();
    const oldTime = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago

    const history: HistoryEntry[] = [
      { articleId: 'recent', timestamp: now },
      { articleId: 'old', timestamp: oldTime },
    ];

    const interests = extractUserInterests(history, articles);

    // Article about blockchain (recent topic) vs cryptocurrency (old topic)
    const recentTopicArticle = getMockNewsArticle({
      title: 'Blockchain Development Framework',
      topics: [], // Clear default topics
      publishedAt: new Date(),
    });
    const oldTopicArticle = getMockNewsArticle({
      title: 'Cryptocurrency Market Analysis',
      topics: [], // Clear default topics
      publishedAt: new Date(),
    });

    const recentTopicScore = scoreArticleForUser(recentTopicArticle, interests);
    const oldTopicScore = scoreArticleForUser(oldTopicArticle, interests);

    // Blockchain is in recentTopics, so gets 1.5x boost
    // Recent: blockchain base=2, recentBoost=2*1.5=3, total=5
    // Old: cryptocurrency base=1, recentBoost=0, total=1
    expect(recentTopicScore.score).toBeGreaterThan(oldTopicScore.score);
  });

  it('adds regional preference bonus', () => {
    const historyArticle = getMockArticleFromRegion('nahost', {
      id: 'nahost-article',
      title: 'Regional News',
    });
    const articles = new Map<string, NewsArticle>([['nahost-article', historyArticle]]);
    const history: HistoryEntry[] = [
      { articleId: 'nahost-article', timestamp: Date.now() },
    ];
    const interests = extractUserInterests(history, articles);

    // Two articles with same keywords but different regions
    const nahostArticle = getMockArticleFromRegion('nahost', {
      title: 'Update News Brief',
      publishedAt: new Date(),
    });
    const usaArticle = getMockArticleFromRegion('usa', {
      title: 'Update News Brief',
      publishedAt: new Date(),
    });

    const nahostScore = scoreArticleForUser(nahostArticle, interests);
    const usaScore = scoreArticleForUser(usaArticle, interests);

    // Nahost should have higher score due to regional preference
    expect(nahostScore.score).toBeGreaterThan(usaScore.score);
  });

  it('applies recency boost for fresh articles', () => {
    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Breaking News Story',
    });
    const articles = new Map<string, NewsArticle>([['history', historyArticle]]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];
    const interests = extractUserInterests(history, articles);

    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const freshArticle = getMockNewsArticle({
      title: 'Breaking Development Today',
      publishedAt: threeHoursAgo, // < 6h = 1.3x boost
    });
    const recentArticle = getMockNewsArticle({
      title: 'Breaking Development Today',
      publishedAt: twelveHoursAgo, // < 24h = 1.1x boost
    });
    const oldArticle = getMockNewsArticle({
      title: 'Breaking Development Today',
      publishedAt: twoDaysAgo, // No boost
    });

    const freshScore = scoreArticleForUser(freshArticle, interests);
    const recentScore = scoreArticleForUser(recentArticle, interests);
    const oldScore = scoreArticleForUser(oldArticle, interests);

    expect(freshScore.score).toBeGreaterThan(recentScore.score);
    expect(recentScore.score).toBeGreaterThan(oldScore.score);
  });

  it('matches article topics array', () => {
    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Generic News',
      topics: ['cryptocurrency', 'blockchain'],
    });
    const articles = new Map<string, NewsArticle>([['history', historyArticle]]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];
    const interests = extractUserInterests(history, articles);

    const matchingArticle = getMockNewsArticle({
      title: 'Market Update',
      topics: ['cryptocurrency'],
      publishedAt: new Date(),
    });

    const result = scoreArticleForUser(matchingArticle, interests);

    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedTopic).toBe('cryptocurrency');
  });
});

describe('getRecommendations', () => {
  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('read article exclusion per D-21', () => {
    it('excludes already-read articles', () => {
      const article1 = getMockNewsArticle({
        id: 'read-article',
        title: 'Climate News Update',
        publishedAt: new Date(),
      });
      const article2 = getMockNewsArticle({
        id: 'unread-article',
        title: 'Climate News Report',
        publishedAt: new Date(),
      });

      const historyArticle = getMockNewsArticle({
        id: 'history-article',
        title: 'Climate Discussion',
      });

      const historyArticles = new Map<string, NewsArticle>([
        ['history-article', historyArticle],
      ]);
      const history: HistoryEntry[] = [
        { articleId: 'history-article', timestamp: Date.now() },
        { articleId: 'read-article', timestamp: Date.now() }, // Already read
      ];

      const recommendations = getRecommendations(
        [article1, article2],
        history,
        historyArticles
      );

      const recommendedIds = recommendations.map((r) => r.article.id);
      expect(recommendedIds).not.toContain('read-article');
      expect(recommendedIds).toContain('unread-article');
    });
  });

  it('returns articles sorted by score', () => {
    const lowScoreArticle = getMockNewsArticle({
      id: 'low',
      title: 'Random Sports Event',
      publishedAt: new Date(),
    });
    const highScoreArticle = getMockNewsArticle({
      id: 'high',
      title: 'Climate Policy Update',
      publishedAt: new Date(),
    });

    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Climate Discussion',
    });
    const historyArticles = new Map<string, NewsArticle>([
      ['history', historyArticle],
    ]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];

    const recommendations = getRecommendations(
      [lowScoreArticle, highScoreArticle],
      history,
      historyArticles
    );

    // Filter to only those with positive score
    const positiveRecs = recommendations.filter((r) => r.score > 0);
    if (positiveRecs.length >= 2) {
      expect(positiveRecs[0].score).toBeGreaterThanOrEqual(positiveRecs[1].score);
    }
  });

  it('respects limit parameter', () => {
    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Climate Technology Innovation',
    });
    const historyArticles = new Map<string, NewsArticle>([
      ['history', historyArticle],
    ]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];

    const articles = Array.from({ length: 20 }, (_, i) =>
      getMockNewsArticle({
        id: `article-${i}`,
        title: `Climate News Article ${i}`,
        publishedAt: new Date(),
      })
    );

    const recommendations = getRecommendations(articles, history, historyArticles, 5);

    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  it('only includes articles with positive score', () => {
    const matchingArticle = getMockNewsArticle({
      id: 'matching',
      title: 'Climate Policy Update',
      publishedAt: new Date(),
    });
    const nonMatchingArticle = getMockNewsArticle({
      id: 'non-matching',
      title: 'Xylophones Zephyrs Quirky',
      publishedAt: new Date(),
    });

    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Climate Discussion',
    });
    const historyArticles = new Map<string, NewsArticle>([
      ['history', historyArticle],
    ]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];

    const recommendations = getRecommendations(
      [matchingArticle, nonMatchingArticle],
      history,
      historyArticles
    );

    recommendations.forEach((rec) => {
      expect(rec.score).toBeGreaterThan(0);
    });
  });

  it('uses default limit of 12', () => {
    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Climate Technology',
    });
    const historyArticles = new Map<string, NewsArticle>([
      ['history', historyArticle],
    ]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];

    const articles = Array.from({ length: 50 }, (_, i) =>
      getMockNewsArticle({
        id: `article-${i}`,
        title: `Climate Technology News ${i}`,
        publishedAt: new Date(),
      })
    );

    const recommendations = getRecommendations(articles, history, historyArticles);

    expect(recommendations.length).toBeLessThanOrEqual(12);
  });

  it('handles empty article list', () => {
    const historyArticle = getMockNewsArticle({
      id: 'history',
      title: 'Climate Discussion',
    });
    const historyArticles = new Map<string, NewsArticle>([
      ['history', historyArticle],
    ]);
    const history: HistoryEntry[] = [
      { articleId: 'history', timestamp: Date.now() },
    ];

    const recommendations = getRecommendations([], history, historyArticles);

    expect(recommendations).toEqual([]);
  });

  it('handles empty history (cold start)', () => {
    const articles = [
      getMockNewsArticle({
        id: 'article-1',
        title: 'News Article One',
        publishedAt: new Date(),
      }),
    ];

    const recommendations = getRecommendations(articles, [], new Map());

    // With no history, no interests, so no positive scores
    expect(recommendations).toEqual([]);
  });
});

describe('formatTopicBadge', () => {
  it('capitalizes first letter', () => {
    const result = formatTopicBadge('climate');
    expect(result).toBe('Climate');
  });

  it('preserves rest of string', () => {
    const result = formatTopicBadge('POLITICS');
    expect(result).toBe('POLITICS');
  });

  it('handles mixed case', () => {
    const result = formatTopicBadge('tEcHnOlOgY');
    expect(result).toBe('TEcHnOlOgY');
  });

  it('handles single character', () => {
    const result = formatTopicBadge('a');
    expect(result).toBe('A');
  });

  it('handles empty string', () => {
    const result = formatTopicBadge('');
    expect(result).toBe('');
  });

  it('handles already capitalized', () => {
    const result = formatTopicBadge('Economy');
    expect(result).toBe('Economy');
  });
});
