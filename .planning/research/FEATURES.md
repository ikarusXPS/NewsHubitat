# Feature Landscape

**Domain:** Multi-perspective News Analysis Platform (v1.6 Infrastructure & Scale)
**Researched:** 2026-04-26

## 1. Source Credibility Scoring

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reliability score (0-100) | NewsGuard standard, users expect numerical ratings | Medium | Multi-factor algorithm (accuracy, transparency, corrections) |
| Source metadata display | Users need context (ownership, funding, location) | Low | Static data from config, UI presentation |
| Historical accuracy tracking | Credibility changes over time, users expect trends | Medium | Requires database schema for historical scores |
| Correction policy indicator | Transparency is a trust signal | Low | Boolean flag + last correction date |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-regional bias comparison | Show how same source rates differently across regions | Medium | Leverage existing 13-region architecture |
| AI-powered credibility analysis | Automated scoring instead of manual review | High | Requires fine-tuned model or third-party API |
| Source evolution timeline | Visual history of credibility changes | Medium | Recharts integration, historical data schema |
| Crowd-sourced trust signals | User feedback on source reliability | High | Voting system, spam prevention, aggregation logic |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Single-metric scoring | Oversimplifies complex credibility factors | Multi-dimensional scoring (accuracy, transparency, bias, ownership) |
| Manual human review at scale | Cannot scale to 130+ sources with manual updates | Hybrid: AI-powered with periodic human audits |
| Real-time credibility API calls | Latency + cost for every article render | Cache scores with weekly/monthly refresh cycles |
| User-generated credibility scores only | Vulnerable to brigading and manipulation | Combine algorithmic base score + user feedback |

### Complexity Assessment

- **Backend**: Medium (new credibility scoring service, database schema updates)
- **Frontend**: Low (display scores in existing SignalCard components)
- **Data Pipeline**: High (historical tracking, periodic re-scoring, third-party API integration)

### Dependencies on Existing Features

- **NewsSource model** (already exists) - add credibility fields
- **AI Service** (already exists) - potentially use for automated analysis
- **Caching layer** (Redis exists) - cache scores to avoid repeated calculations
- **13-region architecture** - enables regional credibility comparison differentiator

---

## 2. Political Bias Detection

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Left-Center-Right scale | AllSides standard, users familiar with political spectrum | Medium | Requires training data or third-party API |
| Article-level bias detection | Users want to know bias of specific articles, not just sources | High | NLP analysis per article (expensive, slow) |
| Source-level bias label | Baseline expectation for news aggregators | Low | Static configuration data per source |
| Visual bias indicator | Color-coding or icons for quick recognition | Low | UI component in SignalCard |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Framing bias detection | Show *how* sources cover same event differently | High | Requires comparing article pairs, semantic analysis |
| Selection bias tracking | What topics each source covers/ignores | Medium | Extend existing topic clustering, track coverage gaps |
| Sentiment divergence by bias | Correlate sentiment with political lean | Medium | Combine existing sentiment analysis + bias detection |
| Bias drift timeline | Show how source bias changes over time | Medium | Historical tracking, visualization |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Binary bias labels (biased/unbiased) | All sources have some bias, binary is dishonest | Multi-dimensional spectrum with transparency |
| Hiding sources based on bias | Censorship undermines multi-perspective value | Show all perspectives, let users filter |
| AI-only bias detection without human audit | False positives harm trust, models can hallucinate | Hybrid: AI suggestions + human verification |
| Real-time bias scoring on every request | Too expensive for AI inference at scale | Pre-compute and cache bias scores |

### Complexity Assessment

- **Backend**: High (NLP models, LLM integration, comparison algorithms)
- **Frontend**: Medium (new bias visualization components)
- **AI Pipeline**: Very High (fine-tuning or prompt engineering for bias detection)

### Dependencies on Existing Features

- **AI Service with multi-provider fallback** (exists) - use for article-level analysis
- **Sentiment analysis** (exists) - extend to correlate with bias
- **Topic clustering** (exists) - extend for selection bias tracking
- **13-region system** (exists) - natural fit for framing bias comparisons
- **Caching** (exists) - essential for performance at scale

---

