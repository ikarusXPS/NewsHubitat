# Phase 20: Monitoring & Alerting - Research

**Researched:** 2026-04-23
**Domain:** Production observability (metrics, health checks, alerting, dashboards)
**Confidence:** HIGH

## Summary

This phase implements production observability for NewsHub using industry-standard Prometheus metrics, Grafana dashboards, Alertmanager for alert routing, and UptimeRobot for external uptime monitoring. The implementation follows the "Four Golden Signals" approach from Google SRE: latency, traffic, errors, and saturation.

The core stack is `prom-client` (v15.1.3) for Node.js metrics instrumentation, exposed via a `/metrics` endpoint that Prometheus scrapes. Grafana visualizes the metrics with provisioned dashboards, while Alertmanager routes alerts to email when error rates or latency thresholds are breached. Health endpoints (`/health`, `/readiness`) enable container orchestration and external monitoring.

**Primary recommendation:** Implement a `MetricsService` singleton following existing project patterns (aiService, cacheService), use prom-client's default metrics plus custom API histograms with route-normalized labels, and deploy Prometheus/Grafana/Alertmanager as Docker Compose services with volume-based persistence.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `prom-client` library for Prometheus metrics
- **D-02:** Create `MetricsService` singleton following existing service patterns
- **D-03:** Expose `/metrics` endpoint on port 3001, no authentication required
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
- **D-25:** `/health` returns liveness check only: {status, version, commit, uptime_seconds}
- **D-26:** `/readiness` checks DB + Redis in parallel: {status, db_latency_ms, redis_latency_ms}
- **D-27:** Keep existing `/api/health/db` and `/api/health/redis` for granular debugging
- **D-28:** 3-second timeout per dependency check, parallel execution via Promise.all
- **D-29:** No rate limiting on health endpoints
- **D-30:** Skip logging for health check requests
- **D-31:** Cache-Control: no-cache, no-store, must-revalidate on all health endpoints
- **D-32:** Version/commit info via BUILD_VERSION, BUILD_COMMIT environment variables
- **D-33:** Update Docker Compose health check to use `/health` instead of `/api/health/db`
- **D-34:** Use UptimeRobot (free tier: 50 monitors, 5-min intervals)
- **D-35:** Monitor production only: `/health` and `/readiness` endpoints
- **D-36:** 5-minute check interval
- **D-37:** Alert after 2 consecutive failures (10 minutes total)
- **D-38:** Email alerts only (UptimeRobot built-in)
- **D-39:** Enable SSL certificate expiry monitoring
- **D-40:** Skip public status page for now
- **D-41:** Monitor naming convention: NewsHub-prod-{endpoint}
- **D-42:** Document setup in `docs/monitoring/uptimerobot.md`
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

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MNTR-01 | Health Endpoints existieren (/health, /health/db, /health/redis, /readiness) | Health endpoint patterns documented; existing /api/health/db and /api/health/redis code at server/index.ts:137-199 can be extended |
| MNTR-02 | Metriken werden im Prometheus-Format exportiert | prom-client v15.1.3 verified; API patterns for Counter, Gauge, Histogram documented with code examples |
| MNTR-03 | Externe Uptime-Checks mit Alerting sind konfiguriert | UptimeRobot free tier (50 monitors, 5-min intervals) confirmed; setup documentation pattern established |
| MNTR-04 | Grafana Dashboard visualisiert alle Metriken | Grafana OSS v13.0.1 verified; provisioning patterns documented for datasources and dashboards |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Metrics collection | API / Backend | - | Express middleware instruments requests; prom-client runs in Node.js process |
| Metrics exposition | API / Backend | - | /metrics endpoint served by Express |
| Metrics storage | Infrastructure (Prometheus) | - | Time-series database, separate from app |
| Alerting | Infrastructure (Alertmanager) | - | Decoupled from app, evaluates Prometheus rules |
| Visualization | Infrastructure (Grafana) | - | Dashboard service, queries Prometheus |
| Health checks | API / Backend | - | Express endpoints for liveness/readiness |
| External monitoring | External Service (UptimeRobot) | - | Third-party SaaS, monitors from outside |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prom-client | 15.1.3 | Prometheus metrics client for Node.js | [VERIFIED: npm registry] Official Prometheus client, 50+ code snippets in Context7, includes TypeScript definitions |
| Prometheus | v3.11.2 | Time-series database and metrics scraping | [VERIFIED: Docker Hub] Latest stable, industry standard for Kubernetes/container monitoring |
| Alertmanager | v0.32.0 | Alert routing and notification | [VERIFIED: Docker Hub] Official Prometheus alerting component, handles grouping, silencing, routing |
| Grafana OSS | 13.0.1 | Metrics visualization and dashboards | [VERIFIED: Docker Hub] Industry-standard dashboarding, native Prometheus integration |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-prom-bundle | 8.0.0 | Express middleware with automatic path normalization | [VERIFIED: npm registry] Alternative if custom middleware too complex; handles route normalization automatically |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| prom-client raw | express-prom-bundle | Bundle provides auto-normalization but less control; raw prom-client chosen per D-02 singleton pattern |
| Alertmanager email | PagerDuty/OpsGenie | External services add cost and complexity; email sufficient for initial production |
| UptimeRobot | Better Uptime, Pingdom | UptimeRobot free tier generous (50 monitors); alternatives require payment |

