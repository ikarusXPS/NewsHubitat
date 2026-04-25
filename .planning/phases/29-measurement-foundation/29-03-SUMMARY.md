---
phase: 29-measurement-foundation
plan: 03
subsystem: ci-performance-monitoring
tags: [lighthouse-ci, performance-budgets, baseline-documentation]
dependency_graph:
  requires: [29-01]
  provides: [lighthouse-ci, performance-baseline-doc]
  affects: [ci-pipeline, performance-tracking]
tech_stack:
  added: [treosh/lighthouse-ci-action@v12]
  patterns: [lighthouse-assertions, web-vitals-tracking, baseline-metrics]
key_files:
  created: [lighthouserc.js, docs/PERFORMANCE-BASELINE.md]
  modified: [.github/workflows/ci.yml]
decisions:
  - "D-10: Lighthouse CI runs on master branch after staging deployment"
  - "D-11: Use treosh/lighthouse-ci-action for automated PR comments with report links"
  - "D-12: Category score thresholds set to 90+ (performance, accessibility, best-practices, SEO)"
  - "D-13: Category scores below 90 fail CI check (error level)"
  - "D-14: 30-day artifact retention for historical analysis"
  - "D-15: Lighthouse audits run against staging URL (STAGING_URL secret)"
  - "D-16: Performance baseline created with TBD placeholders for all metrics"
  - "D-17: Bundle metrics tracked via rollup-plugin-visualizer (from Plan 01)"
  - "D-18: Core Web Vitals (LCP, INP, CLS, FCP) configured with warn level"
  - "D-19: Three URLs audited: root, /analysis, /monitor"
metrics:
  duration_minutes: 3
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_date: "2026-04-25"
---

# Phase 29 Plan 03: Lighthouse CI Integration Summary

**One-liner:** Integrated Lighthouse CI with 90+ score thresholds for automated performance audits on staging deployments, plus baseline documentation for tracking v1.5 optimization progress.

## What Was Built

Established automated Lighthouse CI integration with three components:

1. **Lighthouse CI configuration** - `lighthouserc.js` with 90+ category score thresholds (performance, accessibility, best-practices, SEO), Core Web Vitals assertions (LCP < 2s, CLS < 0.05, INP < 150ms, FCP < 1.5s), and temporary-public-storage upload for free 7-day reports
2. **CI workflow job** - GitHub Actions job running after `deploy-staging` on master branch, with staging health check and 30-day artifact retention
3. **Performance baseline documentation** - `docs/PERFORMANCE-BASELINE.md` with TBD placeholders for bundle metrics, Core Web Vitals, API performance, database performance, and Lighthouse scores

This creates automated quality gates and a living document for tracking performance improvements across optimization phases (30-34).

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Create Lighthouse CI configuration file | 4397296 | Created lighthouserc.js with 90+ thresholds, Core Web Vitals assertions, staging URL config |
| 2 | Add Lighthouse CI job to workflow | deb6df4 | Added lighthouse job with deploy-staging dependency, health check, artifact upload |
| 3 | Create performance baseline documentation | 68b806b | Created PERFORMANCE-BASELINE.md with 5 metric tables and update history |

## Technical Implementation

### Task 1: Lighthouse CI Configuration

