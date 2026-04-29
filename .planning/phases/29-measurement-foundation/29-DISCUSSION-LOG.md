# Phase 29: Measurement Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 29-measurement-foundation
**Areas discussed:** Bundle analysis output, Prisma query logging, Lighthouse CI integration, Baseline documentation

---

## Bundle Analysis Output

| Option | Description | Selected |
|--------|-------------|----------|
| HTML report + CI comment | Generate visualizer HTML, upload as artifact, post bundle size delta in PR comments | ✓ |
| HTML report only | Generate HTML report on build, view locally or as CI artifact | |
| JSON + dashboard | Export JSON data, display trends in Grafana over time | |
| You decide | Claude picks the approach based on existing patterns | |

**User's choice:** HTML report + CI comment (Recommended)
**Notes:** Full CI integration with PR comments for visibility

---

## Bundle Size Blocking

| Option | Description | Selected |
|--------|-------------|----------|
| Warn only | Comment shows delta but doesn't block merge — team reviews and decides | ✓ |
| Block on increase | Any bundle size increase fails the PR check | |
| Block with budget | Fail if total exceeds budget (e.g., 500KB initial JS) | |

**User's choice:** Warn only (Recommended)
**Notes:** Team can review and decide, no hard blocks

---

## Prisma Query Logging

| Option | Description | Selected |
|--------|-------------|----------|
| query + warn | Log all SQL queries in dev + warnings/errors — best for identifying N+1 patterns | ✓ |
| warn only | Only log slow queries and errors — less noise, may miss patterns | |
| query + info + warn | Maximum verbosity — includes connection events, most complete picture | |

**User's choice:** query + warn (Recommended)
**Notes:** Balanced verbosity for N+1 pattern identification

---

## Query Log Output

| Option | Description | Selected |
|--------|-------------|----------|
| Console in dev only | Query logs to stdout in development, disabled in production (performance) | ✓ |
| Winston logger always | Route through existing Winston logger, respect LOG_LEVEL env var | |
| File + rotate | Write to query.log file with daily rotation — good for analysis but more setup | |

**User's choice:** Console in dev only (Recommended)
**Notes:** Keep production lean, dev gets full visibility

---

## Lighthouse CI Integration

| Option | Description | Selected |
|--------|-------------|----------|
| CI on every PR | Run Lighthouse in GitHub Actions, post scores as PR comment, track trends | ✓ |
| Manual only | npm script for local runs, no CI automation | |
| CI + LHCI server | Full Lighthouse CI server for historical tracking — more infrastructure | |

**User's choice:** CI on every PR (Recommended)
**Notes:** Full automation, catch regressions early

---

## Lighthouse Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 90+ all categories | Performance, Accessibility, Best Practices, SEO all >= 90 — matches PROJECT.md target | ✓ |
| 95+ performance only | Strict on performance, relaxed on others | |
| Warn, no block | Post scores as info, never fail the build | |

**User's choice:** 90+ all categories (Recommended)
**Notes:** Aligns with PROJECT.md Lighthouse 90+ target

---

## Baseline Documentation

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown + Grafana | PERFORMANCE-BASELINE.md for reference + Grafana annotations for historical tracking | ✓ |
| Markdown only | PERFORMANCE-BASELINE.md with current metrics, manually updated | |
| Dashboard only | All baselines in Grafana, no markdown documentation | |

**User's choice:** Markdown + Grafana (Recommended)
**Notes:** Dual documentation for both reference and historical tracking

---

## Claude's Discretion

- Exact rollup-plugin-visualizer configuration options
- PR comment template formatting
- Lighthouse CI lighthouserc.js configuration details
- Grafana annotation panel placement
- Baseline document structure and formatting

## Deferred Ideas

None — discussion stayed within phase scope
