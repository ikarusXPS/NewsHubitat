# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewsHub is a multi-perspective global news analysis platform. It aggregates news from 130 sources across 13 regions, with real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights.

## Monorepo Structure

This is a pnpm monorepo with workspace packages:

```
NewsHub/
├── apps/
│   └── web/                    # Main web application (frontend + backend)
│       ├── src/                # React frontend
│       ├── server/             # Express backend
│       ├── prisma/             # Database schema
│       └── e2e/                # Playwright tests
├── packages/
│   └── types/                  # Shared TypeScript types (@newshub/types)
├── pnpm-workspace.yaml
└── package.json                # Root scripts (proxy to apps/web)
```

## Commands

```bash
# Development
pnpm dev                  # Both frontend (5173) + backend (3001)
pnpm dev:frontend         # Frontend only
pnpm dev:backend          # Backend only

# Build & Verify (run before committing)
pnpm typecheck && pnpm test:run && pnpm build

# Quality
pnpm typecheck            # TypeScript validation (all packages)
pnpm lint                 # ESLint validation (all packages)

# Unit Testing (Vitest) - 80% coverage enforced
pnpm test                 # Run unit tests (watch mode)
pnpm test:run             # Run tests once (CI mode)
pnpm test:coverage        # Coverage report (fails below 80%)

# E2E Testing (Playwright)
pnpm test:e2e             # Playwright headless
pnpm test:e2e:headed      # Playwright with browser visible
pnpm test:e2e:ui          # Interactive UI mode

# Database (Prisma + PostgreSQL)
docker compose up -d postgres redis   # Start services
cd apps/web && npx prisma generate    # Generate client (after schema changes)
cd apps/web && npx prisma db push     # Sync schema to database
cd apps/web && npx prisma studio      # Database GUI (localhost:5555)

# Seed Data
pnpm seed                 # All seed scripts (badges + personas)
pnpm seed:badges          # Gamification badges only
pnpm seed:personas        # AI personas only

# Run Single Tests
pnpm test -- apps/web/src/lib/utils.test.ts      # Single unit test file
pnpm test -- -t "mapCentering"                   # Tests matching pattern
cd apps/web && npx playwright test e2e/auth.spec.ts  # Single E2E test

# Docker (Production)
docker compose up -d      # All services (app, postgres, redis, prometheus, grafana)
docker compose logs -f app

# Monitoring (included in docker compose)
# Prometheus: localhost:9090 | Grafana: localhost:3000 (admin/admin)
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4
- **State**: Zustand v5 (localStorage `newshub-storage`) + TanStack Query v5
- **Visualization**: Recharts 3, globe.gl 2, Leaflet 1.9
- **Backend**: Express 5 (TypeScript, ES modules)
- **Database**: PostgreSQL via Prisma 7 (adapter: @prisma/adapter-pg)
- **Real-time**: Socket.io
- **AI**: Multi-provider fallback (OpenRouter → Gemini → Anthropic)
- **Translation**: Multi-provider chain (DeepL → Google → LibreTranslate → Claude)
- **Testing**: Vitest (unit, 80% coverage) + Playwright (E2E)
- **Monitoring**: Prometheus + Grafana + Alertmanager; Sentry for errors

## Architecture

### Frontend (`apps/web/src/`)
- **Routing**: React Router v7 with lazy-loaded pages via Suspense
- **State**: Zustand store for UI (theme, language, filters, bookmarks, feed settings, reading history)
- **Data Fetching**: TanStack Query with error/loading states
- **Auth**: Context API with JWT in localStorage
- **Offline Sync**: `services/syncService.ts` queues actions in IndexedDB when offline

### Backend (`apps/web/server/`)
- **Singleton Services**: All services use `getInstance()` pattern
- **Data Flow**: RSS/HTML crawl → Dedup → Sentiment → Translation → Database/Cache
- **Generated Client**: `src/generated/prisma/` (do not edit)
- **Caching**: Redis for JWT blacklist, rate limits, AI responses; in-memory fallback
- **Rate Limiting**: Tiered (auth 5/min, AI 10/min, news 100/min)

### Key Services (`apps/web/server/services/`)
| Service | Purpose |
|---------|---------|
| `newsAggregator.ts` | Orchestrates RSS fetching, dedup, and storage |
| `aiService.ts` | Multi-provider AI with fallback chain |
| `translationService.ts` | Multi-provider translation chain |
| `websocketService.ts` | Real-time updates via Socket.io |
| `cleanupService.ts` | Daily cleanup: unverified accounts (30d), analytics (90d) |
| `cacheService.ts` | Redis wrapper with graceful degradation |
| `teamService.ts` | Team collaboration features |
| `commentService.ts` | Article comments with threading |
| `subscriptionService.ts` | Stripe subscription management |

### Shared Types (`packages/types/`)
Import shared types from `@newshub/types`:
```typescript
import type { PerspectiveRegion, NewsArticle, ApiResponse } from '@newshub/types';
```

## Database Schema (`apps/web/prisma/schema.prisma`)

### Core Models
- `NewsArticle` - Articles with JSONB translations (`titleTranslated`, `contentTranslated`)
- `NewsSource` - 130 news sources with bias metadata
- `User` - Auth with email verification, OAuth (Google/GitHub), token versioning
- `Bookmark` / `ReadingHistory` - User article interactions

### Feature Models
- `StoryCluster` - Topic clustering with perspective analysis
- `EmailSubscription` / `EmailDigest` - Email digest feature
- `AIPersona` / `UserPersona` - Customizable AI personalities (8 built-in)
- `SharedContent` / `ShareClick` - Social sharing analytics
- `Comment` - Threaded article comments
- `Team` / `TeamMember` / `TeamBookmark` / `TeamInvite` - Team collaboration
- `ApiKey` - Developer API keys with tier-based rate limits

### Gamification Models
- `Badge` - Achievement badges with tiers (bronze, silver, gold, platinum)
- `UserBadge` - User earned badges with progress tracking
- `LeaderboardSnapshot` - Periodic leaderboard snapshots

## Key Patterns

### Query Key Synchronization (CRITICAL)
Components sharing data MUST use identical `queryKey` values:

```typescript
// Monitor.tsx AND EventMap.tsx both use:
queryKey: ['geo-events']
staleTime: 60_000
refetchInterval: 2 * 60_000
```

### Multi-Provider AI Fallback
The AI service uses a fallback chain:
1. **OpenRouter** (free models) - Primary
2. **Gemini** (free tier, 1500 req/day) - Secondary
3. **Anthropic** (premium) - Fallback
4. Keyword-based analysis - Final fallback

### Graceful Degradation
```typescript
const { data, error } = useQuery({ queryKey: ['data'], queryFn: fetchData, retry: 1 });
if (error) return null;  // Don't break the page
```

### Class Utility
```typescript
import { cn } from '../lib/utils';
className={cn('base-class', isActive && 'active-class', variant)}
```

## Core Types

```typescript
type PerspectiveRegion = 'usa' | 'europa' | 'deutschland' | 'nahost' | 'tuerkei' | 'russland' | 'china' | 'asien' | 'afrika' | 'lateinamerika' | 'ozeanien' | 'kanada' | 'alternative';
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
| `/api/auth/register` | POST | Create account (triggers email verification) |
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/me` | GET | Current user (Bearer token) |
| `/api/analysis/clusters` | GET | Topic clustering (`?summaries=true` for AI) |
| `/api/ai/ask` | POST | RAG Q&A `{question, context[]}` |
| `/api/events/geo` | GET | Geo-located events |
| `/api/events/timeline` | GET | Historical event timeline |
| `/api/comments/:articleId` | GET/POST | Article comments |
| `/api/teams` | GET/POST | Team management |
| `/api/health` | GET | Server status |
| `/api/metrics` | GET | Prometheus metrics |

## E2E Testing Structure

Playwright tests split into authenticated and unauthenticated projects:

```typescript
// apps/web/playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },  // Creates auth state
  { name: 'chromium', ... },                       // Unauthenticated
  { name: 'chromium-auth', storageState: 'playwright/.auth/user.json', dependencies: ['setup'] },
]
```

Debug E2E:
```bash
cd apps/web && npx playwright test --debug     # Step-through debugger
cd apps/web && npx playwright test --ui        # Interactive UI
cd apps/web && npx playwright show-report      # View last report
```

## UI Design System

- **Theme**: Dark cyber aesthetic with cyan accent (`#00f0ff`)
- **Colors**: Red (`#ff0044`), Green (`#00ff88`), Yellow (`#ffee00`), Purple (`#bf00ff`)
- **Region Colors**: Western (blue), Middle East (green), Turkish (red), Russian (purple), Chinese (yellow), Alternative (cyan)
- **Fonts**: Inter (body), JetBrains Mono (headers, code)

