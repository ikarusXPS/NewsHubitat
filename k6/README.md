# NewsHub Load Testing

Load testing suite using [Grafana k6](https://k6.io/) to validate system stability under high concurrent user load.

## Overview

This directory contains k6 test scripts that simulate realistic user journeys with gradual ramp-up to **10,000 concurrent virtual users** (D-18). Tests validate critical API endpoints (/api/news, /api/auth/login, /api/ai/ask, /api/bookmarks) with performance thresholds based on production requirements.

**Test Scenarios:**
- **Smoke Test** (D-13): 1 minute, 10 VUs - Quick validation before full load test
- **Load Test** (D-04, D-11): 10 minutes, 0→10k VUs - Full production capacity validation

**User Journey Pattern** (D-02):
1. Login (100% of requests)
2. Browse news (90% read-heavy, D-06)
3. Ask AI (~5% of requests, D-05)
4. Bookmark article (~10% writes, D-06)

## Performance Baselines (D-36, D-37, D-38, D-39)

**LOAD-04 Requirement:** Performance baselines documented with p95 and p99 latency thresholds.

| Endpoint | p95 Latency Threshold | p99 Latency Threshold | Rationale |
|----------|------------------------|------------------------|-----------|
| `/api/news` | < 500ms (D-36) | < 1500ms | News browsing is primary user flow; fast response critical for UX |
| `/api/ai/ask` | < 5000ms (D-37) | < 15000ms | AI analysis involves external API calls; 5s acceptable for complex queries |
| `/api/auth/login` | < 300ms (D-38) | < 1000ms | Login is first impression; must be instant (<300ms) |
| **Overall Error Rate** | **< 1%** (D-39) | — | Excludes expected 429 rate limit responses (D-07) |

**Why these thresholds?**
- **p95**: 95% of requests must meet this threshold (reasonable expectation for most users)
- **p99**: 99% of requests must stay under this limit (catches edge cases, prevents worst-case experiences)
- **<1% error rate**: High availability target (99%+ success rate for production)

**Rate Limiting (D-07):** 429 responses are expected and NOT counted as errors. Rate limits per server/config/rateLimits.ts:
- Auth endpoints: 5 req/min per IP
- AI endpoints: 10 req/min per user
- News endpoints: 100 req/min per IP

## Prerequisites

### Local Execution

Install k6 (load tests can also run in CI without local installation):

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Test User Setup (D-03)

Load tests require 100 pre-seeded test users. Create them once before first test run:

```bash
# 1. Ensure database is running
docker compose up -d postgres

# 2. Seed test users (creates loadtest1@example.com through loadtest100@example.com)
npm run seed:load-test

# 3. Verify users.json was created (gitignored per D-24)
ls k6/data/users.json
```

**Security Note:** `k6/data/users.json` contains plain passwords and is gitignored. Never commit this file.

## Usage

### Local Execution

```bash
# Smoke test (1 minute, 10 VUs) - D-13
K6_BASE_URL=http://localhost:3001 k6 run k6/load-test.js --env K6_SCENARIO=smoke

# Full load test (10 minutes, 10k VUs) - D-04, D-11
K6_BASE_URL=http://localhost:3001 k6 run k6/load-test.js --env K6_SCENARIO=load

# Custom VU count (override default)
K6_BASE_URL=http://localhost:3001 K6_VUS=5000 k6 run k6/load-test.js
```

**Environment Variables (D-22):**
- `K6_BASE_URL`: Target server URL (default: http://localhost:3001)
- `K6_SCENARIO`: Scenario to run - smoke or load (default: load)
- `K6_VUS`: Max VU count override (default: 10000)

### CI Execution (D-29)

**LOAD-03 Requirement:** Load tests run as part of CI pipeline on demand.

Load tests run via GitHub Actions **manual dispatch** (workflow_dispatch) - not on every PR/push due to cost.

**To trigger a load test:**
1. Go to GitHub repo → Actions tab
2. Select "Load Test" workflow
3. Click "Run workflow"
4. Choose scenario: `smoke` (1 min) or `load` (10 min)
5. Click "Run workflow"

**CI Artifacts (D-32):**
- `summary.json`: Machine-readable test results
- `summary.html`: Human-readable HTML report with charts
- Retention: 30 days

**Threshold Validation (D-31):**
CI workflow fails if any performance threshold is breached. This blocks release until performance is restored.

## File Structure (D-19, D-20, D-23)

```
k6/
├── load-test.js              # Main test script with smoke/load scenarios
├── lib/
│   ├── auth.js               # Authentication helper (login, token management)
│   ├── checks.js             # Reusable check functions (status, schema validation)
│   └── config.js             # Environment variable loading
├── data/
│   ├── users.json            # Test user credentials (gitignored, D-24)
│   └── questions.json        # AI question pool (version-controlled, D-27)
└── README.md                 # This file
```

## Test Data (D-15, D-27)

- **users.json** (gitignored): 100 test users with plain passwords (loadtest1@example.com through loadtest100@example.com)
- **questions.json**: 15 varied AI questions to prevent cache hits

## Troubleshooting

### Error: "users.json not found"

Run the seeding script:
```bash
npm run seed:load-test
```

### Error: "Connection refused"

Ensure staging server is running:
```bash
# Local
npm run dev

# Docker
docker compose up -d
```

### Error: "Too many 429 responses"

Expected behavior (D-07). 429 rate limit responses are NOT counted as errors. Check GitHub Actions summary for actual error rate (<1% threshold).

If error rate exceeds threshold, rate limits may need adjustment in `server/config/rateLimits.ts`.

### Error: "Threshold breached"

Performance regression detected. Investigate:
1. Check GitHub Actions summary for which threshold failed (p95, p99, error rate)
2. Review Prometheus metrics at `/metrics` during test run (D-12)
3. Check database query performance
4. Check AI provider latency
5. Check Redis connection pool

## References

- [Grafana k6 Documentation](https://k6.io/docs/)
- [k6 Scenarios](https://k6.io/docs/using-k6/scenarios/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [benc-uk/k6-reporter](https://github.com/benc-uk/k6-reporter)

---

**Phase:** 21-load-testing
**Context:** D-01 through D-39 from `.planning/phases/21-load-testing/21-CONTEXT.md`
**Requirements:** LOAD-01, LOAD-03, LOAD-04
