# Phase 20: Monitoring & Alerting - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Production observability with health checks, metrics, and alerting. This phase implements MNTR-01 through MNTR-04 from v1.3 requirements.

**Delivers:**
- Health endpoints (/health, /readiness) for container orchestration
- Prometheus-format metrics endpoint with API and system metrics
- External uptime monitoring via UptimeRobot
- Grafana dashboard visualizing all key metrics
- Alertmanager for alert routing and delivery

</domain>

<decisions>
## Implementation Decisions

### Metrics Collection

- **D-01:** Use `prom-client` library for Prometheus metrics — industry standard Node.js client
- **D-02:** Create `MetricsService` singleton following existing service patterns (aiService, cacheService)
- **D-03:** Expose `/metrics` endpoint on same port 3001 — no authentication required (internal network only)
- **D-04:** Enable prom-client default metrics (process_*, nodejs_*) with 10s collection interval
- **D-05:** Track API metrics only: request count, latency histograms, error rates by route and status code
- **D-06:** Normalize route labels (e.g., /api/news/:id) to prevent cardinality explosion
- **D-07:** Use standard Prometheus naming convention (http_request_duration_seconds, http_requests_total)
- **D-08:** Standard histogram buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] seconds
- **D-09:** Include HTTP status code labels for error rate calculation
- **D-10:** Skip metrics recording for health endpoints (/health, /readiness, /metrics)
- **D-11:** Add DB and Redis connection pool metrics (db_connections_active, redis_connections_active)
- **D-12:** Add WebSocket connection count metric (websocket_connections_active)
- **D-13:** Add custom `up{service=newshub}` gauge for service status
- **D-14:** No response size metrics, no session metrics, no Sentry duplication

### Prometheus & Alertmanager

- **D-15:** Add Prometheus container (prom/prometheus:v3.4) to docker-compose.yml
- **D-16:** 15-second scrape interval, 15-day data retention
- **D-17:** Alert rules in separate file: `prometheus/alert.rules.yml`
- **D-18:** Error rate alert: 5xx/total > 1% over 5 minutes
- **D-19:** Latency alert: p95 > 2 seconds over 5 minutes
- **D-20:** Alert evaluation interval: 15 seconds
- **D-21:** Add Alertmanager container (prom/alertmanager) for alert routing
- **D-22:** Alert grouping by alertname, 30s group wait before sending
- **D-23:** Alert delivery via email (Alertmanager email receiver)
- **D-24:** Basic silence support via Alertmanager UI for maintenance windows

### Health Endpoints

- **D-25:** `/health` — liveness check only (process running), returns {status, version, commit, uptime_seconds}
- **D-26:** `/readiness` — checks DB + Redis in parallel, returns {status, db_latency_ms, redis_latency_ms}
- **D-27:** Keep existing `/api/health/db` and `/api/health/redis` for granular debugging
- **D-28:** 3-second timeout per dependency check, parallel execution via Promise.all
- **D-29:** No rate limiting on health endpoints
- **D-30:** Skip logging for health check requests (reduce log noise)
- **D-31:** Cache-Control: no-cache, no-store, must-revalidate on all health endpoints
- **D-32:** Version/commit info via BUILD_VERSION, BUILD_COMMIT environment variables
- **D-33:** Update Docker Compose health check to use `/health` instead of `/api/health/db`

### Uptime Monitoring

- **D-34:** Use UptimeRobot (free tier: 50 monitors, 5-min intervals)
- **D-35:** Monitor production only: `/health` and `/readiness` endpoints
- **D-36:** 5-minute check interval
- **D-37:** Alert after 2 consecutive failures (10 minutes total)
- **D-38:** Email alerts only (UptimeRobot built-in)
- **D-39:** Enable SSL certificate expiry monitoring
- **D-40:** Skip public status page for now
- **D-41:** Monitor naming convention: NewsHub-prod-{endpoint}
- **D-42:** Document setup in `docs/monitoring/uptimerobot.md`

### Grafana Dashboards

- **D-43:** Add Grafana container (grafana/grafana-oss) to docker-compose.yml
- **D-44:** Single "NewsHub Operations" dashboard with multiple sections
- **D-45:** Overview row: Request rate, Error rate, Latency p95, Up status (Four Golden Signals)

### Claude's Discretion

- Exact Grafana panel layout and row organization (API, System, Dependencies sections)
- Grafana data source provisioning configuration
- Dashboard JSON structure and variable setup
- Prometheus configuration file details (scrape configs, rule files)
- Alertmanager email template formatting
- Exact thresholds for secondary metrics (memory, event loop lag)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Decisions
- `.planning/phases/17-docker-deployment/17-CONTEXT.md` — Docker Compose setup, health endpoint patterns
- `.planning/phases/18-ci-cd-pipeline/18-CONTEXT.md` — CI/CD workflow, deployment strategy
- `.planning/phases/19-sentry-error-tracking/19-CONTEXT.md` — Error tracking decisions, performance monitoring

### Existing Code
- `server/index.ts` lines 137-199 — Existing /api/health/db and /api/health/redis endpoints
- `server/services/cacheService.ts` — Redis client, getStats() method for metrics
- `docker-compose.yml` — Current service definitions (app, postgres, redis)

### Requirements
- `.planning/REQUIREMENTS.md` — MNTR-01 through MNTR-04 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/api/health/db` and `/api/health/redis`: Existing health checks with latency timing — extend pattern for new endpoints
- `cacheService.isAvailable()` and `cacheService.getStats()`: Redis status methods — use for /readiness check
- Winston logger (`server/utils/logger.ts`): Could add log filtering for health endpoints
- Singleton service pattern: `getInstance()` — use for MetricsService

### Established Patterns
- Express middleware chain: CORS → compression → serverTiming → routes — metrics middleware after routes
- Environment variables: `process.env.*` via dotenv — add BUILD_VERSION, BUILD_COMMIT, SMTP_* for alerts
- Docker Compose services with health checks: 10s interval, 5s timeout, 5 retries pattern
- Named volumes for persistence: postgres_data, redis_data — add prometheus_data, grafana_data

### Integration Points
- `server/index.ts`: Add /health, /readiness endpoints, metrics middleware
- `docker-compose.yml`: Add prometheus, alertmanager, grafana services
- `prometheus/`: New directory for prometheus.yml, alert.rules.yml
- `grafana/provisioning/`: Dashboard and datasource provisioning
- `docs/monitoring/`: Setup documentation for UptimeRobot

</code_context>

<specifics>
## Specific Ideas

- Prometheus scrapes /metrics every 15 seconds, no auth needed (internal Docker network)
- Alert rules follow standard naming: HighErrorRate, HighLatency, ServiceDown
- Grafana uses Prometheus as default datasource, provisioned via YAML
- UptimeRobot checks from multiple geographic locations (automatic)
- Dashboard overview row shows the "Four Golden Signals" from Google SRE book

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-monitoring-alerting*
*Context gathered: 2026-04-23*
