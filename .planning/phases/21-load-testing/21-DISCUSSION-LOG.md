# Phase 21: Load Testing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 21-load-testing
**Areas discussed:** Test scope & scenarios, k6 script organization, CI integration, Performance baselines

---

## Test scope & scenarios

| Option | Description | Selected |
|--------|-------------|----------|
| Critical endpoints only | /api/news, /api/auth/login, /api/ai/ask, /api/bookmarks — the high-traffic and critical paths | |
| All API endpoints | Full coverage including /events, /analysis, /translate, /markets — more comprehensive but longer tests | |
| Read-heavy only | Focus on GET endpoints: news, events, markets — skip auth and write operations | |

**User's choice:** Critical endpoints only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic user journey | Login -> browse news -> ask AI -> bookmark — mimics real user sessions | |
| Isolated endpoint stress | Hammer individual endpoints separately — finds per-endpoint limits | |
| Spike pattern | Sudden traffic bursts (0 -> 10k users in 30s) — tests autoscaling/recovery | |

**User's choice:** Realistic user journey (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-seeded test accounts | Create 100 test users before test, rotate through them — realistic auth load | |
| Single shared token | One JWT for all virtual users — simpler but skips auth under load | |
| Register during test | Each VU registers fresh — tests registration under load but rate limits hit fast | |

**User's choice:** Pre-seeded test accounts (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Gradual ramp-up | 0 -> 1k -> 5k -> 10k over 10 minutes — identifies at what load point issues appear | |
| Immediate full load | Jump straight to 10k VUs — faster test but harder to diagnose where breakdown occurs | |
| Step function | Hold at each tier (1k, 5k, 10k) for 2 minutes — measures steady-state at each level | |

**User's choice:** Gradual ramp-up (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include with realistic ratio | ~5% of requests go to /api/ai/ask — realistic but watch rate limits | |
| Exclude AI endpoint | Skip AI testing entirely — avoids rate limit complexity | |
| Separate AI-only test | Test AI endpoint in isolation with lower VU count | |

**User's choice:** Include with realistic ratio (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Read-heavy ratio | 90% reads (news browse) / 10% writes (bookmarks) — matches typical user behavior | |
| Heavy writes | 50/50 read/write — stress-tests database write capacity | |
| Reads only | Skip all POST/PUT operations — simplifies test but misses write bottlenecks | |

**User's choice:** Read-heavy ratio (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Record & continue | Log 429 responses as expected behavior, don't count as failures — rate limits are working as designed | |
| Disable rate limits for test | Turn off rate limiting during load test via env var — tests raw backend capacity | |
| Fail on any 429 | Treat rate limit hits as test failures — tests whether limits are too aggressive | |

**User's choice:** Record & continue (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude for now | Focus on REST API load first — WebSocket testing is more complex | |
| Include basic WS load | Establish WS connections during test — tests connection handling under load | |
| WS-only separate test | Dedicated WebSocket stress test — isolates real-time capacity | |

**User's choice:** Exclude for now (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Staging environment | Run load tests against staging — isolates from production, same Docker setup | |
| Local Docker Compose | Run against local docker-compose up — good for development but not representative | |
| Production (careful) | Test real production — realistic but risky, needs off-peak timing | |

**User's choice:** Staging environment (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch real article IDs | First fetch /api/news to get real IDs, then bookmark those — realistic but adds dependency | |
| Pre-seeded test articles | Create test articles in DB before test — consistent but needs data setup script | |
| Random UUIDs | Use random IDs expecting 404s — tests error handling but not happy path | |

**User's choice:** Fetch real article IDs (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 10 minutes total | Ramp up 5min, hold peak 3min, ramp down 2min — enough to find issues | |
| 30 minutes (soak test) | Extended run to find memory leaks and connection pool exhaustion | |
| 5 minutes quick | Fast feedback loop — use during development | |

