import * as cheerio from 'cheerio';
import axios from 'axios';
import type { NewsArticle, NewsSource, PerspectiveRegion } from '../../src/types';
import { hashString } from '../utils/hash';

interface CrawlConfig {
  source: NewsSource;
  selectors: {
    articleContainer: string;
    title: string;
    content: string;
    link: string;
    image?: string;
    date?: string;
  };
  baseUrl: string;
  searchPath?: string;
}

// Crawler configurations for sources without RSS feeds or with broken RSS
const CRAWL_CONFIGS: CrawlConfig[] = [
  // ===== SOURCES WITHOUT RSS =====
  {
    source: {
      id: 'presstv',
      name: 'PressTV',
      country: 'IR',
      region: 'middle-east',
      language: 'en',
      bias: { political: 0.4, reliability: 4, ownership: 'state' },
    },
    selectors: {
      articleContainer: '.news-item, article.item',
      title: 'h2 a, .title a',
      content: '.lead, .summary, p',
      link: 'h2 a, .title a',
      image: 'img',
      date: '.date, time',
    },
    baseUrl: 'https://www.presstv.ir',
    searchPath: '/Section/91/Middle_East',
  },
  {
    source: {
      id: 'cumhuriyet',
      name: 'Cumhuriyet',
      country: 'TR',
      region: 'turkish',
      language: 'tr',
      bias: { political: -0.4, reliability: 6, ownership: 'private' },
    },
    selectors: {
      articleContainer: '.news-card, .haber-item, article',
      title: 'h3 a, .title a, h2 a',
      content: '.summary, .ozet, p',
      link: 'h3 a, .title a, h2 a',
      image: 'img',
      date: '.date, .tarih, time',
    },
    baseUrl: 'https://www.cumhuriyet.com.tr',
    searchPath: '/dunya',
  },
  {
    source: {
      id: 'sputnik',
      name: 'Sputnik',
      country: 'RU',
      region: 'russian',
      language: 'en',
      bias: { political: 0.6, reliability: 3, ownership: 'state' },
    },
    selectors: {
      articleContainer: '.list__item, article.cell',
      title: '.list__title, h2 a',
      content: '.list__text, .lead',
      link: '.list__title a, h2 a',
      image: 'img',
      date: '.list__date, time',
    },
    baseUrl: 'https://sputnikglobe.com',
    searchPath: '/world/',
  },
  {
    source: {
      id: 'cgtn',
      name: 'CGTN',
      country: 'CN',
      region: 'chinese',
      language: 'en',
      bias: { political: 0.4, reliability: 4, ownership: 'state' },
    },
    selectors: {
      articleContainer: '.news-item, .content-item, article',
      title: 'h4 a, h3 a, .title a',
      content: '.summary, .desc, p',
      link: 'h4 a, h3 a, .title a',
      image: 'img',
      date: '.date, time, span.time',
    },
    baseUrl: 'https://www.cgtn.com',
    searchPath: '/world',
  },

  // ===== SOURCES WITH BROKEN RSS (404 errors) =====
  {
    source: {
      id: 'reuters',
      name: 'Reuters',
      country: 'UK',
      region: 'western',
      language: 'en',
      bias: { political: 0, reliability: 9, ownership: 'private' },
    },
    selectors: {
      articleContainer: 'article[data-testid="MediaStoryCard"], li.story-collection__story__LeZ29',
      title: 'h3, [data-testid="Heading"]',
      content: 'p, [data-testid="Body"]',
      link: 'a[data-testid="Link"]',
      image: 'img',
      date: 'time',
    },
    baseUrl: 'https://www.reuters.com',
    searchPath: '/world/middle-east/',
  },
  {
    source: {
      id: 'trt',
      name: 'TRT World',
      country: 'TR',
      region: 'turkish',
      language: 'en',
      bias: { political: 0.3, reliability: 6, ownership: 'state' },
    },
    selectors: {
      articleContainer: '.news-card, article.card, .story-item',
      title: 'h3 a, .card-title a, h2 a',
      content: '.card-text, .summary, p',
      link: 'h3 a, .card-title a, h2 a',
      image: 'img',
      date: '.date, time',
    },
    baseUrl: 'https://www.trtworld.com',
    searchPath: '/middle-east',
  },
  {
    source: {
      id: 'middleeasteye',
      name: 'Middle East Eye',
      country: 'UK',
      region: 'middle-east',
      language: 'en',
      bias: { political: -0.2, reliability: 6, ownership: 'private' },
    },
    selectors: {
      articleContainer: 'article.article-card, .teaser, .story',
      title: 'h3 a, .headline a, h2 a',
      content: '.standfirst, .summary, p',
      link: 'h3 a, .headline a, h2 a',
      image: 'img',
      date: 'time, .date',
    },
    baseUrl: 'https://www.middleeasteye.net',
    searchPath: '/topics/gaza',
  },
  {
    source: {
      id: 'ria',
      name: 'RIA Novosti',
      country: 'RU',
      region: 'russian',
      language: 'ru',
      bias: { political: 0.5, reliability: 4, ownership: 'state' },
    },
    selectors: {
      articleContainer: '.list-item, .cell-list__item, article',
      title: '.list-item__title a, h2 a',
      content: '.list-item__text, p',
      link: '.list-item__title a, h2 a',
      image: 'img',
      date: '.list-item__date, time',
    },
    baseUrl: 'https://ria.ru',
    searchPath: '/world/',
  },

  // ===== ALTERNATIVE MEDIA (without consistent RSS) =====
  {
    source: {
      id: 'mei',
      name: 'Middle East Institute',
      country: 'US',
      region: 'alternative',
      language: 'en',
      bias: { political: 0, reliability: 8, ownership: 'nonprofit' },
    },
    selectors: {
      articleContainer: 'article.post, .article-item, .publication-item',
      title: 'h2.post-title a, h3 a, .title a',
      content: '.post-excerpt, .summary, p',
      link: 'h2.post-title a, h3 a, .title a',
      image: 'img.post-thumbnail, img',
      date: '.post-date, .date, time',
    },
    baseUrl: 'https://www.mei.edu',
    searchPath: '/publications',
  },
];

