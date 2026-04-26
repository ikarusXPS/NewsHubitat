# Domain Pitfalls: v1.6 Infrastructure & Scale

**Domain:** Adding infrastructure scaling, advanced AI, mobile platforms, monetization, and content expansion to existing production system
**Researched:** 2026-04-26
**Context:** NewsHub v1.5 (10k concurrent users, PostgreSQL + Redis + Docker Compose, existing multi-provider AI)

---

## Critical Pitfalls

Mistakes that cause rewrites, outages, or major issues.

### Pitfall 1: Docker Swarm Volume Strategy Blindness
**What goes wrong:** Local volumes work fine in Compose, but when Swarm reschedules containers to different nodes, data vanishes. Databases lose state, uploads disappear, and monitoring fails.

**Why it happens:** Teams assume Swarm automatically handles storage the way Compose does with local volumes. It doesn't.

**Consequences:**
- PostgreSQL data loss if master node fails
- User uploads (avatars, exports) lost when containers move nodes
- Prometheus/Grafana metrics reset on reschedule
- Session data inconsistency across nodes

**Prevention:**
1. Audit all volume mounts BEFORE migrating to Swarm
2. Plan storage strategy: NFS, GlusterFS, or managed volume plugins (Portworx, StorageOS)
3. For databases: use managed services (RDS, Supabase cloud) or persistent volumes with node constraints
4. For uploads: use object storage (S3, Cloudinary) - already using Cloudinary for images, extend to user exports
5. For metrics: external Prometheus (cloud) or NFS-backed volume

**Detection:**
- Container restarts on different node = data missing
- Database connection errors after node changes
- Upload URLs return 404 after redeployment

**Phase:** Phase 1 (Infrastructure Planning) - must address before Swarm migration

---

### Pitfall 2: Connection Pool Exhaustion from Horizontal Scaling
**What goes wrong:** Scaling from 1 to 10 Express replicas multiplies database connections 10x. PostgreSQL max_connections (default 100) gets exhausted. New requests hang, timeout, or fail.

**Why it happens:** Each Express instance has its own connection pool (Prisma default: 10 connections). 10 replicas = 100 connections. Add monitoring, background workers, and you've exceeded PostgreSQL capacity.

**Consequences:**
- 503 errors under load despite healthy containers
- Increased latency as requests queue for connections
- Database performance degradation from connection churn
- False alarms: looks like DB failure, actually connection exhaustion

**Prevention:**
1. Implement PgBouncer connection pooler BEFORE scaling replicas
   - Centralized pooling: 1000 client connections → 50 PostgreSQL connections
   - Transaction mode for stateless API, session mode for migrations
2. Calculate connection budget:
   ```
   Total connections needed = (replicas × pool_size) + (workers × pool_size) + monitoring (5)
   PostgreSQL max = CPU cores × 4 (safe limit)
   ```
3. Configure Prisma connection pool per replica:
   - Production: 5 connections per replica (with PgBouncer)
   - Without PgBouncer: replicas × 5 must be < max_connections - 20 (reserved)
4. Monitor pool metrics (already in place from Phase 34)
5. Set connection_limit in DATABASE_URL

**Detection:**
- Prisma error: "Can't reach database server"
- PostgreSQL logs: "FATAL: remaining connection slots reserved"
- Pool wait time > 100ms (Grafana dashboard alert)

**Phase:** Phase 1 (Infrastructure Planning) - implement PgBouncer before Swarm replicas

---

### Pitfall 3: Treating Public API Like Internal API
**What goes wrong:** Expose internal database structure directly in public API. Later you need to refactor schema or rename fields. Breaking changes silently break customer integrations you didn't know existed.

**Why it happens:** Internal API and public API treated as identical. "We'll just expose `/api/news` publicly with API keys."

**Consequences:**
- Database becomes your contract - can't change schema without versioning
- Internal refactoring blocked by external compatibility
- No abstraction layer = direct table exposure
- Breaking changes discovered only when customers complain
- Support overhead from undocumented field changes

**Prevention:**
1. Create separate `/api/v1/public/*` routes (NEVER expose `/api/news` directly)
2. Add abstraction layer with controlled response schemas:
   ```typescript
   // BAD: Direct database exposure
   return prisma.newsArticle.findMany()

   // GOOD: Public API schema
   return articles.map(a => ({
     id: a.id,
     title: a.title,
     published_at: a.publishedAt,  // Different naming
     source: { name: a.source.name },  // Nested, not sourceId
     // Internal fields NOT exposed: internalNotes, processingMetadata
   }))
   ```
3. Version from day one: `/api/v1/news`, `/api/v2/news`
4. Document public fields as immutable contracts
5. Use separate TypeScript types: `PublicArticle` vs `NewsArticle` (Prisma model)
6. Add deprecation warnings before removing fields (X-Deprecation header)

**Detection:**
- Schema migration blocked by "can't change this field, it's in the API"
- Customer support tickets about field changes
- Internal refactoring requires API versioning discussion

**Phase:** Phase 5 (Developer API) - design before implementing