## 3. Fact-Checking / Claim Verification

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Claim extraction from articles | Users expect automated detection of verifiable claims | High | NLP to identify factual claims vs opinions |
| Verification status (verified/false/unverified) | Clear labeling standard in fact-checking industry | Medium | Three-state system with confidence levels |
| Evidence links | Show sources used for verification | Low | Store URLs + excerpts in database |
| Human-in-the-loop verification | Users distrust fully automated fact-checking | High | Workflow system for human review queue |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-reference with ClaimReview schema | SEO benefit + interoperability with Google/Bing | Medium | Schema.org markup, API integration |
| Historical claim database | Track how claims evolve/resurface over time | Medium | New database model, deduplication logic |
| Source credibility weighting | Trusted sources' claims need less verification | Low | Combine with credibility scoring feature |
| Automated evidence retrieval | AI fetches supporting/contradicting sources | High | RAG system extension, web scraping |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fact-check every claim automatically | False positives undermine trust, too expensive | Prioritize high-impact/viral claims |
| Display only "true" or "false" | Nuance matters, many claims are partially true | Multi-level scale (true/mostly true/mixed/false/unverifiable) |
| Third-party fact-checker API only | Single point of failure, potential bias | Hybrid: internal analysis + third-party cross-check |
| Fact-check opinions | Wastes resources, opinions aren't verifiable | Filter for factual claims only |

### Complexity Assessment

- **Backend**: Very High (claim extraction NLP, evidence retrieval, verification logic)
- **Frontend**: Medium (fact-check badges, evidence panel UI)
- **Human Workflow**: High (review queue, moderation tools, audit trail)

### Dependencies on Existing Features

- **AI Q&A with citations** (exists) - extend RAG for evidence retrieval
- **NewsArticle model** (exists) - add claim verification fields
- **Multi-provider AI** (exists) - use for claim analysis
- **Caching** (exists) - cache verification results

---

## 4. React Native + Capacitor Mobile Architecture

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Native app shell | Users expect app store distribution | Medium | Capacitor or React Native wrapper |
| Offline article reading | Mobile users have spotty connectivity | Medium | Service worker already exists, extend for native |
| Push notifications | Re-engagement driver, standard mobile feature | Medium | Capacitor Push Notifications plugin |
| Biometric authentication | Security standard on mobile | Low | Capacitor/React Native plugin available |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hybrid approach (Capacitor for PWA wrapper, React Native for performance-critical features) | Best of both worlds | High | Dual codebase maintenance initially |
| Native gesture navigation | Better UX than web-based navigation | Medium | React Native Gesture Handler |
| Background sync for offline actions | Seamless online/offline transition | Medium | Extend existing syncService.ts |
| Native share sheet integration | Better sharing UX than web share API | Low | Capacitor Share plugin |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full React Native rewrite | Wastes existing React 19 codebase | Capacitor wrapper + selective React Native modules |
| Native UI components only | Loses design consistency with web | Shared component library (React Native Web) |
| Separate codebases for iOS/Android | Doubles maintenance burden | Single codebase with platform-specific overrides |
| App store exclusivity | Alienates web users, limits reach | PWA remains primary, native apps supplement |

### Complexity Assessment

- **Initial Setup**: Medium (Capacitor integration or React Native bridge)
- **Code Reuse**: High (90%+ shared with Capacitor, 60-70% with React Native)
- **Maintenance**: Medium (single codebase with Capacitor, higher with React Native)

### Dependencies on Existing Features

- **PWA/Service Worker** (exists) - foundation for Capacitor approach
- **React 19 codebase** (exists) - reuse with React Native Web or Capacitor
- **Offline sync** (exists) - extend for native background sync
- **Auth system** (exists) - integrate with native biometric APIs

---

## 5. Freemium Subscription Model

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Free tier with limitations | Industry standard, allows user acquisition | Medium | Feature gating, database schema for tiers |
| Premium tier with clear value | Users need obvious upgrade incentive | Low | Define premium features (ad-free, unlimited bookmarks, AI analysis) |
| Subscription management UI | Cancel/upgrade/downgrade self-service | Medium | Stripe Customer Portal or custom UI |
| Payment processing integration | Stripe is standard for subscription apps | Medium | Stripe Checkout + webhook handlers |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Metered usage model (API calls, AI queries) | Pay only for what you use | High | Usage tracking per user, billing integration |
| Team/organization plans | B2B revenue opportunity | Medium | Extend existing Teams feature (exists) |
| Annual discount pricing | Improves retention, upfront revenue | Low | Stripe price configuration |
| Freemium-to-hard-paywall hybrid | High conversion for premium content | Medium | Paywall component, content access control |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Hard paywall only | Kills user acquisition, no trial value | Freemium with generous free tier |
| Too many tiers | Decision paralysis, support complexity | 2-3 tiers max (Free, Premium, Pro/Team) |
| Aggressive upgrade prompts | Drives users away, harms UX | Subtle upgrade CTAs at natural decision points |
| Credit card required for free tier | Massive drop-off in signups | Email-only signup for free tier |

