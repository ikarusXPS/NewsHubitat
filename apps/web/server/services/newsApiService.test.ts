/**
 * Unit tests for NewsApiService
 * Tests 3 API providers (GNews, NewsAPI, MediaStack), perspective detection,
 * sentiment analysis, topic extraction, and entity extraction
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NewsApiService } from './newsApiService';

// Mock logger to silence console output
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

describe('NewsApiService', () => {
  const originalEnv = process.env;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    process.env = { ...originalEnv };
    // Silence console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset singleton between tests (D-13)
    (NewsApiService as any).instance = null;
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = NewsApiService.getInstance();
      const instance2 = NewsApiService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = NewsApiService.getInstance();
      (NewsApiService as any).instance = null;
      const instance2 = NewsApiService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('fetchFromGNews', () => {
    it('returns empty array when GNEWS_API_KEY not configured', async () => {
      delete process.env.GNEWS_API_KEY;
      const service = NewsApiService.getInstance();
      const result = await service.fetchFromGNews();
      expect(result).toEqual([]);
    });

    it('constructs correct URL with query params', async () => {
      process.env.GNEWS_API_KEY = 'test-gnews-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ articles: [] }),
      });

      const service = NewsApiService.getInstance();
      await service.fetchFromGNews('test query');

      expect(mockFetch).toHaveBeenCalledOnce();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://gnews.io/api/v4/search');
      expect(calledUrl).toContain('q=test+query');
      expect(calledUrl).toContain('token=test-gnews-key');
      expect(calledUrl).toContain('lang=en');
      expect(calledUrl).toContain('max=10');
    });

    it('converts GNews article format to NewsArticle', async () => {
      process.env.GNEWS_API_KEY = 'test-gnews-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          articles: [{
            title: 'Test Article Title',
            description: 'Test description of the article',
            content: 'Full content of the test article',
            url: 'https://example.com/article',
            image: 'https://example.com/image.jpg',
            publishedAt: '2024-01-15T10:00:00Z',
            source: { name: 'Reuters', url: 'https://reuters.com' },
          }],
        }),
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromGNews();

      expect(result).toHaveLength(1);
      const article = result[0];
      expect(article.title).toBe('Test Article Title');
      expect(article.content).toBe('Full content of the test article');
      expect(article.summary).toBe('Test description of the article');
      expect(article.url).toBe('https://example.com/article');
      expect(article.imageUrl).toBe('https://example.com/image.jpg');
      expect(article.source.name).toBe('Reuters');
      expect(article.perspective).toBe('western');
      expect(article.originalLanguage).toBe('en');
      expect(article.id).toContain('gnews-');
      expect(article.cached).toBe(false);
    });

    it('returns empty array on API error', async () => {
      process.env.GNEWS_API_KEY = 'test-gnews-key';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromGNews();

      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      process.env.GNEWS_API_KEY = 'test-gnews-key';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromGNews();

      expect(result).toEqual([]);
    });

    it('handles null articles array gracefully', async () => {
      process.env.GNEWS_API_KEY = 'test-gnews-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ articles: null }),
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromGNews();

      expect(result).toEqual([]);
    });
  });

  describe('fetchFromNewsApi', () => {
    it('returns empty array when NEWSAPI_KEY not configured', async () => {
      delete process.env.NEWSAPI_KEY;
      const service = NewsApiService.getInstance();
      const result = await service.fetchFromNewsApi();
      expect(result).toEqual([]);
    });

    it('constructs correct URL with query params', async () => {
      process.env.NEWSAPI_KEY = 'test-newsapi-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ articles: [] }),
      });

      const service = NewsApiService.getInstance();
      await service.fetchFromNewsApi('middle east crisis');

      expect(mockFetch).toHaveBeenCalledOnce();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://newsapi.org/v2/everything');
      expect(calledUrl).toContain('q=middle+east+crisis');
      expect(calledUrl).toContain('apiKey=test-newsapi-key');
      expect(calledUrl).toContain('language=en');
      expect(calledUrl).toContain('sortBy=publishedAt');
      expect(calledUrl).toContain('pageSize=20');
    });

    it('converts NewsAPI article format to NewsArticle', async () => {
      process.env.NEWSAPI_KEY = 'test-newsapi-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          articles: [{
            title: 'NewsAPI Article',
            description: 'Article from NewsAPI',
            content: 'Content text from NewsAPI provider',
            url: 'https://newsapi.example.com/article',
            urlToImage: 'https://newsapi.example.com/image.png',
            publishedAt: '2024-02-20T15:30:00Z',
            source: { id: 'bbc-news', name: 'BBC News' },
          }],
        }),
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromNewsApi();

      expect(result).toHaveLength(1);
      const article = result[0];
      expect(article.title).toBe('NewsAPI Article');
      expect(article.content).toBe('Content text from NewsAPI provider');
      expect(article.url).toBe('https://newsapi.example.com/article');
      expect(article.imageUrl).toBe('https://newsapi.example.com/image.png');
      expect(article.source.name).toBe('BBC News');
      expect(article.perspective).toBe('western');
      expect(article.id).toContain('newsapi-');
    });

    it('returns empty array on API error', async () => {
      process.env.NEWSAPI_KEY = 'test-newsapi-key';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromNewsApi();

      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      process.env.NEWSAPI_KEY = 'test-newsapi-key';
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromNewsApi();

      expect(result).toEqual([]);
    });
  });

  describe('fetchFromMediaStack', () => {
    it('returns empty array when MEDIASTACK_API_KEY not configured', async () => {
      delete process.env.MEDIASTACK_API_KEY;
      const service = NewsApiService.getInstance();
      const result = await service.fetchFromMediaStack();
      expect(result).toEqual([]);
    });

    it('constructs correct URL with query params', async () => {
      process.env.MEDIASTACK_API_KEY = 'test-mediastack-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const service = NewsApiService.getInstance();
      await service.fetchFromMediaStack('ukraine,russia');

      expect(mockFetch).toHaveBeenCalledOnce();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('http://api.mediastack.com/v1/news');
      expect(calledUrl).toContain('access_key=test-mediastack-key');
      expect(calledUrl).toContain('keywords=ukraine%2Crussia');
      expect(calledUrl).toContain('languages=en');
      expect(calledUrl).toContain('limit=25');
    });

    it('converts MediaStack article format to NewsArticle (note: published_at vs publishedAt)', async () => {
      process.env.MEDIASTACK_API_KEY = 'test-mediastack-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            title: 'MediaStack Article',
            description: 'Article from MediaStack API',
            url: 'https://mediastack.example.com/news',
            image: 'https://mediastack.example.com/img.jpg',
            published_at: '2024-03-10T08:00:00Z',
            source: 'The Guardian',
            country: 'gb',
            language: 'en',
          }],
        }),
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromMediaStack();

      expect(result).toHaveLength(1);
      const article = result[0];
      expect(article.title).toBe('MediaStack Article');
      expect(article.content).toBe('Article from MediaStack API');
      expect(article.url).toBe('https://mediastack.example.com/news');
      expect(article.imageUrl).toBe('https://mediastack.example.com/img.jpg');
      expect(article.source.name).toBe('The Guardian');
      expect(article.source.country).toBe('gb');
      expect(article.perspective).toBe('western');
      expect(article.id).toContain('mediastack-');
      expect(article.originalLanguage).toBe('en');
    });

    it('returns empty array on API error', async () => {
      process.env.MEDIASTACK_API_KEY = 'test-mediastack-key';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromMediaStack();

      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      process.env.MEDIASTACK_API_KEY = 'test-mediastack-key';
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromMediaStack();

      expect(result).toEqual([]);
    });

    it('handles null data array gracefully', async () => {
      process.env.MEDIASTACK_API_KEY = 'test-mediastack-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      const service = NewsApiService.getInstance();
      const result = await service.fetchFromMediaStack();

      expect(result).toEqual([]);
    });
  });

  describe('fetchAll', () => {
    it('calls all 3 providers using Promise.allSettled', async () => {
      process.env.GNEWS_API_KEY = 'gnews-key';
      process.env.NEWSAPI_KEY = 'newsapi-key';
      process.env.MEDIASTACK_API_KEY = 'mediastack-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            articles: [{
              title: 'GNews Article',
              description: 'From GNews',
              content: 'Content',
              url: 'https://gnews.example.com/1',
              image: 'https://gnews.example.com/img.jpg',
              publishedAt: '2024-01-01T00:00:00Z',
              source: { name: 'Source1', url: 'https://source1.com' },
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            articles: [{
              title: 'NewsAPI Article',
              description: 'From NewsAPI',
              content: 'Content',
              url: 'https://newsapi.example.com/1',
              urlToImage: 'https://newsapi.example.com/img.jpg',
              publishedAt: '2024-01-02T00:00:00Z',
              source: { id: 'src2', name: 'Source2' },
            }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              title: 'MediaStack Article',
              description: 'From MediaStack',
              url: 'https://mediastack.example.com/1',
              image: 'https://mediastack.example.com/img.jpg',
              published_at: '2024-01-03T00:00:00Z',
              source: 'Source3',
              country: 'us',
              language: 'en',
            }],
          }),
        });

      const service = NewsApiService.getInstance();
      const result = await service.fetchAll();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result.some(a => a.title === 'GNews Article')).toBe(true);
      expect(result.some(a => a.title === 'NewsAPI Article')).toBe(true);
      expect(result.some(a => a.title === 'MediaStack Article')).toBe(true);
    });

    it('combines results from all successful providers', async () => {
      process.env.GNEWS_API_KEY = 'gnews-key';
      process.env.NEWSAPI_KEY = 'newsapi-key';
      delete process.env.MEDIASTACK_API_KEY; // Not configured

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            articles: [
              { title: 'Article 1', description: '', content: '', url: 'https://a.com/1', image: '', publishedAt: '2024-01-01T00:00:00Z', source: { name: 'S1', url: '' } },
              { title: 'Article 2', description: '', content: '', url: 'https://a.com/2', image: '', publishedAt: '2024-01-01T00:00:00Z', source: { name: 'S2', url: '' } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            articles: [
              { title: 'Article 3', description: '', content: '', url: 'https://b.com/1', urlToImage: '', publishedAt: '2024-01-01T00:00:00Z', source: { id: 's3', name: 'S3' } },
            ],
          }),
        });

      const service = NewsApiService.getInstance();
      const result = await service.fetchAll();

      expect(result).toHaveLength(3);
    });

    it('continues if one provider fails', async () => {
      process.env.GNEWS_API_KEY = 'gnews-key';
      process.env.NEWSAPI_KEY = 'newsapi-key';
      process.env.MEDIASTACK_API_KEY = 'mediastack-key';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            articles: [{
              title: 'GNews Article',
              description: '',
              content: '',
              url: 'https://gnews.com/1',
              image: '',
              publishedAt: '2024-01-01T00:00:00Z',
              source: { name: 'S', url: '' },
            }],
          }),
        })
        .mockRejectedValueOnce(new Error('NewsAPI failed')) // NewsAPI fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              title: 'MediaStack Article',
              description: '',
              url: 'https://mediastack.com/1',
              image: '',
              published_at: '2024-01-01T00:00:00Z',
              source: 'S',
              country: 'us',
              language: 'en',
            }],
          }),
        });

      const service = NewsApiService.getInstance();
      const result = await service.fetchAll();

      // Should have 2 articles (GNews + MediaStack), NewsAPI failed
      expect(result).toHaveLength(2);
      expect(result.some(a => a.title === 'GNews Article')).toBe(true);
      expect(result.some(a => a.title === 'MediaStack Article')).toBe(true);
    });

    it('returns empty array when all providers fail', async () => {
      process.env.GNEWS_API_KEY = 'gnews-key';
      process.env.NEWSAPI_KEY = 'newsapi-key';
      process.env.MEDIASTACK_API_KEY = 'mediastack-key';

      mockFetch
        .mockRejectedValueOnce(new Error('GNews failed'))
        .mockRejectedValueOnce(new Error('NewsAPI failed'))
        .mockRejectedValueOnce(new Error('MediaStack failed'));

      const service = NewsApiService.getInstance();
      const result = await service.fetchAll();

      expect(result).toEqual([]);
    });
  });

  describe('detectPerspective', () => {
    // Access private method via service instance
    const detectPerspective = (sourceName: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).detectPerspective(sourceName);
    };

    it("'reuters' -> 'western'", () => {
      expect(detectPerspective('Reuters')).toBe('western');
      expect(detectPerspective('REUTERS NEWS')).toBe('western');
    });

    it("'bbc' -> 'western'", () => {
      expect(detectPerspective('BBC News')).toBe('western');
      expect(detectPerspective('bbc world')).toBe('western');
    });

    it("'cnn' -> 'western'", () => {
      expect(detectPerspective('CNN')).toBe('western');
      expect(detectPerspective('CNN International')).toBe('western');
    });

    it("'guardian' -> 'western'", () => {
      expect(detectPerspective('The Guardian')).toBe('western');
    });

    it("'al jazeera' -> 'middle-east'", () => {
      expect(detectPerspective('Al Jazeera')).toBe('middle-east');
      expect(detectPerspective('AL JAZEERA ENGLISH')).toBe('middle-east');
    });

    it("'haaretz' -> 'middle-east'", () => {
      expect(detectPerspective('Haaretz')).toBe('middle-east');
    });

    it("'times of israel' -> 'middle-east'", () => {
      expect(detectPerspective('Times of Israel')).toBe('middle-east');
    });

    it("'trt' -> 'turkish'", () => {
      expect(detectPerspective('TRT World')).toBe('turkish');
      expect(detectPerspective('TRT')).toBe('turkish');
    });

    it("'daily sabah' -> 'turkish'", () => {
      expect(detectPerspective('Daily Sabah')).toBe('turkish');
    });

    it("'anadolu' -> 'turkish'", () => {
      expect(detectPerspective('Anadolu Agency')).toBe('turkish');
    });

    it("'rt' -> 'russian'", () => {
      expect(detectPerspective('RT')).toBe('russian');
      expect(detectPerspective('RT News')).toBe('russian');
    });

    it("'tass' -> 'russian'", () => {
      expect(detectPerspective('TASS')).toBe('russian');
      expect(detectPerspective('TASS News Agency')).toBe('russian');
    });

    it("'sputnik' -> 'russian'", () => {
      expect(detectPerspective('Sputnik News')).toBe('russian');
    });

    it("'xinhua' -> 'chinese'", () => {
      expect(detectPerspective('Xinhua')).toBe('chinese');
      expect(detectPerspective('Xinhua News Agency')).toBe('chinese');
    });

    it("'cgtn' -> 'chinese'", () => {
      expect(detectPerspective('CGTN')).toBe('chinese');
      expect(detectPerspective('CGTN America')).toBe('chinese');
    });

    it("'global times' -> 'chinese'", () => {
      expect(detectPerspective('Global Times')).toBe('chinese');
    });

    it("'scmp' -> 'chinese'", () => {
      expect(detectPerspective('SCMP')).toBe('chinese');
      expect(detectPerspective('South China Morning Post SCMP')).toBe('chinese');
    });

    it("'intercept' -> 'alternative'", () => {
      expect(detectPerspective('The Intercept')).toBe('alternative');
    });

    it("'middle east monitor' -> 'alternative'", () => {
      expect(detectPerspective('Middle East Monitor')).toBe('alternative');
    });

    it("Unknown source -> 'western' (default)", () => {
      expect(detectPerspective('Unknown News Source')).toBe('western');
      expect(detectPerspective('Random Blog')).toBe('western');
    });

    it("Pattern matching: 'ru' in name -> 'russian'", () => {
      expect(detectPerspective('Russia Today')).toBe('russian');
      expect(detectPerspective('RuNews Daily')).toBe('russian');
    });

    it("Pattern matching: 'china' in name -> 'chinese'", () => {
      expect(detectPerspective('China Daily')).toBe('chinese');
      expect(detectPerspective('Voice of China')).toBe('chinese');
    });

    it("Pattern matching: 'turkey' in name -> 'turkish'", () => {
      expect(detectPerspective('Turkey News')).toBe('turkish');
    });

    it("Pattern matching: 'arab' in name -> 'middle-east'", () => {
      expect(detectPerspective('Arab News')).toBe('middle-east');
    });
  });

  describe('analyzeSentiment', () => {
    const analyzeSentiment = (title: string, content: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).analyzeSentiment(title, content);
    };

    it('Text with attack, killed, war -> negative with score < -0.5', () => {
      const result = analyzeSentiment('Attack kills dozens', 'War continues with violence and casualties');
      expect(result.type).toBe('negative');
      expect(result.score).toBeLessThan(-0.5);
    });

    it('Text with multiple negative words -> more negative score', () => {
      const result = analyzeSentiment('Terror attack bomb strike', 'Violence crisis destruction dead');
      expect(result.type).toBe('negative');
      expect(result.score).toBeLessThan(-0.7);
    });

    it('Text with peace, ceasefire, aid -> positive with score > 0.5', () => {
      const result = analyzeSentiment('Peace agreement reached', 'Ceasefire brings hope and relief');
      expect(result.type).toBe('positive');
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('Text with multiple positive words -> more positive score', () => {
      const result = analyzeSentiment('Peace ceasefire agreement', 'Aid support humanitarian relief rescue');
      expect(result.type).toBe('positive');
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('Balanced text -> neutral with score near 0', () => {
      const result = analyzeSentiment('News update today', 'The meeting was held yesterday');
      expect(result.type).toBe('neutral');
      expect(Math.abs(result.score)).toBeLessThan(0.3);
    });

    it('Mixed positive and negative -> neutral if balanced', () => {
      const result = analyzeSentiment('Peace talks', 'Crisis continues');
      expect(result.type).toBe('neutral');
    });

    it('Edge case: empty text -> neutral', () => {
      const result = analyzeSentiment('', '');
      expect(result.type).toBe('neutral');
      expect(result.score).toBe(0);
    });

    it('Case insensitive matching', () => {
      const result = analyzeSentiment('ATTACK', 'WAR KILLED');
      expect(result.type).toBe('negative');
    });
  });

  describe('extractTopics', () => {
    const extractTopics = (title: string, content: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).extractTopics(title, content);
    };

    it("Text with military, army, strike -> includes 'military'", () => {
      const topics = extractTopics('Military operation', 'Army forces launched strike');
      expect(topics).toContain('military');
    });

    it("Text with troops, forces -> includes 'military'", () => {
      const topics = extractTopics('Troops deployed', 'Forces advance');
      expect(topics).toContain('military');
    });

    it("Text with diplomat, negotiat, talks -> includes 'diplomacy'", () => {
      const topics = extractTopics('Diplomatic talks', 'Negotiations continue');
      expect(topics).toContain('diplomacy');
    });

    it("Text with agreement, summit, ceasefire -> includes 'diplomacy'", () => {
      const topics = extractTopics('Summit scheduled', 'Agreement reached after ceasefire');
      expect(topics).toContain('diplomacy');
    });

    it("Text with humanitarian, aid, refugee -> includes 'humanitarian'", () => {
      const topics = extractTopics('Humanitarian crisis', 'Aid reaches refugees');
      expect(topics).toContain('humanitarian');
    });

    it("Text with civilian, hospital, casualties -> includes 'humanitarian'", () => {
      const topics = extractTopics('Civilian casualties', 'Hospital overwhelmed');
      expect(topics).toContain('humanitarian');
    });

    it("Text with protest, demonstrat, rally -> includes 'protest'", () => {
      const topics = extractTopics('Protest erupts', 'Demonstrators rally in streets');
      expect(topics).toContain('protest');
    });

    it("Text with march -> includes 'protest'", () => {
      const topics = extractTopics('March planned', 'Citizens march for change');
      expect(topics).toContain('protest');
    });

    it("No topic keywords -> returns ['general']", () => {
      const topics = extractTopics('News today', 'Regular update from the region');
      expect(topics).toEqual(['general']);
    });

    it('Multiple topics detected', () => {
      const topics = extractTopics('Military forces aid', 'Troops deliver humanitarian supplies');
      expect(topics).toContain('military');
      expect(topics).toContain('humanitarian');
    });

    it('Case insensitive matching', () => {
      const topics = extractTopics('MILITARY', 'DIPLOMATIC');
      expect(topics).toContain('military');
      expect(topics).toContain('diplomacy');
    });
  });

  describe('extractEntities', () => {
    const extractEntities = (title: string, content: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).extractEntities(title, content);
    };

    it("Text with 'Gaza' -> includes 'Gaza'", () => {
      const entities = extractEntities('Gaza update', 'Situation in Gaza continues');
      expect(entities).toContain('Gaza');
    });

    it("Text with 'Israel' -> includes 'Israel'", () => {
      const entities = extractEntities('Israel announces', 'Policy in Israel');
      expect(entities).toContain('Israel');
    });

    it("Text with 'Netanyahu' -> includes 'Netanyahu'", () => {
      const entities = extractEntities('Netanyahu speaks', 'Prime Minister Netanyahu');
      expect(entities).toContain('Netanyahu');
    });

    it("Text with 'Hamas' -> includes 'Hamas'", () => {
      const entities = extractEntities('Hamas response', 'Statement from Hamas');
      expect(entities).toContain('Hamas');
    });

    it("Text with 'Hezbollah' -> includes 'Hezbollah'", () => {
      const entities = extractEntities('Hezbollah', 'Activity from Hezbollah');
      expect(entities).toContain('Hezbollah');
    });

    it("Text with 'UN' -> includes 'UN'", () => {
      const entities = extractEntities('UN resolution', 'The UN voted');
      expect(entities).toContain('UN');
    });

    it("Text with 'Biden' -> includes 'Biden'", () => {
      const entities = extractEntities('Biden speaks', 'President Biden');
      expect(entities).toContain('Biden');
    });

    it('Text with multiple entities -> includes all', () => {
      const entities = extractEntities('Gaza Israel conflict', 'Netanyahu and Biden discuss Hamas');
      expect(entities).toContain('Gaza');
      expect(entities).toContain('Israel');
      expect(entities).toContain('Netanyahu');
      expect(entities).toContain('Biden');
      expect(entities).toContain('Hamas');
    });

    it('Text with no known entities -> returns empty array', () => {
      const entities = extractEntities('Weather update', 'Sunny skies expected');
      expect(entities).toEqual([]);
    });

    it('Entities are case-sensitive (exact match)', () => {
      // The implementation uses exact case matching
      const entities = extractEntities('gaza', 'gaza situation'); // lowercase
      expect(entities).not.toContain('Gaza'); // Won't match because 'Gaza' vs 'gaza'
    });
  });

  describe('createSource', () => {
    const createSource = (name: string, perspective: string, country?: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).createSource(name, perspective, country);
    };

    it('creates NewsSource with correct id (hashString of name)', () => {
      const source = createSource('Test Source', 'western');
      expect(source.id).toBeDefined();
      expect(typeof source.id).toBe('string');
      expect(source.id.length).toBeGreaterThan(0);
    });

    it('sets name correctly', () => {
      const source = createSource('Reuters', 'western');
      expect(source.name).toBe('Reuters');
    });

    it('sets default reliability to 6', () => {
      const source = createSource('Test', 'western');
      expect(source.bias.reliability).toBe(6);
    });

    it("sets ownership to 'private'", () => {
      const source = createSource('Test', 'western');
      expect(source.bias.ownership).toBe('private');
    });

    it('sets political bias to 0', () => {
      const source = createSource('Test', 'western');
      expect(source.bias.political).toBe(0);
    });

    it('uses provided country when given', () => {
      const source = createSource('Test', 'western', 'GB');
      expect(source.country).toBe('GB');
    });

    it('derives country from perspective when not provided', () => {
      const source = createSource('Test', 'russian');
      expect(source.country).toBe('RU');
    });

    it('sets language to en', () => {
      const source = createSource('Test', 'western');
      expect(source.language).toBe('en');
    });
  });

  describe('getCountryFromPerspective', () => {
    const getCountryFromPerspective = (perspective: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).getCountryFromPerspective(perspective);
    };

    it("'western' -> 'US'", () => {
      expect(getCountryFromPerspective('western')).toBe('US');
    });

    it("'middle-east' -> 'QA'", () => {
      expect(getCountryFromPerspective('middle-east')).toBe('QA');
    });

    it("'turkish' -> 'TR'", () => {
      expect(getCountryFromPerspective('turkish')).toBe('TR');
    });

    it("'russian' -> 'RU'", () => {
      expect(getCountryFromPerspective('russian')).toBe('RU');
    });

    it("'chinese' -> 'CN'", () => {
      expect(getCountryFromPerspective('chinese')).toBe('CN');
    });

    it("'alternative' -> 'US'", () => {
      expect(getCountryFromPerspective('alternative')).toBe('US');
    });
  });

  describe('mapLanguage', () => {
    const mapLanguage = (lang: string) => {
      const service = NewsApiService.getInstance();
      return (service as any).mapLanguage(lang);
    };

    it("'en' -> 'en'", () => {
      expect(mapLanguage('en')).toBe('en');
    });

    it("'de' -> 'de'", () => {
      expect(mapLanguage('de')).toBe('de');
    });

    it("'ar' -> 'ar'", () => {
      expect(mapLanguage('ar')).toBe('ar');
    });

    it("'tr' -> 'tr'", () => {
      expect(mapLanguage('tr')).toBe('tr');
    });

    it("'ru' -> 'ru'", () => {
      expect(mapLanguage('ru')).toBe('ru');
    });

    it("'zh' -> 'zh'", () => {
      expect(mapLanguage('zh')).toBe('zh');
    });

    it("Unknown language -> 'en'", () => {
      expect(mapLanguage('fr')).toBe('en');
      expect(mapLanguage('es')).toBe('en');
      expect(mapLanguage('unknown')).toBe('en');
    });
  });
});