---

### Pitfall 4: Free Tier Too Generous, No Conversion Path
**What goes wrong:** Free tier solves all user needs. Users sign up, love the product, never upgrade. Revenue = $0 despite high engagement.

**Why it happens:** Fear of losing users leads to giving away premium features. "Just one more feature in free tier to boost signups."

**Consequences:**
- Tons of new users, few paying customers
- Infrastructure costs scale with users, revenue doesn't
- Cannot reduce free tier without backlash and churn
- Support burden from free users drains resources
- Impossible to justify premium features when free is complete

**Prevention:**
1. Define value ladder BEFORE implementing billing:
   - **Free:** 20 articles/day, 5 AI questions/day, 7-day history, no exports, no teams
   - **Premium ($9/mo):** Unlimited articles, unlimited AI, full history, CSV exports, email digests, priority support
   - **Team ($29/mo):** Team collaboration, advanced analytics, API access (100 req/day), custom feeds
   - **API ($99/mo):** Developer API (10k req/day), webhooks, historical data access
2. Free tier must create "aha moment" but leave premium value clear
3. In-app friction points that highlight premium:
   - Hit 20 articles → "Upgrade for unlimited access"
   - Try to export → "Premium feature" with upgrade CTA
   - 8th AI question → "Upgrade for unlimited AI insights"
4. Track upgrade trigger metrics: which limits cause conversions
5. NEVER move features from paid → free (trust damage)
6. NEVER move features from free → paid without grandfather clause

**Detection:**
- Free tier signup rate high, upgrade rate < 2%
- Support load from free users > revenue from paid
- Feature requests all solvable within free tier

**Phase:** Phase 4 (Freemium Model) - design tiers before implementation

---

### Pitfall 5: AI Credibility Scoring Without Ground Truth
**What goes wrong:** Build credibility scoring system, but have no way to validate if scores are accurate. Assign high credibility to propaganda sites or low scores to legitimate news. Users lose trust.

**Why it happens:** Assume AI can determine credibility without human-validated training data. "Let's use sentiment + keyword analysis to score sources."

**Consequences:**
- Incorrect credibility scores damage platform reputation
- Bias amplification: training data bias becomes system bias
- False positives: legitimate sources flagged as unreliable
- False negatives: propaganda sources rated as credible
- Legal risk: defamation claims if scores are public
- Algorithmic opacity: users don't understand why scores assigned

**Prevention:**
1. Start with human-validated source ratings:
   - Use existing datasets: Media Bias/Fact Check, AllSides, NewsGuard
   - Manual review of top 50 sources before algorithmic expansion
   - Expert panel review for controversial sources
2. Multi-signal credibility framework (not just AI):
   - Editorial standards (masthead, corrections policy, bylines)
   - Ownership transparency (independent, state-owned, corporate)
   - Fact-check track record (corrections issued, retractions)
   - Professional affiliations (press councils, journalism awards)
   - Cross-reference verification (claims matched by peer sources)
   - Historical accuracy (track corrections over time)
3. Confidence scoring: "80% confidence" not binary credible/not
4. Transparency requirements:
   - Show which signals contributed to score
   - Allow source owners to contest scores (appeal process)
   - Display methodology publicly
5. Human oversight loop:
   - Flag low-confidence scores for manual review
   - Weekly audit of score changes
   - Quarterly expert panel review
6. Never display raw scores publicly - use tiers (High/Medium/Low) with explanations
7. Continuous validation: compare AI predictions against fact-check outcomes

**Detection:**
- User reports: "Why is [legitimate source] rated low?"
- Source complaints about unfair scoring
- Scores don't correlate with fact-check databases
- Outlier scores on politically sensitive topics

**Phase:** Phase 2 (AI Credibility) - validation framework required before scoring

---

### Pitfall 6: Monorepo Without Build Cache Strategy
**What goes wrong:** Add React Native alongside React web in monorepo. Every change triggers full rebuild of both apps. CI takes 30+ minutes. Developer iteration slows to a crawl.

**Why it happens:** Focus on code sharing benefits, ignore build performance implications. Assume tools handle caching automatically.

**Consequences:**
- CI pipeline timeout (GitHub Actions 60min limit)
- Developer frustration: 5min builds for one-line change
- Cannot use watch mode effectively
- Merge conflicts in lockfiles
- Deployment delays

**Prevention:**
1. Choose build tool with caching: **Turborepo** (simple) or **Nx** (advanced)
2. Configure remote caching:
   - Turborepo Remote Cache (Vercel, self-hosted)
   - Nx Cloud (distributed task execution)
   - GitHub Actions cache for dependencies
3. Define task dependencies:
   ```json
   // turbo.json
   {
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": ["dist/**", ".next/**"]
       },
       "test": {
         "dependsOn": ["build"],
         "cache": true
       }
     }
   }
   ```
4. Separate shared code properly:
   - `packages/core` - business logic (zero UI)
   - `packages/ui-web` - React web components
   - `packages/ui-native` - React Native components
   - `apps/web` - Vite app
   - `apps/mobile` - React Native app