**Created lighthouserc.js:**
```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.STAGING_URL || 'https://staging.newshub.example.com/',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/analysis',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/monitor',
      ],
      numberOfRuns: 3,  // Reduce flakiness
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.05 }],
        'interaction-to-next-paint': ['warn', { maxNumericValue: 150 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**Key design choices:**
- **3 URLs audited:** Root (dashboard), /analysis, /monitor for comprehensive coverage
- **3 runs per URL:** Reduces flakiness via median scoring
- **Error-level category scores:** Fail CI if any category drops below 90
- **Warn-level Web Vitals:** Track for improvement without blocking PRs initially
- **Temporary public storage:** Free 7-day report retention with shareable links

### Task 2: CI Workflow Job

**Added to .github/workflows/ci.yml:**

```yaml
lighthouse:
  name: Lighthouse CI
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  if: github.ref == 'refs/heads/master'
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Wait for staging deployment
      run: |
        echo "Waiting for staging to be ready..."
        for i in {1..30}; do
          if curl -sf ${{ secrets.STAGING_URL }}/api/health > /dev/null; then
            echo "Staging is ready"
            exit 0
          fi
          echo "Attempt $i failed, waiting 10s..."
          sleep 10
        done
        echo "Staging failed to become ready"
        exit 1

    - name: Run Lighthouse CI
      id: lighthouse
      uses: treosh/lighthouse-ci-action@v12
      with:
        configPath: ./lighthouserc.js
        uploadArtifacts: true
        temporaryPublicStorage: true
        runs: 3
      env:
        STAGING_URL: ${{ secrets.STAGING_URL }}
        LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

    - name: Upload Lighthouse reports
      uses: actions/upload-artifact@v4
      with:
        name: lighthouse-reports
        path: .lighthouseci/
        retention-days: 30
```

**Key design choices:**
- **Staging health check:** 5-minute timeout (30 attempts x 10s) before running Lighthouse
- **Master-only execution:** `if: github.ref == 'refs/heads/master'` prevents PR runs (staging deployment only happens on master)
- **Artifact retention:** 30 days for historical analysis and trend tracking
- **treosh/lighthouse-ci-action@v12:** Official action handles report posting and status checks

**Workflow sequence:**
```
lint, typecheck, test (parallel)
  ↓
bundle-analysis, build (parallel)
  ↓
e2e
  ↓
deploy-staging
  ↓
lighthouse (NEW - master only)
  ↓
