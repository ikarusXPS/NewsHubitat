---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: User & Community Features
status: executing
last_updated: "2026-04-24T21:43:47Z"
last_activity: 2026-04-24
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 5
  completed_plans: 10
  percent: 40
---

# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** v1.4 User & Community Features

## Current Position

Phase: 26 (OAuth Integration) - Executing
Current Plan: 04
Status: 3/5 plans complete
Last activity: 2026-04-24 — Completed 26-03 Frontend OAuth components

```
v1.4 Progress: [########            ] 40% (6 phases, 2 complete)
```

## Milestone Progress

**Milestone:** v1.4 - User & Community Features
**Goal:** Reduce onboarding friction, expand target audience, and increase user engagement
**Status:** Roadmap complete
**Previous:** v1.3 complete 2026-04-23

### Phase Summary

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 23 | i18n Foundation | I18N-01, I18N-02, I18N-03 | Complete (2026-04-24) |
| 24 | Mobile Responsive | MOBILE-01, MOBILE-02, MOBILE-03 | Complete (2026-04-24) |
| 25 | Social Sharing | SHARE-01, SHARE-02, SHARE-03 | Executing (2/3 plans) |
| 26 | OAuth Integration | OAUTH-01, OAUTH-02, OAUTH-03 | Executing (3/5 plans) |
| 27 | Comments System | COMM-01, COMM-02, COMM-03 | Not started |
| 28 | Team Collaboration | COLLAB-01, COLLAB-02, COLLAB-03 | Not started |

### Phase Dependencies

```
Phase 22 (v1.3 complete)
    |
Phase 23: i18n Foundation
    |
Phase 24: Mobile Responsive
    |
Phase 25: Social Sharing
    |
Phase 26: OAuth Integration
    |
Phase 27: Comments System
    |
Phase 28: Team Collaboration
```

### Research Flags

From research SUMMARY.md:
- Phase 25 (Sharing): Needs SSR investigation for SPA OG tag limitation
- Phase 26 (OAuth): Account linking requires security review
- Phase 27 (Comments): Moderation strategy needs finalization (AI vs manual vs hybrid)
- Phase 28 (Teams): Enterprise features (SSO/SCIM) deferred to v1.5+

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status |
|----------|------|--------|
| verification | Phase 03 human verification | human_needed |
| uat | Phase 06 UAT tests | blocked |
| checkpoint | Phase 22-03 SMTP verification | deferred_to_production |

**Note:** These are environmental/operational items, not code defects:

- Phase 03: Email flows work but need SMTP server for production testing
- Phase 06: UAT tests blocked by no live RSS feeds during testing
- Phase 22-03: SMTP production verification deferred (infrastructure ready)

## Session Context

**Last action:** Completed Phase 26-03 Frontend OAuth components
**Next step:** Execute Phase 26-04 AuthModal integration
**Resume file:** .planning/phases/26-oauth-integration/26-04-PLAN.md
**Checkpoint:** —

## Accumulated Context

Carried forward from v1.3:

- PostgreSQL with PrismaPg adapter (max: 10 connections)
- Redis for JWT blacklist, rate limits, AI cache
- Docker Compose with health checks
- 91.65% test coverage baseline
- Dockerfile with multi-stage build (node:22-alpine3.19)
- Production static file serving via Express
- CI/CD pipeline with GitHub Actions
- Sentry error tracking (frontend + backend)
- Prometheus + Grafana monitoring
- SendGrid SMTP with bounce handling

v1.4 Stack Decisions (from research):
- OAuth: passport-google-oauth20 + passport-github2
- i18n: react-i18next (hooks-based, lazy loading)
- Responsive: Tailwind CSS v4 mobile-first utilities
- Comments: Custom with Socket.io (existing WebSocket infrastructure)
- Teams: Custom RBAC with CASL (owner/admin/member)

## Decisions

