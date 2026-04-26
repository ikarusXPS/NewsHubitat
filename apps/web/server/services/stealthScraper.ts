import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import type { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import type { NewsArticle, NewsSource } from '../../src/types';
import { hashString } from '../utils/hash';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

interface ScraperConfig {
  source: NewsSource;
  url: string;
  selectors: {
    articleContainer: string;
    title: string;
    link: string;
    content?: string;
    image?: string;
    date?: string;
  };
  waitFor?: string;
  scrollToBottom?: boolean;
}

// Scraper configurations for sites with bot protection
const STEALTH_CONFIGS: ScraperConfig[] = [
  {
    source: {
      id: 'reuters-stealth',
      name: 'Reuters',
      country: 'UK',
      region: 'western',
      language: 'en',
      bias: { political: 0, reliability: 9, ownership: 'private' },
    },
    url: 'https://www.reuters.com/world/middle-east/',
    selectors: {
      articleContainer: '[data-testid="MediaStoryCard"], article',
      title: '[data-testid="Heading"], h3',
      link: 'a[href^="/world"]',
      content: '[data-testid="Body"], p',
      image: 'img[src*="cloudfront"]',
      date: 'time',
    },
    waitFor: '[data-testid="MediaStoryCard"]',
    scrollToBottom: true,
  },
  {
    source: {
      id: 'middleeasteye-stealth',
      name: 'Middle East Eye',
      country: 'UK',
      region: 'middle-east',
      language: 'en',
      bias: { political: -0.2, reliability: 6, ownership: 'private' },
    },
    url: 'https://www.middleeasteye.net/news',
    selectors: {
      articleContainer: 'article, .article-card, .teaser',
      title: 'h2 a, h3 a, .headline a',
      link: 'h2 a, h3 a, .headline a',
      content: '.standfirst, .summary, p',
      image: 'img',
      date: 'time, .date',
    },
    waitFor: 'article',
  },
  {
    source: {
      id: 'trtworld-stealth',
      name: 'TRT World',
      country: 'TR',
      region: 'turkish',
      language: 'en',
      bias: { political: 0.3, reliability: 6, ownership: 'state' },
    },
    url: 'https://www.trtworld.com/middle-east',
    selectors: {
      articleContainer: '.news-card, article, .story-item',
      title: 'h3 a, h2 a, .card-title a',
      link: 'h3 a, h2 a, .card-title a',
      content: '.card-text, .summary, p',
      image: 'img',
      date: 'time, .date',
    },
    waitFor: '.news-card, article',
  },
  {
    source: {
      id: 'haaretz-stealth',
      name: 'Haaretz',
      country: 'IL',
      region: 'middle-east',
      language: 'en',
      bias: { political: -0.3, reliability: 8, ownership: 'private' },
    },
    url: 'https://www.haaretz.com/middle-east-news',
    selectors: {
      articleContainer: 'article, .teaser',
      title: 'h2 a, h3 a',
      link: 'h2 a, h3 a',
      content: '.teaser-subtitle, p',
      image: 'img',
      date: 'time',
    },
    waitFor: 'article',
  },
  {
    source: {
      id: 'mei-stealth',
      name: 'Middle East Institute',
      country: 'US',
      region: 'alternative',
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'nonprofit' },
    },
    url: 'https://www.mei.edu/publications',
    selectors: {
      articleContainer: 'article, .publication-item, .views-row',
      title: 'h2 a, h3 a, .title a',
      link: 'h2 a, h3 a, .title a',
      content: '.excerpt, .summary, p',
      image: 'img',
      date: '.date, time',
    },
    waitFor: 'article, .publication-item',
  },
];

export class StealthScraper {
  private static instance: StealthScraper;
  private browser: Browser | null = null;
  private cache: Map<string, { articles: NewsArticle[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private isInitializing = false;

  private constructor() {}

  static getInstance(): StealthScraper {
    if (!StealthScraper.instance) {
      StealthScraper.instance = new StealthScraper();
    }
    return StealthScraper.instance;
  }

  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.browser) return this.browser;
    }

    this.isInitializing = true;

    try {
      console.log('Launching stealth browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      });

      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        this.browser = null;
      });

