# Phase 22: SMTP Production - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 9 (6 modifications, 3 new files)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | schema | database | `prisma/schema.prisma` (User model) | exact |
| `server/services/emailService.ts` | service | request-response | `server/services/emailService.ts` | exact |
| `server/services/metricsService.ts` | service | metrics | `server/services/metricsService.ts` | exact |
| `server/routes/email.ts` | route | request-response | `server/routes/email.ts` | exact |
| `server/types/sendgrid.ts` | type | N/A | N/A (new types file) | N/A |
| `server/middleware/rawBodyParser.ts` | middleware | request-response | `server/middleware/metricsMiddleware.ts` | role-match |
| `prometheus/alert.rules.yml` | config | alerting | `prometheus/alert.rules.yml` | exact |
| `docs/SENDGRID_SETUP.md` | documentation | N/A | N/A (new docs file) | N/A |
| `.env` | config | N/A | `.env` (existing pattern) | exact |

## Pattern Assignments

### `prisma/schema.prisma` (schema, database)

**Analog:** `prisma/schema.prisma` (existing User model)

**Imports pattern** (N/A for schema files):
```prisma
// No imports in Prisma schema
```

**Model extension pattern** (lines 66-116, User model):
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  // ... existing fields ...

  // Email verification (AUTH-01 per D-51)
  emailVerified          Boolean   @default(false)
  verificationTokenHash  String?
  verificationTokenExpiry DateTime?

  // Password reset (AUTH-02 per D-51)
  resetTokenHash         String?
  resetTokenExpiry       DateTime?

  // Session invalidation (D-27, D-28)
  tokenVersion           Int       @default(0)

  // Required for cleanup job (D-17)
  updatedAt              DateTime  @updatedAt

  // NEW: Email bounce/opt-out fields (D-30)
  emailBounced      Boolean   @default(false)
  emailBouncedAt    DateTime?
  emailOptOut       Boolean   @default(false)
  emailOptOutAt     DateTime?

  @@index([verificationTokenHash])
  @@index([resetTokenHash])
  @@index([emailVerified, createdAt])
}
```

**Field patterns to copy**:
- Boolean flags with `@default(false)` for tracking state
- Nullable DateTime fields for timestamp tracking
- Indexes on lookup fields for performance

---

### `server/services/emailService.ts` (service, request-response)

**Analog:** `server/services/emailService.ts` (existing implementation)

**Imports pattern** (lines 1-9):
```typescript
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import type { NewsArticle } from '../../src/types';
// NEW: Add Prisma for bounce check
import { prisma } from '../db/prisma';
// NEW: Add metrics service for counters
import { MetricsService } from './metricsService';
```

**Singleton pattern** (lines 42-58):
```typescript
export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private readonly config: EmailConfig;

  private constructor(config: EmailConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initialize();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }
}
```

**Configuration pattern with environment variables** (lines 31-40):
```typescript
const DEFAULT_CONFIG: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.SMTP_FROM || 'NewsHub <noreply@newshub.app>',
};

// NEW: SendGrid SMTP config (D-02, D-03)
const DEFAULT_CONFIG: EmailConfig = {
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',  // Literal string 'apikey'
    pass: process.env.SENDGRID_API_KEY || '',
  },
  from: process.env.SMTP_FROM || 'NewsHub <noreply@newshub.app>',
};
```

**Core send() method with pre-check pattern** (lines 106-127):
```typescript
async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  if (!this.transporter) {
    logger.warn('Email not sent - service not configured');
    return false;
  }

  // NEW: Check bounce status (D-05)
  const user = await prisma.user.findUnique({ where: { email: to } });
  if (user?.emailBounced) {
    logger.warn(`Email not sent - address bounced: ${to}`);
    metricsService.emailBouncedTotal.inc({ type: 'blocked', bounce_type: 'hard' });
    return false;
  }

  // NEW: Check opt-out status (D-07)
  if (user?.emailOptOut) {
    logger.warn(`Email not sent - user opted out: ${to}`);
    return false;
  }

  try {
    await this.transporter.sendMail({
      from: this.config.from,
      to,
      subject,
      html,
      text: text || this.stripHtml(html),
    });

    logger.debug(`Email sent to ${to}: ${subject}`);

    // NEW: Increment sent counter (D-11)
    metricsService.emailSentTotal.inc({ type: this.getEmailType(subject) });

    return true;
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}
```

**Email type extraction helper pattern**:
```typescript
private getEmailType(subject: string): string {
  if (subject.includes('Verify') || subject.includes('Bestaetige')) return 'verification';
  if (subject.includes('Reset') || subject.includes('zuruecksetzen')) return 'password_reset';
  if (subject.includes('changed') || subject.includes('geaendert')) return 'password_change';
  return 'other';
}
```

**Error handling pattern** (lines 112-126):
```typescript
try {
  await this.transporter.sendMail({ /* ... */ });
  logger.debug(`Email sent to ${to}: ${subject}`);
  return true;
} catch (err) {
  logger.error(`Failed to send email to ${to}:`, err);
  return false;
}
```

---

### `server/services/metricsService.ts` (service, metrics)

**Analog:** `server/services/metricsService.ts` (existing implementation)

**Imports pattern** (lines 1-7):
```typescript
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger';
```

**Singleton with registry pattern** (lines 9-24):
```typescript
export class MetricsService {
  private static instance: MetricsService;
  private registry: Registry;

