import type { NewsArticle, NewsSource, PerspectiveRegion } from '../../src/types';
import { hashString } from '../utils/hash';

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface NewsApiArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    id: string;
    name: string;
  };
}

interface MediaStackArticle {
  title: string;
  description: string;
  url: string;
  image: string;
  published_at: string;
  source: string;
  country: string;
  language: string;
}

// Source mapping for perspective detection
const SOURCE_PERSPECTIVES: Record<string, PerspectiveRegion> = {
  // Western
  'reuters': 'western', 'bbc': 'western', 'cnn': 'western', 'guardian': 'western',
  'ap news': 'western', 'nytimes': 'western', 'washington post': 'western',
  'deutsche welle': 'western', 'france24': 'western',
  // Middle East
  'al jazeera': 'middle-east', 'haaretz': 'middle-east', 'times of israel': 'middle-east',
  'jerusalem post': 'middle-east', 'middle east eye': 'middle-east',
  // Turkish
  'trt': 'turkish', 'daily sabah': 'turkish', 'hurriyet': 'turkish', 'anadolu': 'turkish',
  // Russian
  'rt': 'russian', 'tass': 'russian', 'sputnik': 'russian',
  // Chinese
  'xinhua': 'chinese', 'global times': 'chinese', 'cgtn': 'chinese', 'scmp': 'chinese',
  // Alternative
  'intercept': 'alternative', 'middle east monitor': 'alternative',
};

export class NewsApiService {
  private static instance: NewsApiService;

  private readonly GNEWS_API_KEY = process.env.GNEWS_API_KEY;
  private readonly NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  private readonly MEDIASTACK_API_KEY = process.env.MEDIASTACK_API_KEY;

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  private constructor() {}

