# Research Summary: v1.6 Infrastructure & Scale

**Project:** NewsHub
**Research Date:** 2026-04-26
**Scope:** Docker Swarm horizontal scaling, Advanced AI (credibility/bias/fact-checking), Mobile apps (React Native/Capacitor), Freemium monetization + Developer API, Video/podcast/social content expansion

---

## Executive Summary

NewsHub v1.6 represents a strategic evolution from validated product (10k users, v1.5 production-ready) to scalable platform with AI-enhanced analysis, native mobile apps, monetization infrastructure, and expanded content types. Research across stack, features, architecture, and pitfalls reveals **a low-risk expansion path that reuses existing infrastructure** (PostgreSQL, Redis, multi-provider AI, Docker) while adding horizontal scaling, subscription billing, and mobile distribution channels.

**Key Insight:** The existing monolithic architecture is the RIGHT foundation. Resist premature microservices decomposition. Add Docker Swarm for horizontal scaling (1→N replicas), introduce API gateway layer for developer API, implement signal-based AI credibility scoring, and pursue dual mobile strategy (Capacitor wrapper first for speed, React Native second for native UX if needed).

**Primary Risk:** Cost explosion from video/podcast features. CDN + transcoding can 100x current infrastructure spend ($300/mo → $30k/mo). **Mitigation:** Embed-first strategy (YouTube/Spotify links), upload-only for premium users, aggressive compression, storage quotas.

**Recommended Approach:** Monorepo with pnpm workspaces for code sharing, Docker Swarm for stateless horizontal scaling, Stripe for subscription billing, tiered API rate limiting via Redis, and AI credibility based on aggregated signals (not single-metric scoring). Deploy features incrementally over 6 phases (15 weeks) to validate revenue model before high-cost features.

---

## Key Findings

### From STACK.md: Technology Additions

**Core Infrastructure (Phase 1):**
- **Docker Swarm:** Built into Docker Engine, no new packages. Convert `docker-compose.yml` to `docker-stack.yml` with `deploy.replicas` config
- **Traefik v3.6+:** Reverse proxy with auto-discovery, Let's Encrypt HTTPS, sticky sessions for Socket.IO
- **PgBouncer:** Connection pooler REQUIRED before scaling (10 replicas × 10 connections = 100, exceeds PostgreSQL default max_connections)

**Mobile Platform (Phase 3):**
- **Capacitor v8.3.1+:** Wrap existing React web app for app stores (95% code reuse)
- **React Native with Expo SDK 55 (optional):** True native app if Capacitor UX insufficient (60% code reuse, requires UI rewrite)
- **pnpm workspaces:** Monorepo for shared packages (`@newshub/shared-api`, `@newshub/shared-state`, `@newshub/shared-types`)

**Monetization (Phase 4):**
- **Stripe v22.1.0:** Subscription billing, checkout, webhooks (2.9% + 30¢ per transaction, no monthly fee)
- **swagger-ui-express v5.0.1 + swagger-jsdoc v6.2.8:** Interactive API documentation for developers
- Express-rate-limit (already installed) extended for tiered API limits

**Content Expansion (Phase 6):**
- **node-podcast-parser v2.3.0:** Podcast RSS feed parsing (iTunes extensions support)
- **External APIs:** TranscriptAPI ($0.05/video), ScrapeCreators ($199/mo for social media), Google Fact Check API (free, no quota)
- **Cloudinary Video:** Transcoding + CDN ($99/mo base, scales with usage)

**AI Services (Phase 2):**
- **No new packages:** Extend existing `aiService.ts` multi-provider chain
- **Google Fact Check API:** Free tier for claim verification
- **Custom credibility scoring:** Signal-based aggregation (factuality, bias, fallacies, persuasion techniques)

