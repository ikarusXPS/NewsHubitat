# NewsHub - Feature Specification

## Overview
NewsHub is a multi-perspective news intelligence platform that aggregates, translates, and analyzes news from 130 global sources across Western, Middle Eastern, Turkish, Russian, Chinese, and alternative media. It provides real-time sentiment analysis, perspective comparison, and AI-powered insights focused on Middle East conflict coverage.

---

## Feature 1: News Aggregation & Multi-Source Crawling

### Requirements
1. Aggregate news from 130 RSS feeds and HTML sources
2. Support stealth scraping with Puppeteer for anti-bot protection
3. Deduplicate articles by URL
4. Store max 1000 articles in-memory with 60-minute refresh interval
5. Extract metadata: title, content, author, publishedAt, imageUrl

### API Endpoints
```
GET /api/news
  Query params:
    - regions: string (comma-separated: western,middle-east,turkish,russian,chinese,alternative)
    - search: string (full-text search)
    - sentiment: positive|negative|neutral
    - offset: number (pagination)
    - limit: number (max 100)
  Response: ApiResponse<NewsArticle[]>

GET /api/news/:id
  Response: ApiResponse<NewsArticle>

GET /api/news/sources
  Response: ApiResponse<NewsSource[]>
```

### Data Model
```typescript
interface NewsSource {
  id: string;
  name: string;
  country: string;  // ISO 3166-1 alpha-2
  region: PerspectiveRegion;
  language: string; // ISO 639-1
  bias: {
    political: number;    // -10 (left) to +10 (right)
    reliability: number;  // 0-10
    ownership: string;    // public, private, state-owned
  };
  apiEndpoint: string;
  rateLimit: number;
}

interface NewsArticle {
  id: string;
  title: string;
  titleTranslated?: { de?: string; en?: string };
  content: string;
  summary?: string;
  source: NewsSource;
  author?: string;
  imageUrl?: string;
  url: string;
  originalLanguage: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;  // 0-1
  perspective: PerspectiveRegion;
  topics: string[];
  entities: string[];
  confidence?: number;  // 0-100
}
```

### Business Logic
- **NewsAggregator Service**: Singleton pattern, fetches all sources every 60 minutes
- **StealthScraper**: Uses puppeteer-extra-plugin-stealth to bypass anti-bot detection
- **Deduplication**: Uses Map with URL as key
- **Rate Limiting**: Respects source.rateLimit (requests per hour)

---

## Feature 2: Multi-Provider Translation Chain

### Requirements
1. Translate articles from original language to German & English
2. Cascade through providers: DeepL → Google Translate → LibreTranslate → Claude
3. Cache translations to avoid redundant API calls
4. Support on-demand translation for individual articles

### API Endpoints
```
POST /api/news/:id/translate
  Body: { targetLang: 'de' | 'en' }
  Response: ApiResponse<{ title: string; content: string }>

POST /api/translate
  Body: { text: string; targetLang: string }
  Response: ApiResponse<{ translatedText: string; provider: string }>

POST /api/translate/batch
  Body: { texts: string[]; targetLang: string }
  Response: ApiResponse<Array<{ translatedText: string }>>
```

### Translation Providers
| Provider | Priority | API Key | Fallback |
|----------|----------|---------|----------|
| DeepL | 1 | `DEEPL_API_KEY` | Google |
| Google Translate | 2 | `GOOGLE_TRANSLATE_API_KEY` | LibreTranslate |
| LibreTranslate | 3 | None (public API) | Claude |
| Claude (Contextual) | 4 | `ANTHROPIC_API_KEY` | Fail |

### Business Logic
- **TranslationService**: Cascades through providers until success or all fail
- **Caching**: Store translations in `titleTranslated` field
- **Contextual Translation (Claude)**: Used for nuanced political/cultural terms

---

## Feature 3: Sentiment Analysis & Topic Extraction

### Requirements
1. Analyze sentiment of article content (positive/negative/neutral)
2. Extract topics and named entities
3. Calculate confidence score based on topics, entities, and source reliability
4. Classify articles as escalation/de-escalation/neutral

### API Endpoints
```
GET /api/news/sentiment
  Query params:
    - region: PerspectiveRegion
  Response: ApiResponse<{ positive: number; negative: number; neutral: number }>
```

### Sentiment Classification Logic
```typescript
function classifyTrend(article: NewsArticle): 'escalation' | 'de-escalation' | 'neutral' {
  // Escalation keywords: attack, strike, bomb, killed, military, offensive
  // De-escalation keywords: ceasefire, peace, agreement, talks, diplomatic

  // Priority: sentiment + keyword count
  if (sentiment === 'negative' && escalationWords > deEscalationWords + 1)
    return 'escalation';
  if (sentiment === 'positive' && deEscalationWords > escalationWords + 1)
    return 'de-escalation';

  return 'neutral';
}
```

### Confidence Score Formula
```
confidence = (
  topicsCount * 10 +
  entitiesCount * 5 +
  sourceReliability * 10
) / 3
```

---

## Feature 4: Perspective Comparison & Bias Visualization

### Requirements
1. Display articles grouped by region/country perspective
2. Filter by multiple perspectives simultaneously
3. Show bias radar chart comparing coverage across perspectives
4. Highlight framing differences for same event

### UI Components
- **SourceFilter**: Alphabetically sorted regions with 2-row layout
  - Row 1: Afrika, Alternative, Asien, China, Deutschland, Europa, Kanada
  - Row 2: Lateinamerika, Nahost, Ozeanien, Russland, Türkei, USA
