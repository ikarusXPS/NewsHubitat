# NewsHub

## What This Is

A multi-perspective global news analysis platform that aggregates news from 130 sources across 13 regions. It provides real-time translation, sentiment analysis, perspective comparison visualization, and AI-powered insights to help users understand how different regions frame the same events.

## Core Value

Users can see how the same story is covered by different regional perspectives — Western, Middle East, Turkish, Russian, Chinese, and alternative media — enabling informed analysis beyond single-source narratives.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Phases 1-4 complete. -->

- ✓ Express 5 server with TypeScript + ES modules — Phase 1
- ✓ React 19 + Vite 7 frontend with Zustand + TanStack Query — Phase 1
- ✓ RSS aggregation from 130 sources across 13 regions — Phase 2
- ✓ Multi-provider translation chain (DeepL → Google → LibreTranslate → Claude) — Phase 2
- ✓ Sentiment classification (positive/negative/neutral) — Phase 3
- ✓ 13 region/country perspectives with unique colors — Phase 3
- ✓ NewsFeed with grid/list view modes — Phase 3
- ✓ TanStack Query caching with 5-minute TTL — Phase 4
- ✓ Auto-refresh with "LIVE" badge — Phase 4
- ✓ HeroSection with stats, marquee ticker, keywords, markets panel — Phase 4

### Active

<!-- Current milestone scope: Phases 5-6 -->

- [ ] AI citation tracking with article IDs
- [ ] Follow-up question context preservation
- [ ] Coverage gap detection
- [ ] Propaganda pattern detection
- [ ] Event timeline integration with NewsArticle linking
- [ ] Historical event database (100+ key events)
- [ ] Event clustering for dense regions on map
- [ ] Real-time event markers on globe/map
- [ ] Email verification for auth
- [ ] Password reset flow
- [ ] User preferences (language, theme, default regions)
- [ ] Bookmark management (save/unsave articles)
- [ ] Reading history tracking
- [ ] Personalized news feed based on preferences
- [ ] UserProfile page
- [ ] BookmarksPage
- [ ] SettingsPage with preference management

### Out of Scope

<!-- Deferred to future milestones (Phases 7-10) -->

- PostgreSQL migration — Phase 7 (performance optimization)
- Redis caching — Phase 7 (performance optimization)
- Service Worker offline — Phase 7 (performance optimization)
- OAuth integration (Google, GitHub) — Phase 10 (advanced features)
- Unit test coverage 80%+ — Phase 8 (QA milestone)
- E2E auth flow tests — Phase 8 (QA milestone)
- Load testing (10k concurrent users) — Phase 8 (QA milestone)
- CI/CD pipeline — Phase 9 (deployment milestone)
- Docker containerization — Phase 9 (deployment milestone)
- Sentry error tracking — Phase 9 (deployment milestone)
- i18n multi-language UI — Phase 10 (advanced features)
- Team collaboration features — Phase 10 (advanced features)
- Premium export features — Phase 10 (advanced features)

## Context

**Existing Codebase:**
- Layered monolith: React SPA + Express REST API
- SQLite via Prisma ORM with in-memory caching
- Multi-provider AI fallback chain (OpenRouter → Gemini → Anthropic)
- Socket.IO for real-time updates
- 130 news sources configured in `server/config/sources.ts`

**Known Issues (tracked bugs):**
- B5: Settings page needs more options
- B6: Map point density too low (30 events from 510 signals)
- B7: Article thumbnail fallback system missing

**Architecture:**
- Frontend: `src/` (components, pages, hooks, store)
- Backend: `server/` (routes, services, config)
- Database: `prisma/schema.prisma` (SQLite)
- See `.planning/codebase/` for detailed architecture analysis

## Constraints

- **Tech Stack**: React 19, Express 5, TypeScript, SQLite (fixed)
- **AI Providers**: Must work with OpenRouter, Gemini, or Anthropic API keys
- **Performance**: Frontend Lighthouse score 90+ target
- **Browser**: Chrome, Firefox, Safari (latest 2 versions)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for v1, PostgreSQL for scale | Simplicity for development, defer complexity | — Pending |
| Multi-provider AI fallback | Reliability over single provider dependency | ✓ Good |
| In-memory article cache | Fast filtering without DB queries | ✓ Good |
| Zustand + TanStack Query split | Client state vs server state separation | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 after initialization*