  // Metric properties
  public httpRequestDuration: Histogram<string>;
  public httpRequestsTotal: Counter<string>;
  // NEW: Email metrics
  public emailSentTotal: Counter<string>;
  public emailDeliveredTotal: Counter<string>;
  public emailBouncedTotal: Counter<string>;
  public emailComplainedTotal: Counter<string>;
  public emailDeliverySuccessRate: Gauge<string>;

  private constructor() {
    this.registry = new Registry();
    // ... initialize metrics
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }
}
```

**Counter creation pattern with _total suffix** (lines 42-47):
```typescript
// HTTP request counter (D-05, D-09)
this.httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [this.registry],
});

// NEW: Email counters (D-11)
this.emailSentTotal = new Counter({
  name: 'email_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['type'], // verification, password_reset, password_change, other
  registers: [this.registry],
});

this.emailDeliveredTotal = new Counter({
  name: 'email_delivered_total',
  help: 'Total number of emails delivered',
  labelNames: ['type'],
  registers: [this.registry],
});

this.emailBouncedTotal = new Counter({
  name: 'email_bounced_total',
  help: 'Total number of bounced emails',
  labelNames: ['type', 'bounce_type'], // bounce_type: hard, soft, blocked
  registers: [this.registry],
});

this.emailComplainedTotal = new Counter({
  name: 'email_complained_total',
  help: 'Total number of spam complaints',
  labelNames: ['type'],
  registers: [this.registry],
});
```

**Gauge creation pattern** (lines 50-56):
```typescript
this.upGauge = new Gauge({
  name: 'up',
  help: 'Service up status',
  labelNames: ['service'],
  registers: [this.registry],
});
this.upGauge.set({ service: 'newshub' }, 1);

// NEW: Delivery success rate gauge (D-12)
this.emailDeliverySuccessRate = new Gauge({
  name: 'email_delivery_success_rate',
  help: 'Email delivery success rate (delivered/sent)',
  registers: [this.registry],
});
```

**Metric update helper methods pattern**:
```typescript
incrementEmailSent(type: string): void {
  this.emailSentTotal.inc({ type });
  this.updateDeliveryRate();
}

incrementEmailDelivered(type: string): void {
  this.emailDeliveredTotal.inc({ type });
  this.updateDeliveryRate();
}

incrementEmailBounced(type: string, bounceType: 'hard' | 'soft' | 'blocked'): void {
  this.emailBouncedTotal.inc({ type, bounce_type: bounceType });
  this.updateDeliveryRate();
}

incrementEmailComplained(type: string): void {
  this.emailComplainedTotal.inc({ type });
}

private async updateDeliveryRate(): Promise<void> {
  const sent = await this.emailSentTotal.get();
  const delivered = await this.emailDeliveredTotal.get();

  const totalSent = sent.values.reduce((sum, v) => sum + v.value, 0);
  const totalDelivered = delivered.values.reduce((sum, v) => sum + v.value, 0);

  const rate = totalSent > 0 ? totalDelivered / totalSent : 1.0;
  this.emailDeliverySuccessRate.set(rate);
}
```

---

### `server/routes/email.ts` (route, request-response)

**Analog:** `server/routes/email.ts` (existing implementation)

**Imports pattern** (lines 1-13):
```typescript
import { Router, Request } from 'express';
import { EmailService } from '../services/emailService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();
const emailService = EmailService.getInstance();
```

**NEW: Webhook endpoint with raw body parsing**:
```typescript
// NEW imports for webhook
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';
import { CacheService } from '../services/cacheService';
import { MetricsService } from '../services/metricsService';
import { prisma } from '../db/prisma';

