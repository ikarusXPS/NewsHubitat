---
phase: 22-smtp-production
plan: 02
subsystem: api
tags: [sendgrid, webhook, ecdsa, express, redis, prometheus]

# Dependency graph
requires:
  - phase: 22-smtp-production-01
    provides: SendGrid types (SendGridEvent, BounceClassification), email metrics methods
provides:
  - Webhook endpoint at POST /api/email/webhook with ECDSA signature verification
  - Raw body parser middleware for webhook signature verification
  - Event handlers for bounce, dropped, spamreport, unsubscribe, delivered events
  - Idempotency via Redis cache using sg_event_id
affects: [22-smtp-production-03, email-delivery, monitoring]

# Tech tracking
tech-stack:
  added: [@sendgrid/eventwebhook@8.0.0]
  patterns: [raw-body-parser-for-signature-verification, webhook-idempotency-via-redis]

key-files:
  created: []
  modified:
    - server/routes/email.ts
    - server/index.ts
    - package.json

key-decisions:
  - "Use express.json() verify callback to preserve raw body (avoids separate middleware file)"
  - "24h TTL for webhook idempotency keys (matches SendGrid retry window)"
  - "Log truncated email addresses (first 3 chars) for privacy compliance"

patterns-established:
  - "Webhook signature verification: verify ECDSA signature before processing any events"
  - "Raw body preservation: use express.json verify callback, not separate middleware"
  - "Webhook idempotency: cache event IDs in Redis with TTL to prevent duplicate processing"

requirements-completed: [SMTP-01, SMTP-03]

# Metrics
duration: 10min
completed: 2026-04-23
---

# Phase 22 Plan 02: Webhook Endpoint Summary

**SendGrid webhook endpoint with ECDSA signature verification, bounce/optout event handling, and Redis-based idempotency**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-23T17:33:19Z
- **Completed:** 2026-04-23T17:43:17Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Installed @sendgrid/eventwebhook@8.0.0 for ECDSA signature verification
- Implemented POST /api/email/webhook endpoint with full event processing
- Configured raw body parser to preserve body for signature verification
- Added handlers for bounce/dropped (mark User.emailBounced) and spamreport/unsubscribe (mark User.emailOptOut)
- Implemented idempotency via Redis cache with 24h TTL using sg_event_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @sendgrid/eventwebhook package** - `2983ba6` (chore)
2. **Task 2: Update email routes with webhook endpoint** - `66465dc` (feat)
3. **Task 3: Configure raw body parser in server index** - `37b1108` (feat)

## Files Created/Modified
- `package.json` - Added @sendgrid/eventwebhook@8.0.0 dependency
- `server/routes/email.ts` - Added webhook endpoint, imports, and event handlers
- `server/index.ts` - Updated express.json() with verify callback for raw body preservation

## Decisions Made
- Used express.json() verify callback instead of separate rawBodyParser middleware (simpler, follows Express 5 patterns)
- Hard bounce classifications: Invalid Address, Content, Reputation (immediate block)
- Soft bounces: Technical, Mailbox Unavailable, Frequency/Volume (wait for SendGrid 72h retry)
- 24h TTL for idempotency keys matches SendGrid's webhook retry window

## Deviations from Plan

None - plan executed exactly as written. Plan 22-01 completed its tasks concurrently, providing the required SendGrid types and metricsService email methods before Task 2 needed them.

## Issues Encountered
- npm peer dependency conflict during package install - resolved with --legacy-peer-deps flag (vite-plugin-pwa vs vite@8 incompatibility)

## User Setup Required

**External services require manual configuration.** The webhook endpoint requires:
- `SENDGRID_WEBHOOK_PUBLIC_KEY` environment variable (ECDSA public key from SendGrid dashboard)
- SendGrid Event Webhook configured to POST to `/api/email/webhook`
- Events enabled: delivered, bounce, dropped, spamreport, unsubscribe

See Plan 22-03 for setup guide creation.

## Verification

- TypeScript compiles: PASSED
- Unit tests: 1103 passing
- Package installed: @sendgrid/eventwebhook@8.0.0 confirmed

## Next Phase Readiness
- Webhook endpoint ready to receive SendGrid events once SENDGRID_WEBHOOK_PUBLIC_KEY is configured
- Plan 22-03 will create setup documentation and Prometheus alert rules

## Self-Check: PASSED

- [x] package.json contains @sendgrid/eventwebhook
- [x] server/routes/email.ts contains router.post('/webhook'
- [x] server/index.ts contains rawBody = buf.toString
- [x] Commit 2983ba6 exists
- [x] Commit 66465dc exists
- [x] Commit 37b1108 exists

---
*Phase: 22-smtp-production*
*Completed: 2026-04-23*
