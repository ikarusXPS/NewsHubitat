# Phase 29: Measurement Foundation - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish performance baselines and tooling BEFORE optimization. This phase implements MEAS-01 through MEAS-03 from v1.5 requirements.

**Delivers:**
- Bundle analysis with rollup-plugin-visualizer (HTML reports + CI comments)
- Prisma query logging enabled for N+1 pattern identification
- Lighthouse CI integration with 90+ score thresholds
- Performance baseline documentation (Markdown + Grafana annotations)

**Principle:** Measure FIRST, optimize SECOND. This phase creates the observability needed for data-driven optimization in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Bundle Analysis

- **D-01:** Use rollup-plugin-visualizer to generate HTML report on build
- **D-02:** Upload HTML report as CI artifact on every PR
- **D-03:** Post bundle size delta in PR comments (total size change, per-chunk changes)
- **D-04:** Warn only on size increase — do not block PRs (team reviews and decides)
- **D-05:** Track initial JS bundle size separately from total bundle

### Prisma Query Logging

- **D-06:** Enable Prisma log levels: `query` and `warn`
- **D-07:** Output to console in development only — disabled in production (performance)
- **D-08:** Log format should include query duration for identifying slow queries
- **D-09:** Gate logging on NODE_ENV !== 'production'

### Lighthouse CI

- **D-10:** Run Lighthouse in GitHub Actions on every PR
- **D-11:** Post scores as PR comment with trend comparison
- **D-12:** Thresholds: 90+ for Performance, Accessibility, Best Practices, SEO
- **D-13:** Fail PR check if any category drops below 90
- **D-14:** Use lighthouse-ci-action for GitHub integration
- **D-15:** Run against preview/staging deployment (not localhost)

### Baseline Documentation

- **D-16:** Create `docs/PERFORMANCE-BASELINE.md` with current metrics
- **D-17:** Add Grafana annotations for baseline timestamps
- **D-18:** Document: Initial JS bundle, LCP, INP, CLS, API p95, DB query p95
- **D-19:** Update baseline document after each optimization phase

### Claude's Discretion

- Exact rollup-plugin-visualizer configuration options
- PR comment template formatting
- Lighthouse CI lighthouserc.js configuration details
- Grafana annotation panel placement
- Baseline document structure and formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/20-monitoring-alerting/20-CONTEXT.md` — Prometheus/Grafana setup, MetricsService patterns
- `.planning/phases/21-load-testing/21-CONTEXT.md` — k6 baselines, CI workflow patterns
- `.planning/phases/18-ci-cd-pipeline/18-CONTEXT.md` — GitHub Actions workflow structure

### Existing Code
- `vite.config.ts` — Current build configuration with manual chunks
- `server/db/prisma.ts` — PrismaClient instantiation (add logging here)
- `.github/workflows/ci.yml` — Existing CI workflow to extend

### Research
- `.planning/research/FEATURES.md` — Performance targets (LCP < 2.0s, INP < 150ms, CLS < 0.05)
- `.planning/research/ARCHITECTURE.md` — Integration points for measurement tooling
- `.planning/research/PITFALLS.md` — Measurement before optimization principle (MP-01)

### Requirements
- `.planning/REQUIREMENTS.md` — MEAS-01, MEAS-02, MEAS-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vite.config.ts`: Plugin array ready for rollup-plugin-visualizer
- `server/db/prisma.ts`: PrismaClient instantiation point for adding log config
- `.github/workflows/ci.yml`: Existing workflow with test/build jobs to extend
- `prometheus/`, `grafana/`: Existing monitoring stack for annotations

### Established Patterns
- Vite plugins: Array spread pattern for conditional plugins (see Sentry plugin)
- Environment gating: `process.env.NODE_ENV !== 'production'` pattern
- CI artifacts: 30-day retention, upload with actions/upload-artifact
- PR comments: Use actions/github-script for posting comments

### Integration Points
- `vite.config.ts` plugins array: Add rollup-plugin-visualizer
- `server/db/prisma.ts` PrismaClient config: Add log property
- `.github/workflows/ci.yml`: Add bundle analysis + Lighthouse jobs
- `docs/`: New PERFORMANCE-BASELINE.md file

</code_context>

<specifics>
## Specific Ideas

- Bundle visualizer should output to `dist/stats.html` for easy CI artifact collection
- Prisma log format: `{ query: true, warn: true }` with custom event handler for duration
- Lighthouse CI uses Chrome headless — needs proper URL target in CI
- Grafana annotations use POST to /api/annotations API
- Baseline document should include "before optimization" header for v1.5 tracking

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-measurement-foundation*
*Context gathered: 2026-04-25*