const cacheService = CacheService.getInstance();
const metricsService = MetricsService.getInstance();

/**
 * POST /api/email/webhook
 * SendGrid event webhook endpoint (D-08, D-09, D-10)
 */
router.post('/webhook', async (req, res) => {
  try {
    // 1. Verify signature (D-10)
    const signature = req.get(EventWebhookHeader.SIGNATURE());
    const timestamp = req.get(EventWebhookHeader.TIMESTAMP());

    if (!signature || !timestamp) {
      logger.warn('Webhook missing signature headers');
      return res.status(400).json({ error: 'Missing signature headers' });
    }

    const eventWebhook = new EventWebhook();
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY!;
    const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);

    const isValid = eventWebhook.verifySignature(
      ecPublicKey,
      (req as any).rawBody,  // Raw body preserved by middleware
      signature,
      timestamp
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Process events with idempotency
    const events = req.body as SendGridEvent[];

    for (const event of events) {
      const eventId = event.sg_event_id || `${event.email}-${event.timestamp}`;
      const cacheKey = `webhook:${eventId}`;

      // Idempotency check
      if (await cacheService.get(cacheKey)) {
        logger.debug(`Duplicate event ${eventId}, skipping`);
        continue;
      }

      // Mark as processed
      await cacheService.set(cacheKey, '1', 86400); // 24h TTL

      // Route by event type
      switch (event.event) {
        case 'bounce':
        case 'dropped':
          await handleBounce(event);
          break;
        case 'spamreport':
        case 'unsubscribe':
          await handleOptOut(event);
          break;
        case 'delivered':
          await handleDelivered(event);
          break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleBounce(event: SendGridEvent): Promise<void> {
  const isHardBounce =
    event.event === 'dropped' ||
    event.bounce_classification === 'Invalid Address' ||
    event.bounce_classification === 'Content' ||
    event.bounce_classification === 'Reputation';

  if (isHardBounce) {
    await prisma.user.update({
      where: { email: event.email },
      data: {
        emailBounced: true,
        emailBouncedAt: new Date(),
      },
    });

    metricsService.incrementEmailBounced(
      'unknown', // Type inferred from logs
      'hard'
    );
    logger.info(`Hard bounce: ${event.email}`);
  } else {
    // Soft bounce - wait for SendGrid's 72h retry
    logger.info(`Soft bounce: ${event.email}, will retry`);
    metricsService.incrementEmailBounced('unknown', 'soft');
  }
}

async function handleOptOut(event: SendGridEvent): Promise<void> {
  await prisma.user.update({
    where: { email: event.email },
    data: {
      emailOptOut: true,
      emailOptOutAt: new Date(),
    },
  });

  metricsService.incrementEmailComplained('unknown');
  logger.info(`Opt-out: ${event.email} (${event.event})`);
}

async function handleDelivered(event: SendGridEvent): Promise<void> {
  metricsService.incrementEmailDelivered('unknown');
  logger.debug(`Delivered: ${event.email}`);
}
```

**Existing endpoint pattern** (lines 36-47):
```typescript
router.get('/status', async (req, res) => {
  const isAvailable = emailService.isAvailable();
  const verified = isAvailable ? await emailService.verify() : false;

  res.json({
    success: true,
    data: {
      available: isAvailable,
      verified,
    },
  });
});
```

**Error handling pattern** (lines 67-70):
```typescript
try {
  // ... operation
} catch (err) {
  logger.error('Error context:', err);
  res.status(500).json({ success: false, error: 'Error message' });
}
```

---

### `server/types/sendgrid.ts` (type, N/A)

**Analog:** N/A (new file — use TypeScript type definition patterns)

**Type definition pattern** (reference from RESEARCH.md):
```typescript
/**
 * SendGrid Event Webhook Types
 * Source: https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event
 */

export interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'processed' | 'delivered' | 'bounce' | 'dropped' | 'deferred' | 'spamreport' | 'unsubscribe';
  sg_event_id: string;
  sg_message_id: string;
  bounce_classification?: 'Invalid Address' | 'Technical' | 'Content' | 'Reputation' | 'Frequency/Volume' | 'Mailbox Unavailable' | 'Unclassified';
  reason?: string;
  category?: string[];
  [key: string]: any; // Allow additional fields
}
```

---

### `server/middleware/rawBodyParser.ts` (middleware, request-response)

**Analog:** `server/middleware/metricsMiddleware.ts` (middleware structure)

**Imports pattern** (lines 1-7):
```typescript
import type { Request, Response, NextFunction } from 'express';
import { json } from 'express';
```

**Middleware structure pattern** (lines 10-37 from metricsMiddleware.ts):
```typescript
import { json } from 'express';

/**
 * Raw body parser middleware for webhook signature verification
 * Captures raw body string before JSON parsing
 */
export const rawBodyParser = json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString('utf8');
    }
  },
});
```

**Middleware application pattern** (from server/index.ts lines 80-86):
```typescript
// Apply globally BEFORE express.json() if needed, or
// Apply to specific route:
import { rawBodyParser } from './middleware/rawBodyParser';
app.use('/api/email/webhook', rawBodyParser);
```

---

### `prometheus/alert.rules.yml` (config, alerting)

**Analog:** `prometheus/alert.rules.yml` (existing alert rules)

**Alert group pattern** (lines 4-43):
```yaml
groups:
  - name: newshub
    rules:
      # Existing alerts...

      # NEW: High bounce rate alert (D-13)
      - alert: HighEmailBounceRate
        expr: |
          (
            sum(rate(email_bounced_total[5m]))
            /
            sum(rate(email_sent_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Email bounce rate above 5%"
          description: "Bounce rate: {{ $value | humanizePercentage }}"

      # NEW: Low delivery rate alert (D-14)
      - alert: LowEmailDeliveryRate
        expr: email_delivery_success_rate < 0.95
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Email delivery success below 95%"
          description: "Delivery rate: {{ $value | humanizePercentage }}"
```

**Alert structure pattern** (lines 8-20):
```yaml
- alert: AlertName
  expr: |
    metric_query > threshold
  for: duration
  labels:
    severity: critical | warning | info
  annotations:
    summary: "Human-readable summary"
    description: "Details with {{ $value | humanize* }} template"
```

---

### `docs/SENDGRID_SETUP.md` (documentation, N/A)

**Analog:** N/A (new file — use Markdown documentation patterns)

**Documentation structure pattern**:
```markdown
# SendGrid SMTP Production Setup

This guide covers SendGrid configuration for production email delivery.

## Prerequisites

- SendGrid account (60-day trial: 100 emails/day, then $19.95/month)
- Domain name with DNS access (for SPF/DKIM/DMARC)
- NewsHub backend deployed

## Step 1: Create SendGrid API Key

1. Log in to [SendGrid](https://app.sendgrid.com/)
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Name: `NewsHub Production SMTP`
5. Permissions: "Full Access" (or "Mail Send" minimum)
6. Copy API key (shown only once)

## Step 2: Configure Environment Variables

Add to `.env`:

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_WEBHOOK_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx  # From Step 4
SMTP_FROM=noreply@newshub.app
```

## Step 3: Authenticate Domain (SPF/DKIM/DMARC)

1. Go to Settings → Sender Authentication → Authenticate Your Domain
2. Select DNS host (e.g., Cloudflare, GoDaddy, AWS Route53)
3. Enter domain: `newshub.app`
4. Add DNS records as shown:

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:sendgrid.net ~all
```

### DKIM Records (2 CNAMEs)
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u12345.wl234.sendgrid.net

Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u12345.wl234.sendgrid.net
```

### DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@newshub.app
```

5. Wait 24-48 hours for DNS propagation
6. Verify in SendGrid dashboard (should show "Verified")

## Step 4: Configure Event Webhook

1. Go to Settings → Mail Settings → Event Webhook
2. Enable "Event Webhook"
3. HTTP Post URL: `https://newshub.app/api/email/webhook`
4. Select events: `delivered`, `bounce`, `dropped`, `spamreport`, `unsubscribe`
5. Enable "Signed Event Webhook"
6. Copy "Verification Key" (ECDSA public key)
7. Add to `.env` as `SENDGRID_WEBHOOK_PUBLIC_KEY`
8. Test webhook: Click "Test Your Integration"

## Step 5: Verify Production Emails

Test all transactional flows:

```bash
# 1. Registration + verification
curl -X POST https://newshub.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@newshub.app","password":"Test1234!","name":"Test User"}'

# 2. Password reset
curl -X POST https://newshub.app/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@newshub.app"}'

# 3. Check inbox for emails
# 4. Verify links work correctly
```

## Troubleshooting

### Emails not arriving

- Check SendGrid Activity Feed for delivery status
- Verify DNS records: `dig TXT _dmarc.newshub.app`
- Check spam folder
- Review Prometheus metrics: `email_bounced_total`, `email_delivery_success_rate`

### Webhook signature verification fails

- Ensure `rawBodyParser` middleware is applied to `/api/email/webhook` route
- Verify `SENDGRID_WEBHOOK_PUBLIC_KEY` is exact value from SendGrid dashboard
- Check logs for signature validation errors

### High bounce rate alert

- Review bounce events in SendGrid Activity Feed
- Check if using test/invalid email addresses
- Verify domain authentication completed (SPF/DKIM/DMARC all pass)

## Monitoring

Access metrics at `https://newshub.app/api/metrics`:

- `email_sent_total` — Total emails sent
- `email_delivered_total` — Successfully delivered
- `email_bounced_total` — Hard/soft bounces
- `email_delivery_success_rate` — Delivery rate gauge

Alerts:
- `HighEmailBounceRate` — Bounce rate > 5% for 5 minutes
- `LowEmailDeliveryRate` — Delivery success < 95% for 1 hour
```

---

### `.env` (config, N/A)

**Analog:** `.env` (existing environment variable patterns)

**Environment variable pattern**:
```bash
# Existing SMTP config (to be replaced)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=user@gmail.com
# SMTP_PASS=app_password

# NEW: SendGrid SMTP config (D-01, D-02)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_WEBHOOK_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx  # ECDSA public key for webhook verification
SMTP_FROM=noreply@newshub.app

# Note: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS no longer needed
# SendGrid config is hardcoded in emailService.ts per D-03
```

---

## Shared Patterns

### Database Update Pattern
**Source:** `prisma/schema.prisma` User model extensions
**Apply to:** All schema modifications
```prisma
// Add new fields to existing model
model User {
  // ... existing fields ...

  // NEW: Feature-specific fields with comments
  emailBounced      Boolean   @default(false)  // D-04: Hard bounce tracking
  emailBouncedAt    DateTime?                  // D-04: Bounce timestamp
  emailOptOut       Boolean   @default(false)  // D-07: Spam complaint tracking
  emailOptOutAt     DateTime?                  // D-07: Opt-out timestamp
}
```

### Singleton Service Pattern
**Source:** `server/services/metricsService.ts`
**Apply to:** All service classes
```typescript
export class ServiceName {
  private static instance: ServiceName;

  private constructor() {
    // Initialize service
  }

  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
}
```

### Prometheus Counter with _total Suffix
**Source:** `server/services/metricsService.ts` lines 42-47
**Apply to:** All counter metrics
```typescript
this.metricNameTotal = new Counter({
  name: 'metric_name_total',  // MUST end with _total
  help: 'Description of what is counted',
  labelNames: ['label1', 'label2'],  // Low cardinality only
  registers: [this.registry],
});
```

### Environment Variable with Fallback
**Source:** `server/services/emailService.ts` lines 31-40
**Apply to:** All config values from environment
```typescript
const config = {
  key: process.env.ENV_VAR_NAME || 'fallback_value',
  port: parseInt(process.env.PORT || '3001', 10),
  flag: process.env.FEATURE_FLAG === 'true',
};
```

### Express Route Error Handling
**Source:** `server/routes/email.ts` lines 67-70
**Apply to:** All route handlers
```typescript
router.post('/path', async (req, res) => {
  try {
    // ... operation
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Operation failed:', err);
    res.status(500).json({ success: false, error: 'User-friendly message' });
  }
});
```

### Webhook Idempotency Pattern
**Source:** `server/routes/email.ts` (webhook handler)
**Apply to:** All webhook endpoints
```typescript
const eventId = event.id || `${event.type}-${event.timestamp}`;
const cacheKey = `webhook:${eventId}`;

if (await cacheService.get(cacheKey)) {
  logger.debug(`Duplicate event ${eventId}, skipping`);
  continue;
}

await cacheService.set(cacheKey, '1', 86400); // 24h TTL
// ... process event
```

## No Analog Found

No files without close matches — all files have exact or role-match analogs.

## Metadata

**Analog search scope:** `server/services/`, `server/routes/`, `server/middleware/`, `prisma/`, `prometheus/`
**Files scanned:** 9 total (6 modifications + 3 new)
**Pattern extraction date:** 2026-04-23

**Key insights:**
- Existing emailService.ts already has full bilingual template infrastructure (Phase 03)
- MetricsService.ts singleton pattern is well-established across all services
- Express middleware application pattern from server/index.ts shows global vs. route-specific application
- Prisma User model already has extensive email-related fields (verification, reset) — bounce/optout fields follow same pattern
- Alert rules structure is consistent — rate calculation, threshold, duration, severity, annotations