5. Platform-specific extensions: `.web.tsx`, `.native.tsx`
6. Do NOT share UI components (different layout paradigms)
7. DO share: API client, state management, types, utilities

**Detection:**
- CI build time > 10 minutes for small changes
- Local dev server startup > 30 seconds
- Build cache misses on unchanged code
- Frequent "out of memory" errors in CI

**Phase:** Phase 3 (React Native Foundation) - before adding native app

---

### Pitfall 7: Video/Podcast Content Without Storage Cost Model
**What goes wrong:** Add video and podcast features. Users upload hours of content. Monthly CDN bill goes from $500 to $50,000. No revenue model to cover costs.

**Why it happens:** Excitement about new content types overshadows infrastructure costs. "Let's just add video support."

**Consequences:**
- Unsustainable CDN costs ($0.01-0.08/GB, 1M viewers = $10-50k/month)
- Storage costs explode (video: 100MB/min, podcast: 1MB/min)
- Bandwidth consumption 100x text content
- Cannot remove feature without user backlash
- Forced to add paywalls retroactively

**Prevention:**
1. **Cost model BEFORE implementation:**
   ```
   Assumptions:
   - 10k active users
   - 20% use video (2k users)
   - Average: 5 min video/week/user
   - 100MB/min @ 1080p = 500MB/user/week
   - 2k users × 500MB × 4 weeks = 4TB/month storage
   - CDN delivery (3x views): 12TB/month @ $0.02/GB = $240/month
   - Encoding costs: $0.05/min × 5 min × 2k users × 4 = $2,000/month
   ```
   Total: $2,240/month for video alone (current total infra: ~$300/month)

2. **Cost optimization strategies:**
   - Use tiered storage: S3 Standard → Glacier for old content
   - Adaptive bitrate: serve 720p to mobile, 1080p to desktop
   - Compression: AV1 codec (30-50% savings vs H.264)
   - Multi-CDN: route to cheapest provider per region
   - Cache hit ratio target: 95%+ (reduce origin fetches)

3. **Feature gating:**
   - Video/podcast upload: Premium/Team plans only
   - Free tier: view only, no upload
   - Storage quotas: 10 videos/month (Premium), unlimited (Team)
   - Auto-delete after 90 days unless saved

4. **Content strategy:**
   - Don't host everything: embed YouTube/Spotify links (free)
   - Upload only when necessary: exclusive content, analysis clips
   - Prioritize: short analysis clips (1-2 min) over full podcasts
   - User-generated content: prohibit initially, add later with quotas

5. **Revenue model:**
   - Premium required for uploads
   - API access: charge per GB delivered
   - Sponsorship: offset costs with ads on video content

**Detection:**
- CDN bill spike month-over-month
- Storage growth outpaces user growth
- Video delivery costs > subscription revenue
- Support tickets: "Why is my video slow?" (bandwidth throttling)

**Phase:** Phase 6 (Video/Podcast) - cost model required before design

---

## Moderate Pitfalls

Fixable but cause delays or technical debt.

### Pitfall 8: Docker Swarm Secrets Migration Without Application Support
**What goes wrong:** Migrate environment variables to Docker Swarm secrets. Applications expect `process.env.DATABASE_URL` but secrets mount to `/run/secrets/database_url`. Apps fail to start.

**Why it happens:** Assume Swarm automatically converts secrets to environment variables. It doesn't.

**Prevention:**
1. Audit application secret access patterns BEFORE Swarm
2. Modify applications to support `_FILE` suffix:
   ```typescript
   // OLD: Direct env var
   const dbUrl = process.env.DATABASE_URL

   // NEW: Support both env var and file
   const dbUrl = process.env.DATABASE_URL_FILE
     ? fs.readFileSync(process.env.DATABASE_URL_FILE, 'utf8').trim()
     : process.env.DATABASE_URL
   ```
3. Update Docker Compose:
   ```yaml
   services:
     api:
       secrets:
         - database_url
       environment:
         DATABASE_URL_FILE: /run/secrets/database_url
   ```
4. Create migration plan:
   - Phase 1: Add `_FILE` support alongside env vars
   - Phase 2: Deploy with dual support
   - Phase 3: Switch to secrets in production
   - Phase 4: Remove env var fallback
5. Secrets are immutable: rotation requires new secret + service update
6. Apply least privilege: each service gets only its secrets

**Detection:**
- Container startup failures after Swarm migration
- Logs: "DATABASE_URL is undefined"
- Secrets visible in `docker inspect` (using env vars not secrets)

**Phase:** Phase 1 (Infrastructure Planning) - before Swarm migration

---

### Pitfall 9: Redis Sentinel Without Sentinel-Aware Clients
**What goes wrong:** Deploy Redis Sentinel for high availability. Application uses standard Redis client, connects directly to master. Master fails, Sentinel promotes replica, but app doesn't know and keeps trying old master.

**Why it happens:** Assume Sentinel handles failover transparently. It doesn't for non-aware clients.

