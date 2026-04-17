# NewsHub - Implementation Plan

## Current Status: ✅ Phase 1-3 Complete

This document tracks the implementation phases for NewsHub. Core features are complete; focus is now on enhancements and scaling.

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### Backend Foundation
- [x] Express 5 server with TypeScript + ES modules
- [x] In-memory storage with singleton pattern
- [x] CORS configuration
- [x] Environment variables with dotenv
- [x] Health check endpoint `/api/health`

### Frontend Foundation
- [x] React 19 + Vite 7 + TypeScript strict mode
- [x] Tailwind CSS v4 with `@tailwindcss/vite`
- [x] React Router v7 with lazy-loaded pages
- [x] Zustand store with localStorage persistence
- [x] TanStack Query v5 for server state

### Dependencies
None (foundational phase)

---

## Phase 2: News Aggregation & Translation ✅ COMPLETE

### News Crawling
- [x] RSS parser integration for 130 sources
- [x] Stealth scraping with puppeteer-extra
- [x] Article deduplication by URL
- [x] Source configuration in `server/config/sources.ts`
- [x] 60-minute auto-refresh interval

### Translation System
- [x] Multi-provider chain: DeepL → Google → LibreTranslate → Claude
- [x] Batch translation API endpoint
- [x] On-demand translation for individual articles
- [x] Translation caching in article metadata

### API Endpoints
- [x] `GET /api/news` - List articles with filters
- [x] `GET /api/news/:id` - Single article
- [x] `GET /api/news/sources` - All sources
- [x] `POST /api/translate` - Translate text
- [x] `POST /api/translate/batch` - Batch translate

### Dependencies
- Phase 1 must be complete

---

## Phase 3: Sentiment Analysis & Perspectives ✅ COMPLETE

### Sentiment Engine
- [x] Sentiment classification (positive/negative/neutral)
- [x] Topic extraction from article content
- [x] Named entity recognition
- [x] Confidence score calculation
- [x] Escalation/de-escalation trend classification

### Perspective System
- [x] 13 region/country perspectives with unique colors
- [x] SourceFilter component with alphabetical 2-row layout
- [x] Perspective-based article filtering
- [x] Multi-select perspective filters with state persistence

### UI Components
- [x] NewsFeed with grid/list view modes
- [x] SignalCard with severity badges
- [x] SourceFilter with optimized color distribution
- [x] Trend Analysis tabs (All, Escalation, De-escalation)

### Dependencies
- Phase 2 must be complete (requires article data)

---

## Phase 4: Real-Time Features & Caching ✅ COMPLETE

### Caching Layer
- [x] TanStack Query with 5-minute TTL
- [x] Custom `useCachedQuery` hook
- [x] Cache age indicator in UI
- [x] Stale-while-revalidate strategy

### Live Updates
- [x] Auto-refresh every 5 minutes
- [x] "LIVE" badge when fetching
- [x] Optimistic UI updates
- [x] Background refetch with `refetchInterval`

### Hero Section
- [x] HeroSection with stats (signals, regions, critical, sync time)
- [x] Active feeds marquee ticker (27 sources)
- [x] Top Keywords widget (last 24 hours)
- [x] Markets Panel (Oil, Gold, DAX, S&P 500 with 60s refresh)

### Dependencies
- Phase 3 must be complete

---

## Phase 5: AI Analysis & Visualization (IN PROGRESS)

### AI-Powered Q&A
- [x] Claude Haiku integration for RAG
- [x] AskAI component with chat interface
- [x] Context selection (max 10 relevant articles)
- [ ] Citation tracking with article IDs
- [ ] Follow-up question context preservation

### Analytics Dashboard
- [x] TensionIndex gauge (0-100 conflict intensity)
- [x] SentimentChart (sentiment over time)
- [x] BiasRadarChart (6-axis perspective coverage)
- [ ] Coverage gap detection
- [ ] Propaganda pattern detection

### Event Timeline
- [x] TimelineEvent interface
- [x] Timeline page with date range filter
- [ ] Integration with NewsArticle linking
- [ ] Historical event database (100+ key events)

### Geo-Visualization
- [x] Leaflet map integration
- [x] GlobeView with globe.gl
- [ ] Event clustering for dense regions
- [ ] Real-time event markers

### Dependencies
- Phase 4 must be complete
- `ANTHROPIC_API_KEY` required

---

## Phase 6: Authentication & User Features (PARTIALLY COMPLETE)

### Authentication
- [x] JWT-based auth with bcrypt password hashing
- [x] AuthService with register/login/verify
- [x] Protected routes with middleware
- [ ] Email verification
- [ ] Password reset flow
- [ ] OAuth integration (Google, GitHub)

### User Dashboard
- [ ] User preferences (language, theme, default regions)
- [ ] Bookmark management (save/unsave articles)
- [ ] Reading history tracking
- [ ] Personalized news feed based on preferences

### UI Components
- [x] AuthModal (login/register)
- [x] AuthContext with JWT storage
- [ ] UserProfile page
- [ ] BookmarksPage
- [ ] SettingsPage with preference management

### Dependencies
- Phase 5 analytics can run in parallel

---

## Phase 7: Performance Optimization (PENDING)