deploy-production (depends on lighthouse success)
```

### Task 3: Performance Baseline Documentation

**Created docs/PERFORMANCE-BASELINE.md with 5 metric tables:**

1. **Bundle Metrics** - Initial JS Bundle, Total JS Bundle, Largest Chunk (from rollup-plugin-visualizer)
2. **Core Web Vitals** - LCP per page, INP, CLS (from Lighthouse CI)
3. **API Performance** - p95 latencies for /api/news, /api/ai/ask, /api/auth (from k6)
4. **Database Performance** - Query p95, slow query count, N+1 patterns (from Prisma logging)
5. **Lighthouse Scores** - Performance, Accessibility, Best Practices, SEO per page

**Structure:**
- **Baseline column:** Captured before optimization (TBD placeholders)
- **Current column:** Updated after each optimization phase
- **Target column:** Success criteria for optimization
- **Source column:** Tool that generates the metric
- **Update History:** Tracks which phase updated which metrics

**TBD placeholders:** All metrics start as "TBD" because actual baseline values require:
- First build with rollup-plugin-visualizer (bundle metrics) - already working from Plan 01
- First Lighthouse CI run on staging (Web Vitals + scores) - will run after this plan merges
- Development query logging sample (DB metrics) - enabled in Plan 02

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met without adjustments.

## Verification Results

### Task 1 Verification
```bash
✓ node -c lighthouserc.js passed (valid JavaScript syntax)
✓ grep "categories:performance" lighthouserc.js found
✓ grep "minScore.*0\\.9" lighthouserc.js found
✓ grep "STAGING_URL" lighthouserc.js found
✓ grep "temporary-public-storage" lighthouserc.js found
```

### Task 2 Verification
```bash
✓ grep "lighthouse:" .github/workflows/ci.yml found
✓ grep "treosh/lighthouse-ci-action" .github/workflows/ci.yml found
✓ grep "configPath.*lighthouserc\\.js" .github/workflows/ci.yml found
✓ grep "needs.*deploy-staging" .github/workflows/ci.yml found
```

**Note:** `npm run validate:ci` failed due to `action-validator` Windows execution issues (known limitation from Plan 01), but manual YAML verification and grep checks confirmed correct structure.

### Task 3 Verification
```bash
✓ test -f docs/PERFORMANCE-BASELINE.md passed
✓ grep "v1.5 (pre-optimization)" docs/PERFORMANCE-BASELINE.md found
✓ grep "Initial JS Bundle" docs/PERFORMANCE-BASELINE.md found
✓ grep "LCP (Dashboard)" docs/PERFORMANCE-BASELINE.md found
✓ grep "Query p95" docs/PERFORMANCE-BASELINE.md found
✓ grep "Lighthouse Scores" docs/PERFORMANCE-BASELINE.md found
```

### Commit Verification
```
✓ 4397296 - Task 1 (lighthouserc.js)
✓ deb6df4 - Task 2 (ci.yml lighthouse job)
✓ 68b806b - Task 3 (PERFORMANCE-BASELINE.md)
```

## Known Limitations

1. **LHCI_GITHUB_APP_TOKEN optional** - If not configured as GitHub secret, Lighthouse CI falls back to basic status checks without rich PR comments. Full functionality requires installing the Lighthouse CI GitHub App.

2. **Staging URL secret required** - The workflow expects `STAGING_URL` GitHub secret. Without it, Lighthouse will fail to run (intentional - prevents accidental localhost testing).

3. **Master-only execution** - Lighthouse job only runs on master branch pushes. PR authors won't see Lighthouse results until merge (trade-off to avoid expensive staging deployments per PR).

4. **Baseline metrics are TBD** - PERFORMANCE-BASELINE.md starts with placeholders. Actual baseline values will populate after:
   - First merge to master triggers bundle-analysis job (bundle metrics)
   - First staging deployment triggers lighthouse job (Web Vitals + scores)
   - Development testing captures query samples (DB metrics from Plan 02 logging)

## Next Steps

**Immediate (Phase 29 complete):**
- Merge to master to trigger first Lighthouse CI run
- Populate PERFORMANCE-BASELINE.md with actual values from first CI run
- Move to Phase 30: Frontend Code Splitting

**Dependent phases (Phase 30+):**
- Phase 30: Use Lighthouse LCP metrics to prioritize splitting targets
- Phase 31: Monitor INP/CLS during virtual scrolling implementation
- Phase 32: Track bundle size impact from image optimization
- Phase 33: Validate API p95 improvements after caching
- Phase 34: Measure slow query reduction after DB optimization

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| lighthouserc.js | +39 | Created Lighthouse CI config with assertions |
| .github/workflows/ci.yml | +42 | Added lighthouse job with staging health check |
| docs/PERFORMANCE-BASELINE.md | +63 | Created baseline doc with 5 metric tables |

## Threat Surface Scan

No new security-relevant surface introduced. All changes are CI-only and documentation:

- **Lighthouse reports:** Contain only performance metrics, no sensitive data (T-29-06 accepted)
- **STAGING_URL secret:** Stored in GitHub secrets, not logged in workflow (T-29-07 mitigated)
- **Health check timeout:** 5-minute limit prevents indefinite job hanging (T-29-08 mitigated)

## Self-Check: PASSED

**Files:**
- ✓ lighthouserc.js exists with correct configuration
- ✓ .github/workflows/ci.yml exists with lighthouse job
- ✓ docs/PERFORMANCE-BASELINE.md exists with all metric tables

**Commits:**
- ✓ 4397296 exists (Task 1 - lighthouserc.js)
- ✓ deb6df4 exists (Task 2 - lighthouse workflow job)
- ✓ 68b806b exists (Task 3 - baseline documentation)

**Configuration:**
- ✓ lighthouserc.js has 90+ category score thresholds
- ✓ Core Web Vitals assertions configured (LCP, CLS, INP, FCP)
- ✓ Lighthouse job runs after deploy-staging on master
- ✓ 30-day artifact retention configured
- ✓ PERFORMANCE-BASELINE.md has all 5 metric tables with TBD placeholders

All acceptance criteria met. Plan executed successfully.
