# Phase 29: Measurement Foundation - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 5
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `vite.config.ts` | config | build-time | `vite.config.ts` (self) | exact |
| `server/db/prisma.ts` | service | CRUD | `server/db/prisma.ts` (self) | exact |
| `.github/workflows/ci.yml` | config | CI/CD | `.github/workflows/ci.yml` (self) | exact |
| `lighthouserc.js` | config | CI/CD | N/A (new file) | no-analog |
| `docs/PERFORMANCE-BASELINE.md` | documentation | static | `docs/TESTING.md` | role-match |

## Pattern Assignments

### `vite.config.ts` (config, build-time) - MODIFY

**Analog:** `vite.config.ts` (self-modification)

**Imports pattern** (lines 1-6):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
```

**Plugin array pattern** (lines 9-119):
```typescript
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Gzip compression for production builds
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files > 1KB
    }),
    // ... other plugins
  ],
  // ... rest of config
})
```

**Conditional plugin pattern** (lines 102-118):
```typescript
// Sentry plugin - uploads source maps in CI (per D-04)
// Only enabled when SENTRY_AUTH_TOKEN is set
...(process.env.SENTRY_AUTH_TOKEN
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: {
          name: process.env.SENTRY_RELEASE,
        },
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
    ]
  : []),
```

**Apply to rollup-plugin-visualizer:**
- Add import: `import { visualizer } from 'rollup-plugin-visualizer'`
- Add to plugins array (unconditional - always generate stats):
```typescript
// Bundle visualizer - generates dist/stats.html for CI artifact
visualizer({
  filename: 'dist/stats.html',
  template: 'treemap',
  gzipSize: true,
  brotliSize: true,
  open: false,
}) as PluginOption,
```

---

### `server/db/prisma.ts` (service, CRUD) - MODIFY

**Analog:** `server/db/prisma.ts` (self-modification)

**Current file structure** (lines 1-19):
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString,
  max: 10,                        // D-02: Pool size = 10 connections
  connectionTimeoutMillis: 5_000, // D-04: Connection timeout = 5 seconds
  idleTimeoutMillis: 300_000,     // D-06: Idle timeout = 5 minutes
});

const prisma = new PrismaClient({ adapter });

export { prisma };
```

**Environment gating pattern** (from CONTEXT.md D-09):
```typescript
const isDev = process.env.NODE_ENV !== 'production';
```

**Apply Prisma logging pattern:**
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 300_000,
});

// D-09: Gate logging on NODE_ENV !== 'production'
const isDev = process.env.NODE_ENV !== 'production';

// D-06, D-07: Enable query and warn log levels in development only
const prisma = new PrismaClient({
  adapter,
  log: isDev
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [],
});

// D-08: Log format includes query duration for identifying slow queries
if (isDev) {
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    const duration = e.duration;
    const query = e.query;

    // Color-code slow queries (>100ms) for visibility
    if (duration > 100) {
      console.warn(`[Prisma SLOW ${duration}ms] ${query}`);
    } else {
      console.log(`[Prisma ${duration}ms] ${query}`);
    }

    // Log params for debugging (truncate long values)
    if (e.params && e.params !== '[]') {
      const params = e.params.length > 200
        ? e.params.slice(0, 200) + '...'
        : e.params;
      console.log(`  Params: ${params}`);
    }
  });
}

export { prisma };
```

---

### `.github/workflows/ci.yml` (config, CI/CD) - MODIFY

**Analog:** `.github/workflows/ci.yml` (self-modification)

**Job structure pattern** (lines 106-163):
```yaml
build:
  name: Build Docker Image
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'npm'

    - name: Install dependencies
      run: npm ci --legacy-peer-deps

    - name: Generate Prisma client
      run: npx prisma generate

    - name: Build with source map upload
      run: npm run build
      env:
        SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        # ... more env vars
```

**Artifact upload pattern** (lines 232-237):
```yaml
- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

**Apply bundle-analysis job pattern:**
```yaml
bundle-analysis:
  name: Bundle Analysis
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'npm'

    - name: Install dependencies
      run: npm ci --legacy-peer-deps

    - name: Generate Prisma client
      run: npx prisma generate

    - name: Build with visualizer
      run: npm run build

    - name: Upload bundle stats
      uses: actions/upload-artifact@v4
      with:
        name: bundle-stats
        path: dist/stats.html
        retention-days: 30

    - name: Report bundle size
      uses: preactjs/compressed-size-action@v2
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        pattern: './dist/**/*.{js,css}'
        compression: 'brotli'
```

**Apply lighthouse job pattern:**
```yaml
lighthouse:
  name: Lighthouse CI
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  if: github.ref == 'refs/heads/master'
  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        ref: ${{ github.event.pull_request.head.sha }}

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
        LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

    - name: Comment PR with Lighthouse results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v8
      with:
        script: |
          const links = '${{ steps.lighthouse.outputs.links }}';
          const comment = `## Lighthouse CI Results\n\n${links}\n\nView detailed reports at the links above.`;
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

---

### `lighthouserc.js` (config, CI/CD) - NEW FILE

**Analog:** None (new file type)

**Reference:** RESEARCH.md Pattern 3 (lines 299-333)

**Complete file pattern:**
```javascript
// Lighthouse CI configuration for PR quality gates
// Source: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.STAGING_URL || 'https://staging.newshub.example.com/',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/analysis',
        (process.env.STAGING_URL || 'https://staging.newshub.example.com') + '/monitor',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        // D-12: 90+ thresholds, D-13: fail if below
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        // Core Web Vitals - warn only, tracked for improvement
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

---

### `docs/PERFORMANCE-BASELINE.md` (documentation, static) - NEW FILE

**Analog:** `docs/TESTING.md`

**Document structure pattern** (lines 1-50):
```markdown
<!-- generated-by: gsd-doc-writer -->
# Testing

