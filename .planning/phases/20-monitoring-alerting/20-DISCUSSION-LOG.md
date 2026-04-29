# Phase 20: Monitoring & Alerting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 20-monitoring-alerting
**Areas discussed:** Metrics Collection, Health Endpoints, Uptime Monitoring, Grafana Dashboards

---

## Metrics Collection

| Option | Description | Selected |
|--------|-------------|----------|
| prom-client library | Standard Node.js Prometheus client. Auto-collects Node.js/V8 metrics + custom counters/histograms. Industry standard. | Yes |
| Custom /metrics endpoint | Hand-craft Prometheus text format. Full control but more work, must manually update. | |
| You decide | Claude picks the approach based on codebase patterns | |

**User's choice:** prom-client library (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| API metrics only | Request count, latency histograms, error rates by route — matches Sentry traces, avoids overlap | Yes |
| API + business metrics | Above plus: articles fetched, translations performed, AI queries, auth events | |
| Minimal — defaults only | Just Node.js defaults (memory, CPU, event loop). Keep it simple. | |
| You decide | Claude picks based on what provides actionable insights | |

**User's choice:** API metrics only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No auth | Internal network only — Prometheus scrapes from same Docker network. Simple setup. | Yes |
| Basic auth | Password-protect /metrics endpoint. Needed if exposing to external scrapers. | |
| You decide | Claude picks based on deployment model (Docker Compose = internal) | |

**User's choice:** No auth (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Singleton service pattern | MetricsService.getInstance() following existing aiService/cacheService pattern | Yes |
| Direct in index.ts | Initialize prom-client directly in server/index.ts, simpler but less modular | |
| You decide | Claude picks based on codebase consistency | |

**User's choice:** Singleton service pattern (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, normalize paths | /api/news/123 -> /api/news/:id — prevents cardinality explosion, standard practice | Yes |
| Exact paths | Keep full paths. Higher cardinality but more detail. | |
| You decide | Claude picks standard Prometheus best practices | |

**User's choice:** Yes, normalize paths (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standard web buckets | [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] seconds — covers fast to slow endpoints | Yes |
| Tighter buckets for fast APIs | [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5] — more granularity under 500ms | |
| You decide | Claude picks based on typical NewsHub response times | |

**User's choice:** Standard web buckets (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same port 3001 | Single server, /metrics endpoint alongside API routes. Simpler Docker setup. | Yes |
| Separate metrics port | Run metrics on port 9090. Standard Prometheus convention, isolates traffic. | |
| You decide | Claude picks based on Docker Compose simplicity | |

**User's choice:** Same port 3001 (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded 15s | Standard interval, configured in prometheus.yml. No app-side config needed. | Yes |
| Configurable via env var | METRICS_SCRAPE_INTERVAL for flexibility. Overkill for single deployment. | |
| You decide | Claude picks standard Prometheus defaults | |

**User's choice:** Hardcoded 15s (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, all defaults | Memory, CPU, event loop lag, GC stats — valuable for Node.js observability | Yes |
| Custom metrics only | Only API metrics, skip Node.js internals. Smaller scrape payload. | |
| You decide | Claude picks based on observability value | |

**User's choice:** Yes, all defaults (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include status codes | http_requests_total{status=200|400|500} — essential for error rate calculation | Yes |
| Group by success/error only | http_requests_total{result=success|error} — lower cardinality | |
| You decide | Claude picks based on Grafana dashboard needs | |

**User's choice:** Yes, include status codes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Prometheus convention | http_request_duration_seconds, http_requests_total — snake_case with unit suffix | Yes |
| NewsHub prefix | newshub_http_request_duration_seconds — namespaced to avoid collisions | |
| You decide | Claude picks based on Prometheus best practices | |

