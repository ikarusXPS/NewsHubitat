# Codebase Concerns

**Analysis Date:** 2026-04-18

## Tech Debt

**Incomplete Authentication Integration:**
- Issue: Multiple routes use placeholder `userId` extraction with `// TODO: Get userId from auth middleware` comments
- Files: `server/routes/personas.ts` (lines 102, 123), `server/routes/email.ts` (lines 55, 79, 224)
- Impact: Routes fall back to `'anonymous'` user ID, breaking user-specific features (personas, email subscriptions)
- Fix approach: Implement actual auth middleware integration - extract user ID from verified JWT token

**WebSocket Authentication Not Implemented:**
- Issue: WebSocket `authenticate` handler has commented-out JWT verification: `// TODO: Verify JWT token and set userId`
- Files: `server/services/websocketService.ts` (lines 133-144)
- Impact: Any client can claim to be authenticated; user-specific notifications won't work
- Fix approach: Uncomment and implement JWT verification using `AuthService.verifyToken()`

**Email Subscription Storage Uses In-Memory Map:**
- Issue: Comment explicitly states "In-memory storage for subscriptions (replace with DB in production)"
- Files: `server/routes/email.ts` (lines 16-30)
- Impact: All email subscriptions lost on server restart; won't scale horizontally
- Fix approach: Migrate to Prisma model (EmailSubscription already exists in schema)

**Unsubscribe Token Validation Not Implemented:**
- Issue: `// TODO: Validate token and find subscription` - endpoint just returns success
- Files: `server/routes/email.ts` (lines 224-226)
- Impact: Security issue - anyone can claim unsubscription succeeded without actual validation
- Fix approach: Generate/verify signed tokens with subscription ID

**Focus Suggestion Application Not Implemented:**
- Issue: `handleApplySuggestion` has `// TODO: Implement focus switching logic` and only logs
- Files: `src/components/FocusSuggestions.tsx` (lines 54-59)
- Impact: Users see suggestions but clicking them does nothing useful
- Fix approach: Connect to Zustand store's `setActiveFocus()` action

**Settings Login Button Placeholder:**
- Issue: Login button shows toast "Login-Dialog kommt bald" (coming soon)
- Files: `src/pages/Settings.tsx` (lines 254-257)
- Impact: Users cannot access login from Settings page
- Fix approach: Open AuthModal component on click

**Debug Console Logs in Production Code:**
- Issue: Multiple `console.log('[DEBUG]...')` statements in news routes
- Files: `server/routes/news.ts` (lines 8, 22, 32, 48)
- Impact: Console noise in production; potential performance impact
- Fix approach: Remove or convert to logger.debug() calls

## Known Bugs

**None explicitly documented.** The codebase uses graceful degradation patterns that mask failures.

## Security Considerations

**No API Rate Limiting Middleware:**
- Risk: Endpoints vulnerable to abuse, DoS attacks, and API quota exhaustion
- Files: `server/routes/*.ts` (all route files), `server/services/cacheService.ts` (has rate limit key builder but no middleware)
- Current mitigation: Cache key pattern exists (`CacheKeys.rateLimit`) but no middleware uses it
- Recommendations: Add express-rate-limit middleware; use Redis for distributed rate limiting

**CORS Allows Configurable Origins:**
- Risk: Misconfiguration could allow malicious origins
- Files: `server/index.ts` (line 52), `server/services/websocketService.ts` (lines 76-80)
- Current mitigation: Uses `ALLOWED_ORIGINS` env var with localhost fallback
- Recommendations: Document required ALLOWED_ORIGINS for production; validate origin format

**JWT Secret Enforcement:**
- Risk: Server exits if JWT_SECRET not set - good security but harsh for dev
- Files: `server/services/authService.ts` (lines 27-33)
- Current mitigation: `process.exit(1)` prevents running without secret
- Recommendations: Current approach is correct; document in setup instructions

**Password Policy Enforced at Route Level:**
- Risk: Validation rules could diverge between routes and service
- Files: `server/routes/auth.ts` (lines 16-20, 31-35), `server/services/authService.ts` (line 36)
- Current mitigation: Both enforce 12-char minimum; routes add complexity rules
- Recommendations: Centralize password policy in authService

## Performance Bottlenecks

**Large Page Components:**
- Problem: EventMap.tsx (1041 lines) and Community.tsx (820 lines) contain massive render trees
- Files: `src/pages/EventMap.tsx`, `src/pages/Community.tsx`
- Cause: Large single components with complex state management and multiple sub-components inline
- Improvement path: Extract sub-components into separate files; use React.memo() for expensive renders

**GlobeView Heavy Dependencies:**
- Problem: Globe visualization loads three.js and globe.gl dynamically
- Files: `src/components/GlobeView.tsx` (697 lines)
- Cause: 3D rendering with custom geometries, animations, and LOD calculations
- Improvement path: Lazy load only when visible; implement more aggressive LOD thresholds

**In-Memory Article Storage with Index Maps:**
- Problem: All articles stored in memory with multiple index Maps
- Files: `server/services/newsAggregator.ts` (lines 44-47)
- Cause: Design choice for fast filtering (O(1) lookups)
- Improvement path: Acceptable for current scale (1000 max articles); monitor memory usage

