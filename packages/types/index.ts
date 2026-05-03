// Re-export all shared types from existing src/types/
// This package provides type-only exports with no runtime code

// Core domain types
export type PerspectiveRegion =
  | 'usa'
  | 'europa'
  | 'deutschland'
  | 'nahost'
  | 'tuerkei'
  | 'russland'
  | 'china'
  | 'asien'
  | 'afrika'
  | 'lateinamerika'
  | 'ozeanien'
  | 'kanada'
  | 'alternative'
  // Phase 40 D-A2: 4 new sub-regions (atomic mirror with apps/web/src/types/index.ts)
  | 'sudostasien'
  | 'nordeuropa'
  | 'sub-saharan-africa'
  | 'indien';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type OwnershipType = 'state' | 'private' | 'public' | 'mixed';

export type EventSeverity = 'critical' | 'high' | 'medium' | 'low';

export type EventCategory =
  | 'conflict'
  | 'humanitarian'
  | 'political'
  | 'economic'
  | 'military'
  | 'protest'
  | 'diplomacy'
  | 'other';

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    hasMore?: boolean;
  };
}

// News domain
export interface NewsSource {
  id: string;
  name: string;
  icon?: string;
  country: string;
  region: PerspectiveRegion;
  language: string;
  bias: {
    political: number; // -1 (left) to +1 (right)
    reliability: number; // 0-10
    ownership: OwnershipType;
  };
  apiEndpoint?: string;
  rateLimit?: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  titleTranslated?: {
    de?: string;
    en?: string;
  };
  content: string;
  contentTranslated?: {
    de?: string;
    en?: string;
  };
  summary?: string;
  source: NewsSource;
  originalLanguage: string;
  publishedAt: string | Date;
  url: string;
  imageUrl?: string;
  sentiment: Sentiment;
  sentimentScore: number;
  perspective: PerspectiveRegion;
  topics: string[];
  entities: string[];
  translationQuality?: number;
  cached: boolean;
  confidence?: number; // 0-100 score based on source count and bias diversity
}

// Events domain
export interface GeoEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  severity: EventSeverity;
  location: {
    lat: number;
    lng: number;
    name: string;
    region: string;
  };
  timestamp: string | Date;
  sourceArticles: string[]; // Article IDs
  aiExtracted: boolean;
  confidence: number; // 0-1
  perspectives: PerspectiveRegion[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  category: 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other';
  severity: number; // 1-10
  sources: string[];
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  relatedArticles: string[];
}

export interface I18nText {
  de: string;
  en: string;
}

export interface TimelineEventI18n {
  id: string;
  date: Date;
  title: I18nText;
  description: I18nText;
  category: 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other' | 'economic';
  severity: number; // 1-10
  sources: string[];
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  relatedArticles: string[];
}

// Sentiment data for charts
export interface SentimentData {
  region: PerspectiveRegion;
  positive: number;
  negative: number;
  neutral: number;
  count: number;
}

// Filter state (used across web and future mobile)
export interface FilterState {
  regions: PerspectiveRegion[];
  topics: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
  sentiment: Sentiment | null;
  sortBy: 'date' | 'relevance' | 'sentiment';
  sortOrder: 'asc' | 'desc';
}

// Translation request
export interface TranslationRequest {
  text: string;
  sourceLang?: string;
  targetLang: 'de' | 'en';
}
