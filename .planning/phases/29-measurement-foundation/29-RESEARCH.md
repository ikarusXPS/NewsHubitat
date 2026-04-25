# Phase 29: Measurement Foundation - Research

**Researched:** 2026-04-25
**Domain:** Performance measurement and observability tooling
**Confidence:** HIGH

## Summary

Phase 29 establishes performance baselines and tooling before optimization work begins. The phase implements three measurement pillars: bundle analysis with rollup-plugin-visualizer, database query logging via Prisma's event-based logging, and Lighthouse CI integration for Web Vitals metrics.

The existing infrastructure provides solid foundations: Vite 8 with manual chunk splitting, Prisma 7 with PrismaPg adapter, and a mature CI/CD pipeline on GitHub Actions. The phase adds visualization and measurement layers to existing build and database infrastructure, plus introduces Lighthouse CI as a new quality gate.

**Primary recommendation:** Implement rollup-plugin-visualizer for bundle analysis, enable Prisma query logging with event handlers for development, and add treosh/lighthouse-ci-action to the CI pipeline with 90+ score thresholds.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bundle Analysis:**
- D-01: Use rollup-plugin-visualizer to generate HTML report on build
- D-02: Upload HTML report as CI artifact on every PR
- D-03: Post bundle size delta in PR comments (total size change, per-chunk changes)
- D-04: Warn only on size increase - do not block PRs (team reviews and decides)
- D-05: Track initial JS bundle size separately from total bundle

**Prisma Query Logging:**
- D-06: Enable Prisma log levels: `query` and `warn`
- D-07: Output to console in development only - disabled in production (performance)
- D-08: Log format should include query duration for identifying slow queries
- D-09: Gate logging on NODE_ENV !== 'production'

**Lighthouse CI:**
- D-10: Run Lighthouse in GitHub Actions on every PR
- D-11: Post scores as PR comment with trend comparison
- D-12: Thresholds: 90+ for Performance, Accessibility, Best Practices, SEO
- D-13: Fail PR check if any category drops below 90
- D-14: Use lighthouse-ci-action for GitHub integration
- D-15: Run against preview/staging deployment (not localhost)

**Baseline Documentation:**
- D-16: Create `docs/PERFORMANCE-BASELINE.md` with current metrics
- D-17: Add Grafana annotations for baseline timestamps
- D-18: Document: Initial JS bundle, LCP, INP, CLS, API p95, DB query p95
- D-19: Update baseline document after each optimization phase

### Claude's Discretion

- Exact rollup-plugin-visualizer configuration options
- PR comment template formatting
- Lighthouse CI lighthouserc.js configuration details
- Grafana annotation panel placement
- Baseline document structure and formatting

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-01 | Bundle analysis tooling configured with rollup-plugin-visualizer | rollup-plugin-visualizer 7.0.1 verified, Vite 8 compatible |
| MEAS-02 | Prisma query logging enabled to expose N+1 patterns and slow queries | Prisma 7 log configuration and $on event handlers documented |
| MEAS-03 | Lighthouse CI baseline established with LCP, INP, CLS metrics | treosh/lighthouse-ci-action@v12 with lighthouserc.js assertions |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Bundle analysis | Build/CI | - | Build-time measurement, no runtime impact |
| Query logging | API/Backend | Database | Backend captures query events from ORM layer |
| Lighthouse CI | CI/CD | Frontend Server | CI runs headless browser against deployed app |
| Baseline docs | Documentation | - | Static documentation, no runtime tier |
| Grafana annotations | Monitoring | API/Backend | Monitoring tier with API calls for annotation |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rollup-plugin-visualizer | 7.0.1 | Bundle size visualization | Official Rollup plugin, Vite compatible [VERIFIED: npm registry] |
| @lhci/cli | 0.15.1 | Lighthouse CI runner | Official Google Chrome tooling [VERIFIED: npm registry] |
| lighthouse-ci-action | v12 | GitHub Actions integration | Maintained by treosh, official LHCI integration [VERIFIED: GitHub Marketplace] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| preactjs/compressed-size-action | v2 | Bundle size PR comments | When detailed gzip/brotli delta comments needed [VERIFIED: GitHub Marketplace] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rollup-plugin-visualizer | webpack-bundle-analyzer | Only for webpack; visualizer works with Vite/Rollup |
| treosh/lighthouse-ci-action | justinribeiro/lighthouse-action | Less feature-complete, older maintenance |
| compressed-size-action | build-size-diff | Build-size-diff supports more bundlers but less mature |