| Decision | Context | Outcome |
|----------|---------|---------|
| @sentry/react 10.49.0 | React 19 compatibility needed | Works with React 19 error handlers |
| Sentry enabled in production only | Avoid noise in development | import.meta.env.PROD gate |
| 20% traces sample rate | Balance coverage vs volume | Configurable via VITE_SENTRY_TRACES_SAMPLE_RATE |
| @sentry/node 10.49.0 | Backend error capture needed | Works with Express 5 via setupExpressErrorHandler |
| ESM instrumentation via .mjs | Node --import flag requires ESM | server/instrument.mjs loaded before app |
| Backend Sentry env vars | Separate from frontend VITE_ vars | SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE |
| @sentry/vite-plugin 5.2.0 | Source map upload during CI build | Conditional plugin, deletes maps after upload |
| Hidden source maps | Generate maps without bundling | sourcemap: 'hidden' in vite.config.ts |
| Release format newshub@sha | Git commit traceability | SENTRY_RELEASE: newshub@${{ github.sha }} |
| Environment per deploy job | Distinguish staging/production errors | SENTRY_ENVIRONMENT set in each deploy step |
| prom-client 15.1.3 | Prometheus metrics collection | MetricsService singleton with registry |
| 15s scrape interval | Balance freshness vs overhead | Prometheus scrapes app:3001/metrics |
| Route normalization | Prevent label cardinality explosion | UUID/numeric/ObjectId -> :id in metricsMiddleware |
| 3s dependency timeout | Prevent cascade failures | /readiness checks DB and Redis with timeout |
| HighErrorRate threshold | Alert on 5xx > 1% for 5m | prometheus/alert.rules.yml |
| HighLatency threshold | Alert on p95 > 2s for 5m | prometheus/alert.rules.yml |
| Grafana admin/admin | Default credentials for dev | Change in production |
| k6 JavaScript scripts | No TypeScript build step needed | D-21: JavaScript for k6 simplicity |
| SharedArray for test data | Memory-efficient data sharing | D-03, D-15: Load once, share across VUs |
| 429 marked as expected | Rate limits not counted as failures | D-07: http.expectedStatuses(429) |
| 100 test users seeded | Pre-created verified accounts | D-03: loadtest1-100@example.com |
| Performance thresholds | p95 < 500ms (news), 5s (AI), 300ms (auth) | D-36, D-37, D-38: Baseline validation |
| Manual load test dispatch | workflow_dispatch trigger | D-29: Expensive test, run on demand |
| STAGING_URL secret | CI tests staging only | D-34: Prevent accidental production load |
| GitHub Actions summary | p95, p99, error rate table | D-35: At-a-glance metrics |
| 30-day artifact retention | JSON + HTML reports | D-32: Historical analysis |
| @sendgrid/eventwebhook 8.0.0 | ECDSA signature verification | Official SendGrid package for webhook security |
| express.json verify callback | Raw body preservation | Avoids separate middleware, follows Express patterns |
| 24h webhook idempotency TTL | Match SendGrid retry window | Prevent duplicate event processing |
| react-i18next@17 + i18next@26 | i18n infrastructure for UI | ICU plurals, namespace lazy loading, browser detection |
| 7-day relative date threshold | D-06 hybrid date format | < 7 days: relative ("5 min ago"), >= 7 days: absolute ("Apr 23, 2026") |
| Bidirectional Zustand-i18next sync | Persist language across sessions | useAppStore.subscribe watches language, syncs to i18next on load |
| md: as primary mobile breakpoint | Tablet-first responsive design | Migrated lg: (1024px) to md: (768px) across all components |
| CSS env() safe area variables | Notched device support | --safe-area-top/right/bottom/left from env(safe-area-inset-*) |
| SSR-safe useMediaQuery hook | Server rendering compatibility | typeof window guard with legacy addListener fallback |
| 5-item BottomNav | Mobile primary navigation | Dashboard, Monitor, Events, Bookmarks, Profile per D-01 |
| MobileDrawer full navigation | All nav items in drawer | Full duplication from Sidebar per D-06 |
| Controls in drawer | FocusSelector, FeedManager, LanguageSwitcher | Moved from header to drawer on mobile per D-20 |
| No event stats in drawer | Navigation focus only | Removed stats panel per D-27 |
| Responsive toast position | top-center mobile, bottom-right desktop | Per D-29 |
| Cloudinary fetch mode | On-the-fly image transformation | No upload required, graceful fallback |
| AVIF -> WebP -> JPEG fallback | Modern format support via picture element | D-75: best compression with universal compatibility |
| srcSet 320w/640w/960w/1280w | Responsive image widths | D-73: cover common viewport sizes |
| Priority loading first 3 cards | eager + fetchpriority=high | D-77, D-78: improve LCP |
| URL encoding for Cloudinary | encodeURIComponent on original URL | T-24-05: prevent URL injection |
| SwipeableCard 80px threshold | Swipe-to-bookmark gesture threshold | Claude's discretion from RESEARCH.md |
| Spring animation damping: 20, stiffness: 180 | Natural gesture feel | Per RESEARCH.md line 800 |
| Radio icon for PullToRefresh | Matches NewsHub logo | Per CONTEXT.md Specific Ideas |
| ScrollToTopFAB 500px threshold | Appears after significant scroll | Per D-32 |
| react-simple-pull-to-refresh | Pull-to-refresh library | Installed with --legacy-peer-deps for vite@8 |
| Bot detection via user-agent substring | 10 social crawlers | Twitterbot, facebookexternalhit, LinkedInBot, WhatsApp, TelegramBot, Slackbot, Discordbot, Facebot, Pinterest, Embedly |
| generateOGHtml meta refresh | Human fallback | Redirects humans via meta http-equiv refresh if they receive OG HTML |
| /s/:code route placement | Before SPA fallback | Ensures share routes handled before {*path} catch-all |
| Web Share API primary on mobile | D-07 user decision | Single Share button on mobile; fallback to icon row if API unavailable |
| Platform brand colors | D-03 user decision | Twitter #1DA1F2, LinkedIn #0A66C2, WhatsApp #25D366, Facebook #1877F2 |
| Share2 icon for mobile | Claude discretion | Cleaner design than Share icon |
| MessageCircle for WhatsApp | No official icon | Lucide lacks WhatsApp; MessageCircle with green color is recognizable |
| Fire-and-forget tracking | RESEARCH.md pattern | useShareClick onError only logs; never blocks URL navigation |
| OAuth ID hashing | D-11 security requirement | SHA-256 hash via existing hashToken utility |
| hasPassword field | D-03 OAuth-only accounts | Boolean tracks password vs OAuth-only accounts |
| OAuth emailVerified | D-04 provider trust | OAuth signups auto-verified (provider confirmed email) |
| Password re-auth for linking | D-01 security | linkOAuthAccount requires current password |
| Lockout protection | D-12 UX safety | Cannot unlink only login method |
| Security notifications | Claude discretion | Email on OAuth link/unlink events |
| OAuth routes at /api/auth | D-05 stateless | oauthRoutes registered after authRoutes, same prefix |
| Passport no session | D-05 requirement | passport.initialize() with session:false on all strategies |

## Reports

| Report | Path | Generated |
|--------|------|-----------|
| v1.3 Milestone Summary | .planning/reports/MILESTONE_SUMMARY-v1.3.md | 2026-04-23 |

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-24 — Completed Phase 26-03 Frontend OAuth Components*