**No Redis Cache Graceful Handling:**
- Problem: If Redis unavailable, all cache operations return null/false silently
- Files: `server/services/cacheService.ts` (lines 117-127, 134-142)
- Cause: Designed for graceful degradation but may hide cache misses
- Improvement path: Add metrics/logging for cache hit/miss ratios

## Fragile Areas

**GlobeView Component:**
- Files: `src/components/GlobeView.tsx`
- Why fragile: 15+ eslint-disable comments for `@typescript-eslint/no-explicit-any`; relies on untyped globe.gl library; complex THREE.js interactions
- Safe modification: Test thoroughly in browser; any changes to point rendering affect all visualizations
- Test coverage: No unit tests (visual component)

**Query Key Synchronization:**
- Files: `src/pages/EventMap.tsx`, `src/pages/Monitor.tsx`
- Why fragile: Must use identical `queryKey: ['geo-events']` to share cache; divergence causes data inconsistency
- Safe modification: Search for all usages of `'geo-events'` before changing
- Test coverage: E2E tests exist (`e2e/event-map.spec.ts`, `e2e/monitor.spec.ts`)

**AI Provider Fallback Chain:**
- Files: `server/services/aiService.ts`, `server/routes/ai.ts`
- Why fragile: Three providers (OpenRouter, Gemini, Anthropic) with different APIs and error handling
- Safe modification: Test with each provider disabled to verify fallback works
- Test coverage: None

**Translation Provider Chain:**
- Files: `server/services/translationService.ts` (361 lines)
- Why fragile: Four providers (DeepL, Google, LibreTranslate, Claude) with rate limits and different error modes
- Safe modification: Test with each provider's API key unset
- Test coverage: None

## Scaling Limits

**In-Memory Article Cache:**
- Current capacity: 1000 articles (configurable via `maxArticles`)
- Limit: Memory bound; 1000 articles with full content ~10-50MB
- Scaling path: Move to database-backed pagination with Prisma; add Redis caching layer

**WebSocket Connections:**
- Current capacity: No explicit limit
- Limit: Node.js single-threaded; Socket.io memory per connection
- Scaling path: Add sticky sessions with Redis adapter for horizontal scaling

**SQLite Database:**
- Current capacity: Single-file database
- Limit: Write contention; no horizontal scaling; ~1TB practical limit
- Scaling path: Migrate to PostgreSQL with connection pooling

## Dependencies at Risk

**globe.gl (Untyped):**
- Risk: No TypeScript types; requires `any` casts throughout GlobeView
- Impact: Type safety lost; upgrade could break without warning
- Migration plan: Consider deck.gl (typed) or maplibre-gl as alternatives

**react-leaflet-markercluster:**
- Risk: Third-party wrapper for Leaflet clustering; less maintained than core
- Impact: EventMap marker clustering could break on React/Leaflet upgrades
- Migration plan: Use Leaflet.markercluster directly with useEffect

## Missing Critical Features

**No Request Validation on Many Endpoints:**
- Problem: Many POST/PUT endpoints lack Zod schema validation
- Blocks: Input sanitization, type coercion, error messages
- Files: `server/routes/email.ts`, `server/routes/personas.ts`

**No Error Boundary in Pages:**
- Problem: Component errors crash entire page
- Blocks: Graceful error recovery for users
- Recommended: Add React ErrorBoundary wrapper to each page

**No Offline Support:**
- Problem: App requires constant backend connectivity
- Blocks: Usage on poor connections
- Recommended: Service worker with cache-first strategy for static assets

## Test Coverage Gaps

**No Backend Service Tests:**
- What's not tested: `server/services/*.ts` - all 14 service files have zero unit tests
- Files: `server/services/aiService.ts`, `server/services/newsAggregator.ts`, `server/services/translationService.ts`, etc.
- Risk: Business logic changes break silently; multi-provider fallback logic untested
- Priority: High

**No API Route Tests:**
- What's not tested: `server/routes/*.ts` - all route handlers lack tests
- Files: All route files (auth, news, ai, events, email, personas, etc.)
- Risk: Response format changes, error handling regressions
- Priority: High

**Limited Frontend Unit Tests:**
- What's not tested: 4 test files exist (utils, focusPresets, factories, mapCentering) out of ~50 components
- Files: Most of `src/components/*.tsx`, `src/pages/*.tsx`
- Risk: Component regressions; state management bugs
- Priority: Medium

**E2E Tests Exist But Limited:**
- What's tested: 6 E2E specs (auth, event-map, monitor, navigation, search, timeline)
- What's not tested: Dashboard, Analysis, Community, Profile, Settings pages
- Files: Missing `e2e/dashboard.spec.ts`, `e2e/analysis.spec.ts`, `e2e/community.spec.ts`
- Risk: User flow regressions on untested pages
- Priority: Medium

**No Integration Tests:**
- What's not tested: Database operations, external API integrations, WebSocket flows
- Risk: Integration failures between layers
- Priority: Medium

---

*Concerns audit: 2026-04-18*
