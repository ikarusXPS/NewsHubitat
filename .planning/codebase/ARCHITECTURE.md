# Architecture

**Analysis Date:** 2026-04-18

## Pattern Overview

**Overall:** Layered Monolith with Client-Server Separation

**Key Characteristics:**
- Single Express server handling all backend concerns (API, aggregation, AI, WebSocket)
- React SPA with Zustand for client state and TanStack Query for server state
- SQLite database via Prisma ORM with in-memory caching layer
- Multi-provider fallback chains for AI and Translation services
- Real-time updates via Socket.IO WebSocket integration

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface, user interactions, client-side state management
- Location: `src/`
- Contains: React components, pages, hooks, contexts, Zustand store
- Depends on: API endpoints via fetch/TanStack Query
- Used by: End users via browser

**API Layer:**
- Purpose: HTTP endpoints, request validation, response formatting
- Location: `server/routes/`
- Contains: Express Router handlers for news, auth, events, analysis, AI, etc.
- Depends on: Service layer (`server/services/`)
- Used by: Frontend via REST API calls

**Service Layer:**
- Purpose: Business logic, external integrations, data processing
- Location: `server/services/`
- Contains: Singleton service classes (NewsAggregator, AIService, TranslationService, etc.)
- Depends on: Database (Prisma), external APIs (OpenRouter, Gemini, DeepL)
- Used by: Route handlers

**Data Layer:**
- Purpose: Persistence, database operations, caching
- Location: `server/db/`, `prisma/schema.prisma`
- Contains: Prisma client, SQLite database, Redis cache service
- Depends on: SQLite (dev.db), Redis (optional)
- Used by: Service layer

## Data Flow

**News Aggregation Pipeline:**

1. `NewsAggregator.startAggregation()` triggers on server start (`server/index.ts`)
2. RSS feeds parsed via `rss-parser` from 130+ sources (`server/config/sources.ts`)
3. Articles deduplicated by normalized title hash
4. AI Service classifies topics and analyzes sentiment (`server/services/aiService.ts`)
5. Articles persisted to SQLite via Prisma upsert
6. In-memory article cache updated with indexed lookups (topic/entity Maps)
7. WebSocket broadcasts new articles to subscribed clients

**API Request Flow:**

1. Client sends request (e.g., `GET /api/news?regions=usa,europa`)
2. Express middleware: CORS, compression, JSON parsing
3. Route handler extracts query params (`server/routes/news.ts`)
4. Route accesses service via `req.app.locals.newsAggregator`
5. Service filters in-memory articles array
6. Response sent with Cache-Control headers
7. TanStack Query caches response on client

**State Management:**

- **Server State:** TanStack Query with 2-min stale time, 5-min garbage collection
- **Client State:** Zustand store persisted to localStorage (`newshub-storage` key)
- **Real-time State:** Socket.IO for breaking news, events, tension index updates

## Key Abstractions

**NewsArticle:**
- Purpose: Core domain entity representing a news item
- Examples: `src/types/index.ts`, `prisma/schema.prisma`
- Pattern: Shared type between frontend/backend, JSON-serialized for database

**NewsSource:**
- Purpose: Configuration for a news outlet (RSS endpoint, region, bias metrics)
- Examples: `server/config/sources.ts`, `src/types/index.ts`
- Pattern: Static configuration array, synced to database on startup

**Singleton Services:**
- Purpose: Stateful service instances with `getInstance()` pattern
- Examples: `AIService.getInstance()`, `NewsAggregator.getInstance()`, `TranslationService.getInstance()`
- Pattern: Lazy initialization, single instance per process, shutdown hooks

**FocusPreset:**
- Purpose: User-configurable news filter configuration
- Examples: `src/types/focus.ts`, `src/config/focusPresets.ts`
- Pattern: Predefined presets + custom user presets stored in Zustand

## Entry Points

**Backend Entry:**
- Location: `server/index.ts`
- Triggers: `npm run dev:backend` or `npm start`
- Responsibilities: Express app setup, service initialization, route mounting, WebSocket init, graceful shutdown

**Frontend Entry:**
- Location: `src/main.tsx` -> `src/App.tsx`
- Triggers: `npm run dev:frontend` or browser loads built app
- Responsibilities: React root render, QueryClient setup, AuthProvider, BrowserRouter, Layout

**Database Migration:**
- Location: `npx prisma db push`
- Triggers: Schema changes in `prisma/schema.prisma`
- Responsibilities: Sync SQLite schema with Prisma models

## Error Handling

**Strategy:** Graceful degradation with fallbacks

**Patterns:**
- **AI Fallback Chain:** OpenRouter -> Gemini (primary) -> Gemini (fallback) -> Anthropic -> keyword-based analysis
- **Translation Fallback Chain:** DeepL -> Google Translate -> LibreTranslate -> Claude -> return original text
- **Query Error Handling:** TanStack Query retry once, then show error UI with retry button
- **Service Unavailability:** Services return `isAvailable()` check, routes handle gracefully
- **Component Errors:** `ErrorBoundary` wraps route content, returns `null` on non-critical failures

**Error Response Format:**
```typescript
{
  success: false,
  error: string  // User-friendly message
}
```

## Cross-Cutting Concerns

**Logging:**
- Backend: Winston logger (`server/utils/logger.ts`)
- Frontend: Console logging with Web Vitals metrics in development
- Pattern: `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`

**Validation:**
- API params validated inline in route handlers
- Zod available but not heavily used (dependency present)
- Type safety via TypeScript shared types

**Authentication:**
- JWT tokens stored in localStorage (`newshub-auth-token`)
- `AuthContext` provides `useAuth()` hook for components
- Protected routes check `Authorization: Bearer` header
- Backend validates via `server/services/authService.ts`

**Caching:**
- HTTP: `Cache-Control` headers on all endpoints (5min news, 24h sources, 10min analysis)
- Server: Redis optional (`server/services/cacheService.ts`), in-memory Maps in services
- Client: IndexedDB via custom `cacheService.ts`, TanStack Query cache

**Real-time:**
- Socket.IO server initialized on HTTP server (`server/services/websocketService.ts`)
- Room-based subscriptions: `region:usa`, `topic:conflict`
- Events: `news:new`, `news:breaking`, `event:new`, `analysis:tension-index`

---

*Architecture analysis: 2026-04-18*