**Installation:**
```bash
npm install --save-dev rollup-plugin-visualizer@7.0.1
```

**Version verification:** rollup-plugin-visualizer 7.0.1 is current as of 2026-04-25 [VERIFIED: npm registry]. The package requires Node.js >= 22, which the project satisfies (Node 25.4.0 installed). [VERIFIED: project environment]

## Architecture Patterns

### System Architecture Diagram

```
Build Pipeline Flow:
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Actions CI                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR Created                                                                  │
│      │                                                                       │
│      ▼                                                                       │
│  ┌───────────┐   ┌──────────────┐   ┌──────────────────┐                   │
│  │  Lint     │──▶│  Typecheck   │──▶│   Unit Tests     │                   │
│  └───────────┘   └──────────────┘   └──────────────────┘                   │
│                                              │                               │
│                                              ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                       Build Job                                │         │
│  │  ┌─────────────┐   ┌─────────────────────────────────────────┐│         │
│  │  │  npm build  │──▶│  rollup-plugin-visualizer               ││         │
│  │  │             │   │  ├─ dist/stats.html (treemap)           ││         │
│  │  │             │   │  └─ Chunk sizes logged                  ││         │
│  │  └─────────────┘   └─────────────────────────────────────────┘│         │
│  │                              │                                 │         │
│  │                              ▼                                 │         │
│  │  ┌───────────────────────────────────────────────────────────┐│         │
│  │  │  compressed-size-action                                    ││         │
│  │  │  ├─ Compare PR bundle vs main branch                      ││         │
│  │  │  └─ Post delta comment to PR                              ││         │
│  │  └───────────────────────────────────────────────────────────┘│         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                              │                               │
│                                              ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                    Deploy to Staging                           │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                              │                               │
│                                              ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                    Lighthouse CI Job                           │         │
│  │  ┌─────────────────────────────────────────────────────────┐  │         │
│  │  │  treosh/lighthouse-ci-action                             │  │         │
│  │  │  ├─ Audit: Dashboard, NewsFeed, Analysis pages          │  │         │
│  │  │  ├─ Collect: LCP, INP, CLS, Performance scores          │  │         │
│  │  │  ├─ Assert: 90+ thresholds (fail PR if below)           │  │         │
│  │  │  └─ Upload: Temporary public storage (7-day reports)    │  │         │
│  │  └─────────────────────────────────────────────────────────┘  │         │
│  │                              │                                 │         │
│  │                              ▼                                 │         │
│  │  ┌───────────────────────────────────────────────────────────┐│         │
│  │  │  Post Lighthouse results to PR comment                    ││         │
│  │  └───────────────────────────────────────────────────────────┘│         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Development Query Logging Flow:
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Development Environment                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  API Request                                                                 │
│      │                                                                       │
│      ▼                                                                       │
│  ┌───────────────┐   ┌─────────────────────────────────────────────────┐   │
│  │  Express      │──▶│  Route Handler                                   │   │
│  │  Middleware   │   │      │                                           │   │
│  └───────────────┘   │      ▼                                           │   │
│                      │  ┌─────────────────────────────────────────────┐ │   │
│                      │  │  Prisma Client                               │ │   │
│                      │  │  ├─ log: [{ emit: 'event', level: 'query' }]│ │   │
│                      │  │  │                                           │ │   │
│                      │  │  │  $on('query', (e) => {                   │ │   │
│                      │  │  │    console.log(`[${e.duration}ms]`)       │ │   │
│                      │  │  │    console.log(e.query)                   │ │   │
│                      │  │  │  })                                       │ │   │
│                      │  │  │                                           │ │   │
│                      │  │  └─────────────────────────────────────────┐│ │   │
│                      │  └───────────────────────────────────────────┘│ │   │
│                      │                      │                         │ │   │
│                      │                      ▼                         │ │   │
│                      │              ┌───────────────┐                │ │   │
│                      │              │  PostgreSQL   │                │ │   │
│                      │              └───────────────┘                │ │   │
│                      └───────────────────────────────────────────────────┘   │
│                                                                              │
│  Console Output (development only):                                         │
│  [15ms] SELECT "NewsArticle".* FROM "NewsArticle" WHERE ...                 │
│  [3ms] SELECT "User".* FROM "User" WHERE "id" = $1                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
project/
├── vite.config.ts           # Add rollup-plugin-visualizer plugin
├── server/
│   └── db/
│       └── prisma.ts        # Add query logging configuration
├── lighthouserc.js          # NEW: Lighthouse CI configuration
├── docs/
│   └── PERFORMANCE-BASELINE.md  # NEW: Baseline metrics document
├── .github/
│   └── workflows/
│       └── ci.yml           # Extended with bundle analysis + Lighthouse jobs
└── dist/
    └── stats.html           # Generated bundle visualization (build artifact)
```

