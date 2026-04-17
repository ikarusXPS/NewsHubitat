/**
 * Tests for factory functions
 * Ensures factories produce valid mock data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetIdCounter,
  getMockNewsSource,
  getMockNewsArticle,
  getMockLeftSource,
  getMockRightSource,
  getMockStateSource,
  getMockPositiveArticle,
  getMockNegativeArticle,
  getMockArticleFromRegion,
  getMockArticleCluster,
  getMockSentimentData,
  getMockSentimentDataSet,
  getMockFilterState,
  getMockActiveFilterState,
  getMockGeoEvent,
  getMockCriticalEvent,
  getMockTimelineEvent,
  getMockUser,
  getMockApiResponse,
  getMockApiError,
  getMockArticleSet,
} from './factories';

describe('Factory Functions', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('getMockNewsSource', () => {
    it('creates a valid NewsSource with default values', () => {
      const source = getMockNewsSource();

      expect(source.id).toBe('source-1');
      expect(source.name).toBe('Mock News Source');
      expect(source.region).toBe('western');
      expect(source.bias.political).toBe(0);
      expect(source.bias.reliability).toBe(8);
    });

    it('allows overriding properties', () => {
      const source = getMockNewsSource({
        name: 'Custom Source',
        region: 'russland',
      });

      expect(source.name).toBe('Custom Source');
      expect(source.region).toBe('russland');
    });

    it('generates unique IDs', () => {
      const source1 = getMockNewsSource();
      const source2 = getMockNewsSource();

      expect(source1.id).not.toBe(source2.id);
    });
  });

  describe('getMockLeftSource', () => {
    it('creates a left-leaning source', () => {
      const source = getMockLeftSource();

      expect(source.bias.political).toBeLessThan(0);
      expect(source.name).toBe('Left-Leaning News');
    });
  });

  describe('getMockRightSource', () => {
    it('creates a right-leaning source', () => {
      const source = getMockRightSource();

      expect(source.bias.political).toBeGreaterThan(0);
      expect(source.name).toBe('Right-Leaning News');
    });
  });

  describe('getMockStateSource', () => {
    it('creates a state-owned source', () => {
      const source = getMockStateSource();

      expect(source.bias.ownership).toBe('state');
      expect(source.region).toBe('russian');
    });
  });

  describe('getMockNewsArticle', () => {
    it('creates a valid NewsArticle with default values', () => {
      const article = getMockNewsArticle();

      expect(article.id).toContain('article');
      expect(article.title).toBe('Mock News Article Title');
      expect(article.sentiment).toBe('neutral');
      expect(article.topics).toHaveLength(2);
      expect(article.source).toBeDefined();
    });

    it('allows overriding properties', () => {
      const article = getMockNewsArticle({
        title: 'Custom Title',
        sentiment: 'positive',
      });

      expect(article.title).toBe('Custom Title');
      expect(article.sentiment).toBe('positive');
    });

    it('uses provided source', () => {
      const source = getMockNewsSource({ name: 'Test Source' });
      const article = getMockNewsArticle({ source });

      expect(article.source.name).toBe('Test Source');
      expect(article.perspective).toBe(source.region);
    });
  });

  describe('getMockPositiveArticle', () => {
    it('creates an article with positive sentiment', () => {
      const article = getMockPositiveArticle();

      expect(article.sentiment).toBe('positive');
      expect(article.sentimentScore).toBeGreaterThan(0);
    });
  });

  describe('getMockNegativeArticle', () => {
    it('creates an article with negative sentiment', () => {
      const article = getMockNegativeArticle();

      expect(article.sentiment).toBe('negative');
      expect(article.sentimentScore).toBeLessThan(0);
    });
  });

  describe('getMockArticleFromRegion', () => {
    it('creates an article from specific region', () => {
      const article = getMockArticleFromRegion('china');

      expect(article.perspective).toBe('china');
      expect(article.source.region).toBe('china');
    });
  });

  describe('getMockArticleCluster', () => {
    it('creates articles for same topic from multiple regions', () => {
      const regions = ['usa', 'russland', 'china'] as const;
      const cluster = getMockArticleCluster('Climate Change', [...regions]);

      expect(cluster).toHaveLength(3);
      cluster.forEach((article, index) => {
        expect(article.topics).toContain('Climate Change');
        expect(article.perspective).toBe(regions[index]);
      });
    });
  });

  describe('getMockSentimentData', () => {
    it('creates valid SentimentData', () => {
      const data = getMockSentimentData();

      expect(data.region).toBe('western');
      expect(data.positive + data.negative + data.neutral).toBe(100);
    });
  });

  describe('getMockSentimentDataSet', () => {
    it('creates sentiment data for all regions', () => {
      const dataSet = getMockSentimentDataSet();

      expect(Object.keys(dataSet)).toHaveLength(13);
      expect(dataSet.usa).toBeDefined();
      expect(dataSet.nahost).toBeDefined();
      expect(dataSet.russland).toBeDefined();
    });
  });

  describe('getMockFilterState', () => {
    it('creates a default filter state', () => {
      const filter = getMockFilterState();

      expect(filter.regions).toHaveLength(2);
      expect(filter.searchQuery).toBe('');
      expect(filter.sortBy).toBe('date');
    });
  });

  describe('getMockActiveFilterState', () => {
    it('creates a filter state with active filters', () => {
      const filter = getMockActiveFilterState();

      expect(filter.regions).toHaveLength(1);
      expect(filter.searchQuery).toBeTruthy();
      expect(filter.dateRange.start).toBeInstanceOf(Date);
    });
  });

  describe('getMockGeoEvent', () => {
    it('creates a valid GeoEvent', () => {
      const event = getMockGeoEvent();

      expect(event.id).toContain('event');
      expect(event.location.lat).toBe(52.52);
      expect(event.category).toBe('political');
    });
  });

  describe('getMockCriticalEvent', () => {
    it('creates a high-severity event', () => {
      const event = getMockCriticalEvent();

      expect(event.severity).toBe('critical');
      expect(event.confidence).toBe(0.95);
    });
  });

  describe('getMockTimelineEvent', () => {
    it('creates a valid TimelineEvent', () => {
      const event = getMockTimelineEvent();

      expect(event.id).toContain('timeline');
      expect(event.category).toBe('diplomacy');
      expect(event.sources).toHaveLength(2);
    });
  });

  describe('getMockUser', () => {
    it('creates a valid user', () => {
      const user = getMockUser();

      expect(user.id).toContain('user');
      expect(user.email).toBe('test@example.com');
      expect(user.preferences.theme).toBe('dark');
    });

    it('allows overriding preferences', () => {
      const user = getMockUser({
        preferences: {
          language: 'en',
          theme: 'light',
          regions: ['russian'],
        },
      });

      expect(user.preferences.language).toBe('en');
      expect(user.preferences.theme).toBe('light');
    });
  });

  describe('getMockApiResponse', () => {
    it('wraps data in success response', () => {
      const data = { name: 'test' };
      const response = getMockApiResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta).toBeDefined();
    });
  });

  describe('getMockApiError', () => {
    it('creates an error response', () => {
      const response = getMockApiError('Something went wrong');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
      expect(response.data).toBeUndefined();
    });
  });

  describe('getMockArticleSet', () => {
    it('creates diverse set of articles', () => {
      const articles = getMockArticleSet(12);

      expect(articles).toHaveLength(12);

      // Check diversity of regions
      const regions = new Set(articles.map((a) => a.perspective));
      expect(regions.size).toBeGreaterThan(1);

      // Check diversity of sentiments
      const sentiments = new Set(articles.map((a) => a.sentiment));
      expect(sentiments.size).toBe(3);
    });

    it('uses default count of 10', () => {
      const articles = getMockArticleSet();
      expect(articles).toHaveLength(10);
    });
  });
});