### Build Optimization
- [ ] Code splitting by route
- [ ] Tree shaking unused deps
- [ ] Image lazy loading with `react-intersection-observer`
- [ ] Service Worker for offline caching
- [ ] Compression (gzip/brotli)

### Database Migration
- [ ] Migrate from in-memory to PostgreSQL
- [ ] Implement connection pooling
- [ ] Add database indexes (publishedAt, perspective, sentiment)
- [ ] Batch insert optimization

### Caching Strategy
- [ ] Redis for API response caching
- [ ] CDN for static assets
- [ ] Browser caching headers
- [ ] Cache warming on server startup

### Dependencies
- Phase 6 user features should be complete
- Requires PostgreSQL + Redis setup

---

## Phase 8: Testing & Quality Assurance (PARTIALLY COMPLETE)

### Unit Tests
- [ ] Service layer tests (NewsAggregator, TranslationService)
- [ ] Component tests with Testing Library
- [ ] Hook tests (useCachedQuery, useAuth)
- [ ] 80%+ code coverage target

### E2E Tests
- [x] Playwright setup
- [x] Basic navigation tests
- [ ] Auth flow tests (login, register, logout)
- [ ] Search and filter tests
- [ ] Timeline interaction tests

### Load Testing
- [ ] Artillery or k6 load tests
- [ ] 10,000 concurrent user simulation
- [ ] API response time monitoring
- [ ] Memory leak detection

### Dependencies
- All core features (Phase 1-6) should be implemented

---

## Phase 9: Deployment & DevOps (PENDING)

### CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Automated tests on PR
- [ ] Docker containerization
- [ ] Deployment to production (Vercel/Railway/Fly.io)

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/Fathom)
- [ ] Uptime monitoring (Uptime Robot)
- [ ] Performance monitoring (Web Vitals)

### Security Hardening
- [ ] Rate limiting on all endpoints
- [ ] CSRF token validation
- [ ] XSS sanitization
- [ ] SQL injection prevention (if using PostgreSQL)
- [ ] Security headers (Helmet.js)

### Dependencies
- Phase 8 testing complete
- Production infrastructure ready

---

## Phase 10: Advanced Features (FUTURE)

### Multi-Language UI
- [ ] i18n with react-i18next
- [ ] German and English localization
- [ ] Right-to-left (RTL) support for Arabic sources

### Collaboration
- [ ] Shared reading lists
- [ ] Team annotations on articles
- [ ] Discussion threads per article

### Premium Features
- [ ] Export articles to PDF
- [ ] Custom alert notifications (keyword/topic/source)
- [ ] Advanced analytics (custom date ranges, CSV export)
- [ ] API access for developers

### Machine Learning
- [ ] Topic clustering with BERT embeddings
- [ ] Automated fact-checking
- [ ] Duplicate article detection (semantic similarity)
- [ ] Trend prediction

### Dependencies
- All previous phases complete
- User base validation

---

## Critical Path

```
Phase 1 (Infrastructure)
  ↓
Phase 2 (Aggregation + Translation)
  ↓
Phase 3 (Sentiment + Perspectives)
  ↓
Phase 4 (Real-Time + Caching)
  ↓
Phase 5 (AI + Visualization) ← CURRENT FOCUS
  ↓
Phase 6 (Auth + Users)
  ↓
Phase 7 (Performance)
  ↓
Phase 8 (Testing)
  ↓
Phase 9 (Deployment)
  ↓
Phase 10 (Future Features)
```

---

## Known Issues & Bugs (from User Analysis)

### High Priority
- [x] **B8**: Sidebar signal counter showing dashes instead of 0
- [ ] **B5**: Settings page needs more options (theme, language, filter presets)
- [ ] **B6**: Map point density too low (only 30 events from 510 signals)
- [ ] **B7**: Article thumbnail fallback system (missing images)

### Medium Priority
- [ ] **B1**: BiasRadar chart rendering issues on mobile
- [ ] **B2**: Timeline scrolling jank with 100+ events
- [ ] **B3**: Sentiment chart axis labels overlap
- [ ] **B4**: GlobeView memory leak after 5 minutes

### Low Priority
- [ ] **U1**: Offline banner styling improvements
- [ ] **U2**: CompareMode keyboard shortcuts
- [ ] **U4**: Toast notifications for real-time updates
- [ ] **U5**: Dark/light theme toggle

---

## Next Steps

1. **Complete Phase 5**: Finish AI citation tracking and event timeline linking
2. **Fix High-Priority Bugs**: B5 (Settings), B6 (Map density), B7 (Thumbnails)
3. **Implement User Features**: Phase 6 bookmarks and preferences
4. **Performance Audit**: Lighthouse score 90+ on all pages
5. **Deploy Beta**: Get user feedback before Phase 10 feature expansion

---

## Development Commands

```bash
# Development
npm run dev              # Frontend + Backend concurrently
npm run dev:frontend     # Vite dev server (port 5173)
npm run dev:backend      # Backend only (port 3001)

# Build & Production
npm run build            # TypeScript + Vite build
npm run start            # Run built server

# Quality
npm run typecheck        # TypeScript validation
npm run lint             # ESLint
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright E2E tests

# Coverage
npm run test:coverage    # Generate coverage report
```