**User's choice:** Standard Prometheus convention (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add Prometheus container | prometheus:v3.4 in docker-compose.yml — scrapes /metrics, persists data | Yes |
| External Prometheus only | Assume Prometheus runs elsewhere (Grafana Cloud, etc). Just expose endpoint. | |
| You decide | Claude picks based on self-hosted deployment model | |

**User's choice:** Yes, add Prometheus container (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 15 days | Default retention. Sufficient for troubleshooting, moderate storage. | Yes |
| 7 days | Minimal retention. Lower storage, lose historical context. | |
| 30 days | Longer retention. More historical data, higher storage needs. | |
| You decide | Claude picks based on typical observability needs | |

**User's choice:** 15 days (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No response size metrics | Adds overhead, rarely actionable. Latency is more useful. | Yes |
| Yes, track response sizes | http_response_size_bytes histogram. Useful for bandwidth analysis. | |
| You decide | Claude picks based on what's actually useful | |

**User's choice:** No response size metrics (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add up gauge | up{service=newshub} = 1 when healthy — standard Prometheus pattern | Yes |
| Rely on scrape success only | Prometheus auto-creates up metric from scrape success. No custom gauge. | |
| You decide | Claude picks based on Prometheus conventions | |

**User's choice:** Yes, add up gauge (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, skip health endpoints | Don't record /health, /readiness, /metrics — reduces noise from frequent probes | Yes |
| Track all endpoints | Include health checks in metrics. More data but noisier. | |
| You decide | Claude picks based on typical monitoring patterns | |

**User's choice:** Yes, skip health endpoints (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add pool metrics | db_connections_active, redis_connections_active — useful for capacity planning | Yes |
| No pool metrics | Keep metrics simple, rely on health endpoint for connectivity. | |
| You decide | Claude picks based on what's actionable for debugging | |

**User's choice:** Yes, add pool metrics (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, track WS connections | websocket_connections_active gauge — useful for real-time feature monitoring | Yes |
| No WebSocket metrics | Socket.io already logs connections. Skip to reduce metric count. | |
| You decide | Claude picks based on what's useful for debugging real-time issues | |

**User's choice:** Yes, track WS connections (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Use default 10s | prom-client default interval for collecting Node.js metrics. Standard. | Yes |
| Faster 5s collection | More frequent updates. Slightly higher overhead. | |
| You decide | Claude uses sensible defaults | |

**User's choice:** Use default 10s (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No, avoid duplication | Sentry already tracks errors. Adding metric duplicates effort, they can drift. | Yes |
| Yes, add sentry_errors_total | Counter incremented when Sentry captures. Useful for Grafana correlation. | |
| You decide | Claude picks based on avoiding metric sprawl | |

**User's choice:** No, avoid duplication (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5xx / total requests | Standard error rate: http_requests_total{status=~"5.."} / http_requests_total. Alert at >1% | Yes |
| 4xx + 5xx combined | Include client errors. Higher rate, catches bad requests too. | |
| 5xx only, per-route | Separate error rate per API route. More granular, more alert rules. | |
| You decide | Claude picks based on typical SRE practices | |

**User's choice:** 5xx / total requests (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1% error rate | Alert when 5xx errors exceed 1% of traffic over 5 minutes | Yes |
| 0.5% error rate | More sensitive. May cause alert fatigue for low-traffic APIs. | |
| 5% error rate | Less sensitive. Only alerts for significant outages. | |
| You decide | Claude picks based on typical production thresholds | |

**User's choice:** 1% error rate (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, alert on p95 > 2s | Alert when 95th percentile latency exceeds 2 seconds over 5 minutes | Yes |
| p99 > 5s only | Less sensitive, only extreme outliers. May miss gradual degradation. | |
| No latency alerts | Error rate is sufficient. Latency issues usually cause errors anyway. | |
| You decide | Claude picks based on typical SLO definitions | |

**User's choice:** Yes, alert on p95 > 2s (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| prometheus/alert.rules.yml | Separate file mounted into Prometheus container. Clean separation. | Yes |
| Inline in prometheus.yml | All config in one file. Simpler but harder to maintain. | |
| Grafana alerting | Skip Prometheus alerting, use Grafana's built-in alerts. | |
| You decide | Claude picks based on maintainability | |

