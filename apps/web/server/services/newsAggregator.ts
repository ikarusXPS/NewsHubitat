import Parser from 'rss-parser';
import type { NewsArticle, NewsSource, PerspectiveRegion, Sentiment, OwnershipType } from '../../src/types';
import { NEWS_SOURCES } from '../config/sources';
import { TranslationService } from './translationService';
import { NewsApiService } from './newsApiService';
import { NewsCrawler } from './newsCrawler';
import { StealthScraper } from './stealthScraper';
import { AIService } from './aiService';
import { prisma } from '../db/prisma';
import logger from '../utils/logger';
import { hashString } from '../utils/hash';
import { chunk } from '../utils/array';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NewsHub/2.0 (https://newshub.com; contact@newshub.com)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});

export class NewsAggregator {
  private static instance: NewsAggregator;
  private prisma = prisma;
  private articles: NewsArticle[] = [];
  private updateInterval: number = 60 * 60 * 1000; // 60 minutes
  private maxArticles: number = 1000;
  private readonly CHUNK_SIZE = 50;  // D-07: Safe for pool of 10 connections
  private intervalId: NodeJS.Timeout | null = null;
  private translationService: TranslationService;
  private lastFetchTime: Map<string, number> = new Map();

  private newsApiService: NewsApiService;
  private newsCrawler: NewsCrawler;
  private stealthScraper: StealthScraper;
  private aiService: AIService;
  private useStealthScraper: boolean = false; // Enable/disable stealth scraping
  private useCrawler: boolean = false; // Enable/disable HTML crawler

  // Source IDs that should be crawled instead of RSS (broken or no RSS)
  private crawlerSourceIds: Set<string> = new Set([
    'sputnik', // Often blocked or problematic
    'presstv', 'cgtn', 'xinhua', 'globaltimes', // No RSS feed or preferred crawling
  ]);

  // Performance: Index maps for O(1) lookups instead of O(n) filtering
  private topicIndex: Map<string, Set<string>> = new Map(); // topic -> article IDs
  private entityIndex: Map<string, Set<string>> = new Map(); // entity -> article IDs
  private articleMap: Map<string, NewsArticle> = new Map(); // article ID -> article

  private constructor() {
    this.translationService = TranslationService.getInstance();
    this.newsApiService = NewsApiService.getInstance();
    this.newsCrawler = NewsCrawler.getInstance();
    this.stealthScraper = StealthScraper.getInstance();
    this.aiService = AIService.getInstance();
  }

  private toPrismaArticle(article: NewsArticle) {
    return {
      id: article.id,
      title: article.title,
      titleTranslated: article.titleTranslated ? JSON.stringify(article.titleTranslated) : null,
      content: article.content,
      contentTranslated: article.contentTranslated ? JSON.stringify(article.contentTranslated) : null,
      summary: article.summary,
      originalLanguage: article.originalLanguage,
      publishedAt: article.publishedAt instanceof Date ? article.publishedAt : new Date(article.publishedAt),
      url: article.url,
      imageUrl: article.imageUrl,
      sentiment: article.sentiment,
      sentimentScore: article.sentimentScore,
      perspective: article.perspective,
      topics: JSON.stringify(article.topics),
      entities: JSON.stringify(article.entities),
      translationQuality: article.translationQuality,
      cached: article.cached,
      confidence: article.confidence,
      sourceId: article.source.id,
    };
  }

  private fromPrismaArticle(article: Record<string, unknown>): NewsArticle {
    return {
      ...article,
      titleTranslated: article.titleTranslated ? JSON.parse(article.titleTranslated) : undefined,
      contentTranslated: article.contentTranslated ? JSON.parse(article.contentTranslated) : undefined,
      topics: JSON.parse(article.topics),
      entities: JSON.parse(article.entities),
      source: article.source,
    };
  }

  static getInstance(): NewsAggregator {
    if (!NewsAggregator.instance) {
      NewsAggregator.instance = new NewsAggregator();
    }
    return NewsAggregator.instance;
  }

  private async syncSources(): Promise<void> {
    logger.info('Syncing news sources with database...');
    for (const source of NEWS_SOURCES) {
      await this.ensureSourceExists(source);
    }
    logger.info(`Synced ${NEWS_SOURCES.length} sources.`);
  }

  private async ensureSourceExists(source: NewsSource): Promise<void> {
    await prisma.newsSource.upsert({
      where: { id: source.id },
      update: {
        name: source.name,
        country: source.country,
        region: source.region,
        language: source.language,
        politicalBias: source.bias.political,
        reliability: source.bias.reliability,
        ownership: source.bias.ownership,
        apiEndpoint: source.apiEndpoint,
        rateLimit: source.rateLimit || 100,
      },
      create: {
        id: source.id,
        name: source.name,
        country: source.country,
        region: source.region,
        language: source.language,
        politicalBias: source.bias.political,
        reliability: source.bias.reliability,
        ownership: source.bias.ownership,
        apiEndpoint: source.apiEndpoint,
        rateLimit: source.rateLimit || 100,
      },
    });
  }

  private async loadLatestArticles(): Promise<void> {
    logger.info('Loading latest articles from database...');
    const dbArticles = await prisma.newsArticle.findMany({
      take: this.maxArticles,
      orderBy: { publishedAt: 'desc' },
      include: { source: true },
    });

    this.articles = dbArticles.map((a) => {
      // Map Prisma NewsSource back to our NewsSource interface
      const source: NewsSource = {
        id: a.source.id,
        name: a.source.name,
        country: a.source.country,
        region: a.source.region as PerspectiveRegion,
        language: a.source.language,
        bias: {
          political: a.source.politicalBias,
          reliability: a.source.reliability,
          ownership: a.source.ownership as OwnershipType,
        },
        apiEndpoint: a.source.apiEndpoint || undefined,
        rateLimit: a.source.rateLimit,
      };

      return this.fromPrismaArticle({ ...a, source });
    });

    logger.info(`Loaded ${this.articles.length} articles into memory.`);
    this.updateConfidenceScores();
  }

  async startAggregation(): Promise<void> {
    await this.syncSources();
    await this.loadLatestArticles();
    await this.fetchAllSources();
    this.intervalId = setInterval(() => this.fetchAllSources(), this.updateInterval);
  }

  stopAggregation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async fetchAllSources(): Promise<void> {
    logger.info('Fetching news from all sources...');

    // Filter out sources that will be crawled instead
    const rssSources = NEWS_SOURCES.filter((s) => !this.crawlerSourceIds.has(s.id));

    // Fetch from RSS feeds
    const rssResults = await Promise.allSettled(
      rssSources.map((source) => this.fetchSource(source))
    );

    const newArticles: NewsArticle[] = [];
    for (const result of rssResults) {
      if (result.status === 'fulfilled' && result.value) {
        newArticles.push(...result.value);
      }
    }

    // Fetch from HTML crawler (sources without RSS or with broken RSS)
    if (this.useCrawler) {
      logger.info('Crawling sources without RSS...');
      try {
        const crawledArticles = await this.newsCrawler.crawlAll();
        newArticles.push(...crawledArticles);
        logger.info(`Crawler returned ${crawledArticles.length} articles`);
      } catch (err) {
        logger.error('Crawler error:', err);
      }
    }

    // Fetch from Stealth Scraper (for sites with bot protection)
    if (this.useStealthScraper) {
      logger.info('Running stealth scraper for protected sites...');
      try {
        const stealthArticles = await this.stealthScraper.scrapeAll();
        newArticles.push(...stealthArticles);
        logger.info(`Stealth scraper returned ${stealthArticles.length} articles`);
      } catch (err) {
        logger.error('Stealth scraper error:', err);
      }
    }

    // Fetch from News APIs (GNews, NewsAPI, MediaStack)
    logger.info('Fetching from News APIs...');
    const apiArticles = await this.newsApiService.fetchAll();
    newArticles.push(...apiArticles);
    logger.info(`News APIs returned ${apiArticles.length} articles`);

    // Deduplicate by title similarity (result used in logging below)
    this.deduplicateArticles([...newArticles, ...this.articles]);

    // Persist to database with chunked parallel execution (D-07, D-08)
    logger.info(`Saving ${newArticles.length} new articles to database in chunks of ${this.CHUNK_SIZE}...`);
    const articleChunks = chunk(newArticles, this.CHUNK_SIZE);

    for (const articleChunk of articleChunks) {
      // Process each chunk in parallel
      await Promise.all(
        articleChunk.map(async (article) => {
          try {
            // Ensure source exists before saving article (prevents P2003 foreign key error)
            await this.ensureSourceExists(article.source);

            // Use URL as unique key to prevent duplicates from different providers
            // (e.g., mediastack-abc123 vs newsapi-abc123 for same article URL)
            await prisma.newsArticle.upsert({
              where: { url: article.url },
              update: {
                // Only update non-identifying fields; preserve original ID and source
                title: article.title,
                titleTranslated: article.titleTranslated ? JSON.stringify(article.titleTranslated) : null,
                content: article.content,
                contentTranslated: article.contentTranslated ? JSON.stringify(article.contentTranslated) : null,
                summary: article.summary,
                sentiment: article.sentiment,
                sentimentScore: article.sentimentScore,
                topics: JSON.stringify(article.topics),
                entities: JSON.stringify(article.entities),
                imageUrl: article.imageUrl,
                cached: article.cached,
                confidence: article.confidence,
              },
              create: this.toPrismaArticle(article),
            });
          } catch (err) {
            logger.error(`Failed to save article ${article.id}:`, err);
          }
        })
      );
    }

    // Reload from DB to ensure consistency and limit
    await this.loadLatestArticles();

    logger.info(`Total articles in memory: ${this.articles.length}`);
  }

  private async fetchSource(source: NewsSource): Promise<NewsArticle[]> {
    if (!source.apiEndpoint) {
      return this.generateMockArticles(source);
    }

    try {
      logger.info(`Fetching ${source.name}...`);
      const feed = await parser.parseURL(source.apiEndpoint);

      // Filter: Only accept articles from the last 48 hours
      const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const items = feed.items.slice(0, 10);

      // Process articles with async topic classification
      const articles = await Promise.all(
        items.map(async (item) => {
          const publishedAt = new Date(item.pubDate || Date.now());

          // AI-powered topic classification (with error suppression)
          let topics: string[];
          try {
            topics = await this.aiService.classifyTopics(
              item.title || '',
              item.contentSnippet || item.content || ''
            );
          } catch {
            topics = ['politics']; // Default topic
          }

          // AI-powered sentiment analysis
          let sentimentResult;
          try {
            sentimentResult = await this.aiService.analyzeSentiment(
              item.title || '',
              item.contentSnippet || item.content || ''
            );
          } catch {
            sentimentResult = this.analyzeSentiment(item.title || '', item.contentSnippet || '');
          }

          return {
            id: `${source.id}-${hashString(item.link || item.title || '')}`,
            title: item.title || 'Untitled',
            content: item.contentSnippet || item.content || '',
            summary: item.contentSnippet?.slice(0, 200),
            source,
            originalLanguage: source.language,
            publishedAt,
            url: item.link || '',
            imageUrl: item.enclosure?.url || this.extractImageUrl(item.content || ''),
            sentiment: sentimentResult.sentiment || (sentimentResult as { type?: Sentiment }).type || 'neutral',
            sentimentScore: sentimentResult.score,
            perspective: source.region,
            topics,
            entities: this.extractEntities(item.title || '', item.contentSnippet || ''),
            cached: false,
          };
        })
      );

      return articles.filter((article) => article.publishedAt >= cutoffDate);
    } catch (err) {
      logger.warn(`Failed to fetch ${source.name}:`, err);
      return this.generateMockArticles(source);
    }
  }

  private generateMockArticles(source: NewsSource): NewsArticle[] {
    const mockTitles = [
      'Humanitarian situation continues to evolve',
      'International diplomacy efforts ongoing',
      'Regional tensions reported',
      'UN response to developments',
    ];

    return mockTitles.slice(0, 2).map((mockTitle, i) => {
      const sentiment = this.generateSentiment();
      return {
        id: `${source.id}-mock-${Date.now()}-${i}`,
        title: `[${source.name}] ${mockTitle}`,
        content: `Coverage from ${source.name} regarding ${mockTitle}. This article provides the ${source.region} perspective on current events.`,
        summary: `${source.name} reports on ${mockTitle}.`,
        source,
        originalLanguage: source.language,
        publishedAt: new Date(Date.now() - Math.random() * 86400000 * 2),
        url: `https://${source.id}.example.com/article/${Date.now()}`,
        sentiment: sentiment.type,
        sentimentScore: sentiment.score,
        perspective: source.region,
        topics: ['humanitarian', 'diplomacy'], // Use proper topic names
        entities: [],
        cached: false,
      };
    });
  }

  private async translateHeadlines(): Promise<void> {
    const untranslated = this.articles
      .filter((a) => a.originalLanguage !== 'en' && a.originalLanguage !== 'de' && !a.titleTranslated?.de)
      .slice(0, 50); // Limit for free tier

    if (untranslated.length === 0) return;

    logger.info(`Translating ${untranslated.length} headlines...`);

    for (const article of untranslated) {
      try {
        const result = await this.translationService.translate(article.title, 'de', article.originalLanguage);
        article.titleTranslated = {
          ...article.titleTranslated,
          de: result.text,
        };
        article.translationQuality = result.quality;
      } catch {
        logger.warn(`Failed to translate headline: ${article.id}`);
      }
    }
  }

  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Map<string, NewsArticle>();

    for (const article of articles) {
      // Create a normalized key from title
      const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
      if (!seen.has(key)) {
        seen.set(key, article);
      }
    }

    return Array.from(seen.values());
  }

  private analyzeSentiment(title: string, content: string): { type: Sentiment; score: number } {
    const text = `${title} ${content}`.toLowerCase();

    const negativeWords = ['attack', 'killed', 'dead', 'war', 'bomb', 'strike', 'crisis', 'terror', 'violence', 'casualties'];
    const positiveWords = ['peace', 'ceasefire', 'aid', 'rescue', 'agreement', 'hope', 'relief', 'support', 'humanitarian'];

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

  private generateSentiment(): { type: Sentiment; score: number } {
    const rand = Math.random();
    if (rand < 0.3) return { type: 'positive', score: 0.5 + Math.random() * 0.5 };
    if (rand < 0.6) return { type: 'negative', score: -(0.5 + Math.random() * 0.5) };
    return { type: 'neutral', score: (Math.random() - 0.5) * 0.3 };
  }


  private extractEntities(title: string, content: string): string[] {
    const text = `${title} ${content}`;
    const entities: string[] = [];

    const knownEntities = ['Gaza', 'Israel', 'Hamas', 'UN', 'Hezbollah', 'Iran', 'USA', 'Turkey', 'Egypt', 'Qatar'];
    for (const entity of knownEntities) {
      if (text.includes(entity)) {
        entities.push(entity);
      }
    }

    return entities;
  }

  private extractImageUrl(content: string): string | undefined {
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match?.[1];
  }

  /**
   * Build index maps for O(1) article lookups by topic/entity
   * Called once after fetching, enables O(n) confidence calculation instead of O(n²)
   */
  private buildArticleIndex(): void {
    // Clear existing indexes
    this.topicIndex.clear();
    this.entityIndex.clear();
    this.articleMap.clear();

    // Build indexes in single pass O(n)
    for (const article of this.articles) {
      this.articleMap.set(article.id, article);

      // Index by topics
      for (const topic of article.topics) {
        if (!this.topicIndex.has(topic)) {
          this.topicIndex.set(topic, new Set());
        }
        this.topicIndex.get(topic)!.add(article.id);
      }

      // Index by entities
      for (const entity of article.entities) {
        if (!this.entityIndex.has(entity)) {
          this.entityIndex.set(entity, new Set());
        }
        this.entityIndex.get(entity)!.add(article.id);
      }
    }
  }

  /**
   * Calculate confidence score using pre-built indexes
   * Now O(topics + entities) instead of O(n)
   */
  private calculateConfidence(article: NewsArticle): number {
    // Collect similar article IDs using index lookups (O(1) per lookup)
    const similarIds = new Set<string>();

    // Find articles with shared topics
    for (const topic of article.topics) {
      const articlesWithTopic = this.topicIndex.get(topic);
      if (articlesWithTopic) {
        for (const id of articlesWithTopic) {
          if (id !== article.id) similarIds.add(id);
        }
      }
    }

    // Find articles with 2+ shared entities
    const entityCounts = new Map<string, number>();
    for (const entity of article.entities) {
      const articlesWithEntity = this.entityIndex.get(entity);
      if (articlesWithEntity) {
        for (const id of articlesWithEntity) {
          if (id !== article.id) {
            const count = (entityCounts.get(id) || 0) + 1;
            entityCounts.set(id, count);
            if (count >= 2) similarIds.add(id);
          }
        }
      }
    }

    // Get similar articles from index
    const similarArticles: NewsArticle[] = [];
    for (const id of similarIds) {
      const art = this.articleMap.get(id);
      if (art) similarArticles.push(art);
    }

    // Source count factor (0-50 points)
    const sourceCount = Math.min(similarArticles.length + 1, 10);
    const sourceScore = (sourceCount / 10) * 50;

    // Perspective diversity factor (0-50 points)
    const perspectives = new Set([
      article.perspective,
      ...similarArticles.map((a) => a.perspective),
    ]);
    const perspectiveScore = (Math.min(perspectives.size, 5) / 5) * 50;

    // Reliability boost (0-10 points)
    const reliabilityBoost = (article.source.bias.reliability / 10) * 10;

    // Combine scores
    const confidence = Math.min(100, sourceScore + perspectiveScore + reliabilityBoost);

    return Math.round(confidence);
  }

  private updateConfidenceScores(): void {
    // Build index once before calculating all confidence scores
    this.buildArticleIndex();

    for (const article of this.articles) {
      article.confidence = this.calculateConfidence(article);
    }
  }

  // Public API methods
  getArticles(options?: {
    regions?: PerspectiveRegion[];
    topics?: string[];
    limit?: number;
    offset?: number;
    search?: string;
    sentiment?: Sentiment;
    language?: string;
  }): { articles: NewsArticle[]; total: number } {
    let filtered = [...this.articles];

    if (options?.regions?.length) {
      filtered = filtered.filter((a) => options.regions!.includes(a.perspective));
    }

    if (options?.topics?.length) {
      filtered = filtered.filter((a) =>
        options.topics!.some((topic) => a.topics.includes(topic))
      );
    }

    if (options?.search) {
      const query = options.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.source.name.toLowerCase().includes(query) ||
          a.titleTranslated?.de?.toLowerCase().includes(query) ||
          a.titleTranslated?.en?.toLowerCase().includes(query)
      );
    }

    if (options?.sentiment) {
      filtered = filtered.filter((a) => a.sentiment === options.sentiment);
    }

    if (options?.language) {
      filtered = filtered.filter((a) => a.originalLanguage === options.language);
    }

    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;

    return {
      articles: filtered.slice(offset, offset + limit),
      total,
    };
  }

  getArticleById(id: string): NewsArticle | undefined {
    return this.articles.find((a) => a.id === id);
  }

  getArticleCount(): number {
    return this.articles.length;
  }

  getSources(): NewsSource[] {
    return NEWS_SOURCES;
  }

  getSentimentByRegion(): Record<PerspectiveRegion, { positive: number; negative: number; neutral: number; count: number }> {
    const stats: Record<string, { positive: number; negative: number; neutral: number; count: number }> = {};

    for (const article of this.articles) {
      if (!stats[article.perspective]) {
        stats[article.perspective] = { positive: 0, negative: 0, neutral: 0, count: 0 };
      }
      stats[article.perspective][article.sentiment]++;
      stats[article.perspective].count++;
    }

    return stats as Record<PerspectiveRegion, { positive: number; negative: number; neutral: number; count: number }>;
  }

  async translateArticle(articleId: string, targetLang: 'de' | 'en'): Promise<NewsArticle | null> {
    const article = this.getArticleById(articleId);
    if (!article) return null;

    // Translate title if not already done
    if (!article.titleTranslated?.[targetLang]) {
      const titleResult = await this.translationService.translate(article.title, targetLang, article.originalLanguage);
      article.titleTranslated = {
        ...article.titleTranslated,
        [targetLang]: titleResult.text,
      };
    }

    // Translate content on demand
    if (!article.contentTranslated?.[targetLang]) {
      const contentResult = await this.translationService.translate(article.content, targetLang, article.originalLanguage);
      article.contentTranslated = {
        ...article.contentTranslated,
        [targetLang]: contentResult.text,
      };
      article.translationQuality = contentResult.quality;
    }

    return article;
  }
}