**Prevention:**
1. Check if Redis client supports Sentinel (ioredis: YES, node-redis 4+: YES)
2. Update connection config:
   ```typescript
   // OLD: Direct connection
   const redis = new Redis({
     host: 'redis',
     port: 6379
   })

   // NEW: Sentinel-aware
   const redis = new Redis({
     sentinels: [
       { host: 'sentinel-1', port: 26379 },
       { host: 'sentinel-2', port: 26379 },
       { host: 'sentinel-3', port: 26379 }
     ],
     name: 'mymaster',  // Sentinel monitor name
     sentinelPassword: process.env.SENTINEL_PASSWORD
   })
   ```
3. Deploy at least 3 Sentinel instances (quorum: 2)
4. Set conservative `down-after-milliseconds` (30000ms) to avoid flapping
5. Configure `min-replicas-to-write: 1` to prevent split-brain data loss
6. Monitor Sentinel logs for failover events
7. Test failover manually before production

**Detection:**
- Application errors after Redis master failure
- Clients stuck on old master IP
- Sentinel logs show promotion, app logs show connection errors
- Failover doesn't trigger automatic reconnection

**Phase:** Phase 1 (Infrastructure Planning) - if adding Redis Sentinel

---

### Pitfall 10: PWA Push Notifications Without Update Strategy
**What goes wrong:** Implement push notifications, but service worker doesn't update. Critical notification bug deployed, users stuck on old version for days. Notification delivery fails.

**Why it happens:** Service workers don't auto-update like web pages. Default update check happens on navigation, but PWA users don't navigate away.

**Prevention:**
1. Implement update check strategy:
   ```typescript
   // Check for updates every hour (while app open)
   setInterval(() => {
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.getRegistration().then(reg => {
         reg?.update()
       })
     }
   }, 60 * 60 * 1000)
   ```
2. Notify user when update available:
   ```typescript
   // In service worker
   self.addEventListener('install', (event) => {
     // Skip waiting to activate immediately
     self.skipWaiting()
   })

   // In app
   navigator.serviceWorker.addEventListener('controllerchange', () => {
     // New service worker activated
     showUpdateNotification('New version available. Reload?')
   })
   ```
3. Don't block rendering waiting for update check (harms Core Web Vitals)
4. Validate push subscription endpoints regularly (monthly)
5. Test notification flow on multiple browsers (behavior varies)
6. Handle expired subscriptions gracefully (remove from DB)
7. Implement retry logic for failed notifications

**Detection:**
- Users report not receiving notifications
- High unsubscribe rate after notification feature deployment
- Service worker version stuck on old build number
- Push endpoint errors (410 Gone) not cleaned up

**Phase:** Phase 3 (PWA Enhancement) - before push notifications

---

### Pitfall 11: React Native + Capacitor Without App Store Rejection Plan
**What goes wrong:** Build React Native app with Capacitor, submit to App Store. Rejected under Guideline 4.2 (WebView wrapper). Weeks of delay, redesign required.

**Why it happens:** Capacitor apps are web apps in native shell. Apple rejects if indistinguishable from Safari.

**Prevention:**
1. **Differentiate from web version:**
   - Native navigation (bottom tabs, gestures)
   - Platform-specific UI (iOS: Cupertino, Android: Material)
   - Native features: Face ID, biometrics, share sheet
   - Offline-first: full functionality without network
   - Push notifications (not web push)
2. **Privacy compliance:**
   - Include PrivacyInfo.xcprivacy (required since May 2024)
   - Privacy manifest for ALL third-party SDKs
   - Generate privacy report in Xcode before submission
3. **OTA update restrictions:**
   - ONLY update JavaScript/CSS/HTML (35% rejections from native code in OTA)
   - Do NOT add unreviewed features via OTA
   - Use encrypted update channels
4. **Metadata accuracy:**
   - Screenshots from actual app, not web version
   - Description matches app functionality
   - Keywords relevant to mobile experience
5. **Testing:**
   - Test on actual devices (not just simulator)
   - Verify app works identically offline
   - Ensure native UI patterns used

**Detection:**
- App Store rejection: Guideline 4.2 (minimal functionality)
- Rejection: Guideline 2.1 (crashes, bugs)
- Rejection: Guideline 5.1.1 (privacy non-compliance)
- Users report "just a wrapper" in reviews

**Phase:** Phase 3 (Mobile Apps) - before App Store submission

---

### Pitfall 12: AI Bias Detection Without Continuous Monitoring
**What goes wrong:** Implement bias detection, validate against test dataset, ship to production. Over time, training data bias amplifies, model drift occurs, detection accuracy degrades. Biased content slips through.

**Why it happens:** Treat bias detection as one-time implementation, not ongoing process. "We tested it, it works."

**Prevention:**
1. **Continuous validation pipeline:**
   - Weekly: compare AI outputs against fact-check databases
   - Monthly: expert panel review of bias classifications
   - Quarterly: retrain models with updated data
2. **Drift detection:**
   - Monitor prediction confidence scores (declining = drift)
   - Track error rates by subgroup (demographic, political, geographic)
   - Alert when accuracy drops below threshold