## Environment Variables

```bash
# Required
PORT=3001
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
REDIS_URL=redis://localhost:6379
JWT_SECRET=               # Required, minimum 32 characters

# AI (ONE required, priority: OpenRouter → Gemini → Anthropic)
OPENROUTER_API_KEY=       # FREE tier - multiple free models (recommended)
GEMINI_API_KEY=           # FREE tier - 1500 req/day
ANTHROPIC_API_KEY=        # Premium fallback

# Translation (at least one recommended)
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=

# Email (for verification and digests)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Payments (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Adding New Sources

Edit `apps/web/server/config/sources.ts`:
```typescript
{
  id: 'source-id',
  name: 'Source Name',
  country: 'XX',
  region: 'usa' | 'europa' | 'deutschland' | 'nahost' | ...,
  language: 'en',
  bias: { political: 0, reliability: 8, ownership: 'private' },
  apiEndpoint: 'https://example.com/rss.xml',
  rateLimit: 100,
}
```

## GDPR Compliance

### Consent Management
- `ConsentContext` manages 3 categories: essential (required), preferences, analytics
- `ConsentBanner` shows on first visit, stores in `newshub-consent` localStorage

### Data Retention (automated via cleanupService)
| Data | Retention |
|------|-----------|
| Unverified accounts | 30 days |
| ShareClick analytics | 90 days |
| JWT tokens | 7 days (Redis blacklist) |

### User Rights
| Right | Endpoint |
|-------|----------|
| Data Export (Art. 20) | `GET /api/account/export?format=json\|csv` |
| Account Deletion (Art. 17) | `POST /api/account/delete-request` (7-day grace) |
| History Pause (Art. 18) | `isHistoryPaused` store toggle |
