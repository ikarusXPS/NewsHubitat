# Phase 22: SMTP Production - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure production email delivery with SendGrid, implement bounce/complaint handling via webhooks, add email metrics to monitoring, and verify all transactional email flows work in production.

</domain>

<decisions>
## Implementation Decisions

### Provider Selection
- **D-01:** Use SendGrid as production SMTP provider (100 emails/day free tier, good deliverability)
- **D-02:** Integrate via SMTP relay using existing nodemailer — change SMTP_HOST to smtp.sendgrid.net
- **D-03:** No SendGrid SDK needed — keep current emailService.ts architecture with nodemailer

### Bounce Handling
- **D-04:** Hard bounces mark user's email as bounced (add `emailBounced: Boolean @default(false)` to User model)
- **D-05:** Block email sends to bounced addresses — check flag before send in emailService
- **D-06:** Users can update email to clear bounced status (triggers re-verification)
- **D-07:** Spam complaints auto-unsubscribe user — set `emailOptOut: Boolean @default(false)` on User model
- **D-08:** Implement webhook endpoint `/api/email/webhook` to receive SendGrid events
- **D-09:** Webhook handles events: bounce, dropped, spamreport, unsubscribe
- **D-10:** Webhook validates SendGrid signature for security

### Monitoring & Alerts
- **D-11:** Add Prometheus counters: `email_sent_total`, `email_delivered_total`, `email_bounced_total`, `email_complained_total`
- **D-12:** Add Prometheus gauge: `email_delivery_success_rate` (delivered/sent over 1 hour window)
- **D-13:** Alert rule: HighEmailBounceRate — bounce rate > 5% for 5 minutes
- **D-14:** Alert rule: LowEmailDeliveryRate — delivery success < 95% for 1 hour
- **D-15:** No open/click tracking — keep it simple, respect privacy

### Testing Approach
- **D-16:** Create test accounts with real email addresses (test@newshub.app or team member emails)
- **D-17:** Run actual email flows in production: registration, password reset, password change
- **D-18:** Verify emails arrive in inbox (not spam) and links work correctly
- **D-19:** All transactional flows verified: verification, password reset, password change confirmation
- **D-20:** Digests deferred — not required for launch (optional feature)

### DNS Authentication
- **D-21:** Document SPF, DKIM, DMARC requirements in setup guide
- **D-22:** Setup guide includes exact DNS record values for SendGrid
- **D-23:** No code-level DNS verification — manual configuration by deployer

### Sender Identity
- **D-24:** Use `noreply@newshub.app` as sender address
- **D-25:** Single verified sender domain (no subdomain separation)
- **D-26:** SMTP_FROM env var remains configurable for flexibility

### Email Templates
- **D-27:** Keep current inline HTML templates in emailService.ts
- **D-28:** No template system migration — current approach works well
- **D-29:** Existing bilingual DE/EN templates preserved (per Phase 03 decisions D-08, D-38)

### Database Schema Additions
- **D-30:** Add to User model:
  - `emailBounced: Boolean @default(false)`
  - `emailBouncedAt: DateTime?`
  - `emailOptOut: Boolean @default(false)`
  - `emailOptOutAt: DateTime?`

### Claude's Discretion
- Exact webhook event parsing implementation
- Prometheus metric label cardinality (by email type or flat)
- Setup guide formatting and organization
- Test account email addresses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Email System
- `server/services/emailService.ts` — Core email service with nodemailer, all template methods
- `server/routes/email.ts` — Existing email routes (subscription endpoints)

### Phase 03 Auth Email Decisions
- `.planning/milestones/v1.0-phases/03-auth-completion/03-CONTEXT.md` — Email template decisions (D-08 bilingual, D-47 retry backoff, D-32/D-33 change confirmation)

### Monitoring Stack
- `server/services/metricsService.ts` — Prometheus metrics service with registry
- `prometheus/alert.rules.yml` — Alert rule definitions

### Database
- `prisma/schema.prisma` — User model needs bounce/optout fields added

### External Docs
- SendGrid SMTP Setup: https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp
- SendGrid Event Webhook: https://docs.sendgrid.com/for-developers/tracking-events/event

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmailService` singleton with `send()`, `sendVerification()`, `sendPasswordResetBilingual()`, `sendPasswordChangeConfirmation()`
- `MetricsService` with `registerCounter()`, `registerGauge()` methods
- Express router pattern in `server/routes/email.ts`

### Established Patterns
- Singleton services with `getInstance()` pattern
- Prometheus metrics with prom-client
- Zod validation for request bodies
- Webhook signature verification pattern (see existing middleware)

### Integration Points
- EmailService.send() — add bounce check before sending
- New route `/api/email/webhook` for SendGrid events
- metricsMiddleware pattern for incrementing counters
- alert.rules.yml for new email alerts

</code_context>

<specifics>
## Specific Ideas

- SendGrid webhook uses POST with JSON body containing event arrays
- Bounce status should be clearable when user updates email address
- Consider rate limiting webhook endpoint to prevent abuse

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-smtp-production*
*Context gathered: 2026-04-23*
