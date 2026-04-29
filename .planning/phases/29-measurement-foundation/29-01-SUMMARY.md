---
phase: 29-measurement-foundation
plan: 01
subsystem: build-tooling
tags: [measurement, bundle-analysis, ci-integration]
dependency_graph:
  requires: []
  provides: [bundle-visualizer, size-tracking]
  affects: [ci-pipeline, build-process]
tech_stack:
  added: [rollup-plugin-visualizer@7.0.1, preactjs/compressed-size-action@v2]
  patterns: [treemap-visualization, brotli-compression, artifact-retention]
key_files:
  created: []
  modified: [vite.config.ts, .github/workflows/ci.yml, package.json]
decisions:
  - "D-01: Use rollup-plugin-visualizer treemap template for visual bundle composition"
  - "D-02: Generate stats.html unconditionally on every build for consistency"
  - "D-03: Configure 30-day artifact retention to balance storage and analysis needs"
  - "D-04: Use preactjs/compressed-size-action for automated PR comments (non-blocking)"
  - "D-05: Enable both gzip and brotli size reporting for comprehensive metrics"
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_date: "2026-04-25"
---

# Phase 29 Plan 01: Bundle Visualization Setup Summary

**One-liner:** Integrated rollup-plugin-visualizer with treemap visualization and automated CI bundle size tracking via compressed-size-action for data-driven optimization decisions.

## What Was Built

Established bundle analysis infrastructure with two components:

1. **Build-time visualization** - rollup-plugin-visualizer generates `dist/stats.html` treemap on every build showing module sizes with gzip and brotli compression metrics
2. **CI-integrated size tracking** - GitHub Actions job uploads bundle stats as artifacts (30-day retention) and posts PR comments with bundle size deltas using brotli compression

This creates visibility into bundle composition before optimization work begins in subsequent phases (30-34).

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Install rollup-plugin-visualizer and configure Vite | 3391263 | Added visualizer plugin, configured treemap output to dist/stats.html |
| 2 | Add bundle-analysis job to CI workflow | 7436c6e | Created bundle-analysis job, added pull-requests: write permission, integrated compressed-size-action |

## Technical Implementation

### Task 1: Visualizer Plugin Configuration

**Added to vite.config.ts:**
```typescript
import { visualizer } from 'rollup-plugin-visualizer'
import { type PluginOption } from 'vite'

// In plugins array:
visualizer({
  filename: 'dist/stats.html',
  template: 'treemap',
  gzipSize: true,
  brotliSize: true,
  open: false,
}) as PluginOption,
```

**Type cast reasoning:** The `as PluginOption` cast resolves type mismatch between Rollup Plugin and Vite PluginOption (per RESEARCH.md Pitfall 4).

**Output:** 1.7MB HTML file with interactive treemap showing all chunks and their compressed sizes.

### Task 2: CI Bundle Analysis Job

**Added to .github/workflows/ci.yml:**

1. **Permission grant:** `pull-requests: write` enables compressed-size-action to post PR comments
2. **Job definition:** Runs after `[lint, typecheck, test]` to ensure quality gates pass first
3. **Artifact upload:** 30-day retention balances historical analysis with storage costs
4. **Size reporting:** Brotli compression matches production deployment compression

**Workflow sequence:**
```
lint, typecheck, test (parallel)
  ↓
bundle-analysis (generates stats, uploads artifact, posts PR comment)
  ↓
build (Docker image creation)
```

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met without adjustments.

## Verification Results

### Build Verification
```bash
npm run build
✓ dist/stats.html generated (1.7MB)
✓ Treemap shows all chunks with gzip/brotli sizes
```

### Acceptance Criteria
```bash
✓ rollup-plugin-visualizer@7.0.1 in devDependencies
✓ visualizer imported and configured in vite.config.ts
✓ filename configured as dist/stats.html
✓ bundle-analysis job defined in ci.yml
✓ preactjs/compressed-size-action@v2 configured
✓ pull-requests: write permission added
✓ retention-days: 30 configured
```

### File Verification
```
✓ vite.config.ts exists and contains visualizer configuration
✓ .github/workflows/ci.yml exists with bundle-analysis job
✓ dist/stats.html generated after build
```

### Commit Verification
```
✓ 3391263 - Task 1 commit exists
✓ 7436c6e - Task 2 commit exists
```

## Known Limitations

1. **Workflow syntax validator unavailable** - `action-validator` package had execution issues on Windows, but manual YAML verification and grep checks confirmed correct structure
2. **PR comment testing deferred** - compressed-size-action behavior will be verified on first PR after merge
3. **Stats.html not committed** - Intentionally excluded from git (build artifact, regenerated on each build)

## Next Steps

**Immediate (Phase 29):**
- Plan 02: Lighthouse CI integration for performance budgets
- Plan 03: Web Vitals tracking instrumentation

**Dependent phases (Phase 30+):**
- Use bundle stats to identify splitting opportunities (Phase 30: Frontend Code Splitting)
- Monitor bundle size impact during image optimization (Phase 32: Image Pipeline)
- Validate bundle size reductions after caching improvements (Phase 33: Caching)

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| vite.config.ts | +8 | Import visualizer, add plugin to array with treemap config |
| .github/workflows/ci.yml | +39 | Add bundle-analysis job, pull-requests permission, artifact upload |
| package.json | +1 | Add rollup-plugin-visualizer@7.0.1 to devDependencies |

## Threat Surface Scan

No new security-relevant surface introduced. All changes are build-time and CI-only:
- Bundle stats (dist/stats.html) contain only module sizes, no sensitive data
- compressed-size-action uses official preactjs action with GITHUB_TOKEN
- Artifacts are scoped to repository with 30-day TTL

## Self-Check: PASSED

**Files:**
- ✓ vite.config.ts exists with visualizer configuration
- ✓ .github/workflows/ci.yml exists with bundle-analysis job
- ✓ dist/stats.html generated successfully

**Commits:**
- ✓ 3391263 exists (Task 1)
- ✓ 7436c6e exists (Task 2)

**Configuration:**
- ✓ visualizer plugin configured with treemap template
- ✓ gzipSize and brotliSize enabled
- ✓ bundle-analysis job needs: [lint, typecheck, test]
- ✓ 30-day artifact retention configured
- ✓ compressed-size-action with brotli compression

All acceptance criteria met. Plan executed successfully.
