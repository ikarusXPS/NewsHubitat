---
phase: 20-monitoring-alerting
plan: 01
subsystem: backend/monitoring
tags: [prometheus, metrics, health-checks, observability]
dependency_graph:
  requires: []
  provides:
    - MetricsService singleton with prom-client registry
    - metricsMiddleware for HTTP request instrumentation
    - /health liveness endpoint
    - /readiness dependency check endpoint
    - /metrics Prometheus scrape endpoint
  affects:
    - server/index.ts (middleware integration, new endpoints)
    - package.json (prom-client dependency)
tech_stack:
  added:
    - prom-client@15.1.3 (Prometheus metrics client for Node.js)
  patterns:
    - Singleton service pattern (MetricsService)
    - Route normalization for label cardinality control
    - Promise.race for dependency timeout
key_files:
  created:
    - server/services/metricsService.ts
    - server/middleware/metricsMiddleware.ts
    - server/services/metricsService.test.ts
  modified:
    - server/index.ts
    - package.json
    - .env.example
decisions:
  - prom-client v15.1.3 for Prometheus metrics (D-01)
  - Singleton MetricsService following cacheService pattern (D-02)
  - Standard histogram buckets [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] seconds (D-08)
  - Route normalization to prevent cardinality explosion (D-06)
  - 3-second timeout on dependency checks (D-28)
metrics:
  duration_minutes: 5
  completed: "2026-04-23T11:47:43Z"
  tasks_completed: 4
  tasks_total: 4
  files_created: 3
  files_modified: 3
  tests_added: 8
  tests_passing: 8
---

# Phase 20 Plan 01: Prometheus Metrics and Health Endpoints Summary

Prometheus metrics collection with prom-client, HTTP request instrumentation via middleware, and health endpoints for container orchestration.

## What Was Built

### MetricsService Singleton (Task 1)
Created `server/services/metricsService.ts` following the project's singleton pattern (like CacheService). The service wraps prom-client's Registry and exposes:

- **HTTP Request Histogram** (`http_request_duration_seconds`) - Latency with standard buckets
- **HTTP Request Counter** (`http_requests_total`) - Request count by method/route/status
- **Service Up Gauge** (`up{service=newshub}`) - Liveness indicator
- **WebSocket Connections Gauge** (`websocket_connections_active`)
- **DB Connections Gauge** (`db_connections_active`)
- **Redis Connections Gauge** (`redis_connections_active`)
- Default Node.js metrics with `newshub_` prefix (CPU, memory, event loop, GC)

### Metrics Middleware (Task 2)
Created `server/middleware/metricsMiddleware.ts` that:

- Records request duration using `process.hrtime.bigint()` for nanosecond precision
- Normalizes routes to prevent cardinality explosion (UUIDs, numeric IDs, ObjectIds become `:id`)
- Skips health/metrics endpoints to prevent recursive recording

### Health Endpoints (Task 3)
Added three new endpoints to `server/index.ts`:

| Endpoint | Type | Response |
|----------|------|----------|
| `/health` | Liveness | `{status, version, commit, uptime_seconds}` |
| `/readiness` | Readiness | `{status, db_latency_ms, redis_latency_ms}` |
| `/metrics` | Prometheus | Prometheus exposition format |

The readiness endpoint uses `Promise.race` with a 3-second timeout to prevent cascade failures during partial outages. Both health endpoints return `Cache-Control: no-cache, no-store, must-revalidate`.

### Unit Tests (Task 4)
Added 8 unit tests in `server/services/metricsService.test.ts`:
- Singleton pattern verification
- Prometheus format output
- Content type validation
- Metric existence checks (histogram, counter, gauges)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `2f77235` | feat | Install prom-client and create MetricsService singleton |
| `a0bf828` | feat | Create metricsMiddleware with route normalization |
| `48f5f2b` | feat | Add health endpoints and integrate metrics middleware |
| `f31d3fe` | test | Add MetricsService unit tests |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
npm run typecheck    # PASS - TypeScript compiles without errors
npm run test -- server/services/metricsService.test.ts --run  # PASS - 8/8 tests pass
```

All acceptance criteria met:
- prom-client v15.1.3 installed
- MetricsService singleton with getInstance()
- HTTP histogram with standard buckets
- HTTP counter with method/route/status_code labels
- Route normalization for UUIDs, numeric IDs, ObjectIds
- Health endpoints excluded from metrics
- /health returns version, commit, uptime
- /readiness returns DB + Redis latency
- 3-second timeout on dependency checks
- /metrics returns Prometheus format

## Self-Check: PASSED

All files verified:
- FOUND: server/services/metricsService.ts
- FOUND: server/middleware/metricsMiddleware.ts
- FOUND: server/services/metricsService.test.ts
- FOUND: Commit 2f77235
- FOUND: Commit a0bf828
- FOUND: Commit 48f5f2b
- FOUND: Commit f31d3fe

---

*Plan executed: 2026-04-23*
*Duration: 5 minutes*
