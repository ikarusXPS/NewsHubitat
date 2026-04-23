<!-- generated-by: gsd-doc-writer -->
# Architecture

## System Overview

NewsHub is a multi-perspective global news aggregation and analysis platform built as a full-stack TypeScript application. The system ingests news from 130 sources across 13 regions, performs real-time sentiment analysis and translation, clusters related stories, and delivers personalized news feeds via a real-time dashboard. The architecture follows a **client-server pattern** with a React SPA frontend consuming a RESTful Express backend, with WebSocket support for real-time updates. Data flows from external RSS feeds → deduplication → AI enrichment (sentiment, entities, topics) → PostgreSQL storage → cached delivery to clients.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │   Pages    │→ │ Components │→ │   Zustand  │→ │  React   │ │
│  │ (Routes)   │  │   (UI)     │  │   Store    │  │  Query   │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│         ↓              ↓               ↓               ↓        │
└─────────┼──────────────┼───────────────┼───────────────┼────────┘
          │              │               │               │
          └──────────────┴───────────────┴───────────────┘
                                 ↓
                        ┌───────────────┐
                        │  HTTP/WebSocket│
                        └───────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express 5)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │   Routes   │→ │  Services  │→ │  Prisma    │→ │PostgreSQL│ │
│  │  (API)     │  │ (Business) │  │  Client    │  │          │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│         ↓              ↓               ↓               ↓        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  WebSocket │  │   Cache    │  │    AI      │               │
│  │  Service   │  │  (Redis)   │  │  Providers │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  RSS Feeds │  │ Translation│  │     AI     │  │   SMTP   │ │
│  │ (130 srcs) │  │ APIs (3)   │  │ APIs (3)   │  │  Server  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **News Ingestion**: `NewsAggregator` service fetches from 130 RSS feeds every 60 minutes → parses XML → extracts article metadata (title, content, URL, publishedAt)
2. **Deduplication**: Article URL is hashed to generate unique ID → checks PostgreSQL for existing article → skips duplicates
3. **AI Enrichment**: For new articles, `AIService` analyzes content → extracts sentiment (positive/negative/neutral) + confidence score → identifies entities (people, places, organizations) → assigns topics → `TranslationService` translates title/content to German and English
4. **Database Storage**: Enriched articles stored via Prisma → JSONB fields for translations, topics, entities → GIN indexes for fast topic/entity search
5. **Cache Layer**: `CacheService` stores frequently accessed data in Redis (JWT blacklist, rate limits, AI responses, 5-minute cache) → falls back to in-memory cache if Redis unavailable
6. **Client Delivery**: Frontend requests articles via `/api/news` → Express routes query Prisma → TanStack Query caches responses (2-minute stale time) → Zustand store manages UI state (filters, bookmarks, reading history)
7. **Real-time Updates**: `WebSocketService` broadcasts new article events → clients receive notifications via Socket.io → UI updates without refresh

## Key Abstractions

| Abstraction | Purpose | File Location |
|-------------|---------|---------------|
| **NewsAggregator** | Orchestrates RSS fetching, deduplication, and storage with background scheduling | `server/services/newsAggregator.ts` |
| **AIService** | Multi-provider AI with fallback chain (OpenRouter → Gemini → Anthropic) for sentiment and entity extraction | `server/services/aiService.ts` |
| **TranslationService** | Multi-provider translation chain (DeepL → Google → LibreTranslate → Claude) with quality scoring | `server/services/translationService.ts` |
| **CacheService** | Redis wrapper with in-memory fallback for JWT blacklist, rate limits, and response caching | `server/services/cacheService.ts` |
| **WebSocketService** | Socket.io server for real-time article broadcasts and connection management | `server/services/websocketService.ts` |
| **CleanupService** | Background job for expired token cleanup and unverified account deletion | `server/services/cleanupService.ts` |
| **useAppStore** | Zustand store managing theme, filters, bookmarks, reading history, feed settings with localStorage persistence | `src/store/index.ts` |
| **AuthContext** | React Context provider for JWT authentication state and user session management | `src/contexts/AuthContext.tsx` |
| **PrismaClient** | Type-safe database client with PostgreSQL adapter and custom output path | `src/generated/prisma/` (generated) |
| **ApiResponse<T>** | Standard API response wrapper with success/error/meta fields | `server/types/index.ts` |