**User's choice:** prometheus/alert.rules.yml (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Alertmanager with email | Prometheus Alertmanager sends to email. Standard, no extra services needed. | Yes |
| Slack webhook | Alertmanager posts to Slack channel. Requires Slack workspace. | |
| No Alertmanager, Grafana only | Use Grafana's alerting to email. Simpler, fewer containers. | |
| You decide | Claude picks based on infrastructure simplicity | |

**User's choice:** Alertmanager with email (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add Alertmanager container | prom/alertmanager in docker-compose.yml. Handles alert routing, deduplication. | Yes |
| Skip Alertmanager for now | Use Grafana alerting instead. Fewer containers, simpler setup. | |
| You decide | Claude picks based on production-readiness needs | |

**User's choice:** Yes, add Alertmanager container (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Basic silence via Alertmanager UI | Standard Alertmanager silences. Create via UI when doing maintenance. | Yes |
| No silencing needed | Simple setup, manually stop/start services during maintenance. | |
| You decide | Claude picks based on operational needs | |

**User's choice:** Basic silence via Alertmanager UI (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 15 seconds | Standard evaluation interval. Balances responsiveness and resource usage. | Yes |
| 30 seconds | Less frequent evaluation. Lower resource usage, slower detection. | |
| You decide | Claude uses standard Prometheus defaults | |

**User's choice:** 15 seconds (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No, skip session metrics | Sessions are JWT-based, no server-side tracking. Would require Redis scan. | Yes |
| Yes, estimate from JWT cache | Track blacklisted tokens count as proxy for active sessions. | |
| You decide | Claude picks based on implementation complexity vs value | |

**User's choice:** No, skip session metrics (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Group by alertname | All errors from same alert type grouped. One notification for 'HighErrorRate' even if multiple routes. | Yes |
| Group by alertname + route | Separate notifications per route. More granular but noisier. | |
| No grouping | Each alert fires independently. Maximum detail but potential spam. | |
| You decide | Claude picks based on operational simplicity | |

**User's choice:** Group by alertname (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 30 seconds | Wait 30s to collect related alerts before sending grouped notification. | Yes |
| 1 minute | Longer wait, more grouping, slower initial notification. | |
| Immediate (5s) | Faster alerting but may send multiple notifications as alerts trickle in. | |
| You decide | Claude uses standard Alertmanager defaults | |

**User's choice:** 30 seconds (Recommended)

---

## Health Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| Liveness check only | Just confirms process is running. Returns 200 OK with minimal JSON. For Kubernetes liveness probes. | Yes |
| Aggregate status | Checks DB + Redis + returns combined status. More info but slower, may timeout. | |
| You decide | Claude picks based on container orchestration best practices | |

**User's choice:** Liveness check only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| DB + Redis ready | Checks both dependencies. Returns 200 if both healthy, 503 if either down. For routing traffic. | Yes |
| DB only | Only checks database. Redis is optional, shouldn't block traffic. | |
| Process ready only | Just confirms startup complete. Dependencies checked separately. | |
| You decide | Claude picks based on deployment requirements | |

**User's choice:** DB + Redis ready (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes in /health | /health returns {status, version, commit} — useful for deployment verification | Yes |
| Separate /version endpoint | Keep health minimal, add /version for build info. More endpoints. | |
| No version info | Keep it simple. Version visible in logs/Sentry anyway. | |
| You decide | Claude picks based on operational usefulness | |

**User's choice:** Yes in /health (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include latency_ms | Return {status, db_latency_ms, redis_latency_ms} — matches existing /health/db format | Yes |
| No latency | Just return healthy/unhealthy status. Simpler response. | |
| You decide | Claude picks based on consistency with existing endpoints | |