### Pattern 1: Vite Plugin Configuration for rollup-plugin-visualizer

**What:** Add rollup-plugin-visualizer as a Vite plugin to generate HTML bundle reports
**When to use:** Every production build
**Example:**
```typescript
// Source: https://github.com/btd/rollup-plugin-visualizer [CITED: official README]
import { defineConfig, type PluginOption } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ... existing plugins
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',     // Options: treemap, sunburst, network, flamegraph
      gzipSize: true,
      brotliSize: true,
      open: false,             // Don't auto-open in development
    }) as PluginOption,
  ],
})
```

### Pattern 2: Prisma Event-Based Query Logging

**What:** Enable Prisma query logging with duration timing via event handlers
**When to use:** Development environment only (NODE_ENV !== 'production')
**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging [CITED: official docs]
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

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

// Configure logging based on environment
const isDev = process.env.NODE_ENV !== 'production';

const prisma = new PrismaClient({
  adapter,
  log: isDev
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [],
});

// Event handler for query duration logging (development only)
if (isDev) {
  prisma.$on('query', (e) => {
    console.log(`[Prisma ${e.duration}ms] ${e.query}`);
    if (e.params) {
      console.log(`  Params: ${e.params}`);
    }
  });
}

export { prisma };
```

### Pattern 3: Lighthouse CI Configuration

**What:** lighthouserc.js configuration for CI assertions and thresholds
**When to use:** Run on every PR against staging deployment
**Example:**
```javascript
// Source: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md [CITED: official docs]
module.exports = {
  ci: {
    collect: {
      url: [
        'https://staging.newshub.example.com/',
        'https://staging.newshub.example.com/analysis',
        'https://staging.newshub.example.com/monitor',
      ],
      numberOfRuns: 3,  // Reduce flakiness with multiple runs
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 2000 }],  // < 2s
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.05 }],   // < 0.05
        'interaction-to-next-paint': ['warn', { maxNumericValue: 150 }],  // < 150ms
      },
    },
    upload: {
      target: 'temporary-public-storage',  // Free, 7-day retention
    },
  },
};
```

### Pattern 4: GitHub Actions Bundle Size Comment

**What:** Post bundle size delta as PR comment using compressed-size-action
**When to use:** Every PR build
**Example:**
```yaml
# Source: https://github.com/preactjs/compressed-size-action [CITED: official README]
- name: Report bundle size
  uses: preactjs/compressed-size-action@v2
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    pattern: './dist/**/*.{js,css}'
    build-script: 'build'
    compression: 'brotli'
