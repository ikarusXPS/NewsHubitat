# UptimeRobot External Monitoring Setup

This document describes how to configure external uptime monitoring for NewsHub using UptimeRobot.

## Overview

UptimeRobot provides external HTTP monitoring from multiple geographic locations. It alerts when endpoints are unreachable or return errors, independent of the internal Prometheus/Alertmanager monitoring.

**Why external monitoring?**
- Detects outages that internal monitoring cannot see (e.g., network issues, DNS failures)
- Independent from application infrastructure
- Free tier includes 50 monitors with 5-minute intervals

## Account Setup

1. Create a free account at [https://uptimerobot.com/signUp](https://uptimerobot.com/signUp)
2. Verify email address
3. Navigate to Dashboard

## Monitor Configuration

### Health Monitor (D-35)

Create a monitor for the liveness endpoint:

| Setting | Value |
|---------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | NewsHub-prod-health (D-41) |
| URL | https://your-production-domain.com/health |
| Monitoring Interval | 5 minutes (D-36) |
| Alert Contact | Your email |

**Alert Settings:**
- Alert After | 2 consecutive failures (D-37: ~10 minutes total)
- Alert Type | Email (D-38)

### Readiness Monitor (D-35)

Create a monitor for the readiness endpoint:

| Setting | Value |
|---------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | NewsHub-prod-readiness (D-41) |
| URL | https://your-production-domain.com/readiness |
| Monitoring Interval | 5 minutes (D-36) |
| Alert Contact | Your email |

**Alert Settings:**
- Alert After | 2 consecutive failures (D-37)
- Alert Type | Email (D-38)

### SSL Certificate Monitor (D-39)

For each HTTP monitor, enable SSL certificate monitoring:

1. Click on the monitor
2. Go to "SSL Certificate Expiration" section
3. Enable "SSL Certificate Expiration" alerts
4. Set warning threshold (default: 30 days before expiry)

## Alert Contacts

Configure email alerts (D-38):

1. Go to "My Settings" -> "Alert Contacts"
2. Add email addresses that should receive alerts
3. Verify each email address

## Verification

After setup, verify monitors are working:

1. All monitors should show "Up" status with green indicator
2. Response time should be displayed (typically < 500ms)
3. SSL certificate expiry date should be shown

## Naming Convention (D-41)

All monitors should follow the pattern: `NewsHub-prod-{endpoint}`

Examples:
- `NewsHub-prod-health`
- `NewsHub-prod-readiness`

## Status Page (D-40)

Public status page is **not enabled** in initial setup. To enable later:

1. Go to "Status Pages" in UptimeRobot dashboard
2. Create new status page
3. Add monitors to display
4. Configure custom domain (optional)

## Maintenance Windows

When performing planned maintenance:

1. Go to "Maintenance Windows" in UptimeRobot
2. Create a maintenance window for the expected duration
3. Select affected monitors
4. Alerts will be suppressed during the window

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Monitor shows "Down" but app is running | Check if endpoint is accessible from external networks |
| Response time is high | Check server location, consider CDN |
| SSL monitoring not working | Ensure certificate is valid and properly configured |
| Too many alerts | Increase "Alert After" threshold to reduce false positives |

---

*Document created: Phase 20 - Monitoring & Alerting*
*Last updated: See git history*
