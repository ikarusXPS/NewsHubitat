# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewsHub is a multi-perspective global news analysis platform. It aggregates news from 130 sources across 13 regions, with real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights.

## Commands

```bash
# Development
npm run dev              # Both frontend + backend concurrently
npm run dev:frontend     # Frontend only (port 5173)
npm run dev:backend      # Backend only (port 3001)

# Build & Verify (run before committing)
npm run typecheck && npm run test:run && npm run build

# Quality
npm run typecheck        # TypeScript validation
npm run lint             # ESLint validation

# Unit Testing (Vitest)
npm run test             # Run unit tests
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Coverage report (80% threshold)

# E2E Testing (Playwright)
npm run test:e2e         # Playwright headless
npm run test:e2e:headed  # Playwright with browser visible

# Database (Prisma + PostgreSQL)
docker compose up -d     # Start PostgreSQL container
npx prisma generate      # Generate Prisma client
npx prisma db push       # Sync schema to PostgreSQL
npx prisma studio        # Database GUI (localhost:5555)

# Run Single Tests
npm run test -- src/lib/utils.test.ts           # Single unit test file
npm run test -- -t "mapCentering"               # Tests matching pattern
npx playwright test e2e/auth.spec.ts            # Single E2E test file
```

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind CSS v4
- **State**: Zustand v5 (persisted to localStorage under `newshub-storage`)
- **Server State**: TanStack Query v5 (5-min refetch, 2-min stale time)
- **Visualization**: Recharts, globe.gl, Leaflet
- **Backend**: Express 5 (TypeScript, ES modules)
- **Database**: PostgreSQL via Prisma (adapter: @prisma/adapter-pg)
- **AI**: Multi-provider fallback (OpenRouter → Gemini → Anthropic)
- **Translation**: Multi-provider chain (DeepL → Google → LibreTranslate → Claude)

## Architecture

### Frontend (`src/`)
- **Routing**: React Router v7 with lazy-loaded pages via Suspense
- **State**: Zustand store for UI (theme, language, filters, bookmarks, feed settings)
- **Data Fetching**: TanStack Query with error/loading states
- **Auth**: Context API with JWT in localStorage

### Backend (`server/`)
- **Singleton Services**: All services use `getInstance()` pattern
- **Data Flow**: RSS/HTML crawl → Dedup → Sentiment → Translation → Database/Cache
- **Database**: PostgreSQL via Prisma, schema at `prisma/schema.prisma`
- **Generated Client**: `src/generated/prisma/` (do not edit)
- **Caching**: In-memory Maps with configurable TTL (summaries, topics)
- **Models**: NewsArticle, NewsSource, User, Bookmark, StoryCluster, EmailSubscription, EmailDigest, AIPersona, UserPersona, SharedContent, ShareClick

### Key Directories
| Directory | Purpose |
|-----------|---------|
| `src/components/` | React components (SignalCard, GlobeView, NewsFeed, etc.) |
| `src/pages/` | Route pages (Dashboard, Analysis, Monitor, Timeline, EventMap, Community) |
| `src/store/` | Zustand store with state slices |
| `src/types/` | TypeScript definitions |
| `server/routes/` | API endpoints (news, translate, auth, ai, events) |
| `server/services/` | Business logic (NewsAggregator, TranslationService, AiService) |
| `server/config/sources.ts` | 130 news source configurations |
| `prisma/schema.prisma` | Database schema |
| `server/config/aiProviders.ts` | AI model and cache configuration |

## Store State Slices

The Zustand store (`src/store/index.ts`) manages all client-side state:

```typescript
interface AppState {
  // Core UI
  theme: 'dark' | 'light';
  language: 'de' | 'en';
  filters: FilterState;

  // Feed Manager - source control
  feedState: {
    enabledSources: Record<string, boolean>;  // sourceId → enabled
    customFeeds: CustomFeed[];                // user-created feed presets
    activeSourceFilter: string | null;        // single-source filter mode
  };

  // Read Marking - article tracking
  readState: {
    readArticles: string[];      // article IDs marked as read
    hideReadArticles: boolean;   // toggle to hide read articles
  };

  // User Features
  bookmarkedArticles: string[];
  activeFocusPreset: FocusPreset | null;
  customPresets: FocusPreset[];
}
```

