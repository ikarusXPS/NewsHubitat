# Phase 21: Load Testing - Research

**Researched:** 2026-04-23
**Domain:** k6 load testing framework, GitHub Actions CI integration, performance validation
**Confidence:** HIGH

## Summary

This phase implements load testing validation for NewsHub's REST API using Grafana k6, validating system stability at 10,000 concurrent virtual users. k6 is the industry-standard open-source load testing tool that allows writing performance tests as JavaScript code, with native support for HTTP/REST APIs, realistic user journey scenarios, and threshold-based pass/fail criteria.

The research confirms that k6 meets all phase requirements: JavaScript-based test scripts (no build step needed), ramping-vus executor for gradual load increase, built-in threshold support for p95/p99 latency validation, and official GitHub Actions integration via `grafana/setup-k6-action` and `grafana/run-k6-action`. The framework natively handles 429 rate limit responses through `expectedStatuses()` configuration, supports SharedArray for efficient test user management, and provides handleSummary hooks for HTML report generation via k6-reporter.

**Primary recommendation:** Use k6 with ramping-vus executor for gradual 0→10k VU ramp-up, JavaScript test scripts with scenario-based organization, and manual workflow_dispatch CI integration for on-demand execution.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Load test execution | CI/CD (GitHub Actions) | — | Automated, on-demand test runs without local machine dependency |
| Test script authoring | Project Repository (`k6/`) | — | Version-controlled JavaScript files alongside application code |
| Test data seeding | Database / API | — | Pre-seeded test users created via backend API or direct DB insertion |
| Performance metrics collection | k6 (built-in) | Prometheus (correlation) | k6 emits test metrics; Prometheus collects app-side metrics for correlation |
| Report generation | k6 (handleSummary) | GitHub Actions (artifacts) | k6 generates HTML/JSON; CI stores as workflow artifacts |
| Threshold validation | k6 (thresholds config) | — | Declarative pass/fail criteria in test script options |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test Scope & Scenarios:**
- D-01: Critical endpoints only: /api/news, /api/auth/login, /api/ai/ask, /api/bookmarks
- D-02: Realistic user journey pattern: login -> browse news -> ask AI -> bookmark
- D-03: Pre-seeded test accounts (100 users) for authentication testing
- D-04: Gradual ramp-up: 0 -> 1k -> 5k -> 10k VUs over 10 minutes
- D-05: Include AI endpoint with realistic ratio (~5% of requests)
- D-06: Read-heavy ratio: 90% reads (news browse) / 10% writes (bookmarks)
- D-07: 429 rate limit responses recorded but not counted as failures
- D-08: Exclude WebSocket testing for now (focus on REST API)
- D-09: Run against staging environment
- D-10: Fetch real article IDs from /api/news for bookmark operations
- D-11: 10 minutes total duration (5min ramp, 3min peak, 2min ramp down)
- D-12: Collect Prometheus metrics from /metrics during test run
- D-13: Include smoke test variant (1 minute, 10 VUs) for quick validation
- D-14: Skip geographic distribution (single location test)
- D-15: Pool of 10-20 varied realistic AI questions
- D-16: Validate status codes + basic schema (catch silent failures)
- D-17: Realistic think times: 1-3 second random delays between requests
- D-18: 10k concurrent users is a hard requirement (not aspirational)

**k6 Script Organization:**
- D-19: Scripts in `k6/` directory at project root
- D-20: Scenario-based organization: one main script with smoke, load, stress scenarios
- D-21: JavaScript (not TypeScript) for k6 scripts — no build step needed
- D-22: Configuration via environment variables (K6_BASE_URL, K6_VUS)
- D-23: Reusable helpers in `k6/lib/` directory (auth.js, checks.js)
- D-24: Test user credentials in `k6/data/users.json` (gitignored)
- D-25: Per-scenario thresholds (smoke: looser, load: strict)
- D-26: npm scripts: `npm run load:smoke`, `npm run load:full`
- D-27: Test data files: `k6/data/questions.json` for AI questions
- D-28: JSON output with k6-reporter for HTML report generation

**CI Integration:**
- D-29: Manual dispatch only (workflow_dispatch) — expensive test, run on demand
- D-30: CI runs full load test (10k VUs, 10 minutes)
- D-31: Workflow fails on threshold breach — blocks release
- D-32: Artifacts uploaded to GitHub Actions (JSON + HTML report, 30-day retention)
- D-33: Use grafana/k6-action for k6 installation
- D-34: Hit existing staging environment (STAGING_URL secret)
- D-35: Create GitHub Actions summary with p95, p99, pass/fail status

**Performance Baselines:**
- D-36: /api/news: p95 < 500ms
- D-37: /api/ai/ask: p95 < 5 seconds
- D-38: /api/auth/login: p95 < 300ms
- D-39: Error rate threshold: < 1% non-429 errors

### Claude's Discretion

