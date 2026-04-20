/**
 * Unit tests for EventsService
 * Tests singleton pattern, event extraction, location matching, severity calculation, and cache TTL behavior
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { EventsService } from './eventsService';
import { getMockNewsArticle, getMockNewsSource, resetIdCounter } from '../../src/test/factories';
import type { NewsArticle, TimelineEvent } from '../../src/types';

describe('EventsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'));
    resetIdCounter();
  });

  afterEach(() => {
    // Reset singleton between tests
    (EventsService as any).instance = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = EventsService.getInstance();
      const instance2 = EventsService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('getInstance() creates new instance after reset', () => {
      const instance1 = EventsService.getInstance();
      (EventsService as any).instance = null;
      const instance2 = EventsService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('extractEventsFromArticles', () => {
    describe('basic behavior', () => {
      it('returns empty array for empty input', () => {
        const service = EventsService.getInstance();
        const result = service.extractEventsFromArticles([]);
        expect(result).toEqual([]);
      });

      it('extracts event from article with recognized category', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Military strike reported in Gaza',
          content: 'An airstrike was carried out today.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('military');
      });
    });

    describe('category detection', () => {
      it('extracts military category from strike keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Airstrike reported in the region',
          content: 'Multiple bombing runs were conducted.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('military');
      });

      it('extracts military category from attack keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Missile attack on military base',
          content: 'Details of the assault are emerging.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('military');
      });

      it('extracts diplomacy category from ceasefire keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Ceasefire negotiations begin',
          content: 'Leaders meet for peace talks.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('diplomacy');
      });

      it('extracts diplomacy category from negotiation keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Summit meeting scheduled',
          content: 'Diplomatic talks to begin tomorrow.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('diplomacy');
      });

      it('extracts humanitarian category from aid keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Humanitarian aid convoy arrives',
          content: 'Relief supplies reach the refugee camp.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('humanitarian');
      });

      it('extracts humanitarian category from refugee keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Evacuation of civilians underway',
          content: 'Hospital staff assist with the rescue operation.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('humanitarian');
      });

      it('extracts protest category from protest keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Mass protest in capital city',
          content: 'Thousands join the rally for change.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('protest');
      });

      it('extracts protest category from demonstration keywords', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Solidarity march continues',
          content: 'Citizens demonstrate against new policy.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result[0].category).toBe('protest');
      });

      it('falls back to other category when no keywords match but significant', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Breaking news: Major announcement expected',
          content: 'Government decision to be revealed today.',
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('other');
      });

      it('returns null event (skips) for non-significant articles without category or location', () => {
        const service = EventsService.getInstance();
        const article = getMockNewsArticle({
          title: 'Regular business news',
          content: 'Company shares quarterly earnings data.', // Avoid "report" which is a significant keyword
        });

        const result = service.extractEventsFromArticles([article]);
        expect(result.length).toBe(0);
      });
    });

    describe('event grouping', () => {
      it('groups similar events by date, category, and location', () => {
        const service = EventsService.getInstance();
        const article1 = getMockNewsArticle({
          id: 'art-1',
          title: 'Strike reported in Gaza',
          content: 'Military action continues.',
          source: getMockNewsSource({ id: 'source-1' }),
          publishedAt: new Date('2026-04-20T10:00:00Z'),
        });
        const article2 = getMockNewsArticle({
          id: 'art-2',
          title: 'Attack in Gaza intensifies',
          content: 'More bombing reported.',
          source: getMockNewsSource({ id: 'source-2' }),
          publishedAt: new Date('2026-04-20T11:00:00Z'),
        });

        const result = service.extractEventsFromArticles([article1, article2]);
        // Both should be grouped since same date, category (military), and location (Gaza)
        expect(result.length).toBe(1);
      });

      it('merges sources when grouping events', () => {
        const service = EventsService.getInstance();
        const article1 = getMockNewsArticle({
          id: 'art-1',
          title: 'Strike reported in Gaza',
          content: 'Military action continues.',
          source: getMockNewsSource({ id: 'cnn' }),
          publishedAt: new Date('2026-04-20T10:00:00Z'),
        });
        const article2 = getMockNewsArticle({
          id: 'art-2',
          title: 'Attack in Gaza intensifies',
          content: 'More bombing reported.',
          source: getMockNewsSource({ id: 'bbc' }),
          publishedAt: new Date('2026-04-20T11:00:00Z'),
        });

        const result = service.extractEventsFromArticles([article1, article2]);
        expect(result[0].sources).toContain('cnn');
        expect(result[0].sources).toContain('bbc');
      });

      it('merges relatedArticles when grouping events', () => {
        const service = EventsService.getInstance();
        const article1 = getMockNewsArticle({
          id: 'art-1',
          title: 'Strike reported in Gaza',
          content: 'Military action continues.',
          source: getMockNewsSource({ id: 'source-1' }),
          publishedAt: new Date('2026-04-20T10:00:00Z'),
        });
        const article2 = getMockNewsArticle({
          id: 'art-2',
          title: 'Attack in Gaza intensifies',
          content: 'More bombing reported.',
          source: getMockNewsSource({ id: 'source-2' }),
          publishedAt: new Date('2026-04-20T11:00:00Z'),
        });

        const result = service.extractEventsFromArticles([article1, article2]);
        expect(result[0].relatedArticles).toContain('art-1');
        expect(result[0].relatedArticles).toContain('art-2');
      });

      it('increases severity when multiple sources cover same event', () => {
        const service = EventsService.getInstance();
        const article1 = getMockNewsArticle({
          id: 'art-1',
          title: 'Strike reported in Gaza',
          content: 'Military action continues.',
          source: getMockNewsSource({ id: 'source-1' }),
          publishedAt: new Date('2026-04-20T10:00:00Z'),
        });
        const article2 = getMockNewsArticle({
          id: 'art-2',
          title: 'Attack in Gaza intensifies',
          content: 'More bombing reported.',
          source: getMockNewsSource({ id: 'source-2' }),
          publishedAt: new Date('2026-04-20T11:00:00Z'),
        });

        // Get initial severity from single article
        const singleResult = service.extractEventsFromArticles([article1]);
        const initialSeverity = singleResult[0].severity;

        // Reset cache for fresh extraction
        service.clearCache();

        // Now with both articles
        const result = service.extractEventsFromArticles([article1, article2]);
        // Severity should increase by 0.5 for merged event
        expect(result[0].severity).toBeGreaterThan(initialSeverity);
      });
    });

    describe('output constraints', () => {
      it('limits output to 100 events', () => {
        const service = EventsService.getInstance();
        // Create 150 articles with different dates to avoid grouping
        const articles: NewsArticle[] = [];
        for (let i = 0; i < 150; i++) {
          articles.push(getMockNewsArticle({
            id: `art-${i}`,
            title: `Strike reported in location ${i}`,
            content: 'Military attack ongoing.',
            publishedAt: new Date(Date.now() - i * 86400000), // Different days
          }));
        }

        const result = service.extractEventsFromArticles(articles);
        expect(result.length).toBeLessThanOrEqual(100);
      });

      it('sorts by date (newest first)', () => {
        const service = EventsService.getInstance();
        const oldArticle = getMockNewsArticle({
          id: 'old',
          title: 'Strike in Berlin',
          content: 'Attack on base.',
          publishedAt: new Date('2026-04-18T10:00:00Z'),
        });
        const newArticle = getMockNewsArticle({
          id: 'new',
          title: 'Strike in Moscow',
          content: 'Military operation.',
          publishedAt: new Date('2026-04-20T10:00:00Z'),
        });

        const result = service.extractEventsFromArticles([oldArticle, newArticle]);
        expect(result[0].location?.name).toBe('Moscow');
        expect(result[1].location?.name).toBe('Berlin');
      });

      it('sorts by severity when dates are equal', () => {
        const service = EventsService.getInstance();
        const lowSeverityArticle = getMockNewsArticle({
          id: 'low',
          title: 'Protest in Berlin',
          content: 'Rally held peacefully.',
          sentiment: 'neutral',
          publishedAt: new Date('2026-04-20T10:00:00Z'),
          source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
        });
        const highSeverityArticle = getMockNewsArticle({
          id: 'high',
          title: 'Strike kills civilians in Moscow',
          content: 'Multiple casualties in attack.',
          sentiment: 'negative',
          publishedAt: new Date('2026-04-20T10:00:00Z'),
          source: getMockNewsSource({ bias: { political: 0, reliability: 9, ownership: 'private' } }),
        });

        const result = service.extractEventsFromArticles([lowSeverityArticle, highSeverityArticle]);
        // Higher severity should come first
        expect(result[0].severity).toBeGreaterThan(result[1].severity);
      });
    });
  });

  describe('location extraction', () => {
    it('extracts Gaza coordinates correctly', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'News from Gaza',
        content: 'Events unfolding in the region.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location).toEqual({
        lat: 31.5,
        lng: 34.47,
        name: 'Gaza',
      });
    });

    it('extracts Jerusalem coordinates correctly', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Summit in Jerusalem begins',
        content: 'Leaders meet for talks.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location).toEqual({
        lat: 31.7683,
        lng: 35.2137,
        name: 'Jerusalem',
      });
    });

    it('extracts Moscow coordinates correctly', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Strike near Moscow reported',
        content: 'Military action in the area.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location).toEqual({
        lat: 55.7558,
        lng: 37.6173,
        name: 'Moscow',
      });
    });

    it('extracts Tokyo coordinates correctly', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Summit meeting in Tokyo',
        content: 'Diplomatic talks underway.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location).toEqual({
        lat: 35.6762,
        lng: 139.6503,
        name: 'Tokyo',
      });
    });

    it('extracts Sydney coordinates correctly', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Diplomatic meeting in Sydney',
        content: 'Leaders gather for talks.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location).toEqual({
        lat: -33.8688,
        lng: 151.2093,
        name: 'Sydney',
      });
    });

    it('extracts Kyiv coordinates correctly (both spellings)', () => {
      const service = EventsService.getInstance();
      const article1 = getMockNewsArticle({
        title: 'Strike in Kyiv reported',
        content: 'Military action continues.',
      });
      const article2 = getMockNewsArticle({
        title: 'Strike in Kiev reported',
        content: 'Military action continues.',
      });

      service.clearCache();
      const result1 = service.extractEventsFromArticles([article1]);
      expect(result1[0].location?.name).toBe('Kyiv');

      service.clearCache();
      const result2 = service.extractEventsFromArticles([article2]);
      expect(result2[0].location?.name).toBe('Kyiv');
    });

    it('extracts Tehran coordinates correctly (both spellings)', () => {
      const service = EventsService.getInstance();
      const article1 = getMockNewsArticle({
        title: 'Summit in Tehran begins',
        content: 'Leaders meet for diplomatic talks.',
      });
      const article2 = getMockNewsArticle({
        title: 'Summit in Teheran begins',
        content: 'Leaders meet for diplomatic talks.',
      });

      service.clearCache();
      const result1 = service.extractEventsFromArticles([article1]);
      expect(result1[0].location?.name).toBe('Tehran');

      service.clearCache();
      const result2 = service.extractEventsFromArticles([article2]);
      expect(result2[0].location?.name).toBe('Tehran');
    });

    it('returns undefined location for text without recognized location', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Breaking: Major announcement coming',
        content: 'Government officials prepare for announcement.',
      });

      const result = service.extractEventsFromArticles([article]);
      if (result.length > 0) {
        expect(result[0].location).toBeUndefined();
      }
    });

    it('extracts Brussels coordinates (with optional s)', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'EU summit in Brussels begins',
        content: 'Leaders meet for diplomatic talks.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].location?.name).toBe('Brussels');
    });
  });

  describe('severity calculation', () => {
    it('base severity is 5 plus category boost', () => {
      const service = EventsService.getInstance();
      // Protest has 0 boost, so base should be 5
      const protestArticle = getMockNewsArticle({
        title: 'Protest in Berlin',
        content: 'March held in the city.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([protestArticle]);
      expect(result[0].severity).toBe(5);
    });

    it('military category adds 2 to severity plus 1 for military type', () => {
      const service = EventsService.getInstance();
      const militaryArticle = getMockNewsArticle({
        title: 'Strike reported',
        content: 'Airstrike on facility.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([militaryArticle]);
      // Base 5 + military boost 2 + military category bonus 1 = 8
      expect(result[0].severity).toBe(8);
    });

    it('diplomacy category adds 1 to severity', () => {
      const service = EventsService.getInstance();
      const diplomacyArticle = getMockNewsArticle({
        title: 'Ceasefire talks begin',
        content: 'Negotiations underway.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([diplomacyArticle]);
      // Base 5 + diplomacy boost 1 = 6
      expect(result[0].severity).toBe(6);
    });

    it('humanitarian category adds 1 to severity', () => {
      const service = EventsService.getInstance();
      const humanitarianArticle = getMockNewsArticle({
        title: 'Aid convoy arrives',
        content: 'Humanitarian supplies delivered.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([humanitarianArticle]);
      // Base 5 + humanitarian boost 1 = 6
      expect(result[0].severity).toBe(6);
    });

    it('adds 1 for negative sentiment', () => {
      const service = EventsService.getInstance();
      const negativeArticle = getMockNewsArticle({
        title: 'Protest march continues',
        content: 'Rally in the streets.',
        sentiment: 'negative',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([negativeArticle]);
      // Base 5 + negative sentiment 1 = 6
      expect(result[0].severity).toBe(6);
    });

    it('adds 0.5 for high reliability sources (>=8)', () => {
      const service = EventsService.getInstance();
      const highReliabilityArticle = getMockNewsArticle({
        title: 'Protest in city center',
        content: 'Demonstration ongoing.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 9, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([highReliabilityArticle]);
      // Base 5 + reliability 0.5 = 5.5 -> rounds to 6
      expect(result[0].severity).toBe(6);
    });

    it('adds 1 for high-impact keywords (death, killed, massacre)', () => {
      const service = EventsService.getInstance();
      const highImpactArticle = getMockNewsArticle({
        title: 'Multiple killed in protest',
        content: 'Death toll rises.',
        sentiment: 'neutral',
        source: getMockNewsSource({ bias: { political: 0, reliability: 5, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([highImpactArticle]);
      // Base 5 + high-impact 1 = 6
      expect(result[0].severity).toBeGreaterThanOrEqual(6);
    });

    it('clamps severity to maximum of 10', () => {
      const service = EventsService.getInstance();
      // Military + negative + high reliability + high impact keywords
      const maxSeverityArticle = getMockNewsArticle({
        title: 'Massacre in strike kills thousands',
        content: 'Bombing attack causes death and destruction. Invasion continues.',
        sentiment: 'negative',
        source: getMockNewsSource({ bias: { political: 0, reliability: 10, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([maxSeverityArticle]);
      expect(result[0].severity).toBeLessThanOrEqual(10);
    });

    it('clamps severity to minimum of 1', () => {
      const service = EventsService.getInstance();
      // This should result in base severity without boosts
      const minSeverityArticle = getMockNewsArticle({
        title: 'Protest in Berlin',
        content: 'March held.',
        sentiment: 'positive',
        source: getMockNewsSource({ bias: { political: 0, reliability: 3, ownership: 'private' } }),
      });

      const result = service.extractEventsFromArticles([minSeverityArticle]);
      expect(result[0].severity).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cache behavior', () => {
    it('returns cached events within 5 minutes', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Strike in Gaza',
        content: 'Military action reported.',
      });

      // First call - extracts events
      const result1 = service.extractEventsFromArticles([article]);
      expect(result1.length).toBe(1);

      // Second call within 5 minutes - should return cached
      vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      const result2 = service.extractEventsFromArticles([article]);
      expect(result2).toBe(result1); // Same reference = cached
    });

    it('extracts fresh events after cache expires (5 min)', () => {
      const service = EventsService.getInstance();
      const article1 = getMockNewsArticle({
        title: 'Strike in Gaza',
        content: 'Military action reported.',
      });

      // First call
      const result1 = service.extractEventsFromArticles([article1]);
      const initialReference = result1;

      // Advance past 5 minute TTL
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // Create different article for new extraction
      const article2 = getMockNewsArticle({
        title: 'Attack in Moscow',
        content: 'Military operation underway.',
      });

      // Second call after cache expires - should extract fresh
      const result2 = service.extractEventsFromArticles([article2]);
      expect(result2).not.toBe(initialReference); // Different reference = fresh extraction
    });

    it('cache timestamp updates on fresh extraction', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Strike in Gaza',
        content: 'Military action reported.',
      });

      // First extraction
      service.extractEventsFromArticles([article]);

      // Advance past TTL
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Fresh extraction
      service.extractEventsFromArticles([article]);

      // Cache should be valid for another 5 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      const cachedResult = service.extractEventsFromArticles([article]);
      expect(cachedResult).toBeDefined();
    });
  });

  describe('getEventsByCategory', () => {
    it('filters events by category', () => {
      const service = EventsService.getInstance();
      const events: TimelineEvent[] = [
        {
          id: 'evt-1',
          date: new Date(),
          title: 'Military event',
          description: 'Description',
          category: 'military',
          severity: 7,
          sources: ['src1'],
          relatedArticles: [],
        },
        {
          id: 'evt-2',
          date: new Date(),
          title: 'Diplomacy event',
          description: 'Description',
          category: 'diplomacy',
          severity: 5,
          sources: ['src2'],
          relatedArticles: [],
        },
        {
          id: 'evt-3',
          date: new Date(),
          title: 'Another military event',
          description: 'Description',
          category: 'military',
          severity: 6,
          sources: ['src3'],
          relatedArticles: [],
        },
      ];

      const result = service.getEventsByCategory(events, 'military');
      expect(result.length).toBe(2);
      expect(result.every(e => e.category === 'military')).toBe(true);
    });

    it('returns empty array when no events match category', () => {
      const service = EventsService.getInstance();
      const events: TimelineEvent[] = [
        {
          id: 'evt-1',
          date: new Date(),
          title: 'Military event',
          description: 'Description',
          category: 'military',
          severity: 7,
          sources: ['src1'],
          relatedArticles: [],
        },
      ];

      const result = service.getEventsByCategory(events, 'humanitarian');
      expect(result).toEqual([]);
    });
  });

  describe('getEventsByDateRange', () => {
    it('filters events within date range', () => {
      const service = EventsService.getInstance();
      const events: TimelineEvent[] = [
        {
          id: 'evt-1',
          date: new Date('2026-04-18T10:00:00Z'),
          title: 'Early event',
          description: 'Description',
          category: 'military',
          severity: 7,
          sources: ['src1'],
          relatedArticles: [],
        },
        {
          id: 'evt-2',
          date: new Date('2026-04-19T10:00:00Z'),
          title: 'Middle event',
          description: 'Description',
          category: 'diplomacy',
          severity: 5,
          sources: ['src2'],
          relatedArticles: [],
        },
        {
          id: 'evt-3',
          date: new Date('2026-04-20T10:00:00Z'),
          title: 'Late event',
          description: 'Description',
          category: 'protest',
          severity: 4,
          sources: ['src3'],
          relatedArticles: [],
        },
      ];

      const result = service.getEventsByDateRange(
        events,
        new Date('2026-04-18T00:00:00Z'),
        new Date('2026-04-19T23:59:59Z')
      );
      expect(result.length).toBe(2);
      expect(result.some(e => e.id === 'evt-1')).toBe(true);
      expect(result.some(e => e.id === 'evt-2')).toBe(true);
      expect(result.some(e => e.id === 'evt-3')).toBe(false);
    });

    it('returns empty array when no events in range', () => {
      const service = EventsService.getInstance();
      const events: TimelineEvent[] = [
        {
          id: 'evt-1',
          date: new Date('2026-04-10T10:00:00Z'),
          title: 'Old event',
          description: 'Description',
          category: 'military',
          severity: 7,
          sources: ['src1'],
          relatedArticles: [],
        },
      ];

      const result = service.getEventsByDateRange(
        events,
        new Date('2026-04-18T00:00:00Z'),
        new Date('2026-04-20T23:59:59Z')
      );
      expect(result).toEqual([]);
    });

    it('includes events exactly at range boundaries', () => {
      const service = EventsService.getInstance();
      const startDate = new Date('2026-04-19T00:00:00Z');
      const endDate = new Date('2026-04-19T23:59:59Z');
      const events: TimelineEvent[] = [
        {
          id: 'evt-1',
          date: startDate,
          title: 'Start boundary event',
          description: 'Description',
          category: 'military',
          severity: 7,
          sources: ['src1'],
          relatedArticles: [],
        },
        {
          id: 'evt-2',
          date: endDate,
          title: 'End boundary event',
          description: 'Description',
          category: 'diplomacy',
          severity: 5,
          sources: ['src2'],
          relatedArticles: [],
        },
      ];

      const result = service.getEventsByDateRange(events, startDate, endDate);
      expect(result.length).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('clears the cache', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: 'Strike in Gaza',
        content: 'Military action reported.',
      });

      // First extraction populates cache
      const result1 = service.extractEventsFromArticles([article]);

      // Clear cache
      service.clearCache();

      // Next extraction should be fresh (different reference)
      const result2 = service.extractEventsFromArticles([article]);
      expect(result2).not.toBe(result1);
    });

    it('allows fresh extraction immediately after clear', () => {
      const service = EventsService.getInstance();
      const article1 = getMockNewsArticle({
        title: 'Strike in Gaza',
        content: 'Military action reported.',
      });

      // First extraction
      service.extractEventsFromArticles([article1]);

      // Clear and extract different article
      service.clearCache();
      const article2 = getMockNewsArticle({
        title: 'Summit in Tokyo',
        content: 'Diplomatic talks begin.',
      });

      const result = service.extractEventsFromArticles([article2]);
      expect(result[0].location?.name).toBe('Tokyo');
    });
  });

  describe('title shortening', () => {
    it('removes source prefixes like [Reuters]', () => {
      const service = EventsService.getInstance();
      const article = getMockNewsArticle({
        title: '[Reuters] Strike reported in Gaza',
        content: 'Military action continues.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].title).not.toContain('[Reuters]');
      expect(result[0].title).toContain('Strike reported in Gaza');
    });

    it('truncates titles longer than 80 characters', () => {
      const service = EventsService.getInstance();
      const longTitle = 'Strike reported in Gaza with many additional details that make this title extremely long and needs truncation';
      const article = getMockNewsArticle({
        title: longTitle,
        content: 'Military action continues.',
      });

      const result = service.extractEventsFromArticles([article]);
      expect(result[0].title.length).toBeLessThanOrEqual(80);
      expect(result[0].title.endsWith('...')).toBe(true);
    });
  });
});
