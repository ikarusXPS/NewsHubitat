/**
 * Unit tests for StealthScraper
 * Tests Puppeteer mocking, cheerio parsing (real), caching, sentiment analysis, entity extraction, and retry logic
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock page object - defined as module-level variable
const mockPage = {
  setViewport: vi.fn(),
  setUserAgent: vi.fn(),
  setExtraHTTPHeaders: vi.fn(),
  setRequestInterception: vi.fn(),
  on: vi.fn(),
  goto: vi.fn(),
  waitForSelector: vi.fn(),
  content: vi.fn(),
  evaluate: vi.fn(),
  close: vi.fn(),
};

// Mock browser object - defined as module-level variable
const mockBrowser = {
  newPage: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
};

// Mock puppeteer launch function
const mockLaunch = vi.fn();

vi.mock('puppeteer-extra', () => {
  return {
    default: {
      use: vi.fn(),
      launch: (...args: unknown[]) => mockLaunch(...args),
    },
  };
});

vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: vi.fn(),
}));

vi.mock('puppeteer-extra-plugin-adblocker', () => ({
  default: vi.fn(),
}));

vi.mock('../utils/hash', () => ({
  hashString: vi.fn((str: string) => `hash-${str.slice(-20)}`),
}));

// Silence console output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Do NOT mock cheerio - use real cheerio per D-03
import { StealthScraper } from './stealthScraper';

describe('StealthScraper', () => {
  // Sample HTML fixtures for cheerio tests
  const sampleHtml = `
    <html><body>
      <article>
        <h3><a href="/world/article-1">Breaking News Title</a></h3>
        <p>Article content about war and conflict.</p>
        <img src="https://cdn.example.com/image.jpg" />
        <time>2024-01-15</time>
      </article>
      <article>
        <h3><a href="/world/article-2">Peace Talks Resume</a></h3>
        <p>Diplomatic negotiations continue with hope for ceasefire.</p>
      </article>
    </body></html>
  `;

  const testConfig = {
    source: {
      id: 'test-source',
      name: 'Test Source',
      country: 'US',
      region: 'western' as const,
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'private' as const },
    },
    url: 'https://test.com/news',
    selectors: {
      articleContainer: 'article',
      title: 'h3 a',
      link: 'h3 a',
      content: 'p',
      image: 'img',
      date: 'time',
    },
    waitFor: 'article',
    scrollToBottom: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    vi.clearAllMocks();

    // Reset mock implementations to default behavior
    mockPage.setViewport.mockResolvedValue(undefined);
    mockPage.setUserAgent.mockResolvedValue(undefined);
    mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
    mockPage.setRequestInterception.mockResolvedValue(undefined);
    mockPage.on.mockReturnValue(undefined);
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.waitForSelector.mockResolvedValue(undefined);
    mockPage.content.mockResolvedValue('<html><body></body></html>');
    mockPage.evaluate.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);

    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.on.mockReturnValue(undefined);
    mockBrowser.close.mockResolvedValue(undefined);

    mockLaunch.mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    // Reset singleton per D-13
    const instance = (StealthScraper as unknown as { instance: StealthScraper | null }).instance;
    if (instance) {
      instance.clearCache();
    }
    (StealthScraper as unknown as { instance: StealthScraper | null }).instance = null;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = StealthScraper.getInstance();
      const instance2 = StealthScraper.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('getConfigs should return 5 stealth configs', () => {
      const scraper = StealthScraper.getInstance();
      const configs = scraper.getConfigs();
      expect(configs.length).toBe(5);
      expect(configs.map(c => c.source.id)).toContain('reuters-stealth');
      expect(configs.map(c => c.source.id)).toContain('middleeasteye-stealth');
      expect(configs.map(c => c.source.id)).toContain('trtworld-stealth');
      expect(configs.map(c => c.source.id)).toContain('haaretz-stealth');
      expect(configs.map(c => c.source.id)).toContain('mei-stealth');
    });
  });

  describe('Browser Initialization', () => {
    it('initBrowser should launch puppeteer with stealth options', async () => {
      const scraper = StealthScraper.getInstance();

      // Trigger browser initialization by scraping
      mockPage.content.mockResolvedValue(sampleHtml);
      await scraper.scrapeSource(testConfig);

      expect(mockLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ]),
        })
      );
    });

    it('initBrowser should reuse existing browser', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // First scrape initializes browser
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(1);

      // Clear cache so second scrape doesn't return cached
      scraper.clearCache();

      // Second scrape should reuse existing browser
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(1); // Still 1
    });

    it('initBrowser should wait when already initializing', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // Make launch slow to test waiting
      let launchResolve: () => void;
      mockLaunch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            launchResolve = () => resolve(mockBrowser);
          })
      );

      // Start two scrapes concurrently
      const promise1 = scraper.scrapeSource({
        ...testConfig,
        source: { ...testConfig.source, id: 'source1' },
      });
      const promise2 = scraper.scrapeSource({
        ...testConfig,
        source: { ...testConfig.source, id: 'source2' },
      });

      // Advance timers for the waiting loop
      await vi.advanceTimersByTimeAsync(500);

      // Resolve the browser launch
      launchResolve!();
      await vi.advanceTimersByTimeAsync(100);

      await Promise.all([promise1, promise2]);

      // Only one browser launch should have occurred
      expect(mockLaunch).toHaveBeenCalledTimes(1);
    });

    it('closeBrowser should close browser and reset state', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // Initialize browser
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(1);

      // Close browser
      await scraper.closeBrowser();
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);

      // Clear cache and scrape again - should launch new browser
      scraper.clearCache();
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(2);
    });

    it('should handle browser disconnect event', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // Initialize browser
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(1);

      // Simulate browser disconnect by calling the callback registered via browser.on
      const disconnectCall = mockBrowser.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'disconnected'
      );
      expect(disconnectCall).toBeDefined();
      const disconnectCallback = disconnectCall![1] as () => void;
      disconnectCallback();

      // Clear cache and scrape again - should launch new browser since browser is now null
      scraper.clearCache();
      await scraper.scrapeSource(testConfig);
      expect(mockLaunch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Page Creation', () => {
    it('createPage should set viewport to 1920x1080', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      expect(mockPage.setViewport).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });

    it('createPage should set realistic user agent', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla/5.0')
      );
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Chrome')
      );
    });

    it('createPage should set Accept-Language header', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'Accept-Language': expect.stringContaining('en-US'),
        })
      );
    });

    it('createPage should enable request interception', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
    });

    it('request interception should abort font and media requests', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      // Get the request handler callback
      const requestCall = mockPage.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'request'
      );
      expect(requestCall).toBeDefined();
      const requestHandler = requestCall![1] as (req: { resourceType: () => string; abort: () => void; continue: () => void }) => void;

      // Test font request - should abort
      const fontRequest = {
        resourceType: () => 'font',
        abort: vi.fn(),
        continue: vi.fn(),
      };
      requestHandler(fontRequest);
      expect(fontRequest.abort).toHaveBeenCalled();
      expect(fontRequest.continue).not.toHaveBeenCalled();

      // Test media request - should abort
      const mediaRequest = {
        resourceType: () => 'media',
        abort: vi.fn(),
        continue: vi.fn(),
      };
      requestHandler(mediaRequest);
      expect(mediaRequest.abort).toHaveBeenCalled();
      expect(mediaRequest.continue).not.toHaveBeenCalled();

      // Test document request - should continue
      const docRequest = {
        resourceType: () => 'document',
        abort: vi.fn(),
        continue: vi.fn(),
      };
      requestHandler(docRequest);
      expect(docRequest.abort).not.toHaveBeenCalled();
      expect(docRequest.continue).toHaveBeenCalled();
    });
  });

  describe('Scraping with Cache', () => {
    it('scrapeSource should return cached articles within TTL', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // First scrape
      const articles1 = await scraper.scrapeSource(testConfig);
      expect(articles1.length).toBeGreaterThan(0);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);

      // Advance time within TTL (15 minutes)
      vi.advanceTimersByTime(15 * 60 * 1000);

      // Second scrape should use cache
      const articles2 = await scraper.scrapeSource(testConfig);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1); // Still 1
      expect(articles2).toEqual(articles1);
    });

    it('scrapeSource should fetch new articles when cache expired', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // First scrape
      await scraper.scrapeSource(testConfig);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);

      // Advance time past 30 minute TTL
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Second scrape should fetch fresh
      await scraper.scrapeSource(testConfig);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
    });

    it('scrapeSource should cache successful results', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      expect(scraper.getCacheSize()).toBe(0);

      await scraper.scrapeSource(testConfig);

      expect(scraper.getCacheSize()).toBe(1);
    });

    it('getCacheSize should return number of cached sources', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      expect(scraper.getCacheSize()).toBe(0);

      await scraper.scrapeSource(testConfig);
      expect(scraper.getCacheSize()).toBe(1);

      await scraper.scrapeSource({
        ...testConfig,
        source: { ...testConfig.source, id: 'another-source' },
      });
      expect(scraper.getCacheSize()).toBe(2);
    });

    it('clearCache should empty cache', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);
      expect(scraper.getCacheSize()).toBe(1);

      scraper.clearCache();
      expect(scraper.getCacheSize()).toBe(0);
    });
  });

  describe('Navigation and Retry', () => {
    it('scrapeSource should retry on navigation failure', async () => {
      const scraper = StealthScraper.getInstance();

      // First two attempts fail, third succeeds
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      mockPage.content.mockResolvedValue(sampleHtml);

      // Start scraping and advance timers for retry delays (2s each)
      const promise = scraper.scrapeSource(testConfig);
      await vi.advanceTimersByTimeAsync(5000);
      const articles = await promise;

      expect(mockPage.goto).toHaveBeenCalledTimes(3);
      expect(articles.length).toBeGreaterThan(0);
    });

    it('scrapeSource should fail after 3 retries', async () => {
      const scraper = StealthScraper.getInstance();

      // All 3 attempts fail
      mockPage.goto.mockRejectedValue(new Error('Persistent failure'));

      // Start scraping and advance timers for retry delays (2s each)
      const promise = scraper.scrapeSource(testConfig);
      await vi.advanceTimersByTimeAsync(10000);
      const articles = await promise;

      expect(mockPage.goto).toHaveBeenCalledTimes(3);
      expect(articles).toEqual([]); // No cached articles
    });

    it('scrapeSource should return cached articles on error', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // First successful scrape
      const articles1 = await scraper.scrapeSource(testConfig);
      expect(articles1.length).toBeGreaterThan(0);

      // Expire cache
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Second scrape fails
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      // Start scraping and advance timers for retry delays
      const promise = scraper.scrapeSource(testConfig);
      await vi.advanceTimersByTimeAsync(10000);
      const articles2 = await promise;

      // Should return cached articles
      expect(articles2).toEqual(articles1);
    });
  });

  describe('HTML Parsing (real cheerio)', () => {
    it('parseArticles should extract title from selector', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles.length).toBe(2);
      expect(articles[0].title).toBe('Breaking News Title');
      expect(articles[1].title).toBe('Peace Talks Resume');
    });

    it('parseArticles should make relative URLs absolute', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].url).toBe('https://test.com/world/article-1');
      expect(articles[1].url).toBe('https://test.com/world/article-2');
    });

    it('parseArticles should skip articles without title or link', async () => {
      const scraper = StealthScraper.getInstance();
      const htmlWithInvalid = `
        <html><body>
          <article>
            <h3><a href="/valid">Valid Article</a></h3>
            <p>Content</p>
          </article>
          <article>
            <h3><a href=""></a></h3>
            <p>No title</p>
          </article>
          <article>
            <p>No link at all</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(htmlWithInvalid);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Valid Article');
    });

    it('parseArticles should limit to 15 articles per source', async () => {
      const scraper = StealthScraper.getInstance();
      // Create HTML with 20 articles
      const manyArticles = Array.from({ length: 20 }, (_, i) => `
        <article>
          <h3><a href="/article-${i}">Article ${i}</a></h3>
          <p>Content ${i}</p>
        </article>
      `).join('');
      const htmlManyArticles = `<html><body>${manyArticles}</body></html>`;
      mockPage.content.mockResolvedValue(htmlManyArticles);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles.length).toBe(15);
    });

    it('parseArticles should generate unique IDs with hash', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const articles = await scraper.scrapeSource(testConfig);

      // IDs should include source id and hash prefix
      expect(articles[0].id).toContain('stealth-test-source-hash-');
      expect(articles[1].id).toContain('stealth-test-source-hash-');
      // IDs should be unique (different article URLs produce different hashes)
      // The hash mock uses last 20 chars of URL, so article-1 vs article-2 are different
      expect(articles[0].id).toContain('article-1');
      expect(articles[1].id).toContain('article-2');
    });
  });

  describe('Sentiment Analysis', () => {
    it('analyzeSentiment should return negative for conflict keywords', async () => {
      const scraper = StealthScraper.getInstance();
      const negativeHtml = `
        <html><body>
          <article>
            <h3><a href="/neg">Attack killed many in war bombing</a></h3>
            <p>Violence, destruction, terror, and crisis continue</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(negativeHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].sentiment).toBe('negative');
      expect(articles[0].sentimentScore).toBeLessThan(0);
    });

    it('analyzeSentiment should return positive for peace keywords', async () => {
      const scraper = StealthScraper.getInstance();
      const positiveHtml = `
        <html><body>
          <article>
            <h3><a href="/pos">Peace ceasefire agreement brings hope</a></h3>
            <p>Relief, support, and humanitarian aid rescue operation</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(positiveHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].sentiment).toBe('positive');
      expect(articles[0].sentimentScore).toBeGreaterThan(0);
    });

    it('analyzeSentiment should return neutral for balanced content', async () => {
      const scraper = StealthScraper.getInstance();
      const neutralHtml = `
        <html><body>
          <article>
            <h3><a href="/neu">Meeting scheduled for discussion</a></h3>
            <p>Officials will discuss various topics tomorrow</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(neutralHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].sentiment).toBe('neutral');
    });

    it('analyzeSentiment should scale score based on keyword count', async () => {
      const scraper = StealthScraper.getInstance();

      // Few negative keywords
      const fewNegative = `
        <html><body>
          <article>
            <h3><a href="/few">Attack reported</a></h3>
            <p>Brief content</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(fewNegative);
      const articlesFew = await scraper.scrapeSource(testConfig);
      const scoreFew = articlesFew[0].sentimentScore;

      // Clear cache
      scraper.clearCache();

      // Many negative keywords
      const manyNegative = `
        <html><body>
          <article>
            <h3><a href="/many">Attack killed many in war bombing strike terror</a></h3>
            <p>Violence crisis destruction casualties</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(manyNegative);
      const articlesMany = await scraper.scrapeSource(testConfig);
      const scoreMany = articlesMany[0].sentimentScore;

      // More keywords should result in more extreme score
      expect(scoreMany).toBeLessThan(scoreFew);
    });
  });

  describe('Topic Extraction', () => {
    it('extractTopics should detect military keywords', async () => {
      const scraper = StealthScraper.getInstance();
      const militaryHtml = `
        <html><body>
          <article>
            <h3><a href="/mil">Military forces launch operation</a></h3>
            <p>Army troops deployed in strike</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(militaryHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].topics).toContain('military');
    });

    it('extractTopics should detect diplomacy keywords', async () => {
      const scraper = StealthScraper.getInstance();
      const diplomacyHtml = `
        <html><body>
          <article>
            <h3><a href="/dip">Diplomatic talks lead to agreement</a></h3>
            <p>Summit negotiations successful ceasefire</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(diplomacyHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].topics).toContain('diplomacy');
    });

    it('extractTopics should detect humanitarian keywords', async () => {
      const scraper = StealthScraper.getInstance();
      const humanitarianHtml = `
        <html><body>
          <article>
            <h3><a href="/hum">Humanitarian aid reaches refugees</a></h3>
            <p>Civilian hospital receives supplies</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(humanitarianHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].topics).toContain('humanitarian');
    });

    it('extractTopics should return general for no matches', async () => {
      const scraper = StealthScraper.getInstance();
      const generalHtml = `
        <html><body>
          <article>
            <h3><a href="/gen">Weather forecast sunny</a></h3>
            <p>Expect clear skies tomorrow</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(generalHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].topics).toContain('general');
    });
  });

  describe('Entity Extraction', () => {
    it('extractEntities should find known entities', async () => {
      const scraper = StealthScraper.getInstance();
      const entityHtml = `
        <html><body>
          <article>
            <h3><a href="/ent">Gaza conflict: Israel responds</a></h3>
            <p>UN calls for immediate action</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(entityHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].entities).toContain('Gaza');
      expect(articles[0].entities).toContain('Israel');
      expect(articles[0].entities).toContain('UN');
    });

    it('extractEntities should find multiple entities', async () => {
      const scraper = StealthScraper.getInstance();
      const multiEntityHtml = `
        <html><body>
          <article>
            <h3><a href="/multi">Hamas, Hezbollah, and Iran meet with Turkey</a></h3>
            <p>Biden and Netanyahu discuss situation, Egypt and Qatar mediate</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(multiEntityHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].entities).toContain('Hamas');
      expect(articles[0].entities).toContain('Hezbollah');
      expect(articles[0].entities).toContain('Iran');
      expect(articles[0].entities).toContain('Turkey');
      expect(articles[0].entities).toContain('Biden');
      expect(articles[0].entities).toContain('Netanyahu');
      expect(articles[0].entities).toContain('Egypt');
      expect(articles[0].entities).toContain('Qatar');
    });

    it('extractEntities should return empty for no matches', async () => {
      const scraper = StealthScraper.getInstance();
      const noEntityHtml = `
        <html><body>
          <article>
            <h3><a href="/none">Local weather forecast</a></h3>
            <p>Sunny with some clouds expected</p>
          </article>
        </body></html>
      `;
      mockPage.content.mockResolvedValue(noEntityHtml);

      const articles = await scraper.scrapeSource(testConfig);

      expect(articles[0].entities).toEqual([]);
    });
  });

  describe('Batch Scraping', () => {
    it('scrapeAll should process configs in batches of 2', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // Start scrapeAll - should process in batches
      const promise = scraper.scrapeAll();

      // Advance timers to handle batch delays (5 sources, 2 per batch = 3 batches, 2s delay between)
      await vi.advanceTimersByTimeAsync(10000);

      await promise;

      // Should have scraped all 5 configs
      expect(scraper.getCacheSize()).toBe(5);
    });

    it('scrapeAll should aggregate results from all sources', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const promise = scraper.scrapeAll();
      await vi.advanceTimersByTimeAsync(10000);
      const articles = await promise;

      // Each source produces 2 articles from sampleHtml, 5 sources = 10 articles
      expect(articles.length).toBe(10);
    });

    it('scrapeAll should delay between batches', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      // Track timing of newPage calls
      const callTimes: number[] = [];
      mockBrowser.newPage.mockImplementation(() => {
        callTimes.push(Date.now());
        return Promise.resolve(mockPage);
      });

      const promise = scraper.scrapeAll();
      await vi.advanceTimersByTimeAsync(10000);
      await promise;

      // With 5 configs in batches of 2, we expect 5 page creations
      expect(callTimes.length).toBe(5);

      // Check that there are delays between batches
      // Batch 1: calls 0,1 (parallel)
      // Batch 2: calls 2,3 (parallel, after 2s delay)
      // Batch 3: call 4 (after 2s delay)
      // The third call should be at least 2s after the first
      if (callTimes.length >= 3) {
        expect(callTimes[2] - callTimes[0]).toBeGreaterThanOrEqual(2000);
      }
    });
  });

  describe('AutoScroll', () => {
    it('should call page.evaluate when scrollToBottom is true', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const configWithScroll = {
        ...testConfig,
        scrollToBottom: true,
      };

      // Start scraping and advance timers for autoScroll delay (1s after evaluate)
      const promise = scraper.scrapeSource(configWithScroll);
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should not call page.evaluate when scrollToBottom is false', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const configNoScroll = {
        ...testConfig,
        scrollToBottom: false,
      };

      await scraper.scrapeSource(configNoScroll);

      expect(mockPage.evaluate).not.toHaveBeenCalled();
    });
  });

  describe('WaitFor Selector', () => {
    it('should wait for selector when waitFor is specified', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      await scraper.scrapeSource(testConfig);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('article', { timeout: 10000 });
    });

    it('should continue when waitFor selector not found', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);
      mockPage.waitForSelector.mockRejectedValueOnce(new Error('Timeout'));

      const articles = await scraper.scrapeSource(testConfig);

      // Should still return articles despite selector timeout
      expect(articles.length).toBe(2);
    });

    it('should skip waitFor when not specified', async () => {
      const scraper = StealthScraper.getInstance();
      mockPage.content.mockResolvedValue(sampleHtml);

      const configNoWait = {
        ...testConfig,
        waitFor: undefined,
      };

      await scraper.scrapeSource(configNoWait);

      expect(mockPage.waitForSelector).not.toHaveBeenCalled();
    });
  });
});
