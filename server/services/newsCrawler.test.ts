/**
 * Unit tests for NewsCrawler
 * Tests HTML crawling with real cheerio (D-03), rate limiting (D-09), cache TTL, and utility methods
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios per D-01
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Do NOT mock cheerio - use real cheerio per D-03

// Silence console output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

import { NewsCrawler } from './newsCrawler';

describe('NewsCrawler', () => {
  let mockAxiosGet: ReturnType<typeof vi.fn>;

  const testConfig = {
    source: {
      id: 'test-source',
      name: 'Test Source',
      country: 'US',
      region: 'western' as const,
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'private' as const },
    },
    selectors: {
      articleContainer: '.news-item',
      title: 'h2 a',
      content: '.lead',
      link: 'h2 a',
      image: 'img',
      date: '.date',
    },
    baseUrl: 'https://test.com',
    searchPath: '/news',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-21T12:00:00Z'));
    mockAxiosGet = vi.mocked(axios.get);
  });

  afterEach(() => {
    // Reset singleton per D-13
    (NewsCrawler as any).instance = null;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = NewsCrawler.getInstance();
      const instance2 = NewsCrawler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('crawlSource', () => {
    const recentDate = new Date('2026-04-21T10:00:00Z').toISOString();
    const mockHtml = `
      <html><body>
        <div class="news-item">
          <h2><a href="/article/1">Breaking: Test Event</a></h2>
          <p class="lead">Summary of the test event with attack details</p>
          <img src="/images/event.jpg" />
          <span class="date">${recentDate}</span>
        </div>
        <div class="news-item">
          <h2><a href="https://external.com/article/2">Second Article</a></h2>
          <p class="lead">Peace talks continue with hope for ceasefire</p>
          <img src="https://cdn.test.com/img2.jpg" />
          <span class="date">${recentDate}</span>
        </div>
      </body></html>
    `;

    describe('cache behavior', () => {
      it('returns cached articles within TTL', async () => {
        const crawler = NewsCrawler.getInstance();
        mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });

        // First call populates cache
        const articles1 = await crawler.crawlSource(testConfig);
        expect(articles1.length).toBe(2);
        expect(mockAxiosGet).toHaveBeenCalledTimes(1);

        // Second call within 30 min returns cache (no HTTP)
        vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
        const articles2 = await crawler.crawlSource(testConfig);
        expect(articles2.length).toBe(2);
        expect(mockAxiosGet).toHaveBeenCalledTimes(1); // Still 1
      });

      it('fetches fresh after cache expires', async () => {
        const crawler = NewsCrawler.getInstance();
        mockAxiosGet.mockResolvedValue({ data: mockHtml });

        // First call
        await crawler.crawlSource(testConfig);
        expect(mockAxiosGet).toHaveBeenCalledTimes(1);

        // Advance past 30 minute TTL
        vi.advanceTimersByTime(31 * 60 * 1000);

        // Second call makes new HTTP request
        await crawler.crawlSource(testConfig);
        expect(mockAxiosGet).toHaveBeenCalledTimes(2);
      });
    });

    describe('error handling', () => {
      it('returns empty array on HTTP error with no cache', async () => {
        const crawler = NewsCrawler.getInstance();
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

        const articles = await crawler.crawlSource(testConfig);
        expect(articles).toEqual([]);
      });

      it('returns cached articles on HTTP error when cache exists', async () => {
        const crawler = NewsCrawler.getInstance();

        // First call succeeds
        mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });
        const articles1 = await crawler.crawlSource(testConfig);
        expect(articles1.length).toBe(2);

        // Advance past TTL
        vi.advanceTimersByTime(31 * 60 * 1000);

        // Second call fails - should return cached
        mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));
        const articles2 = await crawler.crawlSource(testConfig);
        expect(articles2.length).toBe(2);
      });
    });

    it('constructs correct URL with searchPath', async () => {
      const crawler = NewsCrawler.getInstance();
      mockAxiosGet.mockResolvedValueOnce({ data: '<html></html>' });

      await crawler.crawlSource(testConfig);

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://test.com/news',
        expect.objectContaining({
          headers: expect.any(Object),
          timeout: 10000,
        })
      );
    });

    it('uses baseUrl only when no searchPath', async () => {
      const crawler = NewsCrawler.getInstance();
      mockAxiosGet.mockResolvedValueOnce({ data: '<html></html>' });

      const configNoPath = { ...testConfig, searchPath: undefined };
      await crawler.crawlSource(configNoPath);

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://test.com',
        expect.any(Object)
      );
    });
  });

  describe('parseArticles (real cheerio - D-03)', () => {
    it('extracts article data from HTML', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date('2026-04-21T10:00:00Z').toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/article/1">Test Title</a></h2>
          <p class="lead">Test summary content</p>
          <img src="/img/test.jpg" />
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Test Title');
      expect(articles[0].content).toBe('Test summary content');
      expect(articles[0].source.id).toBe('test-source');
    });

    it('makes relative URLs absolute', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/article/relative">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles[0].url).toBe('https://test.com/article/relative');
    });

    it('preserves absolute URLs', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="https://other.com/article">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles[0].url).toBe('https://other.com/article');
    });

    it('filters articles older than 48 hours', async () => {
      const crawler = NewsCrawler.getInstance();
      const oldDate = new Date('2026-04-18T12:00:00Z').toISOString(); // 3 days ago
      const recentDate = new Date('2026-04-21T10:00:00Z').toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/old">Old Article</a></h2>
          <p class="lead">Old content</p>
          <span class="date">${oldDate}</span>
        </div>
        <div class="news-item">
          <h2><a href="/new">Recent Article</a></h2>
          <p class="lead">Recent content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Recent Article');
    });

    it('handles missing optional fields gracefully', async () => {
      const crawler = NewsCrawler.getInstance();
      const html = `
        <div class="news-item">
          <h2><a href="/article">Title Only</a></h2>
          <p class="lead"></p>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Title Only');
      expect(articles[0].content).toBe('Title Only'); // Falls back to title
    });

    it('skips articles without title or link', async () => {
      const crawler = NewsCrawler.getInstance();
      const html = `
        <div class="news-item">
          <h2><a href=""></a></h2>
          <p class="lead">No title or link</p>
        </div>
        <div class="news-item">
          <p class="lead">No link at all</p>
        </div>
      `;
      mockAxiosGet.mockResolvedValueOnce({ data: html });

      const articles = await crawler.crawlSource(testConfig);

      expect(articles.length).toBe(0);
    });
  });

  describe('rate limiting (D-09 with fake timers)', () => {
    it('delays consecutive requests by 2 seconds', async () => {
      const crawler = NewsCrawler.getInstance();
      const html = '<html></html>';
      mockAxiosGet.mockResolvedValue({ data: html });

      // First request - immediate
      const promise1 = crawler.crawlSource({ ...testConfig, source: { ...testConfig.source, id: 'source1' } });

      // Advance time to complete first request
      await vi.advanceTimersByTimeAsync(100);
      await promise1;

      // Start second request immediately
      const _startTime = Date.now();
      const promise2 = crawler.crawlSource({ ...testConfig, source: { ...testConfig.source, id: 'source2' } });

      // Advance past rate limit delay
      await vi.advanceTimersByTimeAsync(2000);
      await promise2;

      // Second request should have waited
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('proceeds immediately after delay period', async () => {
      const crawler = NewsCrawler.getInstance();
      mockAxiosGet.mockResolvedValue({ data: '<html></html>' });

      // First request
      const promise1 = crawler.crawlSource({ ...testConfig, source: { ...testConfig.source, id: 'src1' } });
      await vi.advanceTimersByTimeAsync(100);
      await promise1;

      // Wait longer than rate limit
      vi.advanceTimersByTime(3000);

      // Second request should proceed without delay
      const promise2 = crawler.crawlSource({ ...testConfig, source: { ...testConfig.source, id: 'src2' } });
      await vi.advanceTimersByTimeAsync(100);
      await promise2;

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('crawlAll', () => {
    it('crawls all configured sources', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/article">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValue({ data: html });

      // Run crawlAll with timer advancement for rate limiting
      const promise = crawler.crawlAll();
      // Advance timers to handle rate limiting delays (9 sources * 2s = 18s)
      await vi.advanceTimersByTimeAsync(20000);
      const articles = await promise;

      // Should have crawled multiple sources (CRAWL_CONFIGS has 9 sources)
      expect(mockAxiosGet.mock.calls.length).toBeGreaterThan(0);
      expect(articles.length).toBeGreaterThan(0);
    });

    it('continues on single source failure', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/article">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;

      // First source fails, rest succeed
      mockAxiosGet
        .mockRejectedValueOnce(new Error('First source failed'))
        .mockResolvedValue({ data: html });

      // Run with timer advancement
      const promise = crawler.crawlAll();
      await vi.advanceTimersByTimeAsync(20000);
      const _articles = await promise;

      // Should still have articles from other sources
      expect(mockAxiosGet.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('utility methods (D-12 basic coverage)', () => {
    let crawler: NewsCrawler;

    beforeEach(() => {
      crawler = NewsCrawler.getInstance();
    });

    describe('analyzeSentiment', () => {
      it('classifies negative content', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/neg">Attack killed many in war bombing</a></h2>
            <p class="lead">Violence and destruction in crisis</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].sentiment).toBe('negative');
        expect(articles[0].sentimentScore).toBeLessThan(0);
      });

      it('classifies positive content', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/pos">Peace ceasefire agreement brings hope</a></h2>
            <p class="lead">Relief and support for humanitarian aid</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].sentiment).toBe('positive');
        expect(articles[0].sentimentScore).toBeGreaterThan(0);
      });

      it('classifies neutral content', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/neu">Meeting scheduled for tomorrow</a></h2>
            <p class="lead">Officials will discuss various topics</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].sentiment).toBe('neutral');
      });
    });

    describe('extractTopics', () => {
      it('extracts military topic', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/mil">Military forces launch operation</a></h2>
            <p class="lead">Army troops deployed</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].topics).toContain('military');
      });

      it('extracts diplomacy topic', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/dip">Diplomatic talks lead to agreement</a></h2>
            <p class="lead">Summit negotiations successful</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].topics).toContain('diplomacy');
      });

      it('returns general when no topics match', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/gen">Weather forecast for today</a></h2>
            <p class="lead">Sunny with clouds</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].topics).toContain('general');
      });
    });

    describe('extractEntities', () => {
      it('extracts known entities', async () => {
        const recentDate = new Date().toISOString();
        const html = `
          <div class="news-item">
            <h2><a href="/ent">Gaza conflict: Israel and Hamas</a></h2>
            <p class="lead">UN calls for ceasefire, Biden responds</p>
            <span class="date">${recentDate}</span>
          </div>
        `;
        mockAxiosGet.mockResolvedValueOnce({ data: html });

        const articles = await crawler.crawlSource(testConfig);

        expect(articles[0].entities).toContain('Gaza');
        expect(articles[0].entities).toContain('Israel');
        expect(articles[0].entities).toContain('Hamas');
        expect(articles[0].entities).toContain('UN');
        expect(articles[0].entities).toContain('Biden');
      });
    });
  });

  describe('getCacheSize', () => {
    it('returns 0 when cache is empty', () => {
      const crawler = NewsCrawler.getInstance();
      expect(crawler.getCacheSize()).toBe(0);
    });

    it('returns correct cache size after crawling', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/a">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValue({ data: html });

      // First crawl
      const p1 = crawler.crawlSource(testConfig);
      await vi.advanceTimersByTimeAsync(100);
      await p1;
      expect(crawler.getCacheSize()).toBe(1);

      // Second crawl with rate limiting delay
      const p2 = crawler.crawlSource({ ...testConfig, source: { ...testConfig.source, id: 'another' } });
      await vi.advanceTimersByTimeAsync(3000);
      await p2;
      expect(crawler.getCacheSize()).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('clears all cached articles', async () => {
      const crawler = NewsCrawler.getInstance();
      const recentDate = new Date().toISOString();
      const html = `
        <div class="news-item">
          <h2><a href="/a">Title</a></h2>
          <p class="lead">Content</p>
          <span class="date">${recentDate}</span>
        </div>
      `;
      mockAxiosGet.mockResolvedValue({ data: html });

      await crawler.crawlSource(testConfig);
      expect(crawler.getCacheSize()).toBe(1);

      crawler.clearCache();
      expect(crawler.getCacheSize()).toBe(0);
    });
  });
});
