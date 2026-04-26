---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Infrastructure & Scale
current_plan: 36-03
status: In progress
last_updated: "2026-04-26T16:07:12Z"
last_activity: 2026-04-26 — Phase 36 Plan 03 complete (feature gating middleware + Premium benefits)
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 10
  completed_plans: 8
  percent: 80
---

# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** v1.6 Infrastructure & Scale

## Current Position

Phase: 36 - Monetization Core
Current Plan: 36-03 (complete)
Status: In progress
Last activity: 2026-04-26 — Phase 36 Plan 03 complete (feature gating + Premium benefits)

```
v1.6 Progress: [████████████████----] 80% (6 phases, 1 complete, 8/10 plans done)
```

## Milestone Progress

**Milestone:** v1.6 - Infrastructure & Scale
**Goal:** Comprehensive expansion across infrastructure, AI, mobile, monetization, and content
**Status:** Roadmap ready
**Previous:** v1.5 complete 2026-04-26

### Phase Summary

| Phase | Name | Requirements | UI | Status |
|-------|------|--------------|-----|--------|
| 35 | Infrastructure Foundation | 4 reqs (INFRA-01 partial, PAY-08, PAY-09, PAY-10) | No | **Complete** (5/5 plans) |
| 36 | Monetization Core | 7 reqs (PAY-01 to PAY-07) | Yes | **In Progress** (3/5 plans) |
| 37 | Horizontal Scaling | 5 reqs (INFRA-01 to INFRA-05) | No | Not started |
| 38 | Advanced AI Features | 7 reqs (AI-01 to AI-07) | Yes | Not started |
| 39 | Mobile Apps | 8 reqs (MOB-01 to MOB-08) | Yes | Not started |
| 40 | Content Expansion | 7 reqs (CONT-01 to CONT-07) | Yes | Not started |

**Coverage:** 37/37 requirements mapped (100%)

**Next step:** `/gsd-execute-phase 35`

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

**Last action:** Phase 36 Plan 03 complete (feature gating middleware + Premium benefits)
**Next step:** Continue with Phase 36 Plan 04 (Pricing Page UI)
**Resume file:** None
**Checkpoint:** None

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

v1.6 Architecture Decisions (from research):