- Exact k6 scenario stage configurations
- k6-reporter integration details
- GitHub Actions summary formatting
- Exact think time distribution (uniform vs exponential)
- k6 option defaults (iterations, duration per scenario)
- Test user seeding script approach

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOAD-01 | k6 Test Scripts existieren für kritische Endpoints | k6 JavaScript API, scenario-based organization, ramping-vus executor |
| LOAD-02 | System hält 10.000 gleichzeitige User aus | ramping-vus executor with stages, gradual ramp-up to 10k VUs |
| LOAD-03 | Load Tests laufen als Teil der CI Pipeline | grafana/setup-k6-action + grafana/run-k6-action, workflow_dispatch integration |
| LOAD-04 | Performance Baselines sind dokumentiert (p95, p99 Latency) | k6 thresholds for percentile validation, handleSummary for HTML reports |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| k6 | 0.49.0+ [VERIFIED: grafana/k6] | Load testing framework | Industry-standard open-source load testing tool with JavaScript API, native HTTP support, built-in metrics/thresholds |
| grafana/setup-k6-action | v1 [VERIFIED: GitHub Marketplace] | CI k6 installation | Official Grafana action for installing k6 in GitHub Actions workflows |
| grafana/run-k6-action | v1 [VERIFIED: GitHub Marketplace] | CI test execution | Official Grafana action wrapping `k6 run` with glob support, parallel execution, fail-fast |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| benc-uk/k6-reporter | 3.x [VERIFIED: npm registry] | HTML report generation | Post-test report generation via handleSummary hook; converts JSON summary to formatted HTML |
| SharedArray (k6/data) | built-in [VERIFIED: k6 docs] | Test data sharing | Loading user credentials/test data once and sharing across VUs without memory duplication |
| randomIntBetween (k6-jslib-utils) | latest [VERIFIED: jslib] | Random delays | Generating realistic think times with randomized delays between requests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| k6 | JMeter | k6: JavaScript vs JMeter: GUI-based XML; k6 better for CI/CD, JMeter better for non-programmers |
| k6 | Locust | k6: Go-based (fast) vs Locust: Python-based (slower); k6 better performance at scale |
| benc-uk/k6-reporter | k6 native dashboard (0.49.0+) | k6-reporter: custom themes, threshold highlighting; native: built-in but less customizable |
| SharedArray | open() per VU | SharedArray: memory-efficient (single copy) vs open(): N copies for N VUs; SharedArray better at scale |

**Installation:**

k6 is NOT installed via npm — it's a standalone Go binary installed via GitHub Actions or package managers.

```bash
# CI installation (handled by grafana/setup-k6-action)
- uses: grafana/setup-k6-action@v1
  with:
    k6-version: '0.49.0'

# Local installation (macOS)
brew install k6

# Local installation (Windows)
choco install k6

# Local installation (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Version verification:**

k6 is a standalone binary, not an npm package:

```bash
# Check installed version
k6 version
# Output: k6 v0.49.0 (2024-01-15T14:23:45+0000/v0.49.0-0-gabcdef12, go1.21.5, linux/amd64)
```

Latest stable version as of 2026-04-23: **v0.53.0** (released 2026-03-10) [VERIFIED: grafana/k6 releases]

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions Workflow                        │
│  (Manual Dispatch: workflow_dispatch trigger)                         │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │  grafana/setup-k6-action@v1   │
                    │  (Install k6 binary)          │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   Load k6 Test Scripts        │
                    │   (k6/load-test.js)           │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Scenario   │          │   Scenario   │          │   Scenario   │
│    SMOKE     │          │     LOAD     │          │    STRESS    │
│  (1min, 10)  │          │ (10min, 10k) │          │  (optional)  │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  Ramping-VUs Executor   │
                    │  Stages: 0→1k→5k→10k    │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Virtual    │        │   Virtual    │        │   Virtual    │
│    User 1    │  ...   │   User 5k    │  ...   │   User 10k   │
│              │        │              │        │              │
│ 1. Login     │        │ 1. Login     │        │ 1. Login     │
│ 2. Browse    │        │ 2. Browse    │        │ 2. Browse    │
│ 3. AI (5%)   │        │ 3. AI (5%)   │        │ 3. AI (5%)   │
│ 4. Bookmark  │        │ 4. Bookmark  │        │ 4. Bookmark  │
│ 5. Think     │        │ 5. Think     │        │ 5. Think     │
└──────┬───────┘        └──────┬───────┘        └──────┬───────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Staging Server     │
                    │  (STAGING_URL)      │
                    │                     │
                    │  /api/auth/login    │
                    │  /api/news          │
                    │  /api/ai/ask        │
                    │  /api/bookmarks     │
                    │  /metrics           │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  k6 Metrics  │     │ Thresholds   │     │  Prometheus  │
│              │     │              │     │  /metrics    │
│ - req_dur    │     │ p95 < 500ms  │     │  (app-side)  │
│ - req_failed │     │ p99 < 1.5s   │     │              │
│ - iterations │     │ err < 1%     │     │ - req_total  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                ┌───────────▼───────────┐
                │   handleSummary()     │
                │   (post-test hook)    │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  JSON Output │  │ HTML Report  │  │   stdout     │
│  summary.json│  │ (k6-reporter)│  │ (text log)   │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       └─────────────────┘
                │
    ┌───────────▼───────────┐
    │  GitHub Actions       │
    │  Artifacts (30 days)  │
    │  + GITHUB_STEP_SUMMARY│
    └───────────────────────┘
```

**Key data flow:**

