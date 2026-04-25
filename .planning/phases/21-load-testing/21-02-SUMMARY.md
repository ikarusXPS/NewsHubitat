---
phase: 21-load-testing
plan: 02
subsystem: load-testing
tags: [k6, ci-cd, github-actions, performance-baselines]
dependency_graph:
  requires:
    - k6-test-scripts
  provides:
    - ci-load-testing
    - performance-documentation
  affects:
    - ci-pipeline
tech_stack:
  added:
    - grafana/setup-k6-action (GitHub Actions)
  patterns:
    - workflow_dispatch for manual CI triggers
    - GitHub Actions summary with jq metric extraction
    - Artifact upload with 30-day retention
    - Threshold-based workflow failure
key_files:
  created:
    - .github/workflows/load-test.yml (GitHub Actions workflow)
    - k6/README.md (performance baseline documentation)
  modified:
    - package.json (added load:smoke and load:full scripts)
decisions:
  - "D-26: npm scripts load:smoke and load:full for local execution"
  - "D-29: Manual dispatch only (workflow_dispatch) - expensive test"
  - "D-30: CI runs full load test (10k VUs, 10 minutes)"
  - "D-31: Workflow fails on threshold breach - blocks release"
  - "D-32: Artifacts uploaded with 30-day retention"
  - "D-33: grafana/setup-k6-action@v1 for k6 installation"
  - "D-34: STAGING_URL secret for staging environment"
  - "D-35: GitHub Actions summary with p95, p99, error rate"
  - "D-36: /api/news p95 < 500ms documented"
  - "D-37: /api/ai/ask p95 < 5s documented"
  - "D-38: /api/auth/login p95 < 300ms documented"
  - "D-39: Error rate < 1% documented"
metrics:
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  commits: 3
  duration_minutes: 4
  completed_date: "2026-04-23"
---

# Phase 21 Plan 02: CI Integration & Documentation Summary

**One-liner:** GitHub Actions workflow with manual dispatch for on-demand load testing, comprehensive performance baseline documentation with p95/p99 thresholds, and npm scripts for local execution.

## Overview

Integrated k6 load testing into CI pipeline with GitHub Actions workflow, documented performance baselines with rationale, and added npm scripts for convenient local test execution. Implements LOAD-03 (CI integration) and LOAD-04 (baseline documentation) requirements.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create GitHub Actions workflow for load testing | 913cd8b | .github/workflows/load-test.yml |
| 2 | Document performance baselines and usage instructions | 86fb3d6 | k6/README.md |
| 3 | Add npm scripts for local load test execution | 2ef8d94 | package.json |

## Implementation Details

### GitHub Actions Workflow (Task 1)

Created `.github/workflows/load-test.yml` with:

**Trigger (D-29):** Manual dispatch only (`workflow_dispatch`) with scenario input (smoke/load)
- Not triggered on PR/push due to test cost
- Avoids unnecessary load on staging environment

**k6 Installation (D-33):** Uses `grafana/setup-k6-action@v1` with k6 v0.53.0
- Official Grafana action for k6 binary installation
- Version pinning ensures reproducible results

**Test Execution (D-30, D-34):**
- Runs against `STAGING_URL` secret (staging environment)
- Full load test: 10k VUs, 10 minutes
- Environment variables: `K6_BASE_URL`, `K6_SCENARIO`

**Artifact Upload (D-32):**
- Uploads `summary.json` and `summary.html`
- 30-day retention for historical analysis
- Always runs even if test fails

**GitHub Actions Summary (D-35):**
- Extracts p95, p99, error rate from `summary.json` using `jq`
- Generates formatted table with threshold status
- Pass/fail status based on D-36, D-37, D-38, D-39 thresholds
- Links to full HTML report in artifacts

**Threshold Validation (D-31):**
- Final step checks for threshold breaches in `summary.json`
- Counts failed thresholds across all metrics
- Exits with code 1 if any threshold breached (blocks release)

### Performance Baseline Documentation (Task 2)

Created `k6/README.md` (184 lines) with:

**Performance Baselines Table (D-36, D-37, D-38, D-39):**
- `/api/news`: p95 < 500ms, p99 < 1500ms
- `/api/ai/ask`: p95 < 5000ms, p99 < 15000ms
- `/api/auth/login`: p95 < 300ms, p99 < 1000ms
- Error rate: < 1% (excludes 429 rate limits)

**Rationale for Each Threshold:**
- News browsing is primary user flow (fast response critical)
- AI involves external API calls (5s acceptable)
- Login is first impression (must be instant)
- High availability target (99%+ success rate)