export class NewsCrawler {
  private static instance: NewsCrawler;
  private cache: Map<string, { articles: NewsArticle[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly REQUEST_DELAY = 2000; // 2 seconds between requests
  private lastRequestTime = 0;

  private constructor() {}

  static getInstance(): NewsCrawler {
    if (!NewsCrawler.instance) {
      NewsCrawler.instance = new NewsCrawler();
    }
    return NewsCrawler.instance;
  }

  private async delay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchPage(url: string): Promise<string | null> {
    await this.delay();

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err);
      return null;
    }
  }

  private parseArticles(html: string, config: CrawlConfig): NewsArticle[] {
    const $ = cheerio.load(html);
    const articles: NewsArticle[] = [];
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

    $(config.selectors.articleContainer).each((_, element) => {
      try {
        const $el = $(element);

        const title = $el.find(config.selectors.title).text().trim();
        const content = $el.find(config.selectors.content).text().trim();
        let link = $el.find(config.selectors.link).attr('href') || '';
        const image = config.selectors.image ? $el.find(config.selectors.image).attr('src') : undefined;
        const dateStr = config.selectors.date ? $el.find(config.selectors.date).text().trim() : undefined;

        if (!title || !link) return;

        // Make relative URLs absolute
        if (link.startsWith('/')) {
          link = `${config.baseUrl}${link}`;
        }

        const publishedAt = dateStr ? new Date(dateStr) : new Date();

        // Skip articles older than 48 hours
        if (publishedAt < cutoffDate) {
          return;
        }

        const sentiment = this.analyzeSentiment(title, content);

        articles.push({
          id: `crawler-${config.source.id}-${hashString(link)}`,
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
      } catch (err) {
        console.warn('Failed to parse article element:', err);
      }
    });

    return articles;
  }

  async crawlSource(config: CrawlConfig): Promise<NewsArticle[]> {
    const cacheKey = config.source.id;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`Using cached articles for ${config.source.name}`);
      return cached.articles;
    }

    const url = config.searchPath ? `${config.baseUrl}${config.searchPath}` : config.baseUrl;
    console.log(`Crawling ${config.source.name}: ${url}`);

    const html = await this.fetchPage(url);
    if (!html) {
      return cached?.articles || [];
    }

    const articles = this.parseArticles(html, config);
    console.log(`Crawled ${articles.length} articles from ${config.source.name}`);

    this.cache.set(cacheKey, { articles, timestamp: Date.now() });
    return articles;
  }

  async crawlAll(): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];

    for (const config of CRAWL_CONFIGS) {
      try {
        const articles = await this.crawlSource(config);
        results.push(...articles);
      } catch (err) {
        console.error(`Failed to crawl ${config.source.name}:`, err);
      }
    }

    return results;
  }

  // Utility methods (same as in newsApiService)
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

  getCacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