Key actions: `toggleSource()`, `markAsRead()`, `toggleHideReadArticles()`, `setActiveSourceFilter()`

## Key Patterns

### Query Key Synchronization (CRITICAL)
Components sharing the same data MUST use identical `queryKey` values to share the React Query cache:

```typescript
// CORRECT: Same key = shared cache = consistent data
// Monitor.tsx AND EventMap.tsx both use:
queryKey: ['geo-events']
staleTime: 60_000
refetchInterval: 2 * 60_000
```

### Multi-Provider AI Fallback
The AI service (`server/services/aiService.ts`) uses a fallback chain:
1. **OpenRouter** (multi-model, paid) - Primary
2. **Gemini** (free tier, 1500 req/day) - Secondary
3. **Anthropic** (premium) - Fallback

If all providers fail, keyword-based analysis is used as final fallback.

### Graceful Degradation
Components that might fail should return `null` on error:

```typescript
const { data, error } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: 1,
});

if (error) return null;  // Don't break the page
if (!data) return null;
```

### Class Utility
```typescript
import { cn } from '../lib/utils';
className={cn('base-class', isActive && 'active-class', variant)}
```

## Core Types

```typescript
type PerspectiveRegion = 'western' | 'middle-east' | 'turkish' | 'russian' | 'chinese' | 'alternative';
type Sentiment = 'positive' | 'negative' | 'neutral';
type EventSeverity = 'critical' | 'high' | 'medium' | 'low';
type EventCategory = 'conflict' | 'humanitarian' | 'political' | 'economic' | 'military' | 'protest';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | List articles (regions, search, sentiment, pagination) |
| `/api/news/:id` | GET | Single article |
| `/api/news/sources` | GET | All 130 sources |
| `/api/translate` | POST | Translate text `{text, targetLang}` |
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/me` | GET | Current user (Bearer token) |
| `/api/analysis/clusters` | GET | Topic clustering (`?summaries=true` for AI) |
| `/api/ai/ask` | POST | RAG Q&A `{question, context[]}` |
| `/api/events/geo` | GET | Geo-located events |
| `/api/events/timeline` | GET | Historical event timeline |
| `/api/news/sentiment` | GET | Sentiment statistics by region |
| `/api/analysis/framing` | GET | Framing comparison by topic |
| `/api/health` | GET | Server status |

## UI Design System

- **Theme**: Dark cyber aesthetic with cyan accent (`#00f0ff`)
- **Colors**: Red (`#ff0044`), Green (`#00ff88`), Yellow (`#ffee00`), Purple (`#bf00ff`)
- **Region Colors**: Western (blue), Middle East (green), Turkish (red), Russian (purple), Chinese (yellow), Alternative (cyan)
- **Fonts**: Inter (body), JetBrains Mono (headers, code)

## Environment Variables

```bash
# Required
PORT=3001
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5432/newshub?schema=public"

# AI (ONE required, priority: OpenRouter → Gemini → Anthropic)
OPENROUTER_API_KEY=       # Paid - multi-model access
GEMINI_API_KEY=           # FREE tier - 1500 req/day
ANTHROPIC_API_KEY=        # Premium fallback

# Translation (at least one recommended)
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
```

## Adding New Sources

Edit `server/config/sources.ts`:
```typescript
{
  id: 'source-id',
  name: 'Source Name',
  country: 'XX',
  region: 'western' | 'middle-east' | 'turkish' | 'russian' | 'chinese' | 'alternative',
  language: 'en',
  bias: { political: 0, reliability: 8, ownership: 'private' },
  apiEndpoint: 'https://example.com/rss.xml',
  rateLimit: 100,
}
```

## Common Issues & Solutions

### Event Counts Differ Between Pages
**Problem**: Monitor shows different event counts than EventMap.
**Solution**: Use identical `queryKey`, `staleTime`, and `refetchInterval` values across components.

### AI Service Not Available
**Problem**: AI features return errors.
**Solution**: Configure at least one AI provider in `.env`. The service falls back to keyword-based analysis if all providers fail.

### Articles Not Clickable in Clusters
**Problem**: Articles appear as plain text.
**Solution**: Ensure backend includes `url` field and frontend renders as `<a>` tags.