3. **Feedback loop:**
   - User reports: "This article is not biased" → review + retrain
   - False positive tracking by category
   - A/B test new models before full deployment
4. **Transparency:**
   - Explain which signals triggered bias flag
   - Provide appeal mechanism for content creators
   - Publish bias detection methodology
5. **Complexity vs accuracy trade-off:**
   - More complex models = higher compute costs, slower inference
   - Start simple: keyword + sentiment
   - Add complexity incrementally: framing, loaded language, omission
6. **Limitations disclosure:**
   - AI struggles with satire, nuance, cultural context
   - Human oversight for high-stakes content
   - Confidence thresholds: only flag if >80% confident

**Detection:**
- User complaints about bias labels
- False positive rate increasing over time
- Confidence scores declining
- Bias detection fails on recent news (model stale)

**Phase:** Phase 2 (AI Bias Detection) - continuous monitoring required

---

### Pitfall 13: Stripe Migration Without Payment Method Portability Plan
**What goes wrong:** Users have saved payment methods in old system. Migrate to Stripe, payment methods don't transfer. Users forced to re-enter cards, high drop-off rate.

**Why it happens:** Assume payment methods migrate like user data. They don't (PCI compliance, scheme rules).

**Prevention:**
1. **Assess portability options:**
   - Tokenized cards: may be transferable (depends on old processor)
   - Raw card data: never stored, cannot migrate
   - Scheme tokens (Network Tokens): sometimes portable
2. **Migration strategies:**
   - Best case: old processor supports export to Stripe (rare)
   - Common case: users must re-enter payment methods
   - Mitigation: smooth re-entry UX
3. **User communication plan:**
   - Email 2 weeks before: "We're upgrading payments"
   - In-app notice: "Please update payment method by [date]"
   - Grace period: allow old system for 30 days
4. **Data migration validation:**
   - Map old processor fields to Stripe (often not 1:1)
   - Validate all customer records before import
   - Test in Stripe test mode first (not live)
   - Avoid duplicate customer records (match by email)
5. **Incremental migration:**
   - Existing customers: keep old processor initially
   - New customers: Stripe only
   - Gradual migration over 3-6 months
   - Parallel run period for validation
6. **Outstanding requirements:**
   - Check Stripe account requirements (verification)
   - Connected accounts must accept ToS before activation

**Detection:**
- High subscription churn during migration
- Support tickets: "My payment method is missing"
- Duplicate customer records in Stripe
- Failed payments spike after migration

**Phase:** Phase 4 (Freemium Model) - before Stripe integration

---

### Pitfall 14: Public API Rate Limiting Without Tiered Strategy
**What goes wrong:** Implement flat rate limit (100 req/min) for all endpoints. Expensive AI endpoints consume same quota as cheap health checks. Legitimate users hit limits, bad actors exploit cheap endpoints.

**Why it happens:** Simplicity bias - single global limit easier than endpoint-specific limits.

**Prevention:**
1. **Tiered rate limiting:**
   ```typescript
   // Endpoint-based limits
   /api/v1/health        → 1000 req/min (cheap)
   /api/v1/news          → 100 req/min  (moderate)
   /api/v1/ai/ask        → 10 req/min   (expensive)
   /api/v1/analysis      → 20 req/min   (moderate-expensive)
   ```
2. **Dimension-based limiting (layered):**
   - IP-based: 100 req/min (public endpoints, unauthenticated)
   - API key: 1000 req/min (authenticated, per-key quota)
   - Per-endpoint: varies (expensive endpoints stricter)
3. **Plan-based quotas:**
   - Free API: 100 req/day, 10 AI req/day
   - Developer ($29/mo): 10k req/day, 100 AI req/day
   - Business ($99/mo): 100k req/day, 1k AI req/day
4. **Distributed rate limiting:**
   - Use Redis for shared counters (already in place)
   - Token bucket algorithm (AWS API Gateway default)
   - Sliding window log for accuracy
5. **Standard HTTP responses:**
   - Status: 429 Too Many Requests
   - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
   - `Retry-After` header with seconds to wait
6. **Gateway-level enforcement:**
   - Implement at API gateway (consistent enforcement)
   - Avoid per-service limits (inconsistent, gaps)

**Detection:**
- Legitimate users hit limits on cheap endpoints
- Bad actors abuse expensive endpoints
- Uneven load: some endpoints overwhelmed, others idle
- Support tickets: "Rate limit too low for my use case"

**Phase:** Phase 5 (Developer API) - before public launch

---

### Pitfall 15: AI Fact-Checking With 60%+ Error Rate
**What goes wrong:** Deploy AI fact-checking feature. Users trust AI-flagged claims. But AI has 60%+ error rate on nuanced statements. False positives damage legitimate sources, false negatives allow misinformation spread.

**Why it happens:** Over-reliance on AI without understanding accuracy limitations. "AI can fact-check automatically."