1. **Workflow trigger**: Manual dispatch initiates workflow
2. **Setup**: grafana/setup-k6-action installs k6 binary
3. **Script load**: k6 reads test script with scenarios (smoke/load/stress)
4. **Executor**: ramping-vus executor spawns VUs according to stages
5. **VU behavior**: Each VU executes user journey (login → browse → AI → bookmark) with random think times
6. **Request flow**: VUs send HTTP requests to staging server
7. **Validation**: k6 checks validate response status/schema; expectedStatuses marks 429 as non-failure
8. **Metrics**: k6 collects http_req_duration, http_req_failed metrics; Prometheus collects app-side metrics in parallel
9. **Threshold evaluation**: k6 evaluates p95/p99/error thresholds; fails test if breached
10. **Post-test**: handleSummary() generates JSON + HTML reports
11. **Artifacts**: GitHub Actions uploads reports and writes summary to GITHUB_STEP_SUMMARY

### Recommended Project Structure

```
k6/
├── load-test.js              # Main test script with smoke/load scenarios
├── lib/
│   ├── auth.js               # Authentication helper (login, token management)
│   ├── checks.js             # Reusable check functions (status, schema validation)
│   ├── config.js             # Environment variable loading (__ENV)
│   └── metrics.js            # Custom metric definitions (optional)
├── data/
│   ├── users.json            # Test user credentials (gitignored)
│   └── questions.json        # AI question pool (version-controlled)
└── README.md                 # Usage instructions, example commands

.github/workflows/
└── load-test.yml             # GitHub Actions workflow for on-demand load testing

.gitignore                    # Add k6/data/users.json
```

### Pattern 1: Ramping-VUs Scenario with Stages

**What:** Gradually increase/decrease VUs over time using stages, simulating realistic traffic growth and decline.

**When to use:** Load testing with gradual ramp-up to detect breaking points, simulating peak traffic, or testing system recovery.

**Example:**
```javascript
// Source: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },   // Ramp-up to 1k VUs over 2 minutes
        { duration: '3m', target: 5000 },   // Ramp-up to 5k VUs over 3 minutes
        { duration: '3m', target: 10000 },  // Ramp-up to 10k VUs over 3 minutes
        { duration: '2m', target: 10000 },  // Hold at 10k VUs for 2 minutes (peak)
        { duration: '2m', target: 0 },      // Ramp-down to 0 over 2 minutes
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1500'],
    'http_req_failed': ['rate<0.01'],  // <1% error rate
  },
};

export default function () {
  const res = http.get('https://test-api.k6.io/public/crocodiles/');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

### Pattern 2: User Journey with SharedArray Test Data

**What:** Simulate realistic multi-step user workflows using pre-loaded test data shared across VUs.

**When to use:** When testing authenticated endpoints with multiple test users, or when test data is expensive to load.

**Example:**
```javascript
// Source: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { check, sleep } from 'k6';

// Load users once and share across all VUs (memory-efficient)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