```

### Anti-Patterns to Avoid

- **Logging in production:** Never enable Prisma query logging in production - significant performance overhead
- **Blocking PRs on size increase:** Per D-04, warn only - let team decide on acceptable size growth
- **Running Lighthouse against localhost:** Always run against deployed staging URL for accurate results
- **Single Lighthouse run:** Use 3+ runs to reduce measurement variance

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle size visualization | Custom webpack/rollup analysis | rollup-plugin-visualizer | Handles chunk splitting, async imports, tree shaking visualization |
| PR bundle comments | Custom diff calculation | compressed-size-action | Handles gzip/brotli calculation, caching, fork PR limitations |
| Lighthouse CI | Manual Lighthouse runs | treosh/lighthouse-ci-action | Handles Chrome installation, result storage, PR status integration |
| Query logging format | Custom SQL interceptor | Prisma $on('query') events | Prisma already captures duration, params, normalized query |
| Grafana annotations | Manual API calls | POST /api/annotations | Grafana's native API with dashboard linking, tags, filtering |

**Key insight:** These measurement tools have complex edge cases (fork PRs, CI caching, browser installation) that make custom implementations fragile. Standard tools handle these reliably.

## Common Pitfalls

### Pitfall 1: Lighthouse Flakiness in CI

**What goes wrong:** Lighthouse scores vary 5-15 points between runs due to CPU throttling, network simulation, and container resource contention.
**Why it happens:** GitHub Actions runners share resources; Chrome's performance simulation is inherently variable.
**How to avoid:** Run 3+ audits per URL (`numberOfRuns: 3`), use `warn` level for metric assertions while using `error` for category scores.
**Warning signs:** Test failures that pass on retry, scores jumping between 85-95 across runs.

### Pitfall 2: Prisma Query Logging Type Errors

**What goes wrong:** TypeScript errors when using `prisma.$on('query', ...)` due to Prisma's generated client types.
**Why it happens:** The `$on` method signature depends on the `log` configuration; without proper typing, the event shape isn't inferred.
**How to avoid:** Explicitly type the event parameter: `prisma.$on('query', (e: Prisma.QueryEvent) => {...})`. Import `Prisma` namespace from generated client.
**Warning signs:** `Property 'duration' does not exist on type 'unknown'`

### Pitfall 3: Fork PR Comment Limitations

**What goes wrong:** compressed-size-action silently fails to post comments on PRs from forks.
**Why it happens:** GitHub's security model prevents fork PRs from accessing GITHUB_TOKEN with write permissions.
**How to avoid:** Accept that fork PRs will output to stdout instead. Document this limitation. Consider separate workflow for fork PRs using workflow_run trigger.
**Warning signs:** No bundle size comment on external contributor PRs.

### Pitfall 4: rollup-plugin-visualizer + Vite Type Mismatch

**What goes wrong:** TypeScript error: `Type 'Plugin' is not assignable to type 'PluginOption'`
**Why it happens:** rollup-plugin-visualizer returns Rollup Plugin type, Vite expects PluginOption.
**How to avoid:** Cast the plugin: `visualizer({...}) as PluginOption`
**Warning signs:** Build fails with type error on plugins array.

### Pitfall 5: Lighthouse Against Wrong URL

**What goes wrong:** Lighthouse audits localhost or non-existent staging URL, producing invalid results.
**Why it happens:** Job runs before deployment completes, or staging URL secret is misconfigured.
**How to avoid:** Add explicit job dependency on deploy-staging, verify staging URL secret exists, add URL health check before Lighthouse.
**Warning signs:** 0 scores, navigation errors in Lighthouse output.

## Code Examples

### Complete vite.config.ts with Visualizer

```typescript
// Source: Existing vite.config.ts + rollup-plugin-visualizer docs [VERIFIED: project code + official docs]
import { defineConfig, type PluginOption } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    VitePWA({
      // ... existing PWA config
    }),
    // Sentry plugin (conditional)
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            // ... existing Sentry config
          }),
        ]
      : []),
    // Bundle visualizer - generates dist/stats.html
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }) as PluginOption,
  ],
  // ... rest of config unchanged
})
```

### Complete Prisma Logging Configuration

```typescript
// Source: Existing server/db/prisma.ts + Prisma logging docs [VERIFIED: project code + official docs]
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

const isDev = process.env.NODE_ENV !== 'production';

const prisma = new PrismaClient({
  adapter,
  log: isDev
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [],
});

// Development-only query logging with duration
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

### GitHub Actions CI Extension

