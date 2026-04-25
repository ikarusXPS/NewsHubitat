# Phase 21: Load Testing - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate system handles 10,000 concurrent users with documented performance baselines. This phase implements LOAD-01 through LOAD-04 from v1.3 requirements.

**Delivers:**
- k6 test scripts for critical endpoints (news, auth, AI, bookmarks)
- System stability validation at 10,000 concurrent virtual users
- CI workflow for on-demand load testing
- Performance baseline documentation (p95, p99 latency thresholds)

</domain>

<decisions>
## Implementation Decisions

### Test Scope & Scenarios

- **D-01:** Critical endpoints only: /api/news, /api/auth/login, /api/ai/ask, /api/bookmarks
- **D-02:** Realistic user journey pattern: login -> browse news -> ask AI -> bookmark
- **D-03:** Pre-seeded test accounts (100 users) for authentication testing
- **D-04:** Gradual ramp-up: 0 -> 1k -> 5k -> 10k VUs over 10 minutes
- **D-05:** Include AI endpoint with realistic ratio (~5% of requests)
- **D-06:** Read-heavy ratio: 90% reads (news browse) / 10% writes (bookmarks)
- **D-07:** 429 rate limit responses recorded but not counted as failures
- **D-08:** Exclude WebSocket testing for now (focus on REST API)
- **D-09:** Run against staging environment
- **D-10:** Fetch real article IDs from /api/news for bookmark operations
- **D-11:** 10 minutes total duration (5min ramp, 3min peak, 2min ramp down)
- **D-12:** Collect Prometheus metrics from /metrics during test run
- **D-13:** Include smoke test variant (1 minute, 10 VUs) for quick validation
- **D-14:** Skip geographic distribution (single location test)
- **D-15:** Pool of 10-20 varied realistic AI questions
- **D-16:** Validate status codes + basic schema (catch silent failures)
- **D-17:** Realistic think times: 1-3 second random delays between requests
- **D-18:** 10k concurrent users is a hard requirement (not aspirational)

### k6 Script Organization

- **D-19:** Scripts in `k6/` directory at project root
- **D-20:** Scenario-based organization: one main script with smoke, load, stress scenarios
- **D-21:** JavaScript (not TypeScript) for k6 scripts — no build step needed
- **D-22:** Configuration via environment variables (K6_BASE_URL, K6_VUS)
- **D-23:** Reusable helpers in `k6/lib/` directory (auth.js, checks.js)
- **D-24:** Test user credentials in `k6/data/users.json` (gitignored)
- **D-25:** Per-scenario thresholds (smoke: looser, load: strict)
- **D-26:** npm scripts: `npm run load:smoke`, `npm run load:full`
- **D-27:** Test data files: `k6/data/questions.json` for AI questions
- **D-28:** JSON output with k6-reporter for HTML report generation

### CI Integration

- **D-29:** Manual dispatch only (workflow_dispatch) — expensive test, run on demand
- **D-30:** CI runs full load test (10k VUs, 10 minutes)
- **D-31:** Workflow fails on threshold breach — blocks release
- **D-32:** Artifacts uploaded to GitHub Actions (JSON + HTML report, 30-day retention)
- **D-33:** Use grafana/k6-action for k6 installation
- **D-34:** Hit existing staging environment (STAGING_URL secret)
- **D-35:** Create GitHub Actions summary with p95, p99, pass/fail status

### Performance Baselines

- **D-36:** /api/news: p95 < 500ms
- **D-37:** /api/ai/ask: p95 < 5 seconds
- **D-38:** /api/auth/login: p95 < 300ms
- **D-39:** Error rate threshold: < 1% non-429 errors

### Claude's Discretion

- Exact k6 scenario stage configurations
- k6-reporter integration details
- GitHub Actions summary formatting
- Exact think time distribution (uniform vs exponential)
- k6 option defaults (iterations, duration per scenario)
- Test user seeding script approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/20-monitoring-alerting/20-CONTEXT.md` — Prometheus metrics endpoint, health endpoints
- `.planning/phases/17-docker-deployment/17-CONTEXT.md` — Docker Compose setup, staging deployment
- `.planning/phases/14-redis-caching/14-CONTEXT.md` — Rate limiting configuration (auth 5/min, AI 10/min, news 100/min)

### Existing Code
- `server/middleware/rateLimiter.ts` — Rate limit tiers and configuration
- `server/middleware/metricsMiddleware.ts` — Prometheus metrics collection
- `server/index.ts` lines 100-131 — API routes with rate limiting applied
- `docker-compose.yml` — Staging deployment configuration

### Requirements
- `.planning/REQUIREMENTS.md` — LOAD-01 through LOAD-04 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/metrics` endpoint: Prometheus metrics for correlating load test with app internals
- `/health`, `/readiness` endpoints: Verify system health during test
- Rate limit configuration: Understand limits when designing test scenarios

### Established Patterns
- Rate limiting tiers: auth (5/min/IP), AI (10/min/user), news (100/min/IP)
- Prometheus metrics: http_request_duration_seconds, http_requests_total with route labels
- Health checks: 3s timeout, parallel DB + Redis checks

### Integration Points
- `package.json`: Add npm scripts for k6 test execution
- `.github/workflows/`: Add load-test.yml workflow
- `k6/`: New directory for all load testing code

</code_context>

<specifics>
## Specific Ideas

- k6 outputs JSON, post-process with k6-reporter for HTML
- Smoke test is quick validation before full load test
- Test users should be deterministic (same 100 users each run)
- AI questions should be varied to avoid cache hits
- Rate limit 429s are expected and should be tracked separately from errors
- Prometheus metrics collection helps correlate k6 metrics with app-side observations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-load-testing*
*Context gathered: 2026-04-23*
