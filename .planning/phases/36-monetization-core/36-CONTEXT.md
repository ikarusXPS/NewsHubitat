# Phase 36: Monetization Core — Context

**Phase Goal:** Users can subscribe to Premium tier and access gated features with Stripe billing
**Created:** 2026-04-26
**Requirements:** PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07

---

## Market Analysis Summary

**Direct Competitor: Ground News**
- Pro: $9.99/Jahr, Premium: $39.99/Jahr, Vantage: $99.99/Jahr
- 40.000+ Quellen, Blindspot Feed, 3 Bias-Rating-Organisationen
- **NewsHub Advantages:** AI Q&A (unique), Translation (unique), Globe View (unique), Teams, Gamification

**Pricing Position:** €9/Monat ist wettbewerbsfähig — liegt im mittleren Marktsegment mit mehr Features als Ground News Vantage.

---

## Locked Decisions

### Payment Flow

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Checkout Method | Stripe Checkout (hosted) | Compliance, 3DS, localization handled |
| Subscription Changes | Immediate proration | Standard SaaS, user-friendly |
| Cancellation | Cancel at period end | Claude decides: standard approach |
| Trial Period | No trial | Free tier serves as perpetual trial |
| Failed Payment Handling | Custom dunning + in-app banner | User choice |
| Grace Period | 7 days | Claude decides: standard SaaS |
| Subscription Management | Hybrid | In-app overview + Stripe Portal for sensitive actions |
| Annual Billing | Yes, 2 months free | €90/Jahr (~16% discount) |
| Currency | Stripe Auto-Detect | Based on customer location |
| Tax Handling | Stripe Tax | Automatic VAT for EU/DE |
| Enterprise Tier | Calendly demo request | User choice |
| Invoices | Stripe handles | Claude decides |
| Payment History | Via Stripe Portal | Claude decides |
| Promo Codes | Defer to later | Claude decides |
| Subscription Status UI | Badge in header + Settings detail | User choice |

### Tier Structure

| Tier | Price | Billing |
|------|-------|---------|
| Free | €0 | - |
| Premium | €9/Monat | Monthly or Annual (€90/Jahr) |
| Enterprise | Custom | Contact/Demo |

### Feature Gating

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| AI Queries | 10/day (Claude decides) | Unlimited | Unlimited |
| Reading History | 7 days | Unlimited | Unlimited |
| Data Export | None | JSON/CSV | JSON/CSV/PDF |
| Comments | None | Unlimited | Unlimited |
| AI Personas | None | All personas | All personas |
| Email Digests | Weekly only | Daily/Realtime | Daily/Realtime |
| Team Creation | None | Yes | Yes + billing |
| Share Analytics | None | Yes | Yes |
| Translation | Auto-only | Force target language | Force target language |
| Cluster AI Summaries | None | Yes | Yes |
| Real-time Updates | Polling (30s) | WebSocket | WebSocket |
| Advanced Filters | Basic | Sentiment + Bias | Sentiment + Bias |
| Custom Focus Presets | None | Yes | Yes |
| Bookmarks | Unlimited | Unlimited | Unlimited |
| Regions | All 13 | All 13 | All 13 |
| EventMap/Globe | Yes | Yes | Yes |
| Timeline | Full | Full | Full |
| Gamification | Yes | Yes + Premium badges | Yes + Premium badges |
| Feed Manager | Yes (custom feeds Premium) | Claude decides | Claude decides |

**Gating Approach:**
- Server-side only (secure)
- Enum field on User model: `subscriptionTier: FREE | PREMIUM | ENTERPRISE`
- Visible but locked UI for Premium features (upsell)
- Usage counter in AI panel + profile dropdown

**Additional Decisions:**
- API Key tiers separate from subscription (Phase 35 pattern)
- Downgrade preserves data (hidden, not deleted)
- Teams: Defer tier inheritance to later (Claude decides)
- Grandfathering: Defer (Claude decides)

### Pricing Presentation

| Decision | Choice |
|----------|--------|
| Pricing Model | 3 Tiers (Free/Premium/Enterprise) |
| Feature Comparison | Hybrid (Cards + expandable table) |
| Billing Toggle | Prominent with "Spare 2 Monate" badge |
| Competitor Positioning | No direct naming |
| USPs to Highlight | Claude decides based on market analysis |
| Payment Icons | Stripe-Standard (Visa, MC, SEPA, Apple Pay, Google Pay) |
| i18n | All 5 languages (DE/EN/FR/ES/IT) |
| "Most Popular" Badge | Yes, on Premium |
| Premium Highlight | Larger card + cyan accent border |
| Navigation | /pricing route + Header link |
| Access | Public (SEO + Marketing) |
| Money-back Guarantee | 14 days (EU compliance) |
| Upsell CTAs | Contextual (at limit + in settings) |
| Theme | Follow system theme |
| Feature Preview | Screenshots/GIFs |
| A/B Testing | PostHog (Cloud now, self-host later) |
| Gift Subscriptions | Defer (Claude decides) |

### Discounts & Referrals

| Program | Details |
|---------|---------|
| Student Discount | 50%, .edu/.ac email check + manual review fallback with automation |
| Student Verification | Semesterweise re-verify |
| Student Admin | Simple queue page for manual review |
| Referral System | Both get 1 month free + discount on annual |
| Referral Limits | Unlimited referrals, max 3 free months, then 5-10% discount per month |
| Referral UI | Settings section + Share button in header/profile |
| Discount Stacking | Combinable with 50% cap |
| Seasonal Campaigns | Admin-UI for campaign management |
| Lifetime Deals | No |