### Complexity Assessment

- **Backend**: Medium (subscription service, feature gating, webhook handlers)
- **Frontend**: Medium (subscription UI, paywall components, upgrade prompts)
- **Business Logic**: High (usage metering, billing edge cases, refunds, downgrades)

### Dependencies on Existing Features

- **User accounts** (exists) - add subscription tier field
- **Teams feature** (exists) - extend for organization billing
- **Auth system** (exists) - integrate with payment flow
- **AI usage tracking** - metered AI queries for pricing

---

## 6. Developer API Design

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| RESTful API with JSON responses | Industry standard in 2026 | Low | Extend existing Express API |
| API key authentication | Standard developer auth pattern | Medium | Key generation, validation middleware |
| Rate limiting by tier | Prevent abuse, enforce tier limits | Medium | Express-rate-limit + Redis (exists) |
| API documentation (OpenAPI/Swagger) | Developers expect interactive docs | Medium | OpenAPI spec generation from routes |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GraphQL endpoint | Flexible data fetching, modern developer UX | High | New query layer, resolvers, schema |
| Webhook subscriptions | Real-time event notifications for developers | Medium | Webhook delivery service, retry logic |
| SDK generation (JS/Python/Go) | Lower integration friction | Medium | OpenAPI → SDK codegen tools |
| API analytics dashboard | Developers see their usage, errors, latency | Medium | New dashboard UI, metrics collection |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Free unlimited API access | Unsustainable, invites abuse | Generous free tier + paid tiers |
| GraphQL-only API | Alienates REST users, steeper learning curve | Both REST and GraphQL |
| No versioning | Breaking changes destroy developer trust | Semantic versioning (v1, v2) in URL path |
| Internal API endpoints exposed | Security risk, maintenance burden | Separate public API from internal routes |

### Complexity Assessment

- **Backend**: High (new API routes, auth layer, versioning, documentation)
- **Frontend**: Medium (developer dashboard, API key management UI)
- **DevOps**: Medium (API gateway, monitoring, rate limit enforcement)

### Dependencies on Existing Features

- **Express API** (exists) - extend with versioned public endpoints
- **Redis rate limiting** (exists) - extend for per-API-key limits
- **PostgreSQL** (exists) - store API keys, usage logs
- **Auth system** (exists) - developer account management

---

## 7. Video/Podcast Content Integration

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Video embeds from YouTube/Vimeo | Users expect multimedia content | Low | iframe embed or React Player library |
| Podcast RSS feed support | 71% of podcasts now include video (2026) | Medium | Extend RSS parser for audio/video enclosures |
| Playback controls in-app | Users expect native player, not external links | Medium | Video.js or React Player with custom UI |
| Transcript display | Accessibility + SEO benefit | High | Whisper API or third-party transcription |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Perspective comparison for video news | Apply multi-perspective analysis to video | Very High | Video content extraction, semantic analysis |
| AI-generated video summaries | Save users time on long-form content | High | Video-to-text + LLM summarization |
| Cross-platform podcast distribution | Automatic push to Apple/Spotify/YouTube | High | API integrations with podcast platforms |
| Interactive video chapters | Jump to relevant segments | Medium | Chapter metadata parsing, UI timeline |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Self-hosted video streaming | Expensive bandwidth, complex CDN setup | Embed from YouTube/Vimeo, link to external platforms |
| Automatic video transcription for all content | Very expensive at scale | Transcribe on-demand or for premium users only |
| In-app podcast recording/editing | Scope creep, not core news analysis value | Focus on aggregation and analysis, not creation |
| Video ads in free tier | Degrades UX significantly on mobile | Text ads or upgrade prompts instead |

### Complexity Assessment