**Prevention:**
1. **Accept accuracy limitations:**
   - Current AI fact-checkers: 60%+ error rate on complex claims
   - Language complexity, context changes, saturation challenges
   - AI struggles with: satire, nuance, time/location context shifts
2. **Human oversight mandatory:**
   - AI flags potential issues (screening)
   - Human fact-checkers verify before publication
   - Never auto-publish AI fact-check results
3. **Confidence thresholds:**
   - Only flag claims with >85% confidence
   - Show confidence score to users
   - "Needs verification" vs "Confirmed false"
4. **Multi-source verification:**
   - Cross-reference with fact-check databases (Snopes, PolitiFact)
   - Require 2+ independent sources for "false" label
   - Check official source statements
5. **Continuous training:**
   - Use verified fact-checks to retrain models
   - Track false positive/negative rates by topic
   - Bias detection: ensure equal error rates across demographics
6. **User education:**
   - Explain AI limitations in UI
   - "AI-assisted fact-checking, human verified"
   - Allow users to report incorrect labels

**Detection:**
- User reports of incorrect fact-checks
- False positive rate > 10%
- Fact-check database contradicts AI labels
- Confidence scores declining over time

**Phase:** Phase 2 (Fact-Checking) - human oversight required

---

## Minor Pitfalls

Nuisances that can be fixed quickly.

### Pitfall 16: Docker Compose v3 Syntax Assumptions
**What goes wrong:** Use Compose file v3 syntax for Swarm. Discover `build:` directive ignored, `depends_on` doesn't control startup order.

**Why it happens:** Swarm uses Compose v3 spec, which has different semantics than Compose CLI.

**Prevention:**
1. Remember Swarm limitations:
   - `build:` ignored (images must be pre-built and pushed to registry)
   - `depends_on:` doesn't wait for readiness (use healthchecks)
   - Volume syntax different for Swarm (`type: volume` instead of shorthand)