**User's choice:** Yes, include latency_ms (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No rate limit | Health checks are lightweight, no auth. Prometheus scrapes frequently anyway. | Yes |
| Light rate limit | Prevent abuse from external scrapers. 100 req/min per IP. | |
| You decide | Claude picks based on endpoint weight and security | |

**User's choice:** No rate limit (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep them | Granular checks useful for debugging. /readiness aggregates them. | Yes |
| Remove, use /readiness only | Simplify to fewer endpoints. Readiness covers both. | |
| You decide | Claude picks based on operational debugging needs | |

**User's choice:** Yes, keep them (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No logging for health checks | Skip logging for /health*, /readiness, /metrics. Reduces log noise from frequent probes. | Yes |
| Log all requests | Consistent logging, useful for debugging probe failures. | |
| You decide | Claude picks based on log volume management | |

**User's choice:** No logging for health checks (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 seconds per check | DB and Redis each have 3s timeout. Total /readiness under 6s worst case. | Yes |
| 1 second per check | Faster failure detection, may false-positive on slow queries. | |
| 5 seconds per check | More tolerant, may delay routing decisions. | |
| You decide | Claude picks based on typical query performance | |

**User's choice:** 3 seconds per check (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, parallel checks | Check DB and Redis simultaneously with Promise.all. Faster response. | Yes |
| Sequential checks | Check DB first, then Redis. Simpler logic, slower. | |
| You decide | Claude picks based on response time optimization | |

**User's choice:** Yes, parallel checks (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both /health and /api/health/* | Root /health for liveness, /api/health/db etc for detailed. Matches MNTR-01 requirements. | Yes |
| /health only (move existing) | Consolidate all under /health. Breaking change for existing Docker health checks. | |
| You decide | Claude picks to minimize breaking changes | |

**User's choice:** Both /health and /api/health/* (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variables | BUILD_VERSION, BUILD_COMMIT set at build time / in Docker. Simple, CI-friendly. | Yes |
| Read from package.json + git | Get version from package.json, commit from git. More complex, needs git in container. | |
| You decide | Claude picks based on CI/CD integration ease | |

**User's choice:** Environment variables (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, use /health for liveness | Update docker-compose.yml to use /health instead of /api/health/db. Faster check. | Yes |
| Keep /api/health/db | Existing health check works. More thorough (includes DB). | |
| You decide | Claude picks based on health check semantics (liveness vs readiness) | |

**User's choice:** Yes, use /health for liveness (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include process uptime | Return uptime_seconds in /health response. Useful for detecting restarts. | Yes |
| No uptime in response | Uptime available via Prometheus metrics anyway. Keep endpoint minimal. | |
| You decide | Claude picks based on operational usefulness | |

**User's choice:** Yes, include process uptime (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| no-cache, no-store, must-revalidate | Standard no-cache headers. Already used on existing /api/health/* endpoints. | Yes |
| no-store only | Minimal header, prevents storage but not validation. | |
| You decide | Claude keeps consistent with existing health endpoints | |

**User's choice:** no-cache, no-store, must-revalidate (Recommended)

---

## Uptime Monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| UptimeRobot | Free tier: 50 monitors, 5-min intervals. Email alerts included. Simple setup. | Yes |
| Better Uptime | Free tier: 10 monitors, 3-min intervals. Better UI, incident pages. | |
| Pingdom | Paid only. Industry standard but overkill for single app. | |
| You decide | Claude picks based on free tier capabilities | |

**User's choice:** UptimeRobot (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| /health and /readiness | Two monitors: liveness and full readiness. Catch both process crashes and dependency issues. | Yes |
| /health only | Single monitor for liveness. Simpler, fewer alerts. | |
| Homepage + /health | Monitor user-facing page plus health. Catches frontend serve issues. | |
| You decide | Claude picks based on coverage vs noise balance | |