This document describes the testing framework, test execution, and coverage requirements for NewsHub.

## Test Framework and Setup

NewsHub uses two complementary testing frameworks:

### Unit Testing: Vitest
- **Framework**: Vitest v4.0.18
- **Test Runner**: `@vitest/coverage-v8` for coverage reporting
...
```

**Table format pattern** (lines 159-175):
```markdown
## Coverage Requirements

Unit tests enforce an 80% coverage threshold for all metrics:

| Coverage Type | Threshold |
|--------------|-----------|
| Statements   | 80%       |
| Branches     | 80%       |
| Functions    | 80%       |
| Lines        | 80%       |
```

**Code block pattern** (lines 29-44):
```markdown
Setup requirements before running E2E tests:
\`\`\`bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
\`\`\`
```

**Apply to PERFORMANCE-BASELINE.md:**
```markdown
# Performance Baseline

**Captured:** YYYY-MM-DD
**Version:** v1.5 (pre-optimization)
**Environment:** Staging

## Summary

This document captures performance metrics BEFORE optimization work begins in v1.5.
After each optimization phase, update the "Current" column to track improvement.

## Bundle Metrics

| Metric | Baseline | Current | Target | Source |
|--------|----------|---------|--------|--------|
| Initial JS Bundle | TBD KB | - | < 250 KB | rollup-plugin-visualizer |
| Total JS Bundle | TBD KB | - | - | rollup-plugin-visualizer |
| Largest Chunk | TBD KB | - | - | rollup-plugin-visualizer |

## Core Web Vitals

| Metric | Baseline | Current | Target | Source |
|--------|----------|---------|--------|--------|
| LCP (Dashboard) | TBD ms | - | < 2000 ms | Lighthouse CI |
| LCP (NewsFeed) | TBD ms | - | < 2000 ms | Lighthouse CI |
| LCP (Analysis) | TBD ms | - | < 2000 ms | Lighthouse CI |
| INP | TBD ms | - | < 150 ms | Lighthouse CI |
| CLS | TBD | - | < 0.05 | Lighthouse CI |

## API Performance

| Metric | Baseline | Current | Target | Source |
|--------|----------|---------|--------|--------|
| /api/news p95 | TBD ms | - | < 500 ms | k6 load test |
| /api/ai/ask p95 | TBD ms | - | < 5000 ms | k6 load test |
| /api/auth p95 | TBD ms | - | < 300 ms | k6 load test |

## Database Performance

| Metric | Baseline | Current | Target | Source |
|--------|----------|---------|--------|--------|
| Query p95 | TBD ms | - | < 50 ms | Prisma logging |
| Slow queries (>100ms) | TBD count | - | 0 | Prisma logging |
| N+1 patterns identified | TBD count | - | 0 | Prisma logging |

## Lighthouse Scores

| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Dashboard | TBD | TBD | TBD | TBD |
| NewsFeed | TBD | TBD | TBD | TBD |
| Analysis | TBD | TBD | TBD | TBD |
| Monitor | TBD | TBD | TBD | TBD |

## Update History

| Date | Phase | Changes |
|------|-------|---------|
| YYYY-MM-DD | 29 - Measurement Foundation | Initial baseline captured |
```

---

## Shared Patterns

### Environment Gating
**Source:** `server/db/prisma.ts` (new pattern), `vite.config.ts` lines 104
**Apply to:** Prisma logging configuration
```typescript
const isDev = process.env.NODE_ENV !== 'production';
```

### GitHub Actions Job Dependencies
**Source:** `.github/workflows/ci.yml` lines 109, 168, 243, 270
**Apply to:** bundle-analysis and lighthouse jobs
```yaml
needs: [lint, typecheck, test]  # bundle-analysis
needs: [deploy-staging]          # lighthouse
```

### Artifact Upload with Retention
**Source:** `.github/workflows/ci.yml` lines 232-237
**Apply to:** Bundle stats upload
```yaml
- name: Upload bundle stats
  uses: actions/upload-artifact@v4
  with:
    name: bundle-stats
    path: dist/stats.html
    retention-days: 30
```

### Vite Plugin Type Casting
**Source:** RESEARCH.md Pitfall 4 (lines 393-398)
**Apply to:** rollup-plugin-visualizer
```typescript
import { type PluginOption } from 'vite'
// ...
visualizer({...}) as PluginOption,
```

---

## No Analog Found

Files with no close match in the codebase (use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lighthouserc.js` | config | CI/CD | New Lighthouse CI configuration file - no prior Lighthouse usage in project |

**Recommendation:** Use complete pattern from RESEARCH.md lines 304-333 (Pattern 3: Lighthouse CI Configuration).

---

## Metadata

**Analog search scope:** `vite.config.ts`, `server/db/`, `.github/workflows/`, `docs/`
**Files scanned:** 8
**Pattern extraction date:** 2026-04-25

### Key Patterns Identified

1. **Vite conditional plugin pattern** - Use spread operator with ternary for optional plugins (Sentry example)
2. **Unconditional plugin addition** - For always-on plugins like visualizer, add directly to array
3. **Prisma event-based logging** - Use `{ emit: 'event', level: 'query' }` with `$on()` handler
4. **Environment gating** - `NODE_ENV !== 'production'` pattern for dev-only features
5. **CI job dependencies** - `needs: [job1, job2]` for sequential execution
6. **Artifact upload** - `actions/upload-artifact@v4` with retention-days
7. **Documentation tables** - Markdown tables for metrics with Baseline/Current/Target columns