2. Add healthchecks to ALL services:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3001/api/health/db"]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 40s
   ```
3. Use registry even for single-node Swarm (localhost registry or Docker Hub)
4. Test Compose file with `docker stack deploy` before production

**Detection:**
- Service fails to start in Swarm mode
- `depends_on` ignored, startup order wrong
- Build errors: "image not found"

**Phase:** Phase 1 (Infrastructure Planning) - when creating stack file

---

### Pitfall 17: Monorepo Package Dependency Chaos
**What goes wrong:** React web imports from React Native package. Native package imports web-only dependencies. Builds break with cryptic errors.

**Why it happens:** Lack of clear package boundaries and import rules.

**Prevention:**
1. **Strict package architecture:**
   ```
   packages/
     core/          → Zero dependencies on UI packages
     types/         → Shared types only
     api-client/    → HTTP client, auth (core dependency)
     ui-web/        → React web components (CAN import core, NOT ui-native)
     ui-native/     → RN components (CAN import core, NOT ui-web)
   apps/
     web/           → Vite app (imports ui-web, core)
     mobile/        → RN app (imports ui-native, core)
   ```
2. **Dependency rules (enforce with ESLint):**
   - `core` → no UI imports
   - `ui-web` → no `ui-native` imports
   - `ui-native` → no `ui-web` imports
   - `apps/*` → no cross-app imports
3. **Use workspace protocol:**
   ```json
   // packages/ui-web/package.json
   {
     "dependencies": {
       "@newshub/core": "workspace:*",
       "@newshub/ui-native": "FORBIDDEN"  // lint rule
     }
   }
   ```
4. **Platform-specific code:**
   - Use `.web.ts` and `.native.ts` extensions
   - Bundler resolves automatically
   - Example: `logger.web.ts` (console), `logger.native.ts` (react-native-logs)

**Detection:**
- Build errors: "Module not found" (web importing native)
- Bundle size bloated (web includes native dependencies)
- TypeScript errors about incompatible types

**Phase:** Phase 3 (React Native Foundation) - setup phase

---

### Pitfall 18: Freemium Hard-Coded Feature Flags
**What goes wrong:** Hard-code feature checks: `if (user.plan === 'free') disableExport()`. Later want to change plan names or add tiers. Must update code everywhere.

**Why it happens:** Quick implementation without abstraction.

**Prevention:**
1. **Feature flag abstraction:**
   ```typescript
   // BAD: Hard-coded
   if (user.plan === 'free') {
     throw new Error('Premium feature')
   }

   // GOOD: Feature check
   if (!hasFeature(user, 'export_data')) {
     throw new Error('Premium feature')
   }

   // Feature matrix
   const FEATURES = {
     free: ['view_articles', 'ai_questions_limited'],
     premium: ['view_articles', 'ai_questions_unlimited', 'export_data', 'email_digest'],
     team: ['view_articles', 'ai_questions_unlimited', 'export_data', 'email_digest', 'team_collaboration', 'api_access']
   }
   ```
2. **Database-driven feature flags (flexible):**
   ```sql
   CREATE TABLE plan_features (
     plan_id UUID REFERENCES plans(id),
     feature_key TEXT,
     quota INTEGER,  -- NULL = unlimited, 0 = disabled, >0 = quota
     PRIMARY KEY (plan_id, feature_key)
   )
   ```
3. **Usage tracking:**
   - Track daily usage per feature per user
   - Enforce quotas: `ai_questions: 5/day (free)`
   - Show usage in UI: "3 of 5 AI questions used today"

**Detection:**
- Plan changes require code updates
- Feature inconsistencies across codebase
- Cannot A/B test plan features

**Phase:** Phase 4 (Freemium Model) - implementation phase

---

### Pitfall 19: Video Content Without Accessibility
**What goes wrong:** Add video/podcast features, no transcripts or captions. Violates WCAG accessibility standards, excludes deaf/hard-of-hearing users, cannot search video content.

**Why it happens:** Focus on video player, forget accessibility requirements.

**Prevention:**
1. **Automatic transcription:**
   - Use speech-to-text API (AWS Transcribe, Google Speech-to-Text, Whisper)
   - Generate on upload (async job)
   - Store in database for search indexing
2. **Caption formats:**
   - WebVTT for web player
   - SRT for downloads
   - Editable by creators (auto-generated not perfect)
3. **Audio descriptions:**
   - For analysis clips: describe visual content in audio
   - Important for screen reader users
4. **Search integration:**
   - Index transcript text
   - Allow search within video content
   - Jump to timestamp from search results
5. **Player controls:**
   - Keyboard navigation (space, arrow keys)
   - Speed control (0.5x, 1x, 1.5x, 2x)
   - Volume control, mute

**Detection:**
- No captions available
- Video content not searchable
- Keyboard navigation broken
- Accessibility audit failures

**Phase:** Phase 6 (Video/Podcast) - implementation requirement

---

### Pitfall 20: Video Platform Shoehorning Without Content Strategy
**What goes wrong:** Attempt to convert every podcast/video "as-is" to platform. Long intros lose viewers. Auto-publish doesn't engage audience. Content feels like generic dump, not optimized for platform.

**Why it happens:** Treat video as simple file upload without considering platform-specific expectations.

**Prevention:**
1. **Platform-specific optimization:**
   - YouTube: Remove long intros, optimize for retention
   - Mobile: Shorter clips (1-2 min), vertical format consideration
   - Web: Embed quality matters, preview thumbnails
2. **Content strategy:**
   - Don't auto-publish everything
   - Cherry-pick high-value episodes for full video
   - Create platform-specific clips (highlights, key moments)
   - Optimize titles/thumbnails for each platform
3. **Re-editing requirements:**
   - Remove audio-specific elements that don't translate
   - Add visual context (on-screen text, graphics)
   - Adjust pacing for video consumption
4. **Quality over quantity:**
   - Better: 1 well-edited video/week
   - Worse: 10 auto-published full podcasts

**Detection:**
- Low video engagement vs audio
- High drop-off rates (viewers leave quickly)
- Comments: "Just listen to podcast instead"
- Platform metrics show content underperforming

**Phase:** Phase 6 (Video/Podcast) - content strategy required

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | When to Address |
|-------------|----------------|------------|-----------------|
| Docker Swarm Migration | Volume strategy, secrets, registry requirement | Storage audit, PgBouncer, healthchecks | BEFORE migration (Phase 1) |
| AI Credibility Scoring | No ground truth, bias amplification, legal risk | Human-validated dataset, transparency, appeals | Design phase (Phase 2) |
| AI Bias Detection | Model drift, false positives, complexity costs | Continuous monitoring, feedback loop, simple start | Post-launch (Phase 2) |
| Fact-Checking | Low accuracy (60%+ errors), context issues | Human oversight, confidence thresholds, multiple sources | Design phase (Phase 2) |
| PWA Push Notifications | Service worker update lag, platform differences | Update check interval, browser testing | Before implementation (Phase 3) |
| React Native App | Code sharing scope creep, build performance | Monorepo caching, shared logic only (not UI) | Setup phase (Phase 3) |
| Capacitor Submission | App Store rejections (Guideline 4.2), privacy | Native features, privacy manifest, differentiation | Before submission (Phase 3) |
| Freemium Billing | Free tier too generous, no conversion | Value ladder, quota tracking, friction points | Design phase (Phase 4) |
| Stripe Integration | Payment method portability, duplicate records | Migration plan, incremental rollout, validation | Before migration (Phase 4) |
| Public API | Database structure exposure, breaking changes | Abstraction layer, versioning, separate routes | Design phase (Phase 5) |
| Rate Limiting | Flat limits, endpoint cost ignored | Tiered strategy, Redis counters, standard headers | Implementation (Phase 5) |
| Video/Podcast | CDN cost explosion, storage growth | Cost model, compression, quotas, embed-first | BEFORE implementation (Phase 6) |
| Video Accessibility | No transcripts, unsearchable content | Auto-transcription, captions, keyboard controls | Implementation (Phase 6) |

---

## Cross-Cutting Concerns

### Cost Monitoring
- Video/podcast CDN costs can 100x current spend
- Connection pool exhaustion → database upgrade costs
- Redis Sentinel → 3x Redis instances
- Multi-region → 2-3x all infrastructure costs
- Mitigation: Cost alerts, budget caps, gradual rollout

### Backward Compatibility
- Public API fields are permanent contracts
- Freemium plan changes break user expectations
- Database migrations must support old clients
- Mitigation: Versioning, deprecation periods, grandfather clauses

### Data Consistency
- Redis Sentinel split-brain scenarios
- Multi-region eventual consistency challenges
- Payment method migration data loss
- Mitigation: Quorum settings, validation, incremental migration

### Performance Degradation
- Connection pool exhaustion under scale
- Monorepo build times without caching
- Video delivery latency without CDN optimization
- Mitigation: PgBouncer, Turborepo, multi-CDN, compression

### Security & Privacy
- Docker secrets in environment variables (exposure)
- AI credibility scores (defamation risk)
- Payment data migration (PCI compliance)
- App Store privacy manifests (rejection risk)
- Mitigation: Swarm secrets, transparency, Stripe handles PCI, PrivacyInfo.xcprivacy

---

## Sources

### Docker & Infrastructure
- [Docker Compose vs Docker Swarm 2026 Guidance](https://thelinuxcode.com/docker-compose-vs-docker-swarm-practical-differences-real-tradeoffs-and-2026-ready-guidance/)
- [Migrating Docker Compose to Swarm Without Downtime](https://vipinpg.com/blog/migrating-docker-compose-stacks-from-standalone-to-swarm-mode-without-downtime-using-rolling-updates)
- [Docker Swarm Secrets Management Guide](https://medium.com/@csarat424/secure-secrets-management-in-docker-swarm-a-simple-guide-a498a61ee45d)
- [PostgreSQL Connection Pool Exhaustion](https://www.c-sharpcorner.com/article/postgresql-connection-pool-exhaustion-lessons-from-a-production-outage/)
- [Scaling PostgreSQL with PgBouncer 2026](https://tamiltech.in/article/pgbouncer-postgresql-connections-scale-guide)
- [Redis Sentinel High Availability Guide](https://medium.com/@amila922/redis-sentinel-high-availability-everything-you-need-to-know-from-dev-to-prod-complete-guide-deb198e70ea6)

### AI & Machine Learning
- [AI Bias Detection Best Practices](https://www.brookings.edu/articles/algorithmic-bias-detection-and-mitigation-best-practices-and-policies-to-reduce-consumer-harms/)
- [AI Fact-Checking Implementation Challenges](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5122225)
- [AI-Generated Misinformation Detection](https://journals.sagepub.com/doi/10.1177/27523543251325902)
- [Biases in AI-Generated Content](https://www.sciencedirect.com/science/article/abs/pii/S0261517726000567)

### Mobile Development
- [React Native Code Sharing Best Practices](https://matthewwolfe.github.io/blog/code-sharing-react-and-react-native)
- [React Native in 2026: Stability](https://medium.com/@andy.a.g/react-native-in-2026-what-changed-and-why-it-finally-feels-stable-fe96b7a7a8b8)
- [Monorepo 2026: Turborepo vs Nx](https://daily.dev/blog/monorepo-turborepo-vs-nx-vs-bazel-modern-development-teams)
- [React Native App Store Rejections](https://netforemost.com/avoid-react-native-app-store-rejections/)
- [Capacitor App Store Approval Guide](https://capgo.app/blog/capacitor-ota-updates-app-store-approval-guide/)
- [Third-Party Libraries Apple Policy](https://capgo.app/blog/third-party-libraries-apple-policy-compliance/)

### Monetization & APIs
- [Freemium to Premium Conversion Guide](https://www.kinde.com/learn/billing/conversions/from-freemium-to-premium-a-guide-to-converting-free-users-into-paying-customers/)
- [Subscription Billing Mistakes to Avoid](https://www.zuora.com/guides/7-subscription-billing-mistakes-avoid/)
- [API Versioning Best Practices 2026](https://stellarcode.io/blog/advanced-api-development-best-practices-2026/)
- [Managing API Changes 2026](https://www.theneo.io/blog/managing-api-changes-strategies)
- [API Rate Limiting Best Practices 2026](https://www.getknit.dev/blog/10-best-practices-for-api-rate-limiting-and-throttling)
- [Stripe Payment Migration Guide](https://docs.stripe.com/payments/payment-intents/migration-synchronous)

### Video & Content
- [Video Podcast Common Mistakes](https://www.cohostpodcasting.com/resources/video-podcast-mistakes)
- [Video Streaming CDN Architecture](https://mwaretv.com/en/blog/cdn-architecture-streaming)
- [Cut Video Delivery Costs 40%](https://blog.blazingcdn.com/en-us/video-streaming-cdn-architecture-cost-efficiency-and-performance)

### PWA
- [PWA Push Notifications Complete Guide](https://www.magicbell.com/blog/using-push-notifications-in-pwas)
- [PWA Service Worker Update Strategy](https://web.dev/learn/pwa/update)
