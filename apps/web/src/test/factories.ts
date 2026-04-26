/**
 * Factory functions for creating mock test data
 * Pattern: getMockX(overrides?: Partial<X>) => X
 */

import type {
  NewsSource,
  NewsArticle,
  SentimentData,
  FilterState,
  GeoEvent,
  TimelineEvent,
  PerspectiveRegion,
  Sentiment,
} from '../types';

// Counter for unique IDs
let idCounter = 0;

function uniqueId(prefix = 'mock'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Reset the ID counter (useful for deterministic tests)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ==========================================
// NewsSource Factory
// ==========================================

export function getMockNewsSource(overrides?: Partial<NewsSource>): NewsSource {
  return {
    id: uniqueId('source'),
    name: 'Mock News Source',
    country: 'DE',
    region: 'deutschland',
    language: 'de',
    bias: {
      political: 0, // Neutral
      reliability: 8, // High reliability
      ownership: 'private',
    },
    apiEndpoint: 'https://api.example.com/news',
    rateLimit: 100,
    ...overrides,
  };
}

/**
 * Factory for sources with specific political leanings
 */
export function getMockLeftSource(overrides?: Partial<NewsSource>): NewsSource {
  return getMockNewsSource({
    name: 'Left-Leaning News',
    bias: { political: -0.7, reliability: 7, ownership: 'private' },
    ...overrides,
  });
}

export function getMockRightSource(overrides?: Partial<NewsSource>): NewsSource {
  return getMockNewsSource({
    name: 'Right-Leaning News',
    bias: { political: 0.7, reliability: 7, ownership: 'private' },
    ...overrides,
  });
}

export function getMockStateSource(overrides?: Partial<NewsSource>): NewsSource {
  return getMockNewsSource({
    name: 'State Media',
    bias: { political: 0, reliability: 5, ownership: 'state' },
    region: 'russland',
    ...overrides,
  });
}

// ==========================================
// NewsArticle Factory
// ==========================================

export function getMockNewsArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  const source = overrides?.source || getMockNewsSource();

  return {
    id: uniqueId('article'),
    title: 'Mock News Article Title',
    titleTranslated: {
      de: 'Mock News Artikel Titel',
      en: 'Mock News Article Title',
    },
    content: 'This is the mock content of the news article. It contains relevant information about the topic.',
    contentTranslated: {
      de: 'Dies ist der Mock-Inhalt des Nachrichtenartikels.',
      en: 'This is the mock content of the news article.',
    },
    summary: 'Brief summary of the article content.',
    source,
    originalLanguage: 'de',
    publishedAt: new Date(),
    url: 'https://example.com/article/mock-article',
    imageUrl: 'https://example.com/images/mock-image.jpg',
    sentiment: 'neutral',
    sentimentScore: 0,
    perspective: source.region,
    topics: ['Politics', 'Economy'],
    entities: ['Germany', 'EU'],
    translationQuality: 0.95,
    cached: false,
    ...overrides,
  };
}

/**
 * Factory for articles with specific sentiments
 */
export function getMockPositiveArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  return getMockNewsArticle({
    title: 'Positive News Development',
    sentiment: 'positive',
    sentimentScore: 0.7,
    ...overrides,
  });
}

export function getMockNegativeArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  return getMockNewsArticle({
    title: 'Concerning News Report',
    sentiment: 'negative',
    sentimentScore: -0.7,
    ...overrides,
  });
}

/**
 * Factory for articles from specific regions
 */
export function getMockArticleFromRegion(
  region: PerspectiveRegion,
  overrides?: Partial<NewsArticle>
): NewsArticle {
  const source = getMockNewsSource({ region });
  return getMockNewsArticle({
    source,
    perspective: region,
    ...overrides,
  });
}

/**
 * Factory to create multiple articles for the same topic
 * (useful for comparison testing)
 */
export function getMockArticleCluster(
  topic: string,
  regions: PerspectiveRegion[]
): NewsArticle[] {
  return regions.map((region) =>
    getMockArticleFromRegion(region, {
      title: `${topic} - ${region} Perspective`,
      topics: [topic],
    })
  );
}

// ==========================================
// SentimentData Factory
// ==========================================

export function getMockSentimentData(overrides?: Partial<SentimentData>): SentimentData {
  return {
    region: 'usa',
    positive: 30,
    negative: 20,
    neutral: 50,
    count: 100,
    ...overrides,
  };
}

/**
 * Factory for complete sentiment data across all regions
 */