### Conversion & Analytics

| Feature | Tool/Approach |
|---------|---------------|
| Conversion Tracking | PostHog + GA4 (both) |
| Exit Intent Popups | No |
| Mobile Design | Responsive (Claude decides) |
| Upgrade Prompts | Contextual + Sidebar banner + Monthly email (all three) |
| Upgrade Email Opt-out | Yes, in Email Settings |
| Downgrade Survey | Yes, multiple choice at cancellation |
| Win-Back Offer | Pause (1-3 months) + 50% discount for 3 months |
| Pause Duration | Max 3 months |
| After Pause | Manual reactivation required |
| Team Billing | Enterprise-only |
| Education Tier | Prepared but not active at launch |

### Support & Documentation

| Feature | Tool/Approach |
|---------|---------------|
| Live Chat | Crisp with FAQ-Bot (hybrid: rule-based + AI) |
| Support Priority | Premium first |
| Help Center | 3 levels: In-App + Crisp Helpdesk + GitBook |
| Video Tutorials | Loom/YouTube |
| Onboarding | Drip emails (SendGrid) + In-App tours (Intro.js) |
| NPS Survey | In-app after 30 days Premium |
| Feature Requests | Canny (now) + Custom build (later) |
| Changelog | Public |
| Roadmap | Public |
| Status Page | BetterUptime + Custom status page |

### Premium Perks

| Perk | Details |
|------|---------|
| Exclusive Badges | Premium-only achievement badges |
| Profile Badge | Visible by default, can hide via toggle |
| Early Access | Beta features for Premium first |
| Themes | Exclusive Premium themes + custom accent color |
| Reading Analytics | Time per region, topic trends, bias profile |
| Newsletter | Weekly (Free: monthly) |
| Personal API | Basic API for bookmarks/history (Zapier/IFTTT) |
| Keyboard Shortcuts | For everyone (no gating) |
| Enterprise Analytics | Team-level stats, export, reports |

### Webhook Handling

| Decision | Choice |
|----------|--------|
| Idempotency | Redis (24h TTL) + DB backup (both) |
| Error Handling | Retry Queue (3x) + Alerting |
| Events to Process | All relevant: Subscription + Invoice + Customer + Checkout |
| Status Sync Speed | Instant via webhook |
| Monitoring | Admin-UI + Prometheus/Grafana integration |
| Signature Verification | Strict (401 on invalid) |
| Status Notifications | Email + In-App |
| Manual Sync | Admin-UI button + CLI command |
| Stripe Downtime | Claude decides (graceful degradation) |

---

## Schema Changes Required

```prisma
enum SubscriptionTier {
  FREE
  PREMIUM
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  PAUSED
}

model User {
  // Existing fields...

  // Phase 36: Subscription
  subscriptionTier      SubscriptionTier   @default(FREE)
  subscriptionStatus    SubscriptionStatus @default(ACTIVE)
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique
  subscriptionEndsAt    DateTime?
  pausedUntil           DateTime?

  // Premium perks
  showPremiumBadge      Boolean            @default(true)
  customAccentColor     String?

  // Referrals
  referralCode          String?            @unique
  referredBy            String?
  freeMonthsEarned      Int                @default(0)

  // Student discount
  isStudent             Boolean            @default(false)
  studentVerifiedUntil  DateTime?
}

model ProcessedWebhookEvent {
  id        String   @id
  eventType String
  processed DateTime @default(now())

  @@index([processed])
}

model ReferralReward {
  id           String   @id @default(cuid())
  referrerId   String
  referredId   String
  rewardType   String   // free_month, discount
  rewardValue  Int      // months or percentage
  appliedAt    DateTime?
  createdAt    DateTime @default(now())

  @@index([referrerId])
}

model Campaign {
  id           String    @id @default(cuid())
  name         String
  discountPct  Int
  maxUses      Int?
  usedCount    Int       @default(0)
  startsAt     DateTime
  endsAt       DateTime
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())

  @@index([isActive, startsAt, endsAt])
}

model StudentVerification {
  id          String   @id @default(cuid())
  userId      String
  documentUrl String?
  status      String   // pending, approved, rejected
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([status])
  @@index([userId])
}
```

---

## External Integrations

| Service | Purpose | Phase |
|---------|---------|-------|
| Stripe | Payments, subscriptions, webhooks | 36 |
| PostHog | A/B testing, feature flags, analytics | 36 |
| GA4 | Conversion tracking | 36 |
| Crisp | Live chat, FAQ bot, helpdesk | 36 |
| BetterUptime | Status page, uptime monitoring | 36 |
| GitBook | Documentation | 36 |
| Canny | Feature voting | 36 |
| Calendly | Enterprise demos | 36 |
| Intro.js | In-app guided tours | 36 |

---

## Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_ANNUAL=

# PostHog
POSTHOG_API_KEY=
POSTHOG_HOST=

# Crisp
CRISP_WEBSITE_ID=

# Canny
CANNY_API_KEY=

# Calendly (Enterprise demos)
CALENDLY_URL=
```

---

## Next Steps

1. Run `/gsd-plan-phase 36` to create detailed implementation plans
2. Researcher will investigate Stripe SDK, PostHog integration, Crisp setup
3. Planner will break down into 5-7 plans based on this context

---

*Context created: 2026-04-26*
*Discussion areas: Payment flow, Tier feature gating, Pricing presentation, Webhook handling*
*Market analysis: Ground News, Feedly, Inoreader compared*