## Directory Structure Rationale

### Frontend (`src/`)

- **`pages/`** — Route-level components loaded lazily via React Router Suspense (Dashboard, Analysis, Timeline, MapView, Globe, Monitor, EventMap, Community, Profile, Settings, Bookmarks, ReadingHistory). Each page is code-split to reduce initial bundle size.
- **`components/`** — Reusable UI components organized by feature (NewsFeed, SignalCard, GlobeView, FeedManager, CommandPalette, etc.). Large feature areas have subdirectories (e.g., `components/community/`, `components/monitor/`, `components/feed-manager/`).
- **`store/`** — Zustand store with state slices for theme, language, filters, bookmarks, reading history, feed settings, and read tracking. Persisted to localStorage under `newshub-storage` key.
- **`hooks/`** — Custom React hooks for shared logic (useWebSocket, useAuth, useDebounce, useInfiniteScroll).
- **`contexts/`** — React Context providers (AuthContext for JWT session management).
- **`services/`** — Client-side services (cacheService for IndexedDB, syncService for offline queuing).
- **`types/`** — TypeScript type definitions shared across frontend (NewsArticle, FilterState, PerspectiveRegion, Sentiment, etc.).
- **`lib/`** — Utility functions (cn for class merging, formatDate, regionDetection).
- **`generated/prisma/`** — Prisma client generated from schema (do not edit manually).

### Backend (`server/`)

- **`routes/`** — Express route handlers organized by feature (news.ts, auth.ts, analysis.ts, events.ts, ai.ts, translation.ts, etc.). Each file exports a router with related endpoints.
- **`services/`** — Singleton business logic services using `getInstance()` pattern (newsAggregator, aiService, translationService, cacheService, websocketService, cleanupService, etc.). All services share Prisma client instance.
- **`config/`** — Configuration files (sources.ts with 130 news sources, aiProviders.ts with model configuration).
- **`middleware/`** — Express middleware (rateLimiter.ts for tiered rate limits, serverTiming.ts for latency headers, metricsMiddleware.ts for Prometheus).
- **`db/`** — Prisma client initialization with PostgreSQL adapter configuration.
- **`types/`** — Backend-specific TypeScript types (ApiResponse, service interfaces).
- **`utils/`** — Helper functions (logger with Winston, hash utilities, array chunking).
- **`data/`** — Static data files (badge definitions, persona prompts).

### Database (`prisma/`)

- **`schema.prisma`** — Database schema with 14 models (NewsArticle, NewsSource, User, Bookmark, ReadingHistory, StoryCluster, EmailSubscription, EmailDigest, AIPersona, UserPersona, SharedContent, ShareClick, Badge, UserBadge, LeaderboardSnapshot). Uses JSONB fields for translations and arrays with GIN indexes for fast search.
- **`seed.ts`** — Seed script for initial data (news sources, AI personas, badges).

### Infrastructure

- **`docker-compose.yml`** — Multi-container setup (app, PostgreSQL, Redis, Prometheus, Grafana, Alertmanager).
- **`Dockerfile`** — Multi-stage build (frontend with Vite → backend with tsup → runtime with Node 20).
- **`prometheus/`** — Prometheus configuration for metrics scraping from `/metrics` endpoint.
- **`grafana/`** — Grafana dashboards for monitoring (request latency, database performance, cache hit rates).
- **`.github/workflows/`** — CI/CD pipeline (typecheck → lint → unit tests → E2E tests → build).