export function getMockSentimentDataSet(): Record<PerspectiveRegion, SentimentData> {
  const regions: PerspectiveRegion[] = [
    'usa',
    'europa',
    'deutschland',
    'nahost',
    'tuerkei',
    'russland',
    'china',
    'asien',
    'afrika',
    'lateinamerika',
    'ozeanien',
    'kanada',
    'alternative',
  ];

  return regions.reduce((acc, region) => {
    acc[region] = getMockSentimentData({ region });
    return acc;
  }, {} as Record<PerspectiveRegion, SentimentData>);
}

// ==========================================
// FilterState Factory
// ==========================================

export function getMockFilterState(overrides?: Partial<FilterState>): FilterState {
  return {
    regions: ['usa', 'nahost'],
    topics: [],
    dateRange: {
      start: null,
      end: null,
    },
    searchQuery: '',
    sentiment: null,
    sortBy: 'date',
    sortOrder: 'desc',
    ...overrides,
  };
}

/**
 * Factory for active filter state (with filters applied)
 */
export function getMockActiveFilterState(overrides?: Partial<FilterState>): FilterState {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return getMockFilterState({
    regions: ['usa'],
    dateRange: { start: weekAgo, end: now },
    searchQuery: 'climate',
    sentiment: 'neutral',
    ...overrides,
  });
}

// ==========================================
// GeoEvent Factory
// ==========================================

export function getMockGeoEvent(overrides?: Partial<GeoEvent>): GeoEvent {
  return {
    id: uniqueId('event'),
    title: 'Mock Geo Event',
    description: 'Description of the geo event.',
    category: 'political',
    severity: 'medium',
    location: {
      lat: 52.52,
      lng: 13.405,
      name: 'Berlin',
      region: 'Europe',
    },
    timestamp: new Date(),
    sourceArticles: [],
    aiExtracted: false,
    confidence: 0.85,
    perspectives: ['deutschland'],
    ...overrides,
  };
}

/**
 * Factory for high-severity events
 */
export function getMockCriticalEvent(overrides?: Partial<GeoEvent>): GeoEvent {
  return getMockGeoEvent({
    title: 'Critical Event',
    severity: 'critical',
    category: 'conflict',
    confidence: 0.95,
    ...overrides,
  });
}

// ==========================================
// TimelineEvent Factory
// ==========================================

export function getMockTimelineEvent(overrides?: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: uniqueId('timeline'),
    date: new Date(),
    title: 'Mock Timeline Event',
    description: 'Description of the timeline event.',
    category: 'diplomacy',
    severity: 5,
    sources: ['source1', 'source2'],
    location: {
      lat: 48.8566,
      lng: 2.3522,
      name: 'Paris',
    },
    relatedArticles: [],
    ...overrides,
  };
}

// ==========================================
// User Factory (for AuthContext testing)
// ==========================================

export interface MockUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  bookmarks: string[];
  preferences: {
    language: 'de' | 'en';
    theme: 'dark' | 'light';
    regions: string[];
  };
}

export function getMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: uniqueId('user'),
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
    bookmarks: [],
    preferences: {
      language: 'de',
      theme: 'dark',
      regions: ['usa', 'nahost'],
    },
    ...overrides,
  };
}

// ==========================================
// API Response Factory
// ==========================================

export interface MockApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export function getMockApiResponse<T>(
  data: T,
  overrides?: Partial<MockApiResponse<T>>
): MockApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      total: 1,
      page: 1,
      limit: 20,
    },
    ...overrides,
  };
}

export function getMockApiError(
  message = 'An error occurred'
): MockApiResponse<never> {
  return {
    success: false,
    error: message,
  };
}

// ==========================================
// Helper for creating test data sets
// ==========================================

/**
 * Creates a diverse set of articles for comprehensive testing
 */
export function getMockArticleSet(count = 10): NewsArticle[] {
  const regions: PerspectiveRegion[] = [
    'usa',
    'europa',
    'deutschland',
    'nahost',
    'tuerkei',
    'russland',
    'china',
    'asien',
    'afrika',
    'lateinamerika',
    'ozeanien',
    'kanada',
    'alternative',
  ];
  const sentiments: Sentiment[] = ['positive', 'negative', 'neutral'];
  const topics = ['Politics', 'Economy', 'Climate', 'Technology', 'Health'];

  return Array.from({ length: count }, (_, i) => {
    const region = regions[i % regions.length];
    const sentiment = sentiments[i % sentiments.length];
    const topic = topics[i % topics.length];

    return getMockArticleFromRegion(region, {
      title: `Article ${i + 1}: ${topic}`,
      sentiment,
      sentimentScore: sentiment === 'positive' ? 0.5 : sentiment === 'negative' ? -0.5 : 0,
      topics: [topic],
      publishedAt: new Date(Date.now() - i * 3600000), // Each article 1 hour apart
    });
  });
}