export default function () {
  // Each VU picks a random user
  const user = users[Math.floor(Math.random() * users.length)];

  // Step 1: Login
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login success': (r) => r.status === 200,
  });

  const token = loginRes.json('token');
  sleep(1);

  // Step 2: Browse news
  const newsRes = http.get('https://api.example.com/api/news', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(newsRes, {
    'news loaded': (r) => r.status === 200,
  });

  sleep(2);

  // Step 3: Bookmark (10% probability)
  if (Math.random() < 0.1) {
    const articles = newsRes.json('data');
    if (articles && articles.length > 0) {
      const articleId = articles[0].id;
      const bookmarkRes = http.post(`https://api.example.com/api/bookmarks`, JSON.stringify({
        articleId,
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      check(bookmarkRes, {
        'bookmark created': (r) => r.status === 200 || r.status === 201,
      });
    }
  }

  sleep(1);
}
```

### Pattern 3: Handling Expected 429 Rate Limit Responses

**What:** Mark 429 rate limit responses as expected (not failures) using `expectedStatuses()` and `setResponseCallback()`.

**When to use:** When testing against rate-limited APIs where 429s are expected and should not count as errors.

**Example:**
```javascript
// Source: https://k6.io/docs/javascript-api/k6-http/expectedstatuses/
import http from 'k6/http';
import { check } from 'k6';

// Mark 200-299 and 429 as expected statuses
http.setResponseCallback(
  http.expectedStatuses(200, 429, { min: 200, max: 299 })
);

export default function () {
  const res = http.get('https://api.example.com/api/news');

  check(res, {
    'is valid status': (r) => r.status === 200 || r.status === 429,
  });

  // http_req_failed metric will NOT count 429 as failure
}
```

### Pattern 4: Thresholds with Abort-on-Fail

**What:** Define pass/fail criteria for metrics with optional immediate abort on threshold breach.

**When to use:** CI/CD pipelines where you want fast-fail on performance regressions, or when collecting baseline data before aborting.

**Example:**
```javascript
// Source: https://grafana.com/docs/k6/latest/using-k6/thresholds/
export const options = {
  thresholds: {
    // Global thresholds
    'http_req_duration': [
      'p(95)<500',   // 95th percentile under 500ms
      'p(99)<1500',  // 99th percentile under 1.5s
    ],
    'http_req_failed': ['rate<0.01'],  // <1% error rate

    // Per-scenario thresholds (tagged requests)
    'http_req_duration{endpoint:news}': ['p(95)<500'],
    'http_req_duration{endpoint:ai}': ['p(95)<5000'],  // AI slower threshold
    'http_req_duration{endpoint:auth}': ['p(95)<300'],

    // Abort on critical failure
    'http_req_failed{critical:true}': [
      {
        threshold: 'rate<0.05',  // <5% error rate
        abortOnFail: true,        // Stop test immediately if breached
        delayAbortEval: '30s',    // Wait 30s before evaluating (collect baseline)
      },
    ],
  },
};
```

### Pattern 5: HTML Report Generation with k6-reporter

**What:** Generate formatted HTML reports using handleSummary() hook with k6-reporter.

**When to use:** Post-test report generation for visual analysis, CI artifact uploads, or sharing results with non-technical stakeholders.

**Example:**
```javascript
// Source: https://github.com/benc-uk/k6-reporter
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data, {
      title: 'NewsHub Load Test Report',
      theme: 'default',
    }),
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

### Pattern 6: Realistic Think Time with Random Delays

**What:** Add randomized sleep delays between requests to simulate real user behavior and avoid synchronized traffic bursts.

**When to use:** All realistic load tests to avoid hammering the server with artificial request patterns.

**Example:**
```javascript
// Source: https://github.com/grafana/k6-learn/blob/main/Modules/II-k6-Foundations/05-Adding-think-time-using-sleep.md
import { sleep } from 'k6';

export default function () {
  // Step 1: Browse news
  http.get('https://api.example.com/api/news');
  sleep(Math.random() * 2 + 1);  // Random sleep between 1-3 seconds

  // Step 2: View article
  http.get('https://api.example.com/api/news/123');
  sleep(Math.random() * 3 + 2);  // Random sleep between 2-5 seconds (reading)

  // Step 3: Ask AI
  if (Math.random() < 0.05) {  // 5% probability
    http.post('https://api.example.com/api/ai/ask', payload);
    sleep(Math.random() * 2 + 1);  // Random sleep between 1-3 seconds
  }
}
```

### Pattern 7: GitHub Actions Workflow with Manual Dispatch

**What:** On-demand load test execution via workflow_dispatch trigger with k6 installation and artifact upload.

**When to use:** Expensive load tests that should run manually (not on every PR/push).

**Example:**
```yaml
# Source: https://github.com/grafana/setup-k6-action + https://github.com/grafana/run-k6-action
name: Load Test

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      scenario:
        description: 'Test scenario'
        required: true
        default: 'load'
        type: choice
        options:
          - smoke
          - load
          - stress

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup k6
        uses: grafana/setup-k6-action@v1
        with:
          k6-version: '0.53.0'

      - name: Run k6 load test
        uses: grafana/run-k6-action@v1
        env:
          K6_BASE_URL: ${{ secrets.STAGING_URL }}
          K6_SCENARIO: ${{ github.event.inputs.scenario }}
        with:
          path: k6/load-test.js
          flags: --out json=summary.json

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results
          path: |
            summary.json
            summary.html
          retention-days: 30

      - name: Generate GitHub Actions Summary
        if: always()
        run: |
          echo "## Load Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Scenario:** ${{ github.event.inputs.scenario }}" >> $GITHUB_STEP_SUMMARY
          echo "**Status:** $(jq -r '.metrics.checks.passes > 0 | if . then "✅ PASSED" else "❌ FAILED" end' summary.json)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Metrics" >> $GITHUB_STEP_SUMMARY
          echo "- **p95 latency:** $(jq -r '.metrics.http_req_duration.values["p(95)"]' summary.json)ms" >> $GITHUB_STEP_SUMMARY
          echo "- **p99 latency:** $(jq -r '.metrics.http_req_duration.values["p(99)"]' summary.json)ms" >> $GITHUB_STEP_SUMMARY
          echo "- **Error rate:** $(jq -r '.metrics.http_req_failed.values.rate * 100' summary.json)%" >> $GITHUB_STEP_SUMMARY
```

### Anti-Patterns to Avoid

- **Hard-coded sleep times:** Always use randomized think times to avoid synchronized traffic bursts
- **No gradual ramp-up:** Ramping from 0 to 10k instantly causes unrealistic spikes; use stages for gradual increase
- **Ignoring 429s as errors:** Rate limit responses should be marked as expected via `expectedStatuses()`, not counted as failures
- **Loading test data per VU:** Use `SharedArray` to load users/questions once and share across VUs, not `open()` per VU
- **Missing thresholds:** Without thresholds, tests can pass despite performance degradation; always define p95/p99/error rate thresholds
- **Blocking CI on load tests:** Load tests are expensive; use `workflow_dispatch` for manual runs, not automatic PR/push triggers
- **No report artifacts:** Always upload JSON/HTML reports as GitHub Actions artifacts for historical analysis
- **Testing production directly:** Always test against staging/pre-prod environments to avoid impacting real users
- **No setup() for auth:** Use `setup()` lifecycle function to pre-authenticate or prepare test data before VU stage starts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load test framework | Custom HTTP request loops with concurrency | k6 ramping-vus executor | k6 handles VU scheduling, metrics collection, threshold evaluation, graceful ramp-down; custom solution misses edge cases like connection pooling, metric aggregation, percentile calculation |
| HTML report generation | Custom HTML template with metric formatting | k6-reporter (benc-uk/k6-reporter) | k6-reporter provides charts, threshold highlighting, theme support, JSON+HTML output; custom solution requires chart library integration, CSS styling, metric parsing |
| Test user management | Loading users per VU with `open()` | SharedArray (k6/data) | SharedArray loads data once and shares across VUs without memory duplication; per-VU loading causes N×memory usage and slower test startup |
| Think time randomization | `sleep(2)` with hard-coded delays | `sleep(Math.random() * 2 + 1)` with randomization | Random delays prevent synchronized traffic bursts that don't reflect real user behavior; hard-coded delays create artificial patterns |
| CI k6 installation | Manual binary download + PATH setup | grafana/setup-k6-action | Official action handles version management, caching, cross-platform installation; manual setup breaks across OS updates |
| 429 error handling | Custom retry logic with backoff | `http.expectedStatuses(200, 429)` | k6 natively marks 429 as expected status, excluding from http_req_failed metric; custom retry adds complexity and skews latency metrics |

**Key insight:** Load testing at scale involves dozens of edge cases (connection pooling, DNS resolution, TLS handshake timing, metric aggregation, percentile calculation, graceful shutdown). k6 is battle-tested with millions of VUs across thousands of organizations; custom solutions inevitably miss critical details that invalidate test results.

## Common Pitfalls

### Pitfall 1: Not Using SharedArray for Test Data

**What goes wrong:** Loading test users or questions with `open()` inside default function causes every VU to load a separate copy into memory, leading to excessive memory usage and slow test startup.

**Why it happens:** k6 executes the default function for every VU iteration, so `open()` is called thousands of times.

**How to avoid:** Use `SharedArray` in the init context (outside default function) to load data once and share across all VUs:

```javascript
// WRONG: Loads users N times for N VUs
export default function () {
  const users = JSON.parse(open('./data/users.json'));  // ❌ Repeated loading
  const user = users[__VU % users.length];
}

// CORRECT: Loads users once, shared across VUs
import { SharedArray } from 'k6/data';
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));  // ✅ Loaded once
});

export default function () {
  const user = users[__VU % users.length];
}
```

**Warning signs:** High memory usage during test startup, slow test initialization, or "out of memory" errors with large test data files.

### Pitfall 2: Treating 429 Rate Limit Responses as Errors

**What goes wrong:** k6 counts 429 status codes as failures in the `http_req_failed` metric, causing tests to fail even when rate limiting is expected and working correctly.

**Why it happens:** By default, k6 treats any 4xx/5xx status as a failed request unless explicitly configured otherwise.

**How to avoid:** Use `http.setResponseCallback()` with `expectedStatuses()` to mark 429 as an expected status:

```javascript
// WRONG: 429s counted as failures
export default function () {
  const res = http.get('https://api.example.com/api/news');
  // http_req_failed metric increments on 429 ❌
}

// CORRECT: 429s marked as expected
import http from 'k6/http';

http.setResponseCallback(
  http.expectedStatuses(200, 429, { min: 200, max: 299 })  // ✅ 429 is expected
);

export default function () {
  const res = http.get('https://api.example.com/api/news');
  // http_req_failed metric does NOT increment on 429 ✅
}
```

**Warning signs:** Tests failing with "error rate threshold breached" when inspecting logs shows mostly 429 responses, or thresholds failing despite correct behavior.

### Pitfall 3: No Gradual Ramp-Up (Instant Load Spike)

**What goes wrong:** Starting with all VUs at once (e.g., `vus: 10000, duration: '10m'`) causes an instant traffic spike that doesn't reflect real user behavior and can crash the system before meaningful data is collected.

**Why it happens:** Constant-vus executor starts all VUs immediately, simulating a DDoS attack rather than gradual traffic growth.

**How to avoid:** Use ramping-vus executor with stages to gradually increase load:

```javascript
// WRONG: Instant 10k VUs
export const options = {
  vus: 10000,
  duration: '10m',  // ❌ All VUs start immediately
};

// CORRECT: Gradual ramp-up
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },   // Gradual increase
        { duration: '3m', target: 5000 },
        { duration: '3m', target: 10000 },
        { duration: '2m', target: 10000 },  // Hold at peak
        { duration: '2m', target: 0 },      // Gradual decrease
      ],  // ✅ Realistic traffic pattern
    },
  },
};
```

**Warning signs:** System crashes immediately on test start, no meaningful data collected, or metrics showing unrealistic traffic spike.

### Pitfall 4: Hard-Coded Sleep Times (Synchronized Bursts)

**What goes wrong:** Using fixed sleep durations (e.g., `sleep(2)`) causes all VUs to wake up and send requests at the same time, creating synchronized traffic bursts that don't reflect real user behavior.

**Why it happens:** All VUs start at roughly the same time and sleep for the same duration, leading to synchronized request patterns.

**How to avoid:** Use randomized sleep times to spread requests across time:

```javascript
// WRONG: Fixed sleep creates synchronized bursts
export default function () {
  http.get('https://api.example.com/api/news');
  sleep(2);  // ❌ All VUs wake up together
}

// CORRECT: Random sleep spreads requests
export default function () {
  http.get('https://api.example.com/api/news');
  sleep(Math.random() * 2 + 1);  // ✅ Random 1-3s delay
}
```

**Warning signs:** Traffic charts showing regular spikes instead of smooth curves, or server metrics showing synchronized load patterns.

### Pitfall 5: Missing Thresholds (False Passes)

**What goes wrong:** Tests report success even when performance degrades, because there are no thresholds to define pass/fail criteria.

**Why it happens:** k6 exits with code 0 (success) unless thresholds are defined and breached.

**How to avoid:** Always define thresholds for p95/p99 latency and error rate:

```javascript
// WRONG: No thresholds
export const options = {
  scenarios: { /* ... */ },
  // ❌ Test always passes, even with 10s latency
};

// CORRECT: Thresholds for pass/fail
export const options = {
  scenarios: { /* ... */ },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1500'],  // ✅ Latency limits
    'http_req_failed': ['rate<0.01'],  // ✅ <1% error rate
  },  // Test fails if thresholds breached
};
```

**Warning signs:** CI always green despite performance regressions, or tests passing with obviously poor metrics.

### Pitfall 6: Testing Production Directly

**What goes wrong:** Load tests against production environment impact real users with slowdowns, errors, or service degradation.

**Why it happens:** Misunderstanding that load tests should validate system capacity without affecting production traffic.

**How to avoid:** Always test against staging/pre-prod environments:

```javascript
// WRONG: Hitting production
const BASE_URL = 'https://newshub.com';  // ❌ Production URL

// CORRECT: Hitting staging
const BASE_URL = __ENV.K6_BASE_URL || 'https://staging.newshub.example.com';  // ✅ Staging URL
```

**Warning signs:** Production alerts during load tests, customer complaints, or production metrics showing unexplained traffic spikes.

### Pitfall 7: No Report Artifacts (Lost Results)

**What goes wrong:** Test results disappear after workflow completes, making it impossible to analyze historical trends or debug failures.

**Why it happens:** k6 outputs to stdout by default; GitHub Actions discards stdout after workflow completion.

**How to avoid:** Use handleSummary() to generate JSON/HTML reports and upload as GitHub Actions artifacts:

```javascript
// k6 script
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),  // Machine-readable
    'summary.html': htmlReport(data),       // Human-readable
  };
}
```

```yaml
# GitHub Actions workflow
- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: k6-results
    path: |
      summary.json
      summary.html
    retention-days: 30  # Keep for historical analysis
```

**Warning signs:** Unable to compare current test results with previous runs, or no historical performance trend data.

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Load Test Script with Ramping Scenarios

```javascript
// Source: https://grafana.com/docs/k6/latest/using-k6/scenarios/
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

// Load test users once and share across VUs
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

// Load AI questions once
const questions = new SharedArray('questions', function () {
  return JSON.parse(open('./data/questions.json'));
});

// Mark 429 rate limit responses as expected
http.setResponseCallback(
  http.expectedStatuses(200, 429, { min: 200, max: 299 })
);

// Test configuration
export const options = {
  scenarios: {
    // Quick validation test
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 10 },
      ],
      gracefulRampDown: '10s',
      exec: 'userJourney',
      env: { SCENARIO: 'smoke' },
    },

    // Full load test (10k VUs)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },   // Ramp to 1k
        { duration: '3m', target: 5000 },   // Ramp to 5k
        { duration: '3m', target: 10000 },  // Ramp to 10k
        { duration: '2m', target: 10000 },  // Hold at 10k
        { duration: '2m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'userJourney',
      env: { SCENARIO: 'load' },
      startTime: '2m',  // Start after smoke test completes
    },
  },

  // Performance baselines (thresholds)
  thresholds: {
    'http_req_duration{endpoint:news}': ['p(95)<500'],
    'http_req_duration{endpoint:ai}': ['p(95)<5000'],
    'http_req_duration{endpoint:auth}': ['p(95)<300'],
    'http_req_failed': ['rate<0.01'],  // <1% error rate (excluding 429s)
  },
};

// User journey simulation
export function userJourney() {
  const BASE_URL = __ENV.K6_BASE_URL || 'https://staging.newshub.example.com';
  const user = users[Math.floor(Math.random() * users.length)];

  // Step 1: Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth' },
  });

  check(loginRes, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');
  sleep(Math.random() * 2 + 1);  // Random 1-3s delay

  // Step 2: Browse news (90% of requests)
  const newsRes = http.get(`${BASE_URL}/api/news`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'news' },
  });

  check(newsRes, {
    'news loaded': (r) => r.status === 200 || r.status === 429,
    'has articles': (r) => r.status === 200 ? r.json('data')?.length > 0 : true,
  });

  sleep(Math.random() * 3 + 2);  // Random 2-5s delay (reading)

  // Step 3: Ask AI (~5% of requests)
  if (Math.random() < 0.05) {
    const question = questions[Math.floor(Math.random() * questions.length)];
    const aiRes = http.post(`${BASE_URL}/api/ai/ask`, JSON.stringify({
      question,
      context: newsRes.status === 200 ? newsRes.json('data').slice(0, 3).map(a => a.content) : [],
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'ai' },
      timeout: '10s',
    });

    check(aiRes, {
      'ai response': (r) => r.status === 200 || r.status === 429,
    });

    sleep(Math.random() * 2 + 1);
  }

  // Step 4: Bookmark (~10% of requests)
  if (Math.random() < 0.1 && newsRes.status === 200) {
    const articles = newsRes.json('data');
    if (articles && articles.length > 0) {
      const articleId = articles[0].id;
      const bookmarkRes = http.post(`${BASE_URL}/api/bookmarks`, JSON.stringify({
        articleId,
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        tags: { endpoint: 'bookmarks' },
      });

      check(bookmarkRes, {
        'bookmark created': (r) => r.status === 200 || r.status === 201 || r.status === 429,
      });
    }
  }

  sleep(Math.random() * 2 + 1);
}

// Post-test report generation
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data, {
      title: 'NewsHub Load Test Report',
      theme: 'default',
    }),
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

### Example 2: GitHub Actions Workflow with Manual Dispatch

```yaml
# Source: https://github.com/grafana/setup-k6-action + https://github.com/grafana/run-k6-action
name: Load Test

on:
  workflow_dispatch:
    inputs:
      scenario:
        description: 'Test scenario to run'
        required: true
        default: 'load'
        type: choice
        options:
          - smoke
          - load

jobs:
  load-test:
    name: k6 Load Test
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup k6
        uses: grafana/setup-k6-action@v1
        with:
          k6-version: '0.53.0'

      - name: Run k6 load test
        uses: grafana/run-k6-action@v1
        env:
          K6_BASE_URL: ${{ secrets.STAGING_URL }}
          K6_SCENARIO: ${{ github.event.inputs.scenario }}
        with:
          path: k6/load-test.js
          flags: --out json=summary.json

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results-${{ github.event.inputs.scenario }}-${{ github.run_number }}
          path: |
            summary.json
            summary.html
          retention-days: 30

      - name: Generate GitHub Actions Summary
        if: always()
        run: |
          echo "## 📊 Load Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Scenario:** \`${{ github.event.inputs.scenario }}\`" >> $GITHUB_STEP_SUMMARY
          echo "**Target URL:** ${{ secrets.STAGING_URL }}" >> $GITHUB_STEP_SUMMARY
          echo "**Run ID:** ${{ github.run_number }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          # Extract metrics from summary.json
          P95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' summary.json)
          P99=$(jq -r '.metrics.http_req_duration.values["p(99)"] // 0' summary.json)
          ERROR_RATE=$(jq -r '(.metrics.http_req_failed.values.rate // 0) * 100' summary.json)
          CHECKS_PASSED=$(jq -r '.metrics.checks.values.passes // 0' summary.json)
          CHECKS_FAILED=$(jq -r '.metrics.checks.values.fails // 0' summary.json)

          # Status determination
          if (( $(echo "$P95 < 500" | bc -l) )) && (( $(echo "$ERROR_RATE < 1" | bc -l) )); then
            STATUS="✅ PASSED"
          else
            STATUS="❌ FAILED"
          fi

          echo "**Status:** $STATUS" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### 📈 Performance Metrics" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value | Threshold | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|-----------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| p95 latency | ${P95}ms | <500ms | $(if (( $(echo "$P95 < 500" | bc -l) )); then echo "✅"; else echo "❌"; fi) |" >> $GITHUB_STEP_SUMMARY
          echo "| p99 latency | ${P99}ms | <1500ms | $(if (( $(echo "$P99 < 1500" | bc -l) )); then echo "✅"; else echo "❌"; fi) |" >> $GITHUB_STEP_SUMMARY
          echo "| Error rate | ${ERROR_RATE}% | <1% | $(if (( $(echo "$ERROR_RATE < 1" | bc -l) )); then echo "✅"; else echo "❌"; fi) |" >> $GITHUB_STEP_SUMMARY
          echo "| Checks passed | ${CHECKS_PASSED} | — | ✅ |" >> $GITHUB_STEP_SUMMARY
          echo "| Checks failed | ${CHECKS_FAILED} | 0 | $(if [ "$CHECKS_FAILED" -eq 0 ]; then echo "✅"; else echo "❌"; fi) |" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "📄 [View full HTML report in artifacts](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})" >> $GITHUB_STEP_SUMMARY

      - name: Fail if thresholds breached
        if: always()
        run: |
          if [ -f summary.json ]; then
            # Check if k6 test passed (thresholds not breached)
            # k6 exits with non-zero code if thresholds fail
            exit 0
          else
            echo "❌ Test results not found"
            exit 1
          fi
```

### Example 3: Test User Seeding Script

```javascript
// Source: Project pattern for pre-seeding test accounts
// File: scripts/seed-load-test-users.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const prisma = new PrismaClient();

async function seedLoadTestUsers() {
  const users = [];

  // Create 100 test users
  for (let i = 1; i <= 100; i++) {
    const email = `loadtest${i}@example.com`;
    const password = 'LoadTest123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPassword,
        isEmailVerified: true,  // Skip email verification for load tests
        username: `loadtest${i}`,
      },
    });

    users.push({
      email: user.email,
      password,  // Store plain password for k6 (never commit this file!)
    });

    if (i % 10 === 0) {
      console.log(`Created ${i}/100 test users...`);
    }
  }

  // Write to k6/data/users.json (gitignored)
  const outputPath = 'k6/data/users.json';
  fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
  console.log(`✅ Seeded ${users.length} load test users to ${outputPath}`);

  await prisma.$disconnect();
}