**Installation:**
```bash
npm install prom-client@15.1.3
```

**Version verification:** [VERIFIED: npm registry 2026-04-23] prom-client 15.1.3 is current stable release. Includes TypeScript types via `index.d.ts`.

## Architecture Patterns

### System Architecture Diagram

```
                                  +-------------------+
                                  |   UptimeRobot     |
                                  | (External SaaS)   |
                                  +--------+----------+
                                           |
                                           | HTTPS checks every 5 min
                                           v
+------------------+              +--------+----------+              +------------------+
|                  |   scrape     |                   |   scrape     |                  |
|    Prometheus    +<-------------+   NewsHub App     +------------->|     Grafana      |
|    (port 9090)   |   /metrics   |   (port 3001)     |   query      |   (port 3000)    |
|                  |   every 15s  |                   |              |                  |
+--------+---------+              +-------------------+              +------------------+
         |                                |
         | evaluate rules                 | /health, /readiness
         | every 15s                      |
         v                                v
+--------+---------+              +-------------------+
|                  |              |    Docker         |
|   Alertmanager   |              |    Health Check   |
|   (port 9093)    |              |    (internal)     |
|                  |              +-------------------+
+--------+---------+
         |
         | email
         v
+-------------------+
|   SMTP Server     |
|   (SendGrid/SES)  |
+-------------------+
```

**Data Flow:**
1. Express middleware intercepts all requests, records metrics to prom-client registry
2. Prometheus scrapes `/metrics` endpoint every 15 seconds
3. Prometheus evaluates alert rules (HighErrorRate, HighLatency) every 15 seconds
4. When rules trigger, Prometheus sends alerts to Alertmanager
5. Alertmanager groups alerts, waits 30s, sends email notification
6. Grafana queries Prometheus for visualization (user-initiated)
7. UptimeRobot independently checks `/health` and `/readiness` every 5 minutes from external locations
8. Docker health check uses `/health` endpoint for container orchestration

### Recommended Project Structure

```
server/
├── services/
│   └── metricsService.ts       # MetricsService singleton (prom-client wrapper)
├── middleware/
│   └── metricsMiddleware.ts    # Express middleware for request metrics
├── index.ts                    # Add /health, /readiness, /metrics endpoints

prometheus/
├── prometheus.yml              # Scrape config, alert rules reference
├── alert.rules.yml             # Alert rule definitions

alertmanager/
├── alertmanager.yml            # Route config, email receiver

grafana/
└── provisioning/
    ├── datasources/
    │   └── prometheus.yml      # Prometheus datasource config
    └── dashboards/
        ├── dashboards.yml      # Dashboard provider config
        └── newshub-operations.json  # Operations dashboard

docs/
└── monitoring/
    └── uptimerobot.md          # UptimeRobot setup documentation

docker-compose.yml              # Add prometheus, alertmanager, grafana services
```

### Pattern 1: MetricsService Singleton

**What:** Centralized metrics registry and metric creation following project's singleton pattern
**When to use:** All metrics instrumentation goes through this service

```typescript
// Source: prom-client README + project conventions
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
  private static instance: MetricsService;
  private registry: Registry;

  // Metrics
  public httpRequestDuration: Histogram<string>;
  public httpRequestsTotal: Counter<string>;
  public upGauge: Gauge<string>;
  public websocketConnections: Gauge<string>;
  public dbConnectionsActive: Gauge<string>;
  public redisConnectionsActive: Gauge<string>;

  private constructor() {
    this.registry = new Registry();

    // Default Node.js metrics (D-04)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'newshub_',
    });

    // HTTP request duration histogram (D-07, D-08)
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // HTTP request counter (D-05, D-09)
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Service up gauge (D-13)
    this.upGauge = new Gauge({
      name: 'up',
      help: 'Service up status',
      labelNames: ['service'],
      registers: [this.registry],
    });
    this.upGauge.set({ service: 'newshub' }, 1);

    // WebSocket connections (D-12)
    this.websocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    // DB connections (D-11)
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Redis connections (D-11)
    this.redisConnectionsActive = new Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [this.registry],
    });
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
```