**User's choice:** 10 minutes total (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, collect from /metrics | Use k6's Prometheus integration to scrape app metrics — correlates load with internal metrics | |
| k6 metrics only | Rely on k6's built-in metrics — simpler but no correlation with app internals | |
| Grafana dashboard only | Observe via existing Grafana dashboard during test — manual correlation | |

**User's choice:** Yes, collect from /metrics (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include smoke test | 1-minute test with 10 VUs to verify test scripts work — run before full load | |
| No separate smoke test | Full test only — simpler but slower feedback loop | |

**User's choice:** Yes, include smoke test (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip geo distribution | Single location test — k6 Cloud needed for multi-geo, keep it simple | |
| Document for future | Note multi-geo as future enhancement — current test is single-location only | |

**User's choice:** Skip geo distribution (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Varied realistic questions | Pool of 10-20 typical user questions — tests different context sizes | |
| Single repeated question | Same question repeated — simpler but may hit AI caching | |
| Random generated questions | Programmatically vary questions — avoids cache but may be unrealistic | |

**User's choice:** Varied realistic questions (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status codes + basic schema | Check 200/429 status and that response has expected structure — catches silent failures | |
| Status codes only | Just check HTTP status — faster but misses data issues | |
| Full response validation | Verify all fields match expected values — thorough but heavy overhead | |

**User's choice:** Status codes + basic schema (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, realistic pauses | 1-3 second random delays between requests — realistic user behavior | |
| Minimal delays | 100ms between requests — higher load per VU, stress test mode | |
| No delays | Fire as fast as possible — maximum stress but unrealistic | |

**User's choice:** Yes, realistic pauses (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hard requirement | Test MUST pass at 10k VUs or the phase is not complete | |
| Best effort | Document actual capacity achieved, even if below 10k | |
| Tiered targets | Pass at 5k (minimum), stretch goal 10k | |

**User's choice:** Hard requirement (Recommended)

---

## k6 script organization

| Option | Description | Selected |
|--------|-------------|----------|
| k6/ directory at root | Separate directory: k6/scripts/, k6/lib/, k6/config/ — clear separation | |
| tests/load/ | Inside tests directory alongside Vitest and Playwright | |
| loadtest/ | Standalone loadtest/ directory at root | |

**User's choice:** k6/ directory at root (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Scenario-based | One main script with scenarios: smoke, load, stress — share common code | |
| Endpoint-based | Separate script per endpoint group (news.js, auth.js, ai.js) | |
| Single monolith | One big script with all logic — simple but hard to maintain | |

**User's choice:** Scenario-based (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| JavaScript | k6 native — no build step needed, direct execution | |
| TypeScript | Type safety — requires webpack/esbuild bundling before k6 run | |

**User's choice:** JavaScript (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variables | K6_BASE_URL, K6_VUS env vars — flexible for CI and local | |
| Separate config files | config/local.json, config/ci.json — version controlled presets | |
| Command line flags | Pass --env K6_VUS=100 on each run — explicit but verbose | |

**User's choice:** Environment variables (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, lib/ directory | k6/lib/auth.js, k6/lib/checks.js — reusable across scenarios | |
| Inline in main script | Keep it simple — all code in one file for now | |

**User's choice:** Yes, lib/ directory (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| JSON file in k6/data/ | users.json with test accounts — easy to regenerate and gitignore | |
| Environment variable | K6_TEST_USERS as JSON string — flexible but verbose | |
| Generate on the fly | Random user credentials each run — needs DB setup capability | |

**User's choice:** JSON file in k6/data/ (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per scenario | Smoke test: looser thresholds, Load test: strict — different expectations | |
| Global thresholds | Same p95/p99 for all scenarios — simpler but less flexible | |
| No thresholds | Just collect metrics, analyze manually — exploratory mode | |

**User's choice:** Per scenario (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add npm scripts | npm run load:smoke, npm run load:full — discoverable and consistent | |
| Direct k6 commands | Document k6 run commands in README — less abstraction | |

**User's choice:** Yes, add npm scripts (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, questions.json | k6/data/questions.json with 10-20 sample questions — realistic variety | |
| Hardcoded in script | Array of questions in the script file — simpler but less maintainable | |

