# Performance Baseline

**Captured:** 2026-04-25
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
| 2026-04-25 | 29 - Measurement Foundation | Initial baseline document created (TBD placeholders) |

---

*Note: TBD values will be filled in during first CI run after deployment.*