- **BiasRadarChart**: 6-axis radar showing coverage intensity by perspective
- **FramingComparison**: Side-by-side article comparison for same topic

### Data Visualization
```typescript
interface BiasData {
  perspective: PerspectiveRegion;
  articleCount: number;
  averageSentiment: number;
  dominantTopics: string[];
}
```

---

## Feature 5: AI-Powered Analysis (RAG)

### Requirements
1. Provide Q&A interface for article corpus
2. Use Claude Haiku for retrieval-augmented generation
3. Include source citations in responses
4. Support follow-up questions with context

### API Endpoints
```
POST /api/ai/ask
  Body: {
    question: string;
    context: NewsArticle[];  // Relevant articles
  }
  Response: ApiResponse<{
    answer: string;
    sources: string[];  // Article IDs
  }>
```

### Business Logic
- **AiService**: Uses Anthropic SDK with claude-3-haiku-20241022
- **Context Window**: Max 10 most relevant articles based on topic overlap
- **Citation**: Includes article.id in response for traceability

---

## Feature 6: Real-Time Updates & Caching

### Requirements
1. Auto-refresh news feed every 5 minutes
2. Cache API responses with 5-minute TTL
3. Display cache age indicator to user
4. Show "LIVE" badge when fetching new data

### Technical Implementation
```typescript
// TanStack Query Configuration
const { data, isLoading, isFetching, isFromCache, cacheAge } = useCachedQuery({
  queryKey: ['news', filters],
  queryFn: () => fetchNews(filters),
  cacheKey: 'news-western-ukraine',
  cacheTTL: 5 * 60 * 1000,      // 5 minutes
  refetchInterval: 5 * 60 * 1000,
  staleTime: 2 * 60 * 1000,      // 2 minutes
});
```

### UI Components
- **CacheIndicator**: Shows cache age (e.g., "Cached 2m ago")
- **Live Badge**: Animated pulse when `isFetching === true`

---

## Feature 7: Authentication & User Preferences

### Requirements
1. JWT-based authentication
2. Store user preferences (language, theme, filter presets)
3. Bookmark articles for later reading
4. Private user dashboard

### API Endpoints
```
POST /api/auth/register
  Body: { username: string; email: string; password: string }
  Response: ApiResponse<{ token: string; user: User }>

POST /api/auth/login
  Body: { email: string; password: string }
  Response: ApiResponse<{ token: string; user: User }>

GET /api/auth/me
  Headers: { Authorization: 'Bearer <token>' }
  Response: ApiResponse<User>
```

### Data Model
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  preferences: {
    language: 'de' | 'en';
    theme: 'dark' | 'light';
    defaultRegions: PerspectiveRegion[];
  };
  bookmarks: string[];  // Article IDs
}
```

---

## Feature 8: Event Timeline & Geo-Visualization

### Requirements
1. Display historical events on interactive timeline
2. Show event locations on Leaflet map
3. Filter events by date range, region, and severity
4. Link events to related articles

### API Endpoints
```
GET /api/events/timeline
  Query params:
    - startDate: ISO date
    - endDate: ISO date
    - region: PerspectiveRegion
  Response: ApiResponse<TimelineEvent[]>

GET /api/events/geo
  Response: ApiResponse<GeoEvent[]>
```

### Data Model
```typescript
interface GeoEvent {
  id: string;
  title: string;
  location: {
    lat: number;
    lng: number;
    country: string;
  };
  date: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedArticles: string[];  // Article IDs
}
```

---

## Feature 9: Advanced Analytics Dashboard

### Requirements
1. Show top keywords in last 24 hours
2. Display live market data (Oil, Gold, DAX, S&P 500)
3. Calculate tension index based on negative sentiment + escalation count
4. Visualize sentiment trends over time

### UI Components
- **TopKeywords**: Clickable keyword cloud with article counts
- **MarketsPanel**: 2x2 grid with 60-second auto-refresh
- **TensionIndex**: Gauge chart showing conflict intensity (0-100)
- **SentimentChart**: Line chart showing sentiment over time

### Tension Index Formula
```
tensionIndex = (
  (negativeArticles / totalArticles) * 50 +
  (escalationArticles / totalArticles) * 30 +
  (criticalSeverity / totalArticles) * 20
) * 100
```

---

## Feature 10: Offline Support & Progressive Enhancement

### Requirements
1. Detect offline status and show banner
2. Cache article list for offline reading
3. Disable real-time features when offline
4. Auto-reconnect when online

### UI Components
- **OfflineBanner**: Warning banner at top when `navigator.onLine === false`
- **ServiceWorker**: Cache static assets and API responses

---

## Environment Variables

```bash
# Required
PORT=3001

# Translation (at least one recommended)
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
ANTHROPIC_API_KEY=

# Optional
NEWSAPI_KEY=
GNEWS_API_KEY=
```

---

## Non-Functional Requirements

1. **Performance**: Initial page load < 3s, API response < 500ms
2. **Accessibility**: WCAG 2.1 AA compliance
3. **Browser Support**: Chrome 100+, Firefox 100+, Safari 15+
4. **Mobile**: Responsive design with mobile-first approach
5. **Security**: XSS protection, CSRF tokens, JWT expiry (24h)
6. **Scalability**: Support 10,000 concurrent users (future: migrate to PostgreSQL)