- **Backend**: High (video metadata extraction, transcription API, storage)
- **Frontend**: Medium (video player component, chapter navigation)
- **Infrastructure**: High (CDN for self-hosted content, bandwidth costs)

### Dependencies on Existing Features

- **RSS aggregation** (exists) - extend for video/audio enclosures
- **NewsArticle model** (exists) - add video URL, transcript fields
- **AI service** (exists) - use for video summarization
- **Content translation** (exists) - extend for video transcript translation

---

## Cross-Feature Complexity Matrix

| Feature Area | Backend | Frontend | AI/ML | Infrastructure | Total |
|--------------|---------|----------|-------|----------------|-------|
| Credibility Scoring | Medium | Low | Medium | Low | Medium |
| Bias Detection | High | Medium | Very High | Low | High |
| Fact-Checking | Very High | Medium | Very High | Medium | Very High |
| Mobile (Capacitor) | Low | Medium | None | Medium | Medium |
| Mobile (React Native) | Medium | High | None | Medium | High |
| Freemium | Medium | Medium | None | Low | Medium |
| Developer API | High | Medium | None | Medium | High |
| Video/Podcast | High | Medium | High | High | High |

---

## Feature Dependency Graph

```
Existing Features → New Features

NewsSource model → Credibility Scoring
AI Service → Bias Detection, Fact-Checking, Video Summaries
Sentiment Analysis → Bias-Sentiment Correlation
Topic Clustering → Selection Bias Tracking
13-region architecture → Cross-regional Credibility/Bias Comparison
PWA/Service Worker → Capacitor Mobile App
Offline Sync → Native Background Sync
Auth System → Subscription Tiers, Developer API Keys
Redis Caching → API Rate Limiting
Express API → Developer API Versioning
RSS Aggregation → Podcast/Video Feed Support
Teams Feature → Organization Billing
```

---

## MVP Recommendations by Area

### Infrastructure & Scale (Multi-Region)
**Prioritize:**
1. Active-passive deployment (single failover region)
2. Database replication (read replicas first)
3. CDN for static assets

**Defer:**
- Active-active multi-region (very high complexity)
- Edge compute functions (premature optimization)

### Advanced AI Features
**Prioritize:**
1. Source credibility scoring (static metadata + AI-assisted)
2. Source-level bias labels (static configuration)
3. Simple claim extraction (keyword-based for MVP)

**Defer:**
- Article-level bias detection (too expensive per request)
- Automated fact-checking (requires human workflow first)
- Framing bias analysis (research-intensive)

### Mobile Experience
**Prioritize:**
1. Enhanced PWA (push notifications, better offline)
2. Capacitor wrapper (90% code reuse, low risk)

