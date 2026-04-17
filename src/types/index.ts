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
  | 'alternative';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type OwnershipType = 'state' | 'private' | 'public' | 'mixed';

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
  publishedAt: string | Date; // API returns string, may be parsed to Date
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

export type EventSeverity = 'critical' | 'high' | 'medium' | 'low';
export type EventCategory = 'conflict' | 'humanitarian' | 'political' | 'economic' | 'military' | 'protest' | 'diplomacy' | 'other';

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
  timestamp: string | Date; // API returns string, may be parsed to Date
  sourceArticles: string[]; // Article IDs
  aiExtracted: boolean;
  confidence: number; // 0-1
  perspectives: PerspectiveRegion[];
}

export interface SentimentData {
  region: PerspectiveRegion;
  positive: number;
  negative: number;
  neutral: number;
  count: number;
}

export interface FilterState {
  regions: PerspectiveRegion[];
  topics: string[]; // Topic filtering: conflict, diplomacy, economy, etc.
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
  sentiment: Sentiment | null;
  sortBy: 'date' | 'relevance' | 'sentiment';
  sortOrder: 'asc' | 'desc';
}

export interface TranslationRequest {
  text: string;
  sourceLang?: string;
  targetLang: 'de' | 'en';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