### Pattern 2: Route Normalization Middleware

**What:** Express middleware that normalizes dynamic path segments to prevent label cardinality explosion
**When to use:** All API requests should pass through this middleware

```typescript
// Source: express-prom-bundle normalization patterns + Prometheus best practices
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metricsService';

const metricsService = MetricsService.getInstance();

// Skip metrics for these paths (D-10)
const SKIP_PATHS = ['/health', '/readiness', '/metrics', '/api/health'];

// Route normalization patterns (D-06)
function normalizeRoute(path: string): string {
  return path
    // Replace UUIDs: /api/news/550e8400-e29b-... -> /api/news/:id
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs: /api/news/12345 -> /api/news/:id
    .replace(/\/\d+/g, '/:id')
    // Replace ObjectIds: /api/news/507f1f77bcf86cd799439011 -> /api/news/:id
    .replace(/[0-9a-f]{24}/gi, ':id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip health/metrics endpoints (D-10)
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    const route = normalizeRoute(req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    metricsService.httpRequestDuration.observe(labels, duration);
    metricsService.httpRequestsTotal.inc(labels);
  });

  next();
}
```

### Pattern 3: Health Endpoints

**What:** Liveness and readiness probes for container orchestration
**When to use:** Kubernetes/Docker health checks, load balancer probes

```typescript
// Source: project conventions + CONTEXT.md decisions
import { Request, Response } from 'express';
import prisma from '../db';
import cacheService from '../services/cacheService';

const DEPENDENCY_TIMEOUT = 3000; // D-28

// Liveness probe (D-25)
app.get('/health', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // D-31
  res.json({
    status: 'healthy',
    version: process.env.BUILD_VERSION || 'unknown',
    commit: process.env.BUILD_COMMIT || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// Readiness probe (D-26, D-28)
app.get('/readiness', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const checkDb = async (): Promise<number> => {
    const start = Date.now();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), DEPENDENCY_TIMEOUT)),
    ]);
    return Date.now() - start;
  };

  const checkRedis = async (): Promise<number> => {
    const start = Date.now();
    if (!cacheService.isAvailable()) throw new Error('not connected');
    await Promise.race([
      cacheService.getStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), DEPENDENCY_TIMEOUT)),
    ]);
    return Date.now() - start;
  };

  try {
    const [dbLatency, redisLatency] = await Promise.all([checkDb(), checkRedis()]);
    res.json({
      status: 'ready',
      db_latency_ms: dbLatency,
      redis_latency_ms: redisLatency,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'dependency check failed',
    });
  }
});
```

### Pattern 4: Prometheus Configuration

**What:** Scrape configuration for Prometheus
**When to use:** prometheus/prometheus.yml

```yaml
# Source: Prometheus official docs
global:
  scrape_interval: 15s      # D-16
  evaluation_interval: 15s  # D-20

rule_files:
  - 'alert.rules.yml'       # D-17

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'newshub'
    static_configs:
      - targets: ['app:3001']
    metrics_path: '/metrics'
```

### Pattern 5: Alert Rules

**What:** Prometheus alerting rules for error rate and latency
**When to use:** prometheus/alert.rules.yml

```yaml
# Source: Prometheus alerting_rules documentation
groups:
  - name: newshub
    rules:
      # Error rate alert (D-18)
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # Latency alert (D-19)
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
          > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency detected"
          description: "p95 latency is {{ $value | humanizeDuration }}"

      # Service down
      - alert: ServiceDown
        expr: up{service="newshub"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NewsHub service is down"
```

### Pattern 6: Alertmanager Configuration

**What:** Alert routing and email notification
**When to use:** alertmanager/alertmanager.yml

```yaml
# Source: Alertmanager configuration docs
global:
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_from: 'alertmanager@newshub.example.com'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASS}'
  smtp_require_tls: true

route:
  group_by: ['alertname']           # D-22
  group_wait: 30s                   # D-22
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'     # D-23
    email_configs:
      - to: '${ALERT_EMAIL}'
        send_resolved: true
```

### Pattern 7: Grafana Provisioning

**What:** Auto-provisioned Prometheus datasource
**When to use:** grafana/provisioning/datasources/prometheus.yml

