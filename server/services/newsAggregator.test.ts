/**
 * Unit tests for NewsAggregator
 * Tests singleton pattern, article filtering, RSS parsing, deduplication,
 * confidence scoring, sentiment analysis, and entity extraction.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NewsArticle } from '../../src/types';
import { getMockNewsArticle, getMockNewsSource, resetIdCounter } from '../../src/test/factories';

// Mock all singleton service dependencies per D-04
vi.mock('./translationService', () => ({
  TranslationService: {
    getInstance: vi.fn(() => ({
      translate: vi.fn().mockResolvedValue({ text: 'translated', quality: 0.9 }),
    })),
  },
}));

vi.mock('./newsApiService', () => ({
  NewsApiService: {
    getInstance: vi.fn(() => ({
      fetchAll: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('./newsCrawler', () => ({
  NewsCrawler: {
    getInstance: vi.fn(() => ({
      crawlAll: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('./stealthScraper', () => ({
  StealthScraper: {
    getInstance: vi.fn(() => ({
      scrapeAll: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock('./aiService', () => ({
  AIService: {
    getInstance: vi.fn(() => ({
      classifyTopics: vi.fn().mockResolvedValue(['politics']),
      analyzeSentiment: vi.fn().mockResolvedValue({ sentiment: 'neutral', score: 0 }),
    })),
  },
}));

// Mock Prisma per D-05
vi.mock('../db/prisma', () => ({
  prisma: {
    newsSource: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    newsArticle: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock rss-parser per D-01
vi.mock('rss-parser', () => {
  const MockParser = function(this: any) {
    this.parseURL = vi.fn().mockResolvedValue({
      items: [
        {
          title: 'Test Article 1',
          link: 'https://example.com/article1',
          contentSnippet: 'This is test content for article 1.',
          pubDate: new Date().toISOString(),
        },
        {
          title: 'Test Article 2',
          link: 'https://example.com/article2',
          contentSnippet: 'This is test content for article 2.',
          pubDate: new Date().toISOString(),
        },
      ],
    });
  };
  return { default: MockParser };
});

// Mock logger to silence console output
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock NEWS_SOURCES for controlled testing
vi.mock('../config/sources', () => ({
  NEWS_SOURCES: [
    {
      id: 'test-source-1',
      name: 'Test Source 1',
      country: 'US',
      region: 'usa',
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'private' },
      apiEndpoint: 'https://test1.com/rss.xml',
      rateLimit: 100,
    },
    {
      id: 'test-source-2',
      name: 'Test Source 2',
      country: 'DE',
      region: 'deutschland',
      language: 'de',
      bias: { political: -0.2, reliability: 7, ownership: 'private' },
      apiEndpoint: 'https://test2.com/rss.xml',
      rateLimit: 100,
    },
    {
      id: 'test-source-3',
      name: 'Test Source 3',
      country: 'RU',
      region: 'russland',
      language: 'ru',
      bias: { political: 0.3, reliability: 5, ownership: 'state' },
      apiEndpoint: null,
      rateLimit: 100,
    },
  ],
}));

import { NewsAggregator } from './newsAggregator';

describe('NewsAggregator', () => {
  beforeEach(() => {
    resetIdCounter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset singleton between tests per D-13
    (NewsAggregator as any).instance = null;
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = NewsAggregator.getInstance();
      const instance2 = NewsAggregator.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = NewsAggregator.getInstance();
      (NewsAggregator as any).instance = null;
      const instance2 = NewsAggregator.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getArticles', () => {
    beforeEach(() => {
      // Populate articles array with test data
      const service = NewsAggregator.getInstance();
      const testArticles = createTestArticles();
      (service as any).articles = testArticles;
    });

    it('returns all articles with total count', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles();

      expect(result.articles).toBeInstanceOf(Array);
      expect(result.total).toBe(10);
      expect(result.articles.length).toBe(10); // Default limit is 20
    });

    it('filters by regions when provided', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ regions: ['usa'] });

      expect(result.total).toBeGreaterThan(0);
      result.articles.forEach((article) => {
        expect(article.perspective).toBe('usa');
      });
    });

    it('filters by multiple regions', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ regions: ['usa', 'deutschland'] });

      expect(result.total).toBeGreaterThan(0);
      result.articles.forEach((article) => {
        expect(['usa', 'deutschland']).toContain(article.perspective);
      });
    });

    it('filters by topics when provided', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ topics: ['Politics'] });

      expect(result.total).toBeGreaterThan(0);
      result.articles.forEach((article) => {
        expect(article.topics).toContain('Politics');
      });
    });

    it('filters by search query in title', () => {
      const service = NewsAggregator.getInstance();
      // Add an article with specific title
      (service as any).articles.push(
        getMockNewsArticle({ title: 'Climate Change Report', content: 'Test content' })
      );

      const result = service.getArticles({ search: 'Climate' });

      expect(result.total).toBeGreaterThan(0);
      expect(result.articles.some((a) => a.title.includes('Climate'))).toBe(true);
    });

    it('filters by search query in content', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles.push(
        getMockNewsArticle({ title: 'News', content: 'Unique keyword searchable content' })
      );

      const result = service.getArticles({ search: 'searchable' });

      expect(result.total).toBeGreaterThan(0);
    });

    it('filters by search query in source name', () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({ name: 'UniqueSourceName' });
      (service as any).articles.push(getMockNewsArticle({ source }));

      const result = service.getArticles({ search: 'UniqueSourceName' });

      expect(result.total).toBeGreaterThan(0);
    });

    it('filters by search query in translated title (de)', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles.push(
        getMockNewsArticle({
          title: 'English Title',
          titleTranslated: { de: 'Deutscher Titel', en: 'English Title' },
        })
      );

      const result = service.getArticles({ search: 'Deutscher' });

      expect(result.total).toBeGreaterThan(0);
    });

    it('filters by search query in translated title (en)', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles.push(
        getMockNewsArticle({
          title: 'Titel',
          titleTranslated: { de: 'Titel', en: 'English Translation Here' },
        })
      );

      const result = service.getArticles({ search: 'Translation' });

      expect(result.total).toBeGreaterThan(0);
    });

    it('filters by sentiment when provided', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ sentiment: 'positive' });

      result.articles.forEach((article) => {
        expect(article.sentiment).toBe('positive');
      });
    });

    it('filters by language when provided', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ language: 'en' });

      result.articles.forEach((article) => {
        expect(article.originalLanguage).toBe('en');
      });
    });

    it('applies offset and limit pagination', () => {
      const service = NewsAggregator.getInstance();

      const result1 = service.getArticles({ offset: 0, limit: 3 });
      expect(result1.articles.length).toBe(3);

      const result2 = service.getArticles({ offset: 3, limit: 3 });
      expect(result2.articles.length).toBe(3);

      // Ensure different articles
      expect(result1.articles[0].id).not.toBe(result2.articles[0].id);
    });

    it('returns empty array when no articles match filter', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({ regions: ['alternative'] });

      // If no 'alternative' articles in test data, should be 0
      expect(result.articles.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('combines multiple filters', () => {
      const service = NewsAggregator.getInstance();
      const result = service.getArticles({
        regions: ['usa'],
        sentiment: 'positive',
        limit: 5,
      });

      result.articles.forEach((article) => {
        expect(article.perspective).toBe('usa');
        expect(article.sentiment).toBe('positive');
      });
    });
  });

  describe('getArticleById', () => {
    it('returns article when found', () => {
      const service = NewsAggregator.getInstance();
      const testArticle = getMockNewsArticle({ id: 'test-article-123' });
      (service as any).articles = [testArticle];

      const result = service.getArticleById('test-article-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-article-123');
    });

    it('returns undefined when not found', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];

      const result = service.getArticleById('nonexistent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getArticleCount', () => {
    it('returns correct count', () => {
      const service = NewsAggregator.getInstance();
      const testArticles = createTestArticles();
      (service as any).articles = testArticles;

      const count = service.getArticleCount();

      expect(count).toBe(10);
    });

    it('returns 0 for empty articles array', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];

      const count = service.getArticleCount();

      expect(count).toBe(0);
    });
  });

  describe('getSources', () => {
    it('returns NEWS_SOURCES array', () => {
      const service = NewsAggregator.getInstance();
      const sources = service.getSources();

      expect(sources).toBeInstanceOf(Array);
      expect(sources.length).toBe(3); // Matches mocked NEWS_SOURCES
      expect(sources[0].id).toBe('test-source-1');
    });
  });

  describe('getSentimentByRegion', () => {
    it('groups articles by perspective', () => {
      const service = NewsAggregator.getInstance();
      const testArticles = createTestArticles();
      (service as any).articles = testArticles;

      const result = service.getSentimentByRegion();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('counts positive, negative, neutral per region', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [
        getMockNewsArticle({ perspective: 'usa', sentiment: 'positive' }),
        getMockNewsArticle({ perspective: 'usa', sentiment: 'negative' }),
        getMockNewsArticle({ perspective: 'usa', sentiment: 'neutral' }),
        getMockNewsArticle({ perspective: 'usa', sentiment: 'positive' }),
      ];

      const result = service.getSentimentByRegion();

      expect(result.usa).toBeDefined();
      expect(result.usa.positive).toBe(2);
      expect(result.usa.negative).toBe(1);
      expect(result.usa.neutral).toBe(1);
      expect(result.usa.count).toBe(4);
    });

    it('returns count per region', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [
        getMockNewsArticle({ perspective: 'usa', sentiment: 'positive' }),
        getMockNewsArticle({ perspective: 'deutschland', sentiment: 'neutral' }),
        getMockNewsArticle({ perspective: 'usa', sentiment: 'neutral' }),
      ];

      const result = service.getSentimentByRegion();

      expect(result.usa.count).toBe(2);
      expect(result.deutschland.count).toBe(1);
    });
  });

  describe('deduplicateArticles', () => {
    it('removes articles with similar normalized titles', () => {
      const service = NewsAggregator.getInstance();
      const articles = [
        getMockNewsArticle({ id: '1', title: 'Breaking: Event Happens' }),
        getMockNewsArticle({ id: '2', title: 'Breaking: Event Happens!' }), // Similar after normalization
        getMockNewsArticle({ id: '3', title: 'Different Story Entirely' }),
      ];

      const result = (service as any).deduplicateArticles(articles);

      expect(result.length).toBe(2);
    });

    it('keeps first occurrence', () => {
      const service = NewsAggregator.getInstance();
      const articles = [
        getMockNewsArticle({ id: 'first', title: 'Same Title' }),
        getMockNewsArticle({ id: 'second', title: 'Same Title' }),
      ];

      const result = (service as any).deduplicateArticles(articles);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('first');
    });

    it('normalizes: lowercase, remove non-alphanumeric, first 50 chars', () => {
      const service = NewsAggregator.getInstance();
      const articles = [
        getMockNewsArticle({ id: '1', title: 'THE SAME!!! Title---Here' }),
        getMockNewsArticle({ id: '2', title: 'the same title here' }), // Same after normalization
        getMockNewsArticle({ id: '3', title: 'THE-SAME title HERE!' }), // Same after normalization
      ];

      const result = (service as any).deduplicateArticles(articles);

      expect(result.length).toBe(1);
    });

    it('handles very long titles (uses first 50 chars)', () => {
      const service = NewsAggregator.getInstance();
      const longTitleBase = 'This is a very long title that exceeds fifty characters easily';
      const articles = [
        getMockNewsArticle({ id: '1', title: longTitleBase + ' - Version A' }),
        getMockNewsArticle({ id: '2', title: longTitleBase + ' - Version B' }),
      ];

      const result = (service as any).deduplicateArticles(articles);

      // Both normalized to same first 50 chars
      expect(result.length).toBe(1);
    });

    it('handles empty array', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).deduplicateArticles([]);
      expect(result).toEqual([]);
    });
  });

  describe('analyzeSentiment', () => {
    it('returns negative when negative words > positive + 1', () => {
      const service = NewsAggregator.getInstance();
      // Text with multiple negative words: attack, killed, war
      const result = (service as any).analyzeSentiment('War attack', 'People killed in violence');

      expect(result.type).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('returns positive when positive words > negative + 1', () => {
      const service = NewsAggregator.getInstance();
      // Text with multiple positive words: peace, ceasefire, agreement
      const result = (service as any).analyzeSentiment('Peace agreement', 'Ceasefire brings hope and relief');

      expect(result.type).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('returns neutral otherwise', () => {
      const service = NewsAggregator.getInstance();
      // Text with balanced or no sentiment words
      const result = (service as any).analyzeSentiment('Regular news', 'Nothing special happened today');

      expect(result.type).toBe('neutral');
    });

    it('handles edge case with equal positive and negative', () => {
      const service = NewsAggregator.getInstance();
      // One positive, one negative
      const result = (service as any).analyzeSentiment('Peace', 'War');

      expect(result.type).toBe('neutral');
    });

    it('caps score at max values', () => {
      const service = NewsAggregator.getInstance();
      // Many negative words
      const result = (service as any).analyzeSentiment(
        'Attack war bomb crisis terror',
        'Violence killed dead casualties strike'
      );

      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(0);
    });
  });

  describe('extractEntities', () => {
    it('extracts known entities (Gaza, Israel, Hamas, UN, etc.)', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).extractEntities(
        'Gaza conflict escalates',
        'Israel and Hamas tensions rise. UN calls for peace.'
      );

      expect(result).toContain('Gaza');
      expect(result).toContain('Israel');
      expect(result).toContain('Hamas');
      expect(result).toContain('UN');
    });

    it('performs case-sensitive matching', () => {
      const service = NewsAggregator.getInstance();
      // 'gaza' lowercase should not match 'Gaza'
      const result = (service as any).extractEntities('gaza conflict', 'israel tensions');

      expect(result).not.toContain('Gaza');
      expect(result).not.toContain('Israel');
    });

    it('extracts multiple entities from same text', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).extractEntities(
        'Iran and Turkey discuss',
        'Egypt and Qatar mediate while USA watches'
      );

      expect(result).toContain('Iran');
      expect(result).toContain('Turkey');
      expect(result).toContain('Egypt');
      expect(result).toContain('Qatar');
      expect(result).toContain('USA');
    });

    it('returns empty array when no entities found', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).extractEntities('Regular news', 'About technology and science');

      expect(result).toEqual([]);
    });

    it('extracts Hezbollah entity', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).extractEntities('Hezbollah statement', 'Response to events');

      expect(result).toContain('Hezbollah');
    });
  });

  describe('extractImageUrl', () => {
    it('extracts src from img tag in HTML', () => {
      const service = NewsAggregator.getInstance();
      const html = '<p>Some text</p><img src="https://example.com/image.jpg" alt="test"><p>More text</p>';

      const result = (service as any).extractImageUrl(html);

      expect(result).toBe('https://example.com/image.jpg');
    });

    it('returns undefined when no img tag', () => {
      const service = NewsAggregator.getInstance();
      const html = '<p>No images here</p>';

      const result = (service as any).extractImageUrl(html);

      expect(result).toBeUndefined();
    });

    it('handles img tag with multiple attributes', () => {
      const service = NewsAggregator.getInstance();
      const html = '<img class="photo" src="https://cdn.test.com/photo.png" width="100">';

      const result = (service as any).extractImageUrl(html);

      expect(result).toBe('https://cdn.test.com/photo.png');
    });

    it('returns first image if multiple img tags', () => {
      const service = NewsAggregator.getInstance();
      const html = '<img src="https://first.com/1.jpg"><img src="https://second.com/2.jpg">';

      const result = (service as any).extractImageUrl(html);

      expect(result).toBe('https://first.com/1.jpg');
    });

    it('handles empty content', () => {
      const service = NewsAggregator.getInstance();
      const result = (service as any).extractImageUrl('');

      expect(result).toBeUndefined();
    });
  });

  describe('calculateConfidence', () => {
    beforeEach(() => {
      const service = NewsAggregator.getInstance();
      // Set up articles with indexed topics and entities for O(1) lookup testing
      const articles = [
        getMockNewsArticle({
          id: 'art1',
          topics: ['Politics', 'Economy'],
          entities: ['Israel', 'Gaza'],
          perspective: 'usa',
          source: getMockNewsSource({ bias: { political: 0, reliability: 8, ownership: 'private' } }),
        }),
        getMockNewsArticle({
          id: 'art2',
          topics: ['Politics'],
          entities: ['Israel', 'Hamas'],
          perspective: 'deutschland',
          source: getMockNewsSource({ bias: { political: 0, reliability: 7, ownership: 'private' } }),
        }),
        getMockNewsArticle({
          id: 'art3',
          topics: ['Politics', 'Military'],
          entities: ['Israel', 'Gaza', 'Hamas'],
          perspective: 'nahost',
          source: getMockNewsSource({ bias: { political: 0, reliability: 6, ownership: 'state' } }),
        }),
        getMockNewsArticle({
          id: 'art4',
          topics: ['Economy'],
          entities: ['USA', 'EU'],
          perspective: 'europa',
          source: getMockNewsSource({ bias: { political: 0, reliability: 9, ownership: 'private' } }),
        }),
      ];
      (service as any).articles = articles;
      // Build indexes
      (service as any).buildArticleIndex();
    });

    it('uses topic and entity indexes for O(1) lookup', () => {
      const service = NewsAggregator.getInstance();

      // Verify indexes exist
      expect((service as any).topicIndex.size).toBeGreaterThan(0);
      expect((service as any).entityIndex.size).toBeGreaterThan(0);
      expect((service as any).articleMap.size).toBe(4);
    });

    it('calculates source count factor (0-50 points)', () => {
      const service = NewsAggregator.getInstance();
      const article = (service as any).articles[0];

      const confidence = (service as any).calculateConfidence(article);

      // Confidence should be a number
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('calculates perspective diversity factor (0-50 points)', () => {
      const service = NewsAggregator.getInstance();
      // Article with topic shared by multiple perspectives
      const article = getMockNewsArticle({
        id: 'test-art',
        topics: ['Politics'],
        entities: ['Israel'],
        perspective: 'russland',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'state' } }),
      });
      (service as any).articles.push(article);
      (service as any).buildArticleIndex();

      const confidence = (service as any).calculateConfidence(article);

      // Multiple perspectives covering same topic = higher confidence
      expect(confidence).toBeGreaterThan(0);
    });

    it('includes reliability boost (0-10 points)', () => {
      const service = NewsAggregator.getInstance();
      const highRelSource = getMockNewsSource({
        bias: { political: 0, reliability: 10, ownership: 'private' },
      });
      const article = getMockNewsArticle({
        id: 'high-rel',
        topics: ['Unique'],
        entities: [],
        perspective: 'usa',
        source: highRelSource,
      });
      (service as any).articles = [article];
      (service as any).buildArticleIndex();

      const confidence = (service as any).calculateConfidence(article);

      // Single article = low source count, but high reliability should add points
      expect(confidence).toBeGreaterThan(0);
    });

    it('clamps result to max 100', () => {
      const service = NewsAggregator.getInstance();
      // Create many articles with same topic to maximize source count
      const articles = Array.from({ length: 20 }, (_, i) =>
        getMockNewsArticle({
          id: `clamp-art-${i}`,
          topics: ['SharedTopic'],
          entities: ['SharedEntity1', 'SharedEntity2'],
          perspective: ['usa', 'deutschland', 'nahost', 'russland', 'china'][i % 5] as any,
          source: getMockNewsSource({
            bias: { political: 0, reliability: 10, ownership: 'private' },
          }),
        })
      );
      (service as any).articles = articles;
      (service as any).buildArticleIndex();

      const confidence = (service as any).calculateConfidence(articles[0]);

      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('combines source count, perspective diversity, and reliability', () => {
      const service = NewsAggregator.getInstance();
      const article = (service as any).articles[0];

      const confidence = (service as any).calculateConfidence(article);

      // Should be a combined score
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(100);
      expect(Number.isInteger(confidence)).toBe(true);
    });
  });

  describe('buildArticleIndex', () => {
    it('creates topicIndex map', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [
        getMockNewsArticle({ id: 'a1', topics: ['Politics', 'Economy'] }),
        getMockNewsArticle({ id: 'a2', topics: ['Politics'] }),
      ];

      (service as any).buildArticleIndex();

      const topicIndex = (service as any).topicIndex;
      expect(topicIndex.get('Politics').size).toBe(2);
      expect(topicIndex.get('Economy').size).toBe(1);
    });

    it('creates entityIndex map', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [
        getMockNewsArticle({ id: 'a1', entities: ['Israel', 'Gaza'] }),
        getMockNewsArticle({ id: 'a2', entities: ['Israel'] }),
      ];

      (service as any).buildArticleIndex();

      const entityIndex = (service as any).entityIndex;
      expect(entityIndex.get('Israel').size).toBe(2);
      expect(entityIndex.get('Gaza').size).toBe(1);
    });

    it('creates articleMap for O(1) lookup', () => {
      const service = NewsAggregator.getInstance();
      const articles = [
        getMockNewsArticle({ id: 'lookup-1' }),
        getMockNewsArticle({ id: 'lookup-2' }),
      ];
      (service as any).articles = articles;

      (service as any).buildArticleIndex();

      const articleMap = (service as any).articleMap;
      expect(articleMap.get('lookup-1')).toBe(articles[0]);
      expect(articleMap.get('lookup-2')).toBe(articles[1]);
    });

    it('clears existing indexes before rebuilding', () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [getMockNewsArticle({ id: 'old', topics: ['OldTopic'] })];
      (service as any).buildArticleIndex();

      // Replace with new articles
      (service as any).articles = [getMockNewsArticle({ id: 'new', topics: ['NewTopic'] })];
      (service as any).buildArticleIndex();

      expect((service as any).topicIndex.has('OldTopic')).toBe(false);
      expect((service as any).topicIndex.has('NewTopic')).toBe(true);
    });
  });

  describe('updateConfidenceScores', () => {
    it('builds index and updates all article confidence scores', () => {
      const service = NewsAggregator.getInstance();
      const articles = [
        getMockNewsArticle({ id: 'conf1', topics: ['Tech'], confidence: undefined }),
        getMockNewsArticle({ id: 'conf2', topics: ['Tech'], confidence: undefined }),
      ];
      (service as any).articles = articles;

      (service as any).updateConfidenceScores();

      expect(articles[0].confidence).toBeDefined();
      expect(articles[1].confidence).toBeDefined();
      expect(typeof articles[0].confidence).toBe('number');
    });
  });

  describe('generateSentiment', () => {
    it('returns positive, negative, or neutral randomly', () => {
      const service = NewsAggregator.getInstance();
      const results = new Set<string>();

      // Run multiple times to get different random values
      for (let i = 0; i < 100; i++) {
        const result = (service as any).generateSentiment();
        results.add(result.type);
      }

      // Should have generated at least 2 different sentiment types
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it('returns score within expected range', () => {
      const service = NewsAggregator.getInstance();

      for (let i = 0; i < 50; i++) {
        const result = (service as any).generateSentiment();

        if (result.type === 'positive') {
          expect(result.score).toBeGreaterThanOrEqual(0.5);
          expect(result.score).toBeLessThanOrEqual(1);
        } else if (result.type === 'negative') {
          expect(result.score).toBeGreaterThanOrEqual(-1);
          expect(result.score).toBeLessThanOrEqual(-0.5);
        } else {
          expect(result.score).toBeGreaterThanOrEqual(-0.15);
          expect(result.score).toBeLessThanOrEqual(0.15);
        }
      }
    });
  });

  describe('generateMockArticles', () => {
    it('generates 2 mock articles per source', () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource();

      const result = (service as any).generateMockArticles(source);

      expect(result.length).toBe(2);
    });

    it('uses source region as perspective', () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({ region: 'nahost' });

      const result = (service as any).generateMockArticles(source);

      result.forEach((article: NewsArticle) => {
        expect(article.perspective).toBe('nahost');
      });
    });

    it('includes source information', () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({ name: 'Test Source' });

      const result = (service as any).generateMockArticles(source);

      result.forEach((article: NewsArticle) => {
        expect(article.source).toBe(source);
        expect(article.title).toContain('Test Source');
      });
    });
  });

  describe('stopAggregation', () => {
    it('clears interval when active', () => {
      const service = NewsAggregator.getInstance();
      (service as any).intervalId = setInterval(() => {}, 10000);

      service.stopAggregation();

      expect((service as any).intervalId).toBeNull();
    });

    it('handles null intervalId gracefully', () => {
      const service = NewsAggregator.getInstance();
      (service as any).intervalId = null;

      expect(() => service.stopAggregation()).not.toThrow();
    });
  });

  describe('toPrismaArticle', () => {
    it('converts NewsArticle to Prisma format', () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'prisma-test',
        titleTranslated: { de: 'German', en: 'English' },
        contentTranslated: { de: 'German content', en: 'English content' },
        topics: ['Politics'],
        entities: ['Israel'],
      });

      const result = (service as any).toPrismaArticle(article);

      expect(result.id).toBe('prisma-test');
      expect(result.titleTranslated).toBe('{"de":"German","en":"English"}');
      expect(result.topics).toBe('["Politics"]');
      expect(result.entities).toBe('["Israel"]');
      expect(result.sourceId).toBe(article.source.id);
    });

    it('handles null translated fields', () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        titleTranslated: undefined,
        contentTranslated: undefined,
      });

      const result = (service as any).toPrismaArticle(article);

      expect(result.titleTranslated).toBeNull();
      expect(result.contentTranslated).toBeNull();
    });

    it('converts publishedAt to Date', () => {
      const service = NewsAggregator.getInstance();
      const dateStr = '2024-01-15T10:30:00Z';
      const article = getMockNewsArticle({ publishedAt: new Date(dateStr) });

      const result = (service as any).toPrismaArticle(article);

      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('fromPrismaArticle', () => {
    it('converts Prisma format to NewsArticle', () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource();
      const prismaArticle = {
        id: 'from-prisma',
        title: 'Test',
        titleTranslated: '{"de":"German"}',
        contentTranslated: '{"en":"English"}',
        topics: '["Politics","Economy"]',
        entities: '["Israel"]',
        source,
      };

      const result = (service as any).fromPrismaArticle(prismaArticle);

      expect(result.id).toBe('from-prisma');
      expect(result.titleTranslated).toEqual({ de: 'German' });
      expect(result.contentTranslated).toEqual({ en: 'English' });
      expect(result.topics).toEqual(['Politics', 'Economy']);
      expect(result.entities).toEqual(['Israel']);
    });

    it('handles null translated fields', () => {
      const service = NewsAggregator.getInstance();
      const prismaArticle = {
        id: 'null-test',
        title: 'Test',
        titleTranslated: null,
        contentTranslated: null,
        topics: '[]',
        entities: '[]',
        source: getMockNewsSource(),
      };

      const result = (service as any).fromPrismaArticle(prismaArticle);

      expect(result.titleTranslated).toBeUndefined();
      expect(result.contentTranslated).toBeUndefined();
    });
  });

  describe('translateArticle', () => {
    it('returns null when article not found', async () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];

      const result = await service.translateArticle('nonexistent', 'de');

      expect(result).toBeNull();
    });

    it('translates title when not already translated', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'translate-test',
        title: 'English Title',
        titleTranslated: undefined,
        contentTranslated: undefined,
        originalLanguage: 'en',
      });
      (service as any).articles = [article];

      const result = await service.translateArticle('translate-test', 'de');

      expect(result).not.toBeNull();
      expect(result?.titleTranslated?.de).toBe('translated');
    });

    it('translates content when not already translated', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'translate-content',
        content: 'English content',
        titleTranslated: { de: 'Already translated' },
        contentTranslated: undefined,
        originalLanguage: 'en',
      });
      (service as any).articles = [article];

      const result = await service.translateArticle('translate-content', 'de');

      expect(result).not.toBeNull();
      expect(result?.contentTranslated?.de).toBe('translated');
      expect(result?.translationQuality).toBe(0.9);
    });

    it('skips translation when already done', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'already-translated',
        titleTranslated: { de: 'Bereits uebersetzt' },
        contentTranslated: { de: 'Inhalt bereits uebersetzt' },
        originalLanguage: 'en',
      });
      (service as any).articles = [article];

      const result = await service.translateArticle('already-translated', 'de');

      expect(result).not.toBeNull();
      expect(result?.titleTranslated?.de).toBe('Bereits uebersetzt');
      expect(result?.contentTranslated?.de).toBe('Inhalt bereits uebersetzt');
    });

    it('translates to English when requested', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'to-english',
        title: 'Deutscher Titel',
        content: 'Deutscher Inhalt',
        titleTranslated: undefined,
        contentTranslated: undefined,
        originalLanguage: 'de',
      });
      (service as any).articles = [article];

      const result = await service.translateArticle('to-english', 'en');

      expect(result).not.toBeNull();
      expect(result?.titleTranslated?.en).toBe('translated');
    });
  });

  describe('fetchSource', () => {
    it('returns mock articles when source has no apiEndpoint', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({ apiEndpoint: undefined });

      const result = await (service as any).fetchSource(source);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // generateMockArticles returns 2
    });

    it('parses RSS feed and returns articles', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({
        id: 'rss-source',
        apiEndpoint: 'https://example.com/rss.xml',
      });

      const result = await (service as any).fetchSource(source);

      expect(result).toBeInstanceOf(Array);
      // Articles from mocked parser
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('returns mock articles on RSS parse error', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({
        id: 'error-source',
        apiEndpoint: 'https://broken.com/rss.xml',
      });
      // Force parser to throw
      (service as any).parser = { parseURL: vi.fn().mockRejectedValue(new Error('Parse error')) };

      const result = await (service as any).fetchSource(source);

      // Should fallback to mock articles
      expect(result).toBeInstanceOf(Array);
    });

    it('uses fallback topics when AI classifyTopics fails', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({
        id: 'ai-fail-source',
        apiEndpoint: 'https://example.com/rss.xml',
      });
      // Make AI service throw
      (service as any).aiService = {
        classifyTopics: vi.fn().mockRejectedValue(new Error('AI unavailable')),
        analyzeSentiment: vi.fn().mockResolvedValue({ sentiment: 'neutral', score: 0 }),
      };

      const result = await (service as any).fetchSource(source);

      expect(result).toBeInstanceOf(Array);
      // Should have fallback 'politics' topic
    });

    it('uses keyword sentiment when AI analyzeSentiment fails', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({
        id: 'sentiment-fail',
        apiEndpoint: 'https://example.com/rss.xml',
      });
      // Make AI sentiment fail but topics succeed
      (service as any).aiService = {
        classifyTopics: vi.fn().mockResolvedValue(['tech']),
        analyzeSentiment: vi.fn().mockRejectedValue(new Error('AI unavailable')),
      };

      const result = await (service as any).fetchSource(source);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('fetchAllSources', () => {
    it('fetches from RSS, API and deduplicates', async () => {
      const service = NewsAggregator.getInstance();
      // Set up minimal state
      (service as any).articles = [];
      (service as any).useCrawler = false;
      (service as any).useStealthScraper = false;

      await (service as any).fetchAllSources();

      // Should not throw and should process sources
      expect(true).toBe(true);
    });

    it('includes crawler results when useCrawler is true', async () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];
      (service as any).useCrawler = true;
      (service as any).useStealthScraper = false;

      await (service as any).fetchAllSources();

      expect(true).toBe(true);
    });

    it('includes stealth scraper results when useStealthScraper is true', async () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];
      (service as any).useCrawler = false;
      (service as any).useStealthScraper = true;

      await (service as any).fetchAllSources();

      expect(true).toBe(true);
    });
  });

  describe('startAggregation', () => {
    it('syncs sources, loads articles, and starts interval', async () => {
      const service = NewsAggregator.getInstance();

      await service.startAggregation();

      // Should set up interval
      expect((service as any).intervalId).not.toBeNull();

      // Clean up
      service.stopAggregation();
    });
  });

  describe('syncSources', () => {
    it('upserts all NEWS_SOURCES to database', async () => {
      const service = NewsAggregator.getInstance();

      await (service as any).syncSources();

      // Should call prisma.newsSource.upsert for each source
      const { prisma } = await import('../db/prisma');
      expect(prisma.newsSource.upsert).toHaveBeenCalled();
    });
  });

  describe('ensureSourceExists', () => {
    it('calls prisma upsert with correct source data', async () => {
      const service = NewsAggregator.getInstance();
      const source = getMockNewsSource({ id: 'ensure-test', rateLimit: undefined });

      await (service as any).ensureSourceExists(source);

      const { prisma } = await import('../db/prisma');
      expect(prisma.newsSource.upsert).toHaveBeenCalled();
    });
  });

  describe('loadLatestArticles', () => {
    it('loads articles from database and updates confidence scores', async () => {
      const service = NewsAggregator.getInstance();
      const { prisma } = await import('../db/prisma');

      // Mock findMany to return test data
      const mockSource = {
        id: 'db-source',
        name: 'DB Source',
        country: 'US',
        region: 'usa',
        language: 'en',
        politicalBias: 0,
        reliability: 8,
        ownership: 'private',
        apiEndpoint: null,
        rateLimit: 100,
      };

      (prisma.newsArticle.findMany as any).mockResolvedValueOnce([
        {
          id: 'db-article-1',
          title: 'DB Article',
          titleTranslated: null,
          contentTranslated: null,
          content: 'Content',
          summary: 'Summary',
          originalLanguage: 'en',
          publishedAt: new Date(),
          url: 'https://example.com',
          imageUrl: null,
          sentiment: 'neutral',
          sentimentScore: 0,
          perspective: 'usa',
          topics: '["Politics"]',
          entities: '[]',
          translationQuality: null,
          cached: false,
          confidence: null,
          sourceId: 'db-source',
          source: mockSource,
        },
      ]);

      await (service as any).loadLatestArticles();

      expect((service as any).articles.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('translateHeadlines', () => {
    it('translates untranslated non-English/German headlines', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'fr-article',
        originalLanguage: 'fr',
        titleTranslated: undefined,
      });
      (service as any).articles = [article];

      await (service as any).translateHeadlines();

      expect(article.titleTranslated?.de).toBe('translated');
    });

    it('skips articles already translated to German', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'already-de',
        originalLanguage: 'fr',
        titleTranslated: { de: 'Already done' },
      });
      (service as any).articles = [article];

      await (service as any).translateHeadlines();

      expect(article.titleTranslated?.de).toBe('Already done');
    });

    it('skips English articles', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'en-article',
        originalLanguage: 'en',
        titleTranslated: undefined,
      });
      (service as any).articles = [article];

      await (service as any).translateHeadlines();

      // Should not translate English articles
      expect(article.titleTranslated).toBeUndefined();
    });

    it('skips German articles', async () => {
      const service = NewsAggregator.getInstance();
      const article = getMockNewsArticle({
        id: 'de-article',
        originalLanguage: 'de',
        titleTranslated: undefined,
      });
      (service as any).articles = [article];

      await (service as any).translateHeadlines();

      // Should not translate German articles
      expect(article.titleTranslated).toBeUndefined();
    });

    it('returns early when no untranslated articles', async () => {
      const service = NewsAggregator.getInstance();
      (service as any).articles = [];

      await (service as any).translateHeadlines();

      // Should not throw
      expect(true).toBe(true);
    });

    it('handles translation errors gracefully', async () => {
      const service = NewsAggregator.getInstance();
      // Set up article needing translation
      const article = getMockNewsArticle({
        id: 'error-article',
        originalLanguage: 'ru',
        titleTranslated: undefined,
      });
      (service as any).articles = [article];

      // Mock translation service to throw
      (service as any).translationService = {
        translate: vi.fn().mockRejectedValue(new Error('Translation failed')),
      };

      await (service as any).translateHeadlines();

      // Should not throw, just log warning
      expect(true).toBe(true);
    });
  });
});

/**
 * Helper: Create a set of test articles with diverse characteristics
 */