      console.log('Stealth browser launched');
      return this.browser;
    } finally {
      this.isInitializing = false;
    }
  }

  private async createPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return page;
  }

  async scrapeSource(config: ScraperConfig): Promise<NewsArticle[]> {
    // Check cache
    const cacheKey = config.source.id;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`Using cached articles for ${config.source.name}`);
      return cached.articles;
    }

    let page: Page | null = null;

    try {
      console.log(`Stealth scraping ${config.source.name}: ${config.url}`);
      page = await this.createPage();

      // Navigate with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await page.goto(config.url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          console.log(`Retry ${3 - retries} for ${config.source.name}`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Wait for content to load
      if (config.waitFor) {
        try {
          await page.waitForSelector(config.waitFor, { timeout: 10000 });
        } catch {
          console.log(`Selector ${config.waitFor} not found, continuing anyway`);
        }
      }

      // Scroll to load lazy content
      if (config.scrollToBottom) {
        await this.autoScroll(page);
      }

      // Get page content
      const html = await page.content();
      const articles = this.parseArticles(html, config);

      console.log(`Stealth scraped ${articles.length} articles from ${config.source.name}`);

      // Cache results
      this.cache.set(cacheKey, { articles, timestamp: Date.now() });

      return articles;
    } catch (err) {
      console.error(`Stealth scrape failed for ${config.source.name}:`, err);
      return cached?.articles || [];
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    // Wait for lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private parseArticles(html: string, config: ScraperConfig): NewsArticle[] {
    const $ = cheerio.load(html);
    const articles: NewsArticle[] = [];

    $(config.selectors.articleContainer).each((_, element) => {
      try {
        const $el = $(element);

        const title = $el.find(config.selectors.title).first().text().trim();
        let link = $el.find(config.selectors.link).first().attr('href') || '';
        const content = config.selectors.content
          ? $el.find(config.selectors.content).first().text().trim()
          : '';
        const image = config.selectors.image
          ? $el.find(config.selectors.image).first().attr('src')
          : undefined;
        const dateStr = config.selectors.date
          ? $el.find(config.selectors.date).first().text().trim()
          : undefined;

        if (!title || !link) return;

        // Make relative URLs absolute
        if (link.startsWith('/')) {
          const baseUrl = new URL(config.url);
          link = `${baseUrl.origin}${link}`;
        }

        const publishedAt = dateStr ? new Date(dateStr) : new Date();
        const sentiment = this.analyzeSentiment(title, content);

        articles.push({
          id: `stealth-${config.source.id}-${hashString(link)}`,
          title,
          content: content || title,
          summary: content?.slice(0, 200),
          source: config.source,
          originalLanguage: config.source.language,
          publishedAt,
          url: link,
          imageUrl: image,
          sentiment: sentiment.type,
          sentimentScore: sentiment.score,
          perspective: config.source.region,
          topics: this.extractTopics(title, content),
          entities: this.extractEntities(title, content),
          cached: false,
        });
      } catch {
        // Skip invalid articles
      }
    });

    return articles.slice(0, 15); // Limit per source
  }

  async scrapeAll(): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];

    // Process in batches of 2 to avoid overloading
    for (let i = 0; i < STEALTH_CONFIGS.length; i += 2) {
      const batch = STEALTH_CONFIGS.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map((config) => this.scrapeSource(config))
      );
      results.push(...batchResults.flat());

      // Small delay between batches
      if (i + 2 < STEALTH_CONFIGS.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Utility methods
  private analyzeSentiment(title: string, content: string): { type: 'positive' | 'negative' | 'neutral'; score: number } {
    const text = `${title} ${content}`.toLowerCase();

    const negativeWords = ['attack', 'killed', 'dead', 'war', 'bomb', 'strike', 'crisis', 'terror', 'violence', 'casualties', 'destruction'];
    const positiveWords = ['peace', 'ceasefire', 'aid', 'rescue', 'agreement', 'hope', 'relief', 'support', 'humanitarian', 'release'];

    const negCount = negativeWords.filter((w) => text.includes(w)).length;
    const posCount = positiveWords.filter((w) => text.includes(w)).length;

    if (negCount > posCount + 1) {
      return { type: 'negative', score: -0.5 - Math.min(negCount * 0.1, 0.4) };
    }
    if (posCount > negCount + 1) {
      return { type: 'positive', score: 0.5 + Math.min(posCount * 0.1, 0.4) };
    }
    return { type: 'neutral', score: (posCount - negCount) * 0.1 };
  }

  private extractTopics(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const topics: string[] = [];

    const topicKeywords: Record<string, string[]> = {
      military: ['military', 'army', 'strike', 'operation', 'forces', 'troops'],
      diplomacy: ['diplomat', 'negotiat', 'talks', 'agreement', 'summit', 'ceasefire'],
      humanitarian: ['humanitarian', 'aid', 'refugee', 'civilian', 'hospital', 'casualties'],
      protest: ['protest', 'demonstrat', 'rally', 'march'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => text.includes(kw))) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['general'];
  }

  private extractEntities(title: string, content: string): string[] {
    const text = `${title} ${content}`;
    const entities: string[] = [];

    const knownEntities = ['Gaza', 'Israel', 'Hamas', 'UN', 'Hezbollah', 'Iran', 'USA', 'Turkey', 'Egypt', 'Qatar', 'Biden', 'Netanyahu'];
    for (const entity of knownEntities) {
      if (text.includes(entity)) {
        entities.push(entity);
      }
    }

    return entities;
  }

  getConfigs(): ScraperConfig[] {
    return STEALTH_CONFIGS;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