- **Monorepo:** pnpm workspaces for code sharing (web + mobile)
- **Monetization:** Stripe v22.1.0 for subscription billing
- **Scaling:** Docker Swarm + Traefik + PgBouncer (not Kubernetes yet)
- **Mobile:** Capacitor first (95% code reuse), React Native optional
- **Content:** Embed-first strategy (YouTube/Spotify), upload = Premium only

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
| Team name 3-50 chars | Claude discretion | Balanced brevity and descriptiveness |
| Max 10 teams per user | Claude discretion | Prevents abuse while allowing flexibility |
| Soft limit 50 members | Claude discretion | Warning log only, no hard block |
| 7-day invite expiry | D-02 requirement | Matches existing token patterns |
| Soft delete teams | Claude discretion | deletedAt field, 7-day grace period |
| Same error for member/invite | T-28-04 mitigation | Prevents user enumeration |
| Prisma event-based query logging | Phase 29 Plan 02 | emit: 'event' for programmatic access to QueryEvent |
| Query logging disabled in production | Performance and security | NODE_ENV !== 'production' gate |
| 100ms slow query threshold | Balance visibility and noise | console.warn for >100ms queries |
| 200-char param truncation | Log readability | Prevents massive param dumps in console |
| Lighthouse CI master-only execution | Phase 29 Plan 03 | Runs after deploy-staging on master branch only |
| 90+ category score thresholds | Phase 29 Plan 03 | Performance, accessibility, best-practices, SEO all require 90+ |
| Core Web Vitals warn-level | Phase 29 Plan 03 | LCP < 2s, CLS < 0.05, INP < 150ms, FCP < 1.5s tracked without blocking |
| Staging health check 5min timeout | Phase 29 Plan 03 | 30 attempts x 10s before running Lighthouse |
| 30-day Lighthouse artifact retention | Phase 29 Plan 03 | Balance historical analysis with storage costs |
| Temporary public storage for reports | Phase 29 Plan 03 | Free 7-day retention with shareable report links |
| Performance baseline TBD placeholders | Phase 29 Plan 03 | Populated after first CI run with actual metrics |
| Exponential backoff 1s, 2s, 4s | Phase 30 Plan 01 | Balance retry speed vs server load for chunk loading |
| Clear promise cache on retry | Phase 30 Plan 01 | Browser caches failed imports; must reset for fresh attempt |
| French critical strings included | Phase 30 Plan 01 | Project supports DE/EN/FR per i18n foundation |
| Dashboard lazy-loaded | Phase 30 Plan 02 | Was sync import, now uses lazyWithRetry for bundle size |
| routePreloaders map | Phase 30 Plan 02 | Centralized preload functions for hover prefetch |
| 150ms hover prefetch delay | Phase 30 Plan 02 | Filter accidental hovers per D-04 |
| NavLinkPrefetch in nav components | Phase 30 Plan 03 | Sidebar main nav + profile, BottomNav all items |
| Privacy link uses NavLink | Phase 30 Plan 03 | Low priority legal page, no prefetch benefit |
| Dashboard shell + lazy NewsFeed | Phase 30 Plan 04 | Suspense with DashboardSkeleton for immediate visual feedback |
| Skeleton over critical CSS | Phase 30 Plan 04 | animate-pulse skeleton achieves same effect without build complexity |
| NewsCardPremium lazy images | Phase 30 Plan 04 | Added loading="lazy" decoding="async" to motion.img |
| CI bundle-size warning step | Phase 30 Plan 04 | 250KB threshold, ::warning:: annotation, warn-only (no exit 1) |
| @tanstack/react-virtual@3.13.24 | Phase 31 Plan 01 | Headless virtualization, same TanStack family as react-query |
| --legacy-peer-deps for install | Phase 31 Plan 01 | vite-plugin-pwa peer conflict with vite@8 |
| 400px estimated row height | Phase 31 Plan 01 | Starting estimate with measureElement for dynamic adjustment |
| 5-item overscan | Phase 31 Plan 01 | Balance between smoothness and DOM node count |
| Responsive grid columns | Phase 31 Plan 01 | 3 desktop (1024px+), 2 tablet (768px+), 1 mobile |
| CSS fade-in 200ms | Phase 31 Plan 02 | Replace framer-motion stagger with lightweight CSS |
| prefers-reduced-motion fallback | Phase 31 Plan 02 | Disable animation for accessibility users |
| Keep SignalCard index prop | Phase 31 Plan 02 | Backward compatibility with callers |
| Arrow key null start at 0 | Phase 31 CR-fix | ArrowDown/Right from null focusedIndex starts at index 0 |
| ArrowUp/Left from null = noop | Phase 31 CR-fix | No action when no selection exists |
| Removed screen reader sniffing | Phase 31 CR-fix | Rely solely on prefers-reduced-motion, not UA detection |
| DEV-only console.error | Phase 31 CR-fix | Wrap share errors in import.meta.env.DEV check |
| MD5 16-char hash for ETags | Phase 33-02 | Fast generation, sufficient collision resistance for cache validation |
| Cross-platform /assets/ path check | Phase 33-02 | Windows uses backslash, Unix uses forward slash |
| 10% TTL jitter variance | Phase 33-01 | baseTTL * (0.9 + random * 0.2) prevents thundering herd |
| Fire-and-forget cache invalidation | Phase 33-01 | void prefix on delPattern/del calls; don't block broadcasts |
| AsyncLocalStorage for query counting | Phase 34-01 | Request-scoped state without race conditions |
| >5 queries N+1 warning threshold | Phase 34-01 D-08 | Balances sensitivity vs noise |
| Development-only query counter | Phase 34-01 D-08 | NODE_ENV !== 'production' guard for zero production overhead |
| Pool metrics via adapter internals | Phase 34-02 D-14 | getPoolStats attempts pool access with null fallback |
| 10-second pool metrics interval | Phase 34-02 D-14 | Matches WebSocket metrics collection pattern |
| Composite index [showOnLeaderboard, emailVerified] | Phase 34-03 D-05 | Leaderboard query optimization per audit findings |
| Partial index idx_team_active | Phase 34-03 D-06 | WHERE deletedAt IS NULL for active teams filter |
| Standard CREATE INDEX in DO block | Phase 34-03 | CONCURRENTLY cannot run in transaction; documented production workaround |
| pnpm workspaces apps/packages layout | Phase 35-01 D-01 | Standard monorepo structure for code sharing |
| Source-only TypeScript exports | Phase 35-01 D-04 | No build step for packages; apps consume .ts directly |
| tsconfig.base.json extends pattern | Phase 35-01 | Shared TypeScript config inherited by all packages |
| API key format nh_{env}_{random}_{checksum} | Phase 35-02 D-06 | Stripe-inspired format for developer familiarity |
| bcrypt factor 10 for API key hashing | Phase 35-02 | Consistent with password hashing pattern |
| Max 3 keys per user | Phase 35-02 D-10 | Prevents rate limit bypass via key multiplication |
| Checksum pre-validation | Phase 35-02 T-35-08 | SHA-256 checksum prevents invalid DB lookups |
| Code-first OpenAPI with zod-to-openapi | Phase 35-03 D-10 | Single source of truth: Zod schemas define runtime validation and API docs |
| X-API-Key header authentication | Phase 35-03 D-06 | Standard API key header per OpenAPI security scheme |
| IETF RateLimit-* headers | Phase 35-03 D-13 | standardHeaders: true for RateLimit-Limit, Remaining, Reset |
| 5-min Redis cache for validated keys | Phase 35-03 T-35-10 | Cache only first 15 chars as key identifier (security) |
| Key by API key ID, not IP | Phase 35-03 | NAT/VPN friendly rate limiting |
| Fire-and-forget usage tracking | Phase 35-03 | Never block requests for analytics |
| @scalar/api-reference-react 0.9.27 | Phase 35-04 | Plan specified unavailable 1.52.6; installed latest |
| API key routes at /api/keys | Phase 35-04 | Self-service key management separate from public API |
| DevelopersPage lazy-loaded | Phase 35-04 | Uses lazyWithRetry with preload support |
| Playwright request context for API testing | Phase 35-05 | Direct API testing without browser overhead |
| Fresh API keys per rate limit test | Phase 35-05 | Test isolation prevents pollution between runs |
| stripe@22.1.0 | Phase 36-01 | Official Stripe Node.js SDK for subscription billing |
| Stripe API version 2024-12-18.acacia | Phase 36-01 | Pin API version for stability |
| FREE tier: 10 AI queries/day | Phase 36-01 | Per CONTEXT.md Feature Gating table |
| FREE tier: 7-day history limit | Phase 36-01 | Per CONTEXT.md Feature Gating table |
| 5-min subscription cache TTL | Phase 36-01 | CACHE_TTL.MEDIUM for subscription status |
| Graceful Stripe degradation | Phase 36-01 | Service unavailable when STRIPE_SECRET_KEY not set |
| Webhook route before express.json() | Phase 36-02 | Raw body required for HMAC signature verification |
| 24h webhook idempotency TTL (Stripe) | Phase 36-02 | Redis+DB dual storage per CONTEXT.md |
| Return 200 on processing errors | Phase 36-02 | Prevent Stripe retries; idempotency already recorded |
| Price ID whitelist validation | Phase 36-02 | T-36-06 mitigation prevents arbitrary price injection |
| PAST_DUE allows access | Phase 36-03 | 7-day grace period per CONTEXT.md |
| CANCELED/PAUSED blocks Premium | Phase 36-03 | Returns 403 with upgradeUrl |
| requireTier middleware pattern | Phase 36-03 | Factory returns tier-enforcing middleware |
| attachUserTier for soft gating | Phase 36-03 | Attaches tier without blocking access |
| aiTierLimiter 24h window | Phase 36-03 | Daily limit tracking for FREE tier |
| History max entries by tier | Phase 36-03 | FREE: 100, PREMIUM: 1000 |

## Reports

| Report | Path | Generated |
|--------|------|-----------|
| v1.3 Milestone Summary | .planning/reports/MILESTONE_SUMMARY-v1.3.md | 2026-04-23 |

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-26 — Phase 36 Plan 03 complete (feature gating middleware + Premium benefits)*