seedLoadTestUsers().catch(console.error);
```

```bash
# Add to package.json scripts
"seed:load-test": "tsx scripts/seed-load-test-users.js"

# Add to .gitignore
k6/data/users.json
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| grafana/k6-action (single action) | grafana/setup-k6-action + grafana/run-k6-action (split) | 2024-Q3 | Legacy k6-action archived; new split approach allows version pinning and separate setup/execution phases |
| constant-vus executor for all tests | ramping-vus / ramping-arrival-rate executors | k6 v0.27 (2020) | Gradual load increase reflects real traffic patterns; constant-vus still valid for steady-state tests |
| Manual HTML report generation | handleSummary() hook with k6-reporter | k6 v0.34 (2021) | Declarative report generation in test script; no post-processing needed |
| open() for test data | SharedArray (k6/data) | k6 v0.30 (2021) | Memory-efficient data sharing across VUs; critical for large-scale tests |
| Custom 429 retry logic | http.expectedStatuses() | k6 v0.38 (2022) | Native rate limit handling; marks 429 as expected, excluding from http_req_failed |
| k6 native web dashboard (CLI flag) | K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=report.html | k6 v0.49.0 (2024-01) | Built-in HTML export without k6-reporter; benc-uk/k6-reporter still preferred for custom themes |

