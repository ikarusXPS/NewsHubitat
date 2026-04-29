---
phase: 20-monitoring-alerting
plan: 02
subsystem: infrastructure
tags: [prometheus, alertmanager, docker, monitoring, alerting]
dependency_graph:
  requires: [20-01]
  provides: [prometheus-scrape, alert-rules, alertmanager-routing]
  affects: [docker-compose.yml, .env.example]
tech_stack:
  added: [prometheus:v3.4.0, alertmanager:v0.28.1]
  patterns: [docker-compose-services, prometheus-alert-rules, alertmanager-email-routing]
key_files:
  created:
    - prometheus/prometheus.yml
    - prometheus/alert.rules.yml
    - alertmanager/alertmanager.yml
  modified:
    - docker-compose.yml
    - .env.example
decisions:
  - "Prometheus 15s scrape interval with 15-day retention per D-16"
  - "Alert rules in separate file for maintainability per D-17"
  - "Alertmanager groups by alertname with 30s wait per D-22"
  - "App healthcheck updated to /health per D-33"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-23T11:55:13Z"
  tasks: 3
  commits: 3
---

# Phase 20 Plan 02: Prometheus and Alertmanager Setup Summary

Prometheus time-series database and Alertmanager notification routing with Docker Compose integration and email alerts for error rate and latency thresholds.

## What Changed

### Task 1: Prometheus Configuration Files

Created Prometheus scrape configuration and alert rules.

**prometheus/prometheus.yml:**
- 15-second scrape interval and evaluation interval (D-16, D-20)
- Reference to alert.rules.yml for alert definitions (D-17)
- Alertmanager target at alertmanager:9093
- Scrape config targeting app:3001 at /metrics endpoint

**prometheus/alert.rules.yml:**
- `HighErrorRate`: Triggers when 5xx error rate > 1% over 5 minutes (D-18)
- `HighLatency`: Triggers when p95 latency > 2 seconds over 5 minutes (D-19)
- `ServiceDown`: Triggers when up{service="newshub"} == 0 for 1 minute

### Task 2: Alertmanager Configuration

Created Alertmanager routing configuration with email notifications.

**alertmanager/alertmanager.yml:**
- SMTP configuration using environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Alert grouping by alertname with 30s wait time (D-22)
- Email receiver sending to ${ALERT_EMAIL} (D-23)
- send_resolved enabled for recovery notifications
- 4-hour repeat interval to prevent alert fatigue

**Updated .env.example:**
- Added ALERT_EMAIL configuration with documentation comment

### Task 3: Docker Compose Services

Added Prometheus and Alertmanager containers to docker-compose.yml.

**Prometheus service:**
- Image: prom/prometheus:v3.4.0
- 15-day data retention (D-16)
- Volume mount: ./prometheus:/etc/prometheus:ro
- Named volume: prometheus_data
- Depends on app service being healthy
- Healthcheck at /-/healthy

**Alertmanager service:**
- Image: prom/alertmanager:v0.28.1
- Volume mount: ./alertmanager:/etc/alertmanager:ro
- Named volume: alertmanager_data
- Loads .env file for SMTP and ALERT_EMAIL variables
- Depends on prometheus service
- Healthcheck at /-/healthy

**App healthcheck update:**
- Changed from /api/health/db to /health (D-33)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 338eaed | feat | Add Prometheus scrape config and alert rules |
| 8ca8b6f | feat | Add Alertmanager email routing configuration |
| 2ed4d14 | feat | Add Prometheus and Alertmanager Docker services |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
docker compose config: VALID

Success Criteria:
- prometheus/prometheus.yml with 15s scrape interval (D-16)
- prometheus/prometheus.yml references alert.rules.yml (D-17)
- prometheus/alert.rules.yml with HighErrorRate > 1% for 5m (D-18)
- prometheus/alert.rules.yml with HighLatency p95 > 2s for 5m (D-19)
- prometheus/alert.rules.yml with ServiceDown alert
- alertmanager/alertmanager.yml with email receiver (D-23)
- alertmanager/alertmanager.yml with 30s group wait (D-22)
- docker-compose.yml includes prometheus service with 15-day retention (D-15, D-16)
- docker-compose.yml includes alertmanager service (D-21)
- docker-compose.yml app healthcheck uses /health (D-33)
- Named volumes for data persistence
```

## Dependencies for Production

The following environment variables must be configured for alert email delivery:

| Variable | Source | Purpose |
|----------|--------|---------|
| SMTP_HOST | Existing .env | SMTP server hostname |
| SMTP_PORT | Existing .env | SMTP server port |
| SMTP_USER | Existing .env | SMTP authentication username |
| SMTP_PASS | Existing .env | SMTP authentication password |
| ALERT_EMAIL | New (add to .env) | Email address to receive alerts |

## Architecture

```
NewsHub App (:3001)
     |
     | /metrics endpoint (scraped every 15s)
     v
Prometheus (:9090)
     |
     | Alert rule evaluation every 15s
     | When thresholds exceeded:
     v
Alertmanager (:9093)
     |
     | Group alerts, wait 30s, send email
     v
SMTP Server --> Alert Email
```

## Next Steps

- Plan 20-03 will add Grafana dashboard for metrics visualization
- Configure ALERT_EMAIL in production .env file
- Verify SMTP credentials work with Alertmanager

## Self-Check: PASSED

All created files verified to exist:
- prometheus/prometheus.yml: FOUND
- prometheus/alert.rules.yml: FOUND
- alertmanager/alertmanager.yml: FOUND

All commits verified in git history:
- 338eaed: FOUND
- 8ca8b6f: FOUND
- 2ed4d14: FOUND

---

*Plan 20-02 completed: 2026-04-23T11:55:13Z*