**Total New npm Packages:** 6 (Stripe, swagger-ui-express, swagger-jsdoc, node-podcast-parser, @capacitor/*, expo)
**Infrastructure Services:** Traefik (Docker image), PgBouncer (container), Cloudinary (SaaS)
**Monthly Cost Estimate:** ~$380 (excluding revenue from subscriptions), break-even at 40 Premium users ($9/mo) or 13 Developer users ($29/mo)

---

### From FEATURES.md: Table Stakes vs Differentiators

**Table Stakes (Must-Have for Credibility):**

| Feature Area | Table Stakes | Complexity |
|--------------|-------------|------------|
| **Credibility Scoring** | 0-100 reliability score, source metadata display, historical accuracy tracking, correction policy indicator | Medium |
| **Bias Detection** | Left-Center-Right spectrum label, source-level bias labels, visual bias indicators | Medium-High |
| **Fact-Checking** | Claim extraction from articles, verification status (true/false/unverified), evidence links | Very High |
| **Mobile Apps** | Native app shell (app store distribution), offline article reading, push notifications, biometric auth | Medium |
| **Freemium Model** | Free tier with clear limitations, premium tier with obvious value, subscription management UI, Stripe integration | Medium |
| **Developer API** | RESTful JSON API, API key authentication, rate limiting by tier, OpenAPI/Swagger documentation | High |
| **Video/Podcast** | Video embeds (YouTube/Vimeo), podcast RSS support, in-app playback controls, transcript display | High |

**Differentiators (Competitive Advantage):**

| Feature Area | Differentiator | Value Proposition | Complexity |
|--------------|----------------|-------------------|------------|
| **Credibility** | Cross-regional bias comparison | Show how same source rates differently across 13 regions | Medium |
| **Bias** | Framing bias detection | Show *how* sources cover same event differently (not just sentiment) | High |
| **Fact-Checking** | Historical claim database | Track how claims evolve/resurface over time (deduplication) | Medium |
| **Mobile** | Hybrid Capacitor + React Native | Best of both: fast to market (Capacitor), native UX for power users (RN) | High |
| **Monetization** | Metered API usage model | Pay-per-use for developers (usage-based pricing) | High |
| **Developer API** | GraphQL endpoint (optional) | Flexible data fetching for advanced integrations | High |
| **Video/Podcast** | AI-generated video summaries | Save users time on long-form content | High |

**Anti-Features (What NOT to Build):**

- Single-metric credibility scoring (oversimplifies complex factors)
- Real-time bias scoring on every request (too expensive at scale)
- Fully automated fact-checking without human review (60%+ error rate)
- Full React Native rewrite (wastes existing web codebase)
- Free unlimited API access (unsustainable, invites abuse)
- Self-hosted video streaming (CDN bandwidth costs 100x text content)

**MVP Recommendations:**
1. **Infrastructure:** Active-passive deployment (single failover), database read replicas, CDN for static assets → defer active-active multi-region
2. **AI:** Source credibility scoring (static + AI-assisted), source-level bias labels, keyword-based claim extraction → defer article-level bias (expensive)
3. **Mobile:** Enhanced PWA with push notifications, Capacitor wrapper (90% code reuse) → defer full React Native (high maintenance)
4. **Monetization:** Simple freemium (Free + Premium), Stripe Checkout + Portal, feature gating → defer metered usage billing (complex tracking)
5. **Content:** Podcast RSS support, YouTube embeds → defer video transcription (expensive at scale), self-hosted video

---

### From ARCHITECTURE.md: Integration Patterns

**Recommended Architecture Decision:** **Layered Monolith + Selective Microservices**

**Monolith Retention (Core API):**
- Express REST API remains monolithic (proven at 10k users)
- Horizontal scaling via Docker Swarm replicas (stateless, shares Redis for sessions)
- No code changes required for Swarm migration (environment-based config only)

**Monorepo Structure (Code Sharing for Mobile):**
```
NewsHub/
├── apps/
│   ├── web/              # Existing Vite app (moved from root)
│   ├── mobile-capacitor/ # Capacitor wrapper (95% code reuse)
│   └── mobile-rn/        # React Native (optional, 60% code reuse)
├── packages/
│   ├── shared-types/     # TypeScript types (100% shared)
│   ├── shared-api/       # TanStack Query hooks, API client (100% shared)
│   ├── shared-state/     # Zustand store (100% shared)
│   └── ui-components/    # Platform-agnostic React components (80% shared)
├── server/               # Express API (unchanged location)
└── pnpm-workspace.yaml
```

**New Layers (v1.6):**

1. **API Gateway Layer (Public API):**
   - `/api/v1/public/*` routes (separate from internal `/api/*`)
   - API key authentication → subscription tier lookup → tiered rate limiting
   - Redis-backed counters for distributed rate limiting
   - Usage logging to `ApiUsage` table (async, non-blocking)

2. **Subscription Management:**
   - Stripe Checkout flow → webhook handler (idempotent) → update `Subscription` model
   - `requireTier()` middleware gates premium endpoints (credibility, bias, fact-check, API access)
   - Webhook events queued for async processing (return 200 within 20s to avoid Stripe timeout)

3. **AI Credibility Service:**
   - **Signal-based scoring:** Aggregate factuality + bias + fallacies + persuasion → overall score (0-100)
   - Reuses existing `AIService` multi-provider fallback (OpenRouter → Gemini → Anthropic)
   - Cache results in Redis (24h TTL, versioned by algorithm)
   - Background job recalculates scores for articles > 7 days old

4. **Media Ingestion Service (Optional Microservice):**
   - Video/podcast RSS parsing → metadata extraction → transcoding queue (Cloudinary)
   - Async pipeline: upload → transcode → webhook callback → generate transcript (Whisper) → summarize (AI)
   - Consider extracting to separate service if CPU-intensive processing impacts API latency

**Data Flow (Before vs After):**

**Before v1.6:**
```
Client → Express App → Business Logic → PostgreSQL/Redis → Response
```

**After v1.6:**
```
Client (Web/Mobile/API)
  ↓
API Gateway (if /api/v1/public)
  ├─ API Key Auth (lookup tier)
  ├─ Tiered Rate Limit (Redis)
  └─ Usage Logging (async)
  ↓
Swarm Load Balancer (routing mesh)
  ↓
Express App Replica (1 of N)
  ├─ Subscription Tier Guard (if protected endpoint)
  └─ Business Logic
  ↓
Services Layer
  ├─ AIService (+ Credibility/Bias/FactCheck methods)
  ├─ MediaIngestionService (video/podcast pipeline)
  └─ TranslationService (existing, unchanged)
  ↓
Data Layer
  ├─ PostgreSQL (Prisma) — NewsArticle, Subscription, ApiKey, MediaContent
  └─ Redis — Rate limits, JWT blacklist, AI cache, session store
  ↓
External Services
  ├─ Stripe (webhooks for subscriptions)
  ├─ Cloudinary (video transcoding)
  ├─ OpenAI/Gemini (AI analysis, Whisper transcription)
  └─ CDN (transcoded video files)
```

**Database Schema Additions:**
- `Subscription` model (userId, tier, status, stripeCustomerId, stripeSubscriptionId)
- `StripeEvent` model (id, type, processed, data) — idempotency tracking
- `ApiKey` model (userId, key hash, tier, customLimits, revokedAt)
- `ApiUsage` model (apiKeyId, endpoint, timestamp, statusCode, responseTime)
- `MediaContent` model (type, sourceUrl, transcodedUrls, transcript, transcodingStatus)
- `NewsArticle` extensions: `credibilityScore`, `biasAnalysis` (JSONB), `factChecks` (JSONB)
- `NewsSource` extensions: `credibilityScore` (0-100), `lastScoreUpdate`

**Build Order (Dependency-Aware, 15 weeks):**

| Phase | Weeks | Components | Why This Order |
|-------|-------|------------|----------------|
| **1. Foundation** | 1-2 | Monorepo setup (pnpm workspaces), API Gateway + rate limiting, API key management | Required for all mobile work (code sharing) and Developer API |
| **2. Monetization** | 3-4 | Subscription schema + Stripe integration, webhook handler (idempotent), tier guards | Monetization unlocks PRO features, gates advanced AI |
| **3. Infrastructure** | 5-6 | Docker Swarm deployment (docker-stack.yml), graceful shutdown, PgBouncer, monitoring | Can be done in parallel with AI work, enables horizontal scaling |
| **4. Advanced AI** | 7-9 | AI Credibility Service (signal aggregation), bias detection, fact-checking (Google API), background scoring job | Depends on subscription tiers (PRO feature), needs API gateway for usage tracking |
| **5. Mobile** | 10-12 | Capacitor wrapper (apps/mobile-capacitor), push notifications, biometric auth, app store submission | Depends on monorepo (Phase 1), reuses all shared packages |
| **6. Content Expansion** | 13-15 | Media pipeline service (MediaContent model), Cloudinary transcoding, Whisper transcription, video/podcast player UI | Independent feature, CPU-heavy (consider microservice extraction) |

**Architecture Decision Records (ADRs):**

1. **Monorepo with pnpm Workspaces:** Most stable 2026 stack, zero config, compatible with existing tooling. (Tradeoff: No built-in task orchestration, add Turborepo later if needed)
2. **Capacitor First, React Native Optional:** 95% code reuse vs 60%, faster MVP, reuses web components. (Tradeoff: Less "native feel" than RN)
3. **Monolith + Optional Microservices:** Keep core monolithic, extract media processing only if CPU-heavy. (Tradeoff: Media processing may slow API if kept in monolith)
4. **Stripe for Billing:** Battle-tested, PCI compliant, webhook infrastructure included. (Tradeoff: 2.9% + 30¢ per transaction)
5. **Redis for Rate Limiting:** Works across Swarm replicas, already deployed. (Tradeoff: Redis dependency, but already required for cache)
6. **Cloudinary for Video Transcoding:** No infrastructure to manage, CDN included, webhook callbacks. (Tradeoff: Cost scales with video volume, consider AWS MediaConvert at scale)

---

### From PITFALLS.md: Critical Risks & Prevention

**CRITICAL Pitfalls (Cause Rewrites/Outages):**

**1. Docker Swarm Volume Strategy Blindness (Phase 1)**
- **Risk:** Local volumes work in Compose, but Swarm reschedules containers to different nodes → data vanishes (PostgreSQL, uploads, metrics)
- **Prevention:**
  - PostgreSQL: Use managed service (RDS, Supabase cloud) OR persistent volumes with node constraints
  - Uploads: Use object storage (S3, Cloudinary) — already using Cloudinary for images
  - Metrics: External Prometheus (cloud) OR NFS-backed volume
  - Audit ALL volume mounts BEFORE Swarm migration

**2. Connection Pool Exhaustion from Horizontal Scaling (Phase 1)**
- **Risk:** 10 replicas × 10 connections/replica = 100 connections, exceeds PostgreSQL max_connections (default 100)
- **Prevention:**
  - Implement **PgBouncer** connection pooler BEFORE scaling replicas
  - Centralized pooling: 1000 client connections → 50 PostgreSQL connections
  - Calculate connection budget: `(replicas × pool_size) + (workers × pool_size) + monitoring (5) < max_connections - 20`
  - Configure Prisma connection pool per replica: 5 connections (with PgBouncer)

**3. Treating Public API Like Internal API (Phase 5)**
- **Risk:** Expose internal database structure directly → cannot refactor schema without breaking customer integrations
- **Prevention:**
  - Create separate `/api/v1/public/*` routes (NEVER expose `/api/news` directly)
  - Add abstraction layer with controlled response schemas (PublicArticle vs NewsArticle Prisma model)
  - Version from day one: `/api/v1/news`, `/api/v2/news`
  - Use deprecation warnings before removing fields (X-Deprecation header)

**4. Free Tier Too Generous, No Conversion Path (Phase 4)**
- **Risk:** Free tier solves all user needs → high engagement, $0 revenue
- **Prevention:**
  - **Free:** 20 articles/day, 5 AI questions/day, 7-day history, no exports, no teams
  - **Premium ($9/mo):** Unlimited articles, unlimited AI, full history, CSV exports, email digests
  - **Team ($29/mo):** Team collaboration, advanced analytics, API access (100 req/day)
  - **API ($99/mo):** Developer API (10k req/day), webhooks, historical data access
  - In-app friction: Hit 20 articles → "Upgrade for unlimited access"
  - NEVER move features from paid → free (trust damage)

**5. AI Credibility Scoring Without Ground Truth (Phase 2)**
- **Risk:** No way to validate accuracy → assign high credibility to propaganda OR low scores to legitimate sources
- **Prevention:**
  - Start with human-validated source ratings (Media Bias/Fact Check, AllSides, NewsGuard)
  - Multi-signal framework: editorial standards, ownership transparency, fact-check track record, professional affiliations
  - Confidence scoring: "80% confidence" not binary credible/not
  - Human oversight loop: flag low-confidence scores for manual review
  - Never display raw scores publicly — use tiers (High/Medium/Low) with explanations
  - Continuous validation: compare AI predictions against fact-check outcomes

**6. Monorepo Without Build Cache Strategy (Phase 3)**
- **Risk:** Every change triggers full rebuild of web + mobile → CI takes 30+ minutes
- **Prevention:**
  - Choose build tool with caching: **Turborepo** (simple) or **Nx** (advanced)
  - Configure remote caching (Turborepo Remote Cache, Nx Cloud, GitHub Actions cache)
  - Define task dependencies in `turbo.json`
  - Separate shared code: `packages/core` (zero UI), `packages/ui-web` (web only), `packages/ui-native` (native only)
  - Do NOT share UI components (different layout paradigms)

**7. Video/Podcast Content Without Storage Cost Model (Phase 6)**
- **Risk:** Monthly CDN bill goes from $500 to $50,000, no revenue model to cover costs
- **Prevention:**
  - **Cost model FIRST:**
    - 10k users, 20% use video (2k users), 5 min video/week/user = 4TB/month storage
    - CDN delivery (3x views): 12TB/month @ $0.02/GB = $240/month
    - Encoding: $0.05/min × 5 min × 2k users × 4 = $2,000/month
    - **Total: $2,240/month (current infra: ~$300/month)**
  - **Feature gating:** Video upload = Premium/Team only, free tier = view only
  - **Content strategy:** Embed YouTube/Spotify links (free), upload only for exclusive content
  - **Revenue model:** Premium required for uploads, API charge per GB delivered

**MODERATE Pitfalls (Fixable but Cause Delays):**

- **Docker Swarm Secrets Migration Without Application Support:** Apps expect `process.env.DATABASE_URL` but secrets mount to `/run/secrets/database_url` → add `_FILE` suffix support
- **Redis Sentinel Without Sentinel-Aware Clients:** Master fails, app doesn't know → update to Sentinel-aware connection config (ioredis, node-redis 4+)
- **PWA Push Notifications Without Update Strategy:** Service worker doesn't auto-update → implement hourly update check + notify user
- **React Native + Capacitor Without App Store Rejection Plan:** Apple rejects WebView wrappers (Guideline 4.2) → differentiate with native UI, biometrics, offline-first, PrivacyInfo.xcprivacy
- **AI Bias Detection Without Continuous Monitoring:** Model drift over time → weekly validation, monthly expert review, quarterly retraining
- **Stripe Migration Without Payment Method Portability Plan:** Saved cards don't transfer → smooth re-entry UX, grace period, incremental migration
- **Public API Rate Limiting Without Tiered Strategy:** Flat 100 req/min for all endpoints → endpoint-based limits (health: 1000/min, AI: 10/min), plan-based quotas
- **AI Fact-Checking With 60%+ Error Rate:** AI cannot reliably fact-check nuanced claims → human oversight mandatory, confidence thresholds (>85%), multi-source verification

**MINOR Pitfalls (Nuisances):**

- **Docker Compose v3 Syntax Assumptions:** Swarm ignores `build:` directive, `depends_on` doesn't wait for readiness → pre-build images, add healthchecks
- **Monorepo Package Dependency Chaos:** Web imports from Native package → strict package architecture, enforce with ESLint
- **Freemium Hard-Coded Feature Flags:** `if (user.plan === 'free')` everywhere → feature flag abstraction (`hasFeature(user, 'export_data')`)
- **Video Content Without Accessibility:** No transcripts/captions → auto-transcription (Whisper), WebVTT captions, keyboard navigation
- **Video Platform Shoehorning Without Content Strategy:** Auto-publish everything → cherry-pick high-value episodes, platform-specific clips, quality over quantity

---

## Implications for Roadmap

### Phase Grouping Recommendations

**Phase 1: Infrastructure Foundation (Weeks 1-2)**
- Monorepo setup (pnpm workspaces)
- API Gateway + rate limiting infrastructure
- API key management (database schema, generation, validation)
- **Rationale:** Code sharing foundation required for all mobile work; API gateway required for Developer API
- **Pitfalls to Avoid:** Monorepo without build cache (add Turborepo), package dependency chaos (strict architecture)
- **Deliverables:** `pnpm-workspace.yaml`, `packages/shared-*`, `server/middleware/apiGateway.ts`, `ApiKey` Prisma model

**Phase 2: Monetization Core (Weeks 3-4)**
- Subscription schema (Prisma models: Subscription, StripeEvent)
- Stripe integration (Checkout, Customer Portal, webhook handler)
- Subscription tier guards (`requireTier()` middleware)
- Billing settings UI
- **Rationale:** Monetization unlocks PRO features, gates advanced AI, validates revenue model before high-cost features
- **Pitfalls to Avoid:** Free tier too generous (define value ladder), payment method portability (migration plan), webhook non-idempotency
- **Deliverables:** Stripe integration, billing UI, `Subscription` model, tiered feature flags

**Phase 3: Horizontal Scaling (Weeks 5-6)**
- Docker Swarm deployment (`docker-stack.yml`)
- PgBouncer connection pooling
- Graceful shutdown for rolling updates
- Traefik reverse proxy (load balancing, HTTPS)
- Health checks for all services
- **Rationale:** Can be done in parallel with AI work, no schema changes, enables 10k → 30k users with 3 replicas
- **Pitfalls to Avoid:** Volume strategy blindness (managed PostgreSQL, object storage), connection pool exhaustion (PgBouncer required), secrets in env vars
- **Deliverables:** `docker-stack.yml`, PgBouncer container, Swarm deployment playbook

**Phase 4: Advanced AI (Weeks 7-9)**
- Extend `AIService` with credibility/bias/fact-check methods
- Implement `CredibilityService` (signal aggregation)
- Add credibility fields to `NewsArticle`/`NewsSource` models
- Background job for scoring (batch process)
- Credibility badges in UI (`SignalCard.tsx` extension)
- Google Fact Check API integration
- **Rationale:** Depends on subscription tiers (PRO feature), needs API gateway for usage tracking
- **Pitfalls to Avoid:** No ground truth (human-validated dataset required), bias amplification (continuous monitoring), 60% AI error rate (human oversight)
- **Research Flags:** Needs deeper research on credibility scoring validation methodology
- **Deliverables:** `CredibilityService`, AI credibility endpoints, background scoring job, UI badges

**Phase 5: Mobile Apps (Weeks 10-12)**
- Capacitor wrapper (`apps/mobile-capacitor`)
- Capacitor plugins (Camera, Push Notifications, Biometrics)
- Platform-specific adjustments (storage, navigation)
- iOS/Android builds
- App Store + Google Play submission
- **Optional:** React Native app (`apps/mobile-rn`) if Capacitor UX insufficient
- **Rationale:** Depends on monorepo (Phase 1), reuses all shared packages, fast to market with Capacitor (95% code reuse)
- **Pitfalls to Avoid:** Build cache strategy (Turborepo), App Store rejection (native features, privacy manifest), PWA update lag (service worker strategy)
- **Deliverables:** Capacitor app, app store listings, push notification support

**Phase 6: Content Expansion (Weeks 13-15)**
- `MediaContent` Prisma model
- `MediaIngestionService` (video/podcast pipeline)
- Cloudinary integration (transcoding)
- Whisper API integration (transcription)
- Video/podcast player UI components
- Podcast RSS source configuration
- **Rationale:** Independent feature, CPU-heavy (consider microservice extraction), deferred to validate monetization first
- **Pitfalls to Avoid:** Storage cost explosion (cost model REQUIRED), no accessibility (auto-transcription), platform shoehorning (content strategy)
- **Deliverables:** Media pipeline service, player UI, podcast/video sources, transcoding infrastructure

### Research Flags for Roadmapper

**Needs Deeper Research During Planning:**

| Phase | Research Topic | Why Needed |
|-------|---------------|------------|
| Phase 1 | PgBouncer vs RDS Proxy vs Supabase Pooler | Trade-offs for managed vs self-hosted connection pooling |
| Phase 2 | Credibility scoring validation dataset | Need human-validated source ratings, cannot rely on AI alone |
| Phase 3 | Docker Swarm vs Kubernetes decision point | Swarm sufficient for v1.6, but at what scale does K8s become necessary? |
| Phase 4 | AI fact-checking accuracy benchmarking | What accuracy threshold is acceptable? 60% too low, 90% unrealistic |
| Phase 5 | React Native vs Capacitor user testing | Which UX gaps exist in Capacitor that justify RN investment? |
| Phase 6 | Video CDN cost modeling | Need usage projections (hours/month, viewers/video) for accurate cost estimates |

**Well-Documented Patterns (Skip Research):**

- Stripe subscription billing (extensive documentation, battle-tested patterns)
- API rate limiting with Redis (standard Express middleware, proven at scale)
- Monorepo with pnpm workspaces (mature tooling, clear best practices)
- Capacitor app store submission (documented approval guidelines)
- Docker Swarm deployment (official Docker documentation, production-ready)

---

## Confidence Assessment

| Research Area | Confidence | Notes |
|---------------|-----------|-------|
| **Stack** | **HIGH** | All versions verified, sources cited, integration paths clear. Docker Swarm, Stripe, Capacitor, pnpm are production-ready 2026 technologies. |
| **Features** | **MEDIUM-HIGH** | Table stakes well-defined (industry standards), differentiators validated by research. Anti-features prevent common mistakes. MVP recommendations based on complexity vs value matrix. |
| **Architecture** | **MEDIUM** | Build order is dependency-aware, but PgBouncer vs managed pooler decision needs validation. Microservice extraction point for media pipeline unclear (CPU profiling needed). |
| **Pitfalls** | **HIGH** | Critical pitfalls backed by production incident reports and research papers. Prevention strategies concrete and actionable. Phase-specific warnings align with build order. |

### Gaps to Address During Planning

1. **Connection Pooling Strategy:** PgBouncer (self-hosted) vs RDS Proxy (AWS-only) vs Supabase Pooler (managed)? Need cost/complexity comparison.

2. **Credibility Scoring Validation:** Where to source ground truth data? Media Bias/Fact Check API ($$$), AllSides (manual scraping), NewsGuard ($$$), or manual expert panel?

3. **Video Content Scope:** Embed-only (free) vs upload-enabled (complex)? Cost model assumes 2k users upload 5 min/week — needs user research validation.

4. **Mobile App Priority:** Capacitor wrapper is low-risk MVP, but does it meet user expectations? Need UX testing to validate before investing in React Native.

5. **AI Fact-Checking Accuracy:** 60% baseline error rate (research-backed) — what threshold is acceptable for v1.6? 70%? 80%? Requires user trust research.

6. **Freemium Tier Limits:** 20 articles/day, 5 AI questions/day — are these the right numbers? Need conversion rate benchmarks from similar news platforms.

### Source Quality Summary

**STACK.md Sources:**
- Official documentation (Docker, Stripe, Expo, Capacitor)
- Production deployment guides (Better Stack, Reintech)
- Technology comparison articles (PKG Pulse, Digital Applied)
- **Quality:** Excellent (direct from vendors, recent 2026 content)

**FEATURES.md Sources:**
- Academic research (arXiv, Nature, PMC)
- Industry analysis (Deloitte, RevenueCat, Kong)
- Technology news (TechCrunch derivatives, industry blogs)
- **Quality:** Good (mix of peer-reviewed and industry reports)

**ARCHITECTURE.md Sources:**
- Technical blogs (Medium, Dev.to, LinkedIn)
- Official documentation (Stripe, Docker)
- Architecture guides (Better Stack, OneUptime)
- **Quality:** Good (practitioner-focused, production-tested patterns)

**PITFALLS.md Sources:**
- Incident reports (production outage case studies)
- Policy documentation (Apple App Store guidelines)
- Research papers (AI bias, fact-checking accuracy)
- Migration guides (Docker Swarm, Stripe)
- **Quality:** Excellent (real-world failures, compliance requirements)

---

## Ready for Roadmap Creation

**Synthesis complete.** All four research files analyzed, findings integrated, dependencies mapped, risks identified, and phase structure recommended. Roadmapper agent can proceed with confidence to structure v1.6 implementation roadmap.

**Key Handoff Points for Roadmapper:**

1. **Use 6-phase structure** (15 weeks total) recommended in Build Order section
2. **Prioritize monetization before high-cost features** (Phase 2 before Phase 6) to validate revenue model
3. **Flag Phase 4 (AI Credibility) for deeper research** on validation dataset sourcing
4. **Add cost modeling task to Phase 6** before video/podcast implementation
5. **Reference Critical Pitfalls section** for each phase's risk mitigation checklist
6. **Validate free tier limits** (20 articles/day, 5 AI questions/day) with user research before implementation

**Next Step:** Roadmapper agent creates `.planning/ROADMAP.md` with detailed phase breakdown, timeline, and dependencies.

---

**Research completed:** 2026-04-26
**Confidence:** HIGH (Stack, Pitfalls), MEDIUM-HIGH (Features, Architecture)
**Total sources cited:** 90+ across four research files