**User's choice:** /health and /readiness (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5 minutes | UptimeRobot free tier default. Reasonable for most applications. | Yes |
| 1 minute | Fastest detection. May require paid plan. | |
| 15 minutes | Less frequent, fewer API calls. Slower incident detection. | |
| You decide | Claude uses free tier defaults | |

**User's choice:** 5 minutes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email only | Built-in email alerts. No additional setup needed. | Yes |
| Email + webhook to Alertmanager | Integrate with internal alerting. More complex setup. | |
| Slack integration | Alerts to Slack channel. Requires Slack workspace. | |
| You decide | Claude picks simplest effective option | |

**User's choice:** Email only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Production only | Only production needs external uptime monitoring. Staging can use internal Prometheus. | Yes |
| Both staging and production | Monitor both environments. Uses 4 of 50 free monitors. | |
| You decide | Claude picks based on typical monitoring patterns | |

**User's choice:** Production only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip status page for now | UptimeRobot has status pages, but adds complexity. Internal dashboards sufficient. | Yes |
| Enable UptimeRobot status page | Public page showing uptime. Useful for user communication. | |
| You decide | Claude picks based on project maturity | |

**User's choice:** Skip status page for now (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 2 consecutive failures | Alert after 2 failed checks (10 min with 5-min interval). Avoids false positives. | Yes |
| 1 failure (immediate) | Alert on first failure. Faster but may cause noise from network blips. | |
| 3 failures | More tolerant (15 min). May delay incident response. | |
| You decide | Claude picks based on typical SRE practices | |

**User's choice:** 2 consecutive failures (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, enable SSL monitoring | Alert 30 days before certificate expires. Free feature. | Yes |
| No SSL monitoring | Skip if using auto-renewing certs (Let's Encrypt + certbot). | |
| You decide | Claude picks based on deployment setup | |

**User's choice:** Yes, enable SSL monitoring (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add setup doc | Create docs/monitoring/uptimerobot.md with setup instructions. Helps future maintainers. | Yes |
| No documentation | UptimeRobot setup is straightforward. Skip docs. | |
| You decide | Claude picks based on project documentation standards | |

**User's choice:** Yes, add setup doc (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| NewsHub-prod-{endpoint} | e.g., NewsHub-prod-health, NewsHub-prod-readiness. Clear, grep-able. | Yes |
| newshub_{env}_{check} | e.g., newshub_prod_health. Snake_case, consistent with metrics. | |
| You decide | Claude picks based on readability | |

**User's choice:** NewsHub-prod-{endpoint} (Recommended)

---

## Grafana Dashboards

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add Grafana container | grafana/grafana-oss in docker-compose.yml. Self-hosted, full control, persistent storage. | Yes |
| Use Grafana Cloud | Free tier: 10k series. No container management but external dependency. | |
| You decide | Claude picks based on self-hosted deployment model | |

**User's choice:** Yes, add Grafana container (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single dashboard, multiple panels | One NewsHub Operations dashboard with sections: Overview, API, System, Dependencies | Yes |
| Multiple dashboards | Separate dashboards for API, System, Dependencies. More complex navigation. | |
| You decide | Claude picks based on operational simplicity | |

**User's choice:** Single dashboard, multiple panels (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Request rate, Error rate, Latency p95, Up status | The 'Four Golden Signals' at a glance. Industry standard overview. | Yes |
| Just request rate and errors | Minimal overview. Other metrics in detail rows. | |
| You decide | Claude picks based on SRE best practices | |

**User's choice:** Request rate, Error rate, Latency p95, Up status (Recommended)

---

## Claude's Discretion

- Exact Grafana panel layout and row organization (API, System, Dependencies sections)
- Grafana data source provisioning configuration
- Dashboard JSON structure and variable setup
- Prometheus configuration file details (scrape configs, rule files)
- Alertmanager email template formatting
- Exact thresholds for secondary metrics (memory, event loop lag)

## Deferred Ideas

None — discussion stayed within phase scope