```yaml
# Source: Grafana provisioning docs
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Anti-Patterns to Avoid

- **High-cardinality labels:** Never use user IDs, request IDs, or unbounded values as label values. Always normalize routes to templates. [CITED: CNCF Prometheus best practices]
- **Metrics inside hot paths:** Don't put expensive metric computation inside request handlers; use middleware that fires on response finish
- **Synchronous registry.metrics() in endpoints:** Always use `await registry.metrics()` as it may be async with certain collectors
- **Health checks with authentication:** Health endpoints should be unauthenticated for container orchestration compatibility
- **Logging health check requests:** Creates massive log noise; skip logging for /health, /readiness, /metrics

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prometheus metrics format | Custom text format | prom-client | Exposition format is complex with escaping rules, histogram bucket aggregation |
| Route normalization | Regex matching | Established patterns from express-prom-bundle | Edge cases with UUIDs, ObjectIds, mixed segments |
| Alert evaluation | Custom threshold checks | Prometheus rules | Already has rate(), histogram_quantile(), time series math |
| Alert grouping/deduplication | Custom queue system | Alertmanager | Handles grouping, silencing, routing, inhibition |
| Time series storage | Custom DB | Prometheus | Optimized for metric ingestion, retention, querying |

**Key insight:** The Prometheus ecosystem is mature and battle-tested. Every component (exposition format, alerting rules, alert routing, visualization) has specific semantics that are easy to get wrong. Use the standard components.

## Common Pitfalls

### Pitfall 1: Label Cardinality Explosion

**What goes wrong:** Metrics endpoint returns MB of data, Prometheus OOMs, queries time out
**Why it happens:** Using request path directly as label without normalization; `/api/users/12345` creates unique series per user
**How to avoid:** Normalize all dynamic path segments to `:id` before using as label; monitor `prometheus_tsdb_head_series` metric
**Warning signs:** `/metrics` endpoint slow (>100ms), Prometheus memory usage climbing, query timeouts

### Pitfall 2: Health Check Cascading Failures

**What goes wrong:** Health check timeout causes container restart, which causes more timeouts
**Why it happens:** Health check has no timeout, blocks on DB/Redis indefinitely during network issues
**How to avoid:** Always use `Promise.race()` with timeout (D-28: 3 seconds); separate liveness from readiness
**Warning signs:** Container restart loops during partial outages, health endpoint latency spikes

### Pitfall 3: Alert Fatigue

**What goes wrong:** Team ignores alerts because there are too many false positives
**Why it happens:** Thresholds too sensitive, no `for` duration, alerting on transient spikes
**How to avoid:** Use `for` duration (5 minutes minimum for production alerts); tune thresholds based on baseline
**Warning signs:** More than 10 alerts per week, alerts that auto-resolve within minutes

### Pitfall 4: Missing Silence During Maintenance

**What goes wrong:** Team gets paged during planned maintenance
**Why it happens:** Alertmanager not silenced before maintenance window
**How to avoid:** Document maintenance procedure including Alertmanager silence creation (D-24); expose Alertmanager UI on accessible port
**Warning signs:** Maintenance-related pages, on-call frustration

### Pitfall 5: Grafana Dashboard Drift

**What goes wrong:** Dashboard edits lost on container restart
**Why it happens:** Dashboards edited via UI but not saved to provisioning files
**How to avoid:** Set `editable: false` on provisioned dashboards, or export JSON after edits; store dashboards in git
**Warning signs:** "I know I changed that panel" comments, inconsistent dashboards across environments

## Code Examples

### Express Metrics Endpoint

```typescript
// Source: prom-client README
import { Request, Response } from 'express';
import { MetricsService } from './services/metricsService';

const metricsService = MetricsService.getInstance();

// /metrics endpoint (D-03)
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    res.end(await metricsService.getMetrics());
  } catch (error) {
    res.status(500).end();
  }
});
```

### Updating WebSocket Connection Gauge

```typescript
// Source: prom-client README + websocketService.ts patterns
import { MetricsService } from './services/metricsService';

const metricsService = MetricsService.getInstance();

// In WebSocketService connection handler
this.io.on('connection', (socket) => {
  this.connectedClients.set(socket.id, socket);
  metricsService.websocketConnections.set(this.connectedClients.size);

  socket.on('disconnect', () => {
    this.connectedClients.delete(socket.id);
    metricsService.websocketConnections.set(this.connectedClients.size);
  });
});
```

### Histogram Timing Helper

```typescript
// Source: prom-client README
const end = metricsService.httpRequestDuration.startTimer({
  method: req.method,
  route: normalizeRoute(req.path),
});

// ... do work ...