  /**
   * Fetch with exponential backoff retry for rate limit errors (429)
   */
  private async fetchWithRetry(
    url: string,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<Response> {
    const maxRetries = options.maxRetries ?? this.MAX_RETRIES;
    const baseDelay = options.baseDelay ?? this.BASE_DELAY_MS;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        // If rate limited (429), retry with backoff
        if (response.status === 429 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;

          console.log(`Rate limited (429). Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.sleep(waitTime);
          continue;
        }

        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Network errors: retry with backoff
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static getInstance(): NewsApiService {
    if (!NewsApiService.instance) {
      NewsApiService.instance = new NewsApiService();
    }
    return NewsApiService.instance;
  }

  async fetchFromGNews(query: string = 'gaza israel conflict'): Promise<NewsArticle[]> {
    if (!this.GNEWS_API_KEY) {
      console.log('GNews API key not configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        token: this.GNEWS_API_KEY,
        lang: 'en',
        max: '10',
      });

      const response = await fetch(`https://gnews.io/api/v4/search?${params}`);
      if (!response.ok) {
        throw new Error(`GNews API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`GNews: fetched ${data.articles?.length || 0} articles`);

      return (data.articles || []).map((article: GNewsArticle) =>
        this.convertToNewsArticle(article, 'gnews')
      );
    } catch (err) {
      console.error('GNews fetch error:', err);
      return [];
    }
  }

  async fetchFromNewsApi(query: string = 'gaza OR israel OR middle east'): Promise<NewsArticle[]> {
    if (!this.NEWSAPI_KEY) {
      console.log('NewsAPI key not configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        apiKey: this.NEWSAPI_KEY,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: '20',
      });

      const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`NewsAPI: fetched ${data.articles?.length || 0} articles`);

      return (data.articles || []).map((article: NewsApiArticle) =>
        this.convertNewsApiArticle(article)
      );
    } catch (err) {
      console.error('NewsAPI fetch error:', err);
      return [];
    }
  }

  async fetchFromMediaStack(keywords: string = 'gaza,israel'): Promise<NewsArticle[]> {
    if (!this.MEDIASTACK_API_KEY) {
      console.log('MediaStack API key not configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        access_key: this.MEDIASTACK_API_KEY,
        keywords: keywords,
        languages: 'en',
        limit: '25',
      });

      const response = await this.fetchWithRetry(
        `http://api.mediastack.com/v1/news?${params}`,
        { maxRetries: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`MediaStack API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`MediaStack: fetched ${data.data?.length || 0} articles`);

      return (data.data || []).map((article: MediaStackArticle) =>
        this.convertMediaStackArticle(article)
      );
    } catch (err) {
      console.error('MediaStack fetch error:', err);
      return [];
    }
  }

  async fetchAll(): Promise<NewsArticle[]> {
    const results = await Promise.allSettled([
      this.fetchFromGNews(),
      this.fetchFromNewsApi(),
      this.fetchFromMediaStack(),
    ]);

    const articles: NewsArticle[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        articles.push(...result.value);
      }
    }

    return articles;
  }

  private convertToNewsArticle(article: GNewsArticle, provider: string): NewsArticle {
    const perspective = this.detectPerspective(article.source.name);
    const sentiment = this.analyzeSentiment(article.title, article.description || '');

    return {
      id: `${provider}-${hashString(article.url)}`,
      title: article.title,
      content: article.content || article.description || '',
      summary: article.description?.slice(0, 200),
      source: this.createSource(article.source.name, perspective),
      originalLanguage: 'en',
      publishedAt: new Date(article.publishedAt),
      url: article.url,
      imageUrl: article.image,
      sentiment: sentiment.type,
      sentimentScore: sentiment.score,
      perspective,
      topics: this.extractTopics(article.title, article.description || ''),
      entities: this.extractEntities(article.title, article.description || ''),
      cached: false,
    };
  }

  private convertNewsApiArticle(article: NewsApiArticle): NewsArticle {
    const perspective = this.detectPerspective(article.source.name);
    const sentiment = this.analyzeSentiment(article.title, article.description || '');

    return {
      id: `newsapi-${hashString(article.url)}`,
      title: article.title,
      content: article.content || article.description || '',
      summary: article.description?.slice(0, 200),
      source: this.createSource(article.source.name, perspective),
      originalLanguage: 'en',
      publishedAt: new Date(article.publishedAt),
      url: article.url,
      imageUrl: article.urlToImage,
      sentiment: sentiment.type,
      sentimentScore: sentiment.score,
      perspective,
      topics: this.extractTopics(article.title, article.description || ''),
      entities: this.extractEntities(article.title, article.description || ''),
      cached: false,
    };
  }

  private convertMediaStackArticle(article: MediaStackArticle): NewsArticle {
    const perspective = this.detectPerspective(article.source);
    const sentiment = this.analyzeSentiment(article.title, article.description || '');
    const language = this.mapLanguage(article.language);

    return {
      id: `mediastack-${hashString(article.url)}`,
      title: article.title,
      content: article.description || '',
      summary: article.description?.slice(0, 200),
      source: this.createSource(article.source, perspective, article.country),
      originalLanguage: language,
      publishedAt: new Date(article.published_at),
      url: article.url,
      imageUrl: article.image,
      sentiment: sentiment.type,
      sentimentScore: sentiment.score,
      perspective,
      topics: this.extractTopics(article.title, article.description || ''),
      entities: this.extractEntities(article.title, article.description || ''),
      cached: false,
    };
  }

  private detectPerspective(sourceName: string): PerspectiveRegion {
    const normalizedName = sourceName.toLowerCase();

    for (const [key, perspective] of Object.entries(SOURCE_PERSPECTIVES)) {
      if (normalizedName.includes(key)) {
        return perspective;
      }
    }

    // Default based on common patterns
    if (normalizedName.includes('ru') || normalizedName.includes('russian')) return 'russian';
    if (normalizedName.includes('china') || normalizedName.includes('chinese')) return 'chinese';
    if (normalizedName.includes('turkey') || normalizedName.includes('turkish')) return 'turkish';
    if (normalizedName.includes('arab') || normalizedName.includes('middle east')) return 'middle-east';

    return 'western'; // Default
  }

  private createSource(name: string, perspective: PerspectiveRegion, country?: string): NewsSource {
    return {
      id: hashString(name),
      name,
      country: country || this.getCountryFromPerspective(perspective),
      region: perspective,
      language: 'en',
      bias: {
        political: 0,
        reliability: 6,
        ownership: 'private',
      },
    };
  }

  private getCountryFromPerspective(perspective: PerspectiveRegion): string {
    const mapping: Record<PerspectiveRegion, string> = {
      western: 'US',
      'middle-east': 'QA',
      turkish: 'TR',
      russian: 'RU',
      chinese: 'CN',
      alternative: 'US',
    };
    return mapping[perspective];
  }

  private mapLanguage(lang: string): string {
    const mapping: Record<string, string> = {
      en: 'en',
      de: 'de',
      ar: 'ar',
      tr: 'tr',
      ru: 'ru',
      zh: 'zh',
    };
    return mapping[lang] || 'en';
  }

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

}
