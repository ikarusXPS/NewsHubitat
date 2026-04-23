---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Production Ready
status: executing
last_updated: "2026-04-23T10:37:47Z"
last_activity: 2026-04-23
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# State: NewsHub

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Users can see how the same story is covered by different regional perspectives
**Current focus:** v1.3 Production Ready

## Current Position

Phase: 21 - Load Testing (in progress)
Current Plan: 21-01 (complete)
Status: Plan complete
Last activity: 2026-04-23 — Plan 21-01 complete (k6 test scripts, helper libraries, test data, user seeding)

```
v1.3 Progress: [######              ] 33% (1/3 plans in Phase 21)
```

## Milestone Progress

**Milestone:** v1.3 - Production Ready
**Goal:** Production-grade deployment infrastructure with CI/CD, error tracking, monitoring, and performance validation
**Status:** Ready to execute
**Previous:** v1.2 complete 2026-04-23

### Phase Summary

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 18 | CI/CD Pipeline | CICD-01, CICD-02, CICD-03, CICD-04 | Planned (3 plans) |
| 19 | Sentry Error Tracking | SNTR-01, SNTR-02, SNTR-03, SNTR-04 | Complete (3/3 plans) |
| 20 | Monitoring & Alerting | MNTR-01, MNTR-02, MNTR-03, MNTR-04 | Complete (3/3 plans) |
| 21 | Load Testing | LOAD-01, LOAD-02, LOAD-03, LOAD-04 | Not started |
| 22 | SMTP Production | SMTP-01, SMTP-02, SMTP-03 | Not started |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status |
|----------|------|--------|
| verification | Phase 03 human verification | human_needed |
| uat | Phase 06 UAT tests | blocked |

**Note:** These are environmental/operational items, not code defects:

- Phase 03: Email flows work but need SMTP server for production testing
- Phase 06: UAT tests blocked by no live RSS feeds during testing

## Session Context

**Last action:** Plan 21-01 complete (k6 test scripts, helper libraries, test data, user seeding)
**Next step:** Plan 21-02 (GitHub Actions workflow, performance baseline documentation)
**Resume file:** None
**Checkpoint:** None

## Accumulated Context

Carried forward from v1.2:

- PostgreSQL with PrismaPg adapter (max: 10 connections)
- Redis for JWT blacklist, rate limits, AI cache
- Docker Compose with health checks
- 91.65% test coverage baseline
- Dockerfile with multi-stage build (node:22-alpine3.19)
- Production static file serving via Express

## Decisions

| Decision | Context | Outcome |
|----------|---------|---------|
| @sentry/react 10.49.0 | React 19 compatibility needed | Works with React 19 error handlers |
| Sentry enabled in production only | Avoid noise in development | import.meta.env.PROD gate |
| 20% traces sample rate | Balance coverage vs volume | Configurable via VITE_SENTRY_TRACES_SAMPLE_RATE |
| @sentry/node 10.49.0 | Backend error capture needed | Works with Express 5 via setupExpressErrorHandler |
| ESM instrumentation via .mjs | Node --import flag requires ESM | server/instrument.mjs loaded before app |
| Backend Sentry env vars | Separate from frontend VITE_ vars | SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE |
| @sentry/vite-plugin 5.2.0 | Source map upload during CI build | Conditional plugin, deletes maps after upload |
| Hidden source maps | Generate maps without bundling | sourcemap: 'hidden' in vite.config.ts |
| Release format newshub@sha | Git commit traceability | SENTRY_RELEASE: newshub@${{ github.sha }} |
| Environment per deploy job | Distinguish staging/production errors | SENTRY_ENVIRONMENT set in each deploy step |
| prom-client 15.1.3 | Prometheus metrics collection | MetricsService singleton with registry |
| 15s scrape interval | Balance freshness vs overhead | Prometheus scrapes app:3001/metrics |
| Route normalization | Prevent label cardinality explosion | UUID/numeric/ObjectId → :id in metricsMiddleware |
| 3s dependency timeout | Prevent cascade failures | /readiness checks DB and Redis with timeout |
| HighErrorRate threshold | Alert on 5xx > 1% for 5m | prometheus/alert.rules.yml |
| HighLatency threshold | Alert on p95 > 2s for 5m | prometheus/alert.rules.yml |
| Grafana admin/admin | Default credentials for dev | Change in production |
| k6 JavaScript scripts | No TypeScript build step needed | D-21: JavaScript for k6 simplicity |
| SharedArray for test data | Memory-efficient data sharing | D-03, D-15: Load once, share across VUs |
| 429 marked as expected | Rate limits not counted as failures | D-07: http.expectedStatuses(429) |
| 100 test users seeded | Pre-created verified accounts | D-03: loadtest1-100@example.com |
| Performance thresholds | p95 < 500ms (news), 5s (AI), 300ms (auth) | D-36, D-37, D-38: Baseline validation |

---
*State initialized: 2026-04-18*
*Last updated: 2026-04-23 — Plan 21-01 complete (k6 test scripts)*