**User's choice:** Yes, questions.json (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| JSON output + script to HTML | k6 outputs JSON, convert to HTML with k6-reporter — CI artifact | |
| Console output only | Summary in terminal — simple but no artifacts | |
| k6 Cloud integration | Send to k6 Cloud for visualization — requires account | |

**User's choice:** JSON output + script to HTML (Recommended)

---

## CI integration

| Option | Description | Selected |
|--------|-------------|----------|
| Manual dispatch only | workflow_dispatch — expensive test, run on demand before releases | |
| Nightly schedule | Run every night at 2am — catch regressions automatically | |
| On release tags | Run when v*.*.* tag created — validate before release | |
| On PR to main | Run on every PR — comprehensive but slow | |

**User's choice:** Manual dispatch only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full load test | 10k VUs, 10 minutes — validate the 10k user requirement | |
| Smoke test only | Quick validation that scripts work — faster but not load validation | |
| Both in sequence | Smoke first (fail fast), then full load — comprehensive but longer | |

**User's choice:** Full load test (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fail workflow | k6 exits non-zero on threshold breach — blocks release | |
| Warning only | Continue workflow, annotate results — advisory not blocking | |
| Create issue | Auto-create GitHub issue on failure — async follow-up | |

**User's choice:** Fail workflow (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions artifacts | Upload JSON and HTML report as workflow artifact — 30-day retention | |
| Commit to repo | Commit results to results/ directory — permanent history | |
| External storage | Upload to S3/GCS — requires extra setup | |

**User's choice:** GitHub Actions artifacts (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| grafana/k6-action | Official k6 GitHub Action — handles installation automatically | |
| apt-get install | Install via package manager in workflow — more control | |
| Docker k6 | Run k6 in Docker container — isolated but adds complexity | |

**User's choice:** grafana/k6-action (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hit existing staging | Staging already deployed — just run k6 against STAGING_URL | |
| Docker Compose in CI | Start app in CI runner — self-contained but resource-intensive | |
| Parameterized | Accept target URL as workflow input — flexible for any environment | |

**User's choice:** Hit existing staging (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, create summary | Add summary with p95, p99, pass/fail status — visible in Actions UI | |
| No summary | Just artifacts — need to download to see results | |

**User's choice:** Yes, create summary (Recommended)

---

## Performance baselines

| Option | Description | Selected |
|--------|-------------|----------|
| < 500ms | Fast news browsing — typical SPA expectation | |
| < 1 second | Relaxed target — allows for complex queries | |
| < 200ms | Very aggressive — may need CDN/edge caching | |

**User's choice:** < 500ms (Recommended) for /api/news p95

---

| Option | Description | Selected |
|--------|-------------|----------|
| < 5 seconds | AI responses take time — users expect wait | |
| < 3 seconds | Faster AI — may require response streaming | |
| < 10 seconds | Very relaxed — complex queries may need this | |

**User's choice:** < 5 seconds (Recommended) for /api/ai/ask p95

---

| Option | Description | Selected |
|--------|-------------|----------|
| < 300ms | Fast login — bcrypt hashing is the bottleneck | |
| < 500ms | Relaxed — allows for rate limiting overhead | |
| < 1 second | Very relaxed — may indicate auth issues | |

**User's choice:** < 300ms (Recommended) for /api/auth/login p95

---

| Option | Description | Selected |
|--------|-------------|----------|
| < 1% non-429 errors | Exclude rate limit responses from error count | |
| < 0.1% total errors | Very strict — any error is concerning | |
| < 5% errors | Relaxed — allows for some failures under load | |

**User's choice:** < 1% non-429 errors (Recommended)

---

## Claude's Discretion

- Exact k6 scenario stage configurations
- k6-reporter integration details
- GitHub Actions summary formatting
- Exact think time distribution (uniform vs exponential)
- k6 option defaults (iterations, duration per scenario)
- Test user seeding script approach

## Deferred Ideas

None