**Defer:**
- Full React Native app (high effort, maintenance burden)
- Native-only features (doesn't leverage web investment)

### Monetization
**Prioritize:**
1. Simple freemium (Free + Premium tiers)
2. Stripe integration (Checkout + Customer Portal)
3. Feature gating (ad-free, unlimited AI queries, export)

**Defer:**
- Metered usage billing (complex usage tracking)
- GraphQL API (REST API sufficient for MVP)
- SDK generation (manual examples first)

### Content Expansion
**Prioritize:**
1. Podcast RSS support (extend existing parser)
2. YouTube/Vimeo embeds (simple iframe/React Player)

**Defer:**
- Video transcription (expensive at scale)
- Self-hosted video (bandwidth costs)
- Perspective comparison for video (very high complexity)

---

## Sources

### Source Credibility Scoring
- [NewsGuard News Reliability Ratings](https://www.newsguardtech.com/solutions/news-reliability-ratings/)
- [Best AI News Aggregators in 2026](https://www.readless.app/blog/best-ai-news-aggregators-2026)
- [NewsGuard News Credibility Ratings Guide](https://www.aitools-directory.com/tools/newsguard-news-credibility-ratings/)
- [Unbiased News Apps 2026 Comparison](https://geobarta.com/en/blog/unbiased-news-apps-2026-comparison)
- [AllSides Analysis: News Aggregators Still Biased Left](https://www.allsides.com/blog/most-news-aggregators-still-biased-left-including-google-apple-bing-allsides-updated-analysis-2026)

### Political Bias Detection
- [Automatic Large-Scale Political Bias Detection](https://pmc.ncbi.nlm.nih.gov/articles/PMC12068563/)
- [Media Bias Detector (CHI 2025)](https://dl.acm.org/doi/10.1145/3706598.3713716)
- [ChunkyBERT for Political Bias Detection](https://www.nature.com/articles/s41598-026-46646-z)
- [Penn Media Bias Lab Research](https://www.thedp.com/article/2026/03/penn-media-bias-lab-research-presidential-election)
- [Media Bias Detector Design Paper](https://arxiv.org/html/2502.06009v2)

### Fact-Checking
- [Show Me the Work: Fact-Checkers' Requirements](https://dl.acm.org/doi/full/10.1145/3706598.3713277)
- [Automated Fact-Checking for Investigative Journalists](https://spotlight.ebu.ch/p/automated-fact-checking-osint-api-guide)
- [Automated Fact-Checking of Climate Claims](https://www.nature.com/articles/s44168-025-00215-8)
- [ClimateCheck 2026 Competition](https://arxiv.org/html/2603.26449v1)
- [FEVER: Fact Extraction and Verification](https://fever.ai/)

### Mobile Architecture
- [Flutter vs React Native vs Capacitor 2026](https://www.oflight.co.jp/en/columns/flutter-rn-capacitor-tauri-overview-2026)
- [Capacitor vs React Native Comparison](https://nextnative.dev/blog/capacitor-vs-react-native)
- [React Native vs Capacitor Tradeoffs](https://appisto.app/blog/react-native-vs-nativescript-vs-capacitor)
- [Cross-Platform App 2026 Guide](https://thedebuggersitsolutions.com/blog/cross-platform-app-2026-flutter-react-native-capacitor)
- [Capacitor Plugins Documentation](https://capacitorjs.com/docs/plugins)

### Freemium Models
- [Freemium Monetization Strategies](https://adapty.io/blog/freemium-app-monetization-strategies/)
- [State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [Subscription vs Freemium Analysis](https://www.eliteitteam.com/blogs/subscription-vs-freemium/)
- [RevenueCat 2026 Trends Report](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/)

### Developer API Design
- [API Trends Shaping 2026](https://tblocks.com/articles/api-trends/)
- [API Developer Engineering 2026](https://www.refontelearning.com/blog/api-developer-engineering-in-2026-trends-skills-best-practices)
- [Kong API Landscape 2026](https://konghq.com/blog/engineering/api-a-rapidly-changing-landscape)
- [API Monetization Strategies](https://newsdata.io/blog/api-monetization/)
- [News API Landscape 2026](https://stackademic.com/blog/the-news-api-landscape-in-2026-from-intelligence-platforms-to-simple-feeds)

### Video/Podcast Integration
- [Best Video Podcast Platforms 2026](https://www.podcastvideos.com/articles/best-video-podcast-platforms-2026/)
- [Video Podcasting Statistics 2026](https://blog.podbean.com/video-podcast-statistics-2026/)
- [Apple Video Podcast Experience](https://www.apple.com/newsroom/2026/02/apple-introduces-a-new-video-podcast-experience-on-apple-podcasts/)
- [Deloitte Video Podcasts Prediction](https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/video-podcasts-reach.html)
- [Podcasting Growth Trends 2026](https://www.podcastvideos.com/articles/podcasting-growth-trends-2026-video-ai/)

### Multi-Region Deployment
- [Building Multi-Region AWS Applications](https://dasroot.net/posts/2026/04/building-multi-region-aws-applications-architecture-patterns/)
- [How to Build Multi-Region Architecture](https://oneuptime.com/blog/post/2026-01-30-multi-region-architecture/view)
- [Multi-Cloud Architectures 2026](https://flolive.net/blog/glossary/multi-cloud-in-2026-architecture-challenges-and-best-practices/)
- [Cloud Resilience 2026](https://www.techstoriess.com/cloud-resilience-2026-building-multi-cloud-architectures-that-survive-major-outages/)

### News Verification & Metadata
- [How to Fact-Check Sources 2026](https://rivereditor.com/guides/how-to-fact-check-verify-sources-2026)
- [Automated Newsroom Metadata 2026](https://digital-nirvana.com/blog/newsroom-metadata-automation-2025/)
- [C2PA Content Authenticity](https://c2pa.org/)
- [State of Content Authenticity 2026](https://contentauthenticity.org/blog/the-state-of-content-authenticity-in-2026)
