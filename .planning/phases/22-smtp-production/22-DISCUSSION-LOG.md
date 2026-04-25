# Phase 22: SMTP Production - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 22-smtp-production
**Areas discussed:** Provider selection, Bounce handling, Monitoring & alerts, Testing approach, SPF/DKIM/DMARC setup, Sender domain & from address, Email templates

---

## Provider Selection

| Option | Description | Selected |
|--------|-------------|----------|
| SendGrid (Recommended) | 100 emails/day free, good deliverability, webhook for bounces, easy setup. Most popular choice. | ✓ |
| AWS SES | Very cheap ($0.10/1000), requires AWS account, more setup, great for scale. | |
| Postmark | Best deliverability, transactional-focused, $15/mo for 10k emails. Premium option. | |
| Mailgun | 5000 emails/month free for 3 months, good API, flexible webhooks. | |

**User's choice:** SendGrid (Recommended)

---

## Integration Method

| Option | Description | Selected |
|--------|-------------|----------|
| SMTP relay (Recommended) | Use existing nodemailer code, just change SMTP_HOST to smtp.sendgrid.net. Minimal code changes. | ✓ |
| SendGrid SDK | Replace nodemailer with @sendgrid/mail. Better features (templates, tracking) but more code changes. | |
| Both available | Keep nodemailer as default, add SendGrid SDK as optional upgrade path. | |

**User's choice:** SMTP relay (Recommended)

---

## Hard Bounce Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Mark address + block retries (Recommended) | Add bounced flag to User model. Prevent future sends to that address. User can update email. | ✓ |
| Just log and continue | Log bounces for monitoring but don't change behavior. Risk: hurt sender reputation. | |
| Delete unverified bounced accounts | Auto-delete accounts with bounced emails if unverified. Aggressive but clean. | |

**User's choice:** Mark address + block retries (Recommended)

---

## Spam Complaint Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-unsubscribe (Recommended) | User who marks as spam gets all email disabled. Protects sender reputation. | ✓ |
| Manual review | Log complaint, admin reviews. More work but allows nuance. | |
| Ignore (risky) | Just log. Risk: repeated complaints hurt deliverability. | |

**User's choice:** Auto-unsubscribe (Recommended)

---

## Bounce Event Reception

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook endpoint (Recommended) | Add /api/email/webhook that SendGrid POSTs to. Real-time bounce/complaint handling. | ✓ |
| Polling via API | Periodically fetch events from SendGrid API. Simpler but delayed (5-30 min lag). | |
| Manual review only | Check SendGrid dashboard manually. No code changes but not automated. | |

**User's choice:** Webhook endpoint (Recommended)

---

## Monitoring Level

| Option | Description | Selected |
|--------|-------------|----------|
| Basic metrics (Recommended) | Track sent/delivered/bounced/complained counts in Prometheus. Alert on high bounce rate (>5%). | ✓ |
| Full analytics | Add open tracking, click tracking, engagement metrics. More complex, privacy considerations. | |
| SendGrid dashboard only | Rely on SendGrid's built-in analytics. No code changes but separate from app monitoring. | |

**User's choice:** Basic metrics (Recommended)

---

## Alert Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Bounce rate + delivery failures (Recommended) | Alert if bounce rate > 5% or delivery success < 95% over 1 hour. Catches major issues. | ✓ |
| Any failure | Alert on every send failure. Noisy but catches everything immediately. | |
| Daily summary only | No real-time alerts, just daily email stats report. Less noise, delayed awareness. | |

**User's choice:** Bounce rate + delivery failures (Recommended)

---

## Testing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Test accounts + real sends (Recommended) | Create test@yourdomain.com accounts. Run actual flows, verify delivery, check spam folders. | ✓ |
| SendGrid sandbox mode | Use SendGrid's sandbox to test without real delivery. Good for CI but doesn't prove production works. | |
| Staging environment only | Test in staging with real SMTP, never test in prod. Risk: prod config issues missed. | |

**User's choice:** Test accounts + real sends (Recommended)

---

## Flows to Verify

| Option | Description | Selected |
|--------|-------------|----------|
| All transactional (Recommended) | Verification, password reset, password change confirmation. Core security flows. | ✓ |
| Verification + reset only | Skip password change confirmation. Less testing but faster. | |
| Also digests | Include daily/weekly digest delivery. More comprehensive but digests are optional feature. | |

**User's choice:** All transactional (Recommended)

---

## DNS Authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Document requirements (Recommended) | Create setup guide with exact DNS records. User configures manually. Flexible for any domain. | ✓ |
| Verify in code | Add health check that validates DNS records are configured. More complex but catches issues. | |
| Defer to SendGrid guide | Just link to SendGrid's DNS setup docs. Simplest but less project-specific. | |

**User's choice:** Document requirements (Recommended)

---

## Sender Identity

| Option | Description | Selected |
|--------|-------------|----------|
| noreply@newshub.app (Recommended) | Single verified sender domain. Simple, consistent branding. | ✓ |
| Subdomain: mail.newshub.app | Separate subdomain for email. Protects main domain reputation if issues occur. | |
| Configurable via env var | SMTP_FROM already exists. Let deployer choose domain. Most flexible. | |

**User's choice:** noreply@newshub.app (Recommended)

---

## Email Templates

| Option | Description | Selected |
|--------|-------------|----------|
| Keep inline HTML (Recommended) | Current approach works. Templates are in emailService.ts. Simple, no new dependencies. | ✓ |
| Move to separate files | Extract HTML to /server/templates/*.html. Easier to edit but no hot-reload benefit. | |
| Use React Email or MJML | Modern template systems. Better responsive emails but adds complexity and build step. | |

**User's choice:** Keep inline HTML (Recommended)

---

## Claude's Discretion

- Exact webhook event parsing implementation
- Prometheus metric label cardinality
- Setup guide formatting
- Test account email addresses

## Deferred Ideas

None