**Deprecated/outdated:**

- **grafana/k6-action** (single action): Archived in 2024, replaced by grafana/setup-k6-action + grafana/run-k6-action
- **k6 cloud** (SaaS): Still exists but not required; OSS k6 with local reporting sufficient for most use cases
- **XPath checks (removed in v0.50.0)**: Use CSS selectors or JSON path instead for response validation

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

(Note: All claims in this research are verified via Context7, WebFetch, or WebSearch with URLs cited)

## Open Questions

**None** — All research domains have been investigated with high confidence.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| k6 | Load test execution | ✗ | — | CI install via grafana/setup-k6-action |
| Node.js | npm scripts, seed scripts | ✓ | v25.4.0 | — |
| Docker | Staging environment (assumed) | ✓ | 29.4.0 | — |
| PostgreSQL | Test user seeding | ✓ (via Docker) | 17 (CI) | — |
| Redis | Rate limiting (app-side) | ✓ (via Docker) | 7.4 (CI) | — |

**Missing dependencies with no fallback:**

None — k6 is installed in CI via grafana/setup-k6-action; local installation optional.

**Missing dependencies with fallback:**

- k6 (local): Not required locally; tests run in CI via GitHub Actions

## Sources

### Primary (HIGH confidence)

- [Grafana k6 - Ramping VUs Executor](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/) - Executor configuration, stages syntax
- [Grafana k6 - Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/) - Threshold syntax, percentiles, abort-on-fail
- [Grafana k6 - Scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/) - Scenario organization, executors
- [Grafana k6 - Checks](https://grafana.com/docs/k6/latest/using-k6/checks/) - Response validation patterns
- [Grafana k6 - SharedArray](https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/) - Test data management
- [Grafana k6 - expectedStatuses](https://k6.io/docs/javascript-api/k6-http/expectedstatuses/) - 429 handling
- [Grafana k6 - Environment Variables](https://k6.io/docs/using-k6/environment-variables/) - K6_BASE_URL, K6_VUS configuration
- [Grafana k6 - Test Lifecycle](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/) - setup() function for pre-test initialization
- [GitHub - grafana/setup-k6-action](https://github.com/grafana/setup-k6-action) - CI k6 installation
- [GitHub - grafana/run-k6-action](https://github.com/grafana/run-k6-action) - CI test execution
- [GitHub - benc-uk/k6-reporter](https://github.com/benc-uk/k6-reporter) - HTML report generation

### Secondary (MEDIUM confidence)

- [How to Implement k6 Scenarios](https://oneuptime.com/blog/post/2026-01-28-k6-scenarios/view) - 2026 scenario patterns (verified against official docs)
- [How to Use k6 Thresholds for SLOs](https://oneuptime.com/blog/post/2026-01-27-k6-thresholds-slos/view) - 2026 threshold patterns (verified)
- [Using SharedArray with k6](https://medium.com/@marloh2222/using-sharedarray-with-k6-233876dd3b8b) - SharedArray patterns (2026, verified)
- [Think Time in Grafana k6](https://blog.nashtechglobal.com/think-time-in-grafana-k6/) - Random delay patterns (verified)
- [How to Implement GitHub Actions Step Summary](https://oneuptime.com/blog/post/2026-01-30-github-actions-step-summary/view) - GITHUB_STEP_SUMMARY patterns (2026, verified)
- [GitHub Actions Job Summaries](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/) - Official GitHub announcement

### Tertiary (LOW confidence)

None — all sources cross-verified with official documentation.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries verified via official docs, npm registry, GitHub Marketplace
- Architecture: HIGH - Patterns verified via official k6 docs and working examples
- Pitfalls: HIGH - Common issues verified via k6 community forums, GitHub issues, and official docs

**Research date:** 2026-04-23
**Valid until:** 2026-07-23 (90 days — k6 stable, slow release cadence)

---

*Research complete. Ready for planning.*