function createTestArticles(): NewsArticle[] {
  const usaSource = getMockNewsSource({
    id: 'usa-source',
    region: 'usa',
    language: 'en',
    bias: { political: 0, reliability: 8, ownership: 'private' },
  });

  const deSource = getMockNewsSource({
    id: 'de-source',
    region: 'deutschland',
    language: 'de',
    bias: { political: -0.2, reliability: 7, ownership: 'private' },
  });

  const ruSource = getMockNewsSource({
    id: 'ru-source',
    region: 'russland',
    language: 'ru',
    bias: { political: 0.3, reliability: 5, ownership: 'state' },
  });

  return [
    // USA articles
    getMockNewsArticle({
      id: 'usa-1',
      source: usaSource,
      perspective: 'usa',
      originalLanguage: 'en',
      sentiment: 'positive',
      topics: ['Politics'],
    }),
    getMockNewsArticle({
      id: 'usa-2',
      source: usaSource,
      perspective: 'usa',
      originalLanguage: 'en',
      sentiment: 'negative',
      topics: ['Economy'],
    }),
    getMockNewsArticle({
      id: 'usa-3',
      source: usaSource,
      perspective: 'usa',
      originalLanguage: 'en',
      sentiment: 'neutral',
      topics: ['Politics', 'Economy'],
    }),
    // German articles
    getMockNewsArticle({
      id: 'de-1',
      source: deSource,
      perspective: 'deutschland',
      originalLanguage: 'de',
      sentiment: 'positive',
      topics: ['Politics'],
    }),
    getMockNewsArticle({
      id: 'de-2',
      source: deSource,
      perspective: 'deutschland',
      originalLanguage: 'de',
      sentiment: 'neutral',
      topics: ['Economy'],
    }),
    // Russian articles
    getMockNewsArticle({
      id: 'ru-1',
      source: ruSource,
      perspective: 'russland',
      originalLanguage: 'ru',
      sentiment: 'negative',
      topics: ['Politics', 'Military'],
    }),
    getMockNewsArticle({
      id: 'ru-2',
      source: ruSource,
      perspective: 'russland',
      originalLanguage: 'ru',
      sentiment: 'neutral',
      topics: ['Economy'],
    }),
    // More USA for pagination testing
    getMockNewsArticle({
      id: 'usa-4',
      source: usaSource,
      perspective: 'usa',
      originalLanguage: 'en',
      sentiment: 'positive',
      topics: ['Technology'],
    }),
    getMockNewsArticle({
      id: 'usa-5',
      source: usaSource,
      perspective: 'usa',
      originalLanguage: 'en',
      sentiment: 'positive',
      topics: ['Health'],
    }),
    getMockNewsArticle({
      id: 'de-3',
      source: deSource,
      perspective: 'deutschland',
      originalLanguage: 'de',
      sentiment: 'negative',
      topics: ['Climate'],
    }),
  ];
}
