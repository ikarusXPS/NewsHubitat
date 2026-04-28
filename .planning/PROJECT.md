# NewsHub

## What This Is

A multi-perspective global news analysis platform that aggregates news from 130 sources across 13 regions. It provides real-time translation, sentiment analysis, perspective comparison visualization, AI-powered insights with coverage gap detection, reading history tracking, personalized recommendations, and gamification features to help users understand how different regions frame the same events.

## Core Value

Users can see how the same story is covered by different regional perspectives — Western, Middle East, Turkish, Russian, Chinese, and alternative media — enabling informed analysis beyond single-source narratives.

## Current State (v1.5 shipped)

**Shipped:** 2026-04-26
**Codebase:** ~25,000 lines TypeScript
**Tech stack:** React 19, Express 5, PostgreSQL/Prisma, Redis, Zustand, TanStack Query

**What's Working:**
- Multi-perspective news from 130 sources across 13 regions
- AI Q&A with citations and coverage gap detection
- i18n (DE/EN/FR/ES/IT), OAuth (Google/GitHub), Teams, Comments
- Performance optimized: code splitting, virtual scroll, image pipeline
- Production-ready: Docker, CI/CD, Prometheus/Grafana, Sentry
- 10k concurrent users validated (k6)

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

<!-- v1.6: Infrastructure & Scale -->

(See REQUIREMENTS.md for detailed requirements)

### Out of Scope

<!-- Explicit exclusions -->

- Real-time chat — Not core to news analysis value
- User-generated articles — Focus on aggregation, not content creation
- Blockchain/Web3 — No clear value for news analysis

## Context

**Architecture:**
- Layered monolith: React SPA + Express REST API
- PostgreSQL via Prisma ORM with Redis caching
- Multi-provider AI fallback chain (OpenRouter → Gemini → Anthropic)
- Socket.IO for real-time updates
- Docker Compose deployment with health checks
- CI/CD via GitHub Actions
- Monitoring: Prometheus + Grafana + Sentry

**Testing Status:**
- 1051+ unit tests, 91.65% coverage
- 62+ E2E tests
- 10k concurrent users validated (k6)

## Constraints

- **Tech Stack**: React 19, Express 5, TypeScript, PostgreSQL, Redis
- **AI Providers**: Must work with OpenRouter, Gemini, or Anthropic API keys
- **Performance**: Frontend Lighthouse score 90+ target
- **Browser**: Chrome, Firefox, Safari (latest 2 versions)
- **Mobile**: iOS 15+, Android 10+ for native apps

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

## Current Milestone: v1.6 Infrastructure & Scale

**Goal:** Comprehensive expansion across infrastructure, AI capabilities, mobile platforms, monetization, and content.

**Target features:**

**Infrastructure & Scale:**
- Docker Swarm/Compose with replicas for horizontal scaling
- Multi-region architecture preparation (single region first)

**Advanced AI Features:**
- Source credibility scoring (reliability per source)
- Bias detection (political/framing analysis)
- Fact-checking (claim verification)

**Mobile Experience:**
- Enhanced PWA (push notifications, better offline)
- React Native cross-platform app
- Capacitor wrapper for app stores

**Monetization:**
- Freemium model (free tier + premium features)
- Developer API (news data and analysis access)

**Content Expansion:**
- More news sources beyond 130
- New content types (video, podcasts, social)
- Source quality improvements (metadata, verification)

## Completed Milestones

### v1.5 Performance Optimization (2026-04-26)
- Measurement Foundation (metrics, query logging, Lighthouse CI)
- Frontend Code Splitting (lazy loading, prefetch)
- Virtual Scrolling for long lists
- Image Pipeline (Cloudinary, AVIF/WebP)
- Caching Improvements (ETags, TTL jitter)
- Database Optimization (N+1 detection, indexes, pool metrics)

### v1.4 User & Community Features (2026-04-25)
- i18n Foundation (DE/EN/FR/ES/IT)
- Mobile Responsive layouts
- Social Sharing with OG tags
- Google & GitHub OAuth
- Comments System
- Team Collaboration

### v1.3 Production Ready (2026-04-23)
- CI/CD Pipeline (GitHub Actions)
- Sentry Error Tracking (frontend + backend)
- Prometheus + Grafana Monitoring
- k6 Load Testing (10k users validated)
- SMTP Production with SendGrid

### v1.2 Performance & Scale (2026-04-23)
- PostgreSQL migration
- Redis caching (sessions, rate limiting, AI cache)
- Docker Compose deployment
- PWA / Service Worker

### v1.1 Quality & Testing (2026-04-22)
- 1051 unit tests, 62 E2E tests
- 91.65% statement coverage
- All quality gates passing

### v1.0 AI Analysis & User Features (2026-04-20)
- Core multi-perspective news analysis
- AI Q&A with citations
- Gamification and personalization

---
*Last updated: 2026-04-28 — Phase 36.3 complete (Stripe webhook monorepo path fix; live `/api/webhooks/stripe` mount restored, 93 [200] forwards + IDEMPOTENCY: PASS empirically demonstrated)*