**p95 vs p99 Explanation:**
- p95: 95% of requests must meet this (reasonable expectation)
- p99: 99% of requests stay under (catches edge cases)

**Usage Instructions:**
- Local execution: k6 installation, environment variables
- CI execution: GitHub Actions manual dispatch steps
- Prerequisites: k6 installation, test user seeding

**Troubleshooting:**
- Common errors: users.json missing, connection refused, 429s, thresholds breached
- Debugging steps for each error scenario

**References:**
- LOAD-03 (CI integration)
- LOAD-04 (baseline documentation)
- Links to k6 docs, scenarios, thresholds, k6-reporter

### npm Scripts (Task 3)

Added to `package.json`:

```json
"load:smoke": "k6 run k6/load-test.js --env K6_SCENARIO=smoke"
"load:full": "k6 run k6/load-test.js --env K6_SCENARIO=load"
```

**Assumptions:**
- k6 installed locally (brew/choco/apt)
- `K6_BASE_URL` defaults to http://localhost:3001 (per k6/lib/config.js)

## Deviations from Plan

None - plan executed exactly as written.

## Decision IDs Implemented

**npm Scripts:**
- D-26: npm scripts for load:smoke and load:full

**CI Integration:**
- D-29: Manual dispatch only (workflow_dispatch)
- D-30: CI runs full load test (10k VUs, 10 minutes)
- D-31: Workflow fails on threshold breach
- D-32: Artifacts uploaded with 30-day retention
- D-33: grafana/setup-k6-action@v1 for k6 installation
- D-34: STAGING_URL secret for staging environment
- D-35: GitHub Actions summary with p95, p99, error rate

**Performance Baselines:**
- D-36: /api/news p95 < 500ms documented
- D-37: /api/ai/ask p95 < 5s documented
- D-38: /api/auth/login p95 < 300ms documented
- D-39: Error rate < 1% documented

## Known Stubs

None - all functionality implemented.

## Threat Flags

None - all security considerations addressed:
- T-21-05 mitigated: STAGING_URL secret enforces staging-only testing (D-09, D-34)
- T-21-06 accepted: K6_BASE_URL redacted in logs (GitHub Actions secret masking)
- T-21-07 accepted: GitHub Actions permissions enforce repository write access
- T-21-08 accepted: Artifacts immutable after upload

## Self-Check: PASSED

**Files exist:**
- ✓ .github/workflows/load-test.yml
- ✓ k6/README.md (184 lines, exceeds 100-line requirement)

**Commits exist:**
- ✓ 913cd8b (Task 1: GitHub Actions workflow)
- ✓ 86fb3d6 (Task 2: Performance baseline documentation)
- ✓ 2ef8d94 (Task 3: npm scripts)

**Configuration verified:**
- ✓ package.json contains "load:smoke" script
- ✓ package.json contains "load:full" script
- ✓ Workflow has workflow_dispatch trigger
- ✓ Workflow uses grafana/setup-k6-action
- ✓ README has "## Performance Baselines" section
- ✓ README documents D-36, D-37, D-38, D-39 thresholds

## User Setup Required

**Service:** GitHub Actions

**Why:** Manual load test execution via workflow_dispatch

**Environment Variables:**
- `STAGING_URL`: Staging server base URL
  - Source: GitHub repo → Settings → Secrets and variables → Actions → Repository secrets
  - Example: `https://staging.newshub.example.com`

**Dashboard Configuration:**
1. Navigate to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `STAGING_URL`
4. Value: Your staging server URL (e.g., `https://staging.newshub.example.com`)
5. Click "Add secret"

**To trigger load test:**
1. Go to GitHub repo → Actions tab
2. Select "Load Test" workflow
3. Click "Run workflow"
4. Choose scenario: `smoke` or `load`
5. Click "Run workflow"
6. View results in workflow summary and artifacts

## Next Steps

1. **Configure STAGING_URL secret** in GitHub Actions (see User Setup above)
2. **Trigger smoke test** to validate workflow
3. **Review artifacts** (summary.json, summary.html) after test run
4. **Monitor Prometheus metrics** during load test for correlation
5. **Plan 21-03** (if needed): Advanced load testing scenarios or baseline refinement

## Metrics

- **Duration:** 4 minutes
- **Tasks completed:** 3/3
- **Files created:** 2
- **Files modified:** 1
- **Commits:** 3
- **Requirements completed:** LOAD-03, LOAD-04

---

**Plan completed:** 2026-04-23
**Status:** ✅ All tasks complete, ready for load test execution
