# NewsHub

## What This Is

A multi-perspective global news analysis platform that aggregates news from 130 sources across 13 regions. It provides real-time translation, sentiment analysis, perspective comparison visualization, AI-powered insights with coverage gap detection, reading history tracking, personalized recommendations, and gamification features to help users understand how different regions frame the same events.

## Core Value

Users can see how the same story is covered by different regional perspectives — Western, Middle East, Turkish, Russian, Chinese, and alternative media — enabling informed analysis beyond single-source narratives.

## Current State (v1.0 shipped)

**Shipped:** 2026-04-20
**Codebase:** ~17,000 lines TypeScript across 79 files
**Tech stack:** React 19, Express 5, SQLite/Prisma, Zustand, TanStack Query

**What's Working:**
- AI Q&A with citations and coverage gap detection
- Bilingual historical events database (111 events, 1914-2025)
- Email verification and password reset with secure tokens
- Reading history with gamification (10 badge types, 4 tiers)
- Personalized "For You" carousel based on reading patterns
- Account management: data export, deletion with grace period

## Requirements

### Validated

<!-- Shipped and confirmed valuable in v1.0 -->

- ✓ Express 5 server with TypeScript + ES modules — v1.0
- ✓ React 19 + Vite 7 frontend with Zustand + TanStack Query — v1.0
- ✓ RSS aggregation from 130 sources across 13 regions — v1.0
- ✓ Multi-provider translation chain (DeepL → Google → LibreTranslate → Claude) — v1.0
- ✓ Sentiment classification (positive/negative/neutral) — v1.0
- ✓ 13 region/country perspectives with unique colors — v1.0
- ✓ NewsFeed with grid/list view modes — v1.0
- ✓ TanStack Query caching with 5-minute TTL — v1.0
- ✓ Auto-refresh with "LIVE" badge — v1.0
- ✓ HeroSection with stats, marquee ticker, keywords, markets panel — v1.0
- ✓ AI citation tracking with article IDs — v1.0
- ✓ Follow-up question context preservation — v1.0
- ✓ Coverage gap detection (<3 regions alerts) — v1.0
- ✓ Propaganda pattern detection — v1.0
- ✓ Event timeline integration with NewsArticle linking — v1.0
- ✓ Historical event database (111 events, DE/EN bilingual) — v1.0
- ✓ Event clustering for dense regions on map — v1.0
- ✓ Real-time event markers on globe/map — v1.0
- ✓ Email verification for auth — v1.0
- ✓ Password reset flow — v1.0
- ✓ User preferences (language, theme, default regions) — v1.0
- ✓ Bookmark management (save/unsave articles) — v1.0
- ✓ Reading history tracking — v1.0
- ✓ Personalized news feed based on preferences — v1.0
- ✓ UserProfile page with reading insights — v1.0
- ✓ BookmarksPage — v1.0
- ✓ SettingsPage with preference management — v1.0
- ✓ Gamification: badges, achievements, avatar unlocks — v1.0
- ✓ Leaderboard with time filters — v1.0
- ✓ Account management: export, deletion — v1.0

### Active

<!-- v1.1: Quality & Testing -->

- [ ] Unit test coverage 80%+ across backend services, frontend hooks, utilities
- [ ] E2E tests for critical user flows (auth, bookmarks, reading history, personalization)
- [ ] Fix B7: Article thumbnail fallback system
- [ ] Code quality improvements (linting, type coverage, dead code cleanup)

### Out of Scope

<!-- Deferred to future milestones -->

- PostgreSQL migration — Future (performance optimization)
- Redis caching — Future (performance optimization)
- Service Worker offline — Future (performance optimization)
- OAuth integration (Google, GitHub) — Future (advanced features)
- Load testing (10k concurrent users) — Future (QA milestone)
- CI/CD pipeline — Future (deployment milestone)
- Docker containerization — Future (deployment milestone)
- Sentry error tracking — Future (deployment milestone)
- i18n multi-language UI — Future (advanced features)
- Team collaboration features — Future (advanced features)
- Premium export features — Future (advanced features)
- Mobile native app — Web-first approach, PWA sufficient
- Real-time chat — Not core to news analysis value
- Video content — Storage/bandwidth costs, text focus
- Paid subscriptions — Monetization deferred post-validation

## Context

**Architecture:**
- Layered monolith: React SPA + Express REST API
- SQLite via Prisma ORM with in-memory caching
- Multi-provider AI fallback chain (OpenRouter → Gemini → Anthropic)
- Socket.IO for real-time updates
- 130 news sources configured in `server/config/sources.ts`

**Known Issues:**
- B7: Article thumbnail fallback system missing (deferred)

**Testing Status:**
- Phase 03 auth flows: Code complete, needs SMTP for production testing
- Phase 06 UAT: Needs live RSS feeds for full validation

## Constraints

- **Tech Stack**: React 19, Express 5, TypeScript, SQLite (fixed for v1.x)
- **AI Providers**: Must work with OpenRouter, Gemini, or Anthropic API keys
- **Performance**: Frontend Lighthouse score 90+ target
- **Browser**: Chrome, Firefox, Safari (latest 2 versions)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for v1, PostgreSQL for scale | Simplicity for development, defer complexity | ✓ Good (v1.0 shipped) |
| Multi-provider AI fallback | Reliability over single provider dependency | ✓ Good |
| In-memory article cache | Fast filtering without DB queries | ✓ Good |
| Zustand + TanStack Query split | Client state vs server state separation | ✓ Good |
| 32-byte crypto tokens with SHA-256 | Security best practice for auth tokens | ✓ Good |
| Disposable email blocking | Prevent spam registrations | ✓ Good |
| 7-day deletion grace period | User safety, prevent accidental deletion | ✓ Good |
| Topic weighting with 7-day recency | Fresh recommendations without stale patterns | ✓ Good |
| Badge tier system (bronze-platinum) | Engagement without overwhelming new users | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**v1.0 shipped (2026-04-20):**
- All 22 requirements validated and moved to Validated section
- Core Value confirmed: multi-perspective comparison is the differentiator
- Gamification and personalization added as key engagement features

## Current Milestone: v1.2 Performance & Scale

**Goal:** Production-ready infrastructure with PostgreSQL, Redis, and Docker deployment

**Target features:**
- PostgreSQL migration (replace SQLite)
- Redis caching (sessions, rate limiting, AI cache)
- Query optimization (indexes, N+1 fixes)
- PWA / Service Worker (offline support)
- Docker Compose deployment

**Baseline (2026-04-22):**
- Unit tests: 1051 passing, 91.65% coverage
- E2E tests: 62 passing
- Database: SQLite (dev.db)
- Caching: In-memory Maps
- Deployment: Manual

## Completed Milestones

### v1.1 Quality & Testing (2026-04-22)
- 1051 unit tests, 62 E2E tests
- 91.65% statement coverage
- All quality gates passing

### v1.0 AI Analysis & User Features (2026-04-20)
- Core multi-perspective news analysis
- AI Q&A with citations
- Gamification and personalization

---
*Last updated: 2026-04-22 after v1.2 milestone started*