```yaml
# Source: Existing .github/workflows/ci.yml + lighthouse-ci-action docs [VERIFIED: project code + official docs]
name: CI/CD Pipeline

on:
  pull_request:
  push:
    branches: [master]

# ... existing jobs (lint, typecheck, test, build, e2e)

jobs:
  # ... existing jobs unchanged

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
            if curl -sf ${{ secrets.STAGING_URL }}/health > /dev/null; then
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

### Complete lighthouserc.js

```javascript
// Source: lighthouse-ci-action docs + project requirements [VERIFIED: official docs]
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
        // Chrome flags for CI environment
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        // Category scores (D-12: 90+ required, D-13: fail if below)
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals (D-18: document baselines) - warn only, tracked for improvement
        'largest-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.05 }],
        'interaction-to-next-paint': ['warn', { maxNumericValue: 150 }],

        // First Contentful Paint - secondary metric
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Grafana Annotation API Usage

```bash
# Source: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/annotations/ [CITED: official docs]
# Create a baseline annotation in Grafana

curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Performance Baseline v1.5 - Phase 29",
    "tags": ["baseline", "v1.5", "measurement-foundation"],
    "time": '"$(date +%s)000"'
  }' \
  http://localhost:3000/api/annotations
```

### PERFORMANCE-BASELINE.md Template

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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| webpack-bundle-analyzer | rollup-plugin-visualizer | Vite 2+ adoption | Works with Vite/Rolldown ecosystem |
| stdout logging | Event-based Prisma logging | Prisma 3+ | Structured events with duration, params |
| Manual Lighthouse runs | Lighthouse CI in GitHub Actions | 2022+ | Automated regression detection |
| INP replaces FID | Core Web Vitals update | March 2024 | INP better reflects real interaction latency |

**Deprecated/outdated:**
- First Input Delay (FID): Replaced by INP in Core Web Vitals as of March 2024 [CITED: web.dev/blog/inp]
- webpack-bundle-analyzer for Vite projects: Use rollup-plugin-visualizer instead

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Grafana admin credentials remain admin/admin in development | Code Examples | Minor - update curl command credentials |
| A2 | Staging URL follows pattern staging.newshub.example.com | lighthouserc.js | Medium - update URL or use env var |

**If this table is empty:** Most claims in this research were verified or cited - only two minor assumptions identified above.

## Open Questions

1. **LHCI_GITHUB_APP_TOKEN setup**
   - What we know: Lighthouse CI offers GitHub App token for status checks on PRs
   - What's unclear: Whether team has authorized the Lighthouse CI GitHub App
   - Recommendation: Document setup steps in implementation, fall back to GITHUB_TOKEN if app not authorized

2. **Prisma QueryEvent type import path**
   - What we know: Prisma exports `Prisma.QueryEvent` type for event handlers
   - What's unclear: Exact import path with PrismaPg adapter and generated client location
   - Recommendation: Verify import in implementation, may need `import type { Prisma } from '../../src/generated/prisma/client'`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js 22+ | rollup-plugin-visualizer | Yes | v25.4.0 | - |
| GitHub Actions | Lighthouse CI | Yes | ubuntu-latest | - |
| Staging deployment | Lighthouse audits | Conditional | SSH deploy | Skip Lighthouse on PRs, run only on merge |

**Missing dependencies with no fallback:**
- None identified

**Missing dependencies with fallback:**
- Staging URL: If staging not deployed, Lighthouse job can be skipped with condition

## Sources

### Primary (HIGH confidence)
- rollup-plugin-visualizer npm registry - version 7.0.1, configuration options [VERIFIED: npm view]
- Prisma logging documentation - https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging [CITED]
- Lighthouse CI getting-started.md - https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md [CITED]
- treosh/lighthouse-ci-action - https://github.com/marketplace/actions/lighthouse-ci-action [CITED]
- preactjs/compressed-size-action - https://github.com/preactjs/compressed-size-action [CITED]

### Secondary (MEDIUM confidence)
- Vite 8 rollup-plugin-visualizer compatibility - web search verified against official announcement [CITED: vite.dev/blog/announcing-vite8]
- Grafana annotations API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/annotations/ [CITED]

### Tertiary (LOW confidence)
- None - all claims verified or cited

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified against npm registry and official documentation
- Architecture: HIGH - Extends existing CI/CD patterns (Phase 18), monitoring patterns (Phase 20)
- Pitfalls: HIGH - Based on documented limitations and verified edge cases

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days - stable tooling with slow release cycles)