end({ status_code: String(res.statusCode) }); // Adds final label and observes duration
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom metrics format | OpenMetrics/Prometheus exposition format | 2020+ | Industry standardization, tool interoperability |
| Single `/health` endpoint | Separate `/health` (liveness) and `/readiness` | Kubernetes 1.16 (2019) | Proper container orchestration, graceful degradation |
| Pull-based alerting (polling) | Push-based to Alertmanager | Prometheus 2.0 (2017) | Decoupled alerting, grouping, routing |
| Express.js response-time header | Prometheus histograms | 2018+ | Better percentile calculation, dashboard integration |

**Deprecated/outdated:**
- `pushgateway` for short-lived jobs: Not needed for long-running web servers
- `statsd` + `graphite`: Prometheus ecosystem has won for container monitoring
- Manual email from app on errors: Use Alertmanager for proper grouping and deduplication

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SMTP credentials will be configured via existing SMTP_* env vars | Alertmanager Configuration | Alert emails won't send; need to add SMTP config |
| A2 | Docker internal network allows prometheus -> app:3001 communication | Architecture Diagram | Metrics scraping fails; may need explicit network config |
| A3 | Grafana port 3000 is available on host | Docker Compose | Port conflict; can remap to different host port |

**Note:** Most claims in this research were verified against official documentation or package registries. Assumptions are limited to environment-specific configurations.

## Open Questions

1. **ALERT_EMAIL recipient**
   - What we know: Alertmanager sends to `${ALERT_EMAIL}` environment variable
   - What's unclear: Which email address(es) should receive alerts
   - Recommendation: Add ALERT_EMAIL to `.env.example`, document as required for production

2. **Grafana authentication**
   - What we know: Grafana OSS has built-in auth
   - What's unclear: Whether to use default admin/admin or configure external auth
   - Recommendation: Use default admin, change password on first login; document in setup guide

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | All containers | Assumed | - | None (required) |
| Docker Compose | Service orchestration | Assumed | v2+ | None (required) |
| SMTP Server | Alertmanager email | External | - | Alerts won't send; log-only fallback |
| UptimeRobot account | External monitoring | External | - | Manual monitoring; not critical for launch |

**Missing dependencies with no fallback:**
- Docker and Docker Compose are assumed present (Phase 17 dependency)

**Missing dependencies with fallback:**
- SMTP: Alertmanager will fail to send emails but Prometheus/Grafana still function
- UptimeRobot: Documentation-only task, can be deferred without blocking

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | /metrics unauthenticated by design (internal network) |
| V3 Session Management | No | No sessions in monitoring stack |
| V4 Access Control | Yes | Grafana login required; Prometheus/Alertmanager internal only |
| V5 Input Validation | No | Metrics are generated internally, not user input |
| V6 Cryptography | No | No secrets in metrics; SMTP uses TLS |

### Known Threat Patterns for Monitoring Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Metrics endpoint information disclosure | Information Disclosure | Keep /metrics on internal network; no sensitive data in labels |
| Alertmanager SMTP credential exposure | Information Disclosure | Use environment variables, not hardcoded; Docker secrets if available |
| Grafana unauthorized access | Elevation of Privilege | Change default admin password; consider OIDC for production |
| Prometheus query injection | Tampering | Not applicable (no user-facing query interface) |

## Sources

### Primary (HIGH confidence)
- [prom-client GitHub README](https://github.com/siimon/prom-client) - Counter, Gauge, Histogram APIs, collectDefaultMetrics
- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) - Scrape configs, rule files
- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) - Alert rule syntax
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/) - Route, receiver, email config
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/) - Datasource and dashboard provisioning

### Secondary (MEDIUM confidence)
- [CNCF Prometheus Labels Best Practices](https://www.cncf.io/blog/2025/07/22/prometheus-labels-understanding-and-best-practices/) - Label cardinality guidelines
- [express-prom-bundle](https://github.com/jochen-schweizer/express-prom-bundle) - Route normalization patterns
- [Docker awesome-compose prometheus-grafana](https://github.com/docker/awesome-compose/blob/master/prometheus-grafana/README.md) - Docker Compose patterns

### Tertiary (LOW confidence)
- [UptimeRobot Pricing](https://uptimerobot.com/pricing/) - Free tier limits (50 monitors, 5-min intervals)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified against npm registry and Docker Hub
- Architecture: HIGH - Standard Prometheus/Grafana patterns, extensively documented
- Pitfalls: HIGH - Common issues well-documented in Prometheus community

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days - monitoring stack is stable)

---

*Phase: 20-monitoring-alerting*
*Research completed: 2026-04-23*
