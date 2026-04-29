---
phase: 36-monetization-core
plan: 04
subsystem: subscription-ui
tags: [pricing, subscription, i18n, ui-components]
dependency_graph:
  requires:
    - 36-01 (subscription service)
    - 36-02 (webhook handlers)
    - 36-03 (feature gating middleware)
  provides:
    - public pricing page with tier comparison
    - subscription success flow
    - AI usage counter for FREE tier
    - i18n translations for DE/EN/FR
  affects:
    - routes.ts
    - App.tsx
    - header component (SubscriptionBadge integration)
tech_stack:
  added: []
  patterns:
    - TierCard component with cyber theme styling
    - SubscriptionBadge for header tier display
    - UpgradePrompt overlay for feature gating
    - AIUsageCounter progress bar with color thresholds
key_files:
  created:
    - src/components/subscription/TierCard.tsx
    - src/components/subscription/SubscriptionBadge.tsx
    - src/components/subscription/UpgradePrompt.tsx
    - src/pages/Pricing.tsx
    - src/pages/SubscriptionSuccess.tsx
    - src/components/subscription/AIUsageCounter.tsx
    - public/locales/en/pricing.json
    - public/locales/de/pricing.json
    - public/locales/fr/pricing.json
  modified:
    - src/routes.ts
    - src/App.tsx
    - public/locales/en/common.json
    - public/locales/de/common.json
decisions:
  - "Premium tier highlighted with cyan (#00f0ff) border and scale-105"
  - "Most Popular badge on Premium tier card"
  - "SubscriptionBadge returns null for FREE tier by default"
  - "AIUsageCounter shows progress bar with green/yellow/red thresholds"
  - "Enterprise tier opens Calendly for demo booking"
  - "Annual billing shows Save 2 Months badge"
metrics:
  duration: 8 minutes
  completed: 2026-04-26T16:22:00Z
---

# Phase 36 Plan 04: Pricing Page UI Summary

Pricing page with tier comparison, subscription success flow, and i18n translations for the monetization UI.

## What Was Built

### Task 1: Subscription UI Components
**Commit:** `17066dd`

Created `src/components/subscription/` directory with three components:

1. **TierCard.tsx** - Tier comparison card with features and CTA
   - Props: name, price, annualPrice, billingCycle, features, isPopular, isCurrent, isEnterprise
   - Premium tier highlighted with cyan border (`#00f0ff`) and scale-105
   - "Most Popular" badge displayed for `isPopular=true`
   - Annual billing shows "Save 2 Months" in green (`#00ff88`)
   - Loading spinner state for checkout flow

2. **SubscriptionBadge.tsx** - Header badge showing subscription tier
   - Tier-specific icons: Sparkles (Free), Crown (Premium), Building (Enterprise)
   - Tier-specific colors: gray (Free), cyan (Premium), purple (Enterprise)
   - Returns null for FREE tier by default (configurable via className)
   - Two sizes: sm (header) and md (profile)

3. **UpgradePrompt.tsx** - Contextual upsell overlay
   - Blur/dim locked content with lock icon overlay
   - Navigates to /pricing on click
   - Inline variant for button-style prompts
   - Uses i18n for "upgrade.required" and "upgrade.clickToUnlock"

### Task 2: Pricing and Success Pages
**Commit:** `6956f02`

1. **Pricing.tsx** - Public pricing comparison page
   - 3 TierCard components: Free, Premium, Enterprise
   - Billing toggle between monthly (EUR9) and annual (EUR90)
   - Feature lists per CONTEXT.md Feature Gating table
   - Stripe checkout integration via POST /api/subscriptions/checkout
   - Unauthenticated users redirected to login with checkout intent stored
   - Enterprise tier opens Calendly for demo booking
   - Trust badges: secure payment, payment methods, 14-day money-back

2. **SubscriptionSuccess.tsx** - Post-checkout verification
   - Verifies session_id from Stripe redirect
   - Refreshes user data to update subscription tier
   - Success animation with CheckCircle icon
   - Auto-redirects to dashboard after 3 seconds
   - Error state with "Go to Dashboard" fallback

3. **AIUsageCounter.tsx** - FREE tier usage display
   - Fetches usage from GET /api/ai/usage
   - Progress bar with color thresholds: green (>50%), yellow (20-50%), red (<20%)
   - Shows upgrade CTA when remaining <= 2
   - Compact mode for header/dropdown display
   - Returns null for Premium/Enterprise users

### Task 3: Routes and i18n
**Commit:** `bde8ee4`

1. **routes.ts updates:**
   - Added `Pricing` and `SubscriptionSuccess` lazy components
   - Added `/pricing` to `routePreloaders` for hover prefetch

2. **App.tsx updates:**
   - Added imports for Pricing and SubscriptionSuccess
   - Added routes: `/pricing` and `/subscription/success`
   - Routes placed in public section (no auth required)

3. **i18n translations:**
   - `public/locales/en/pricing.json` - English translations
   - `public/locales/de/pricing.json` - German translations
   - `public/locales/fr/pricing.json` - French translations
   - Updated `common.json` (EN/DE) with upgrade and AI usage strings

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 17066dd | feat | add subscription UI components |
| 6956f02 | feat | add pricing page and subscription success flow |
| bde8ee4 | feat | add pricing routes and i18n translations |

## Verification Results

- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] Pricing page renders with 3 tier cards
- [x] Premium tier card has cyan border and "Most Popular" badge
- [x] Billing toggle switches between monthly (EUR9) and annual (EUR90)
- [x] Routes added to App.tsx and routes.ts
- [x] i18n translations created for EN, DE, FR

## Deviations from Plan

None - plan executed exactly as written.

## Key Patterns

### TierCard Styling Pattern
```typescript
// Premium highlight with cyan accent
className={cn(
  'relative rounded-xl border p-6 transition-all duration-300',
  isPopular
    ? 'border-[#00f0ff] bg-[#00f0ff]/5 scale-105 shadow-lg shadow-[#00f0ff]/10'
    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
)}
```

### AIUsageCounter Color Thresholds
```typescript
percentage > 50 ? 'bg-[#00ff88]' :
percentage > 20 ? 'bg-[#ffee00]' : 'bg-[#ff0044]'
```

### Checkout Flow
```typescript
// Authenticated: initiate Stripe checkout
const response = await fetch('/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
  },
  body: JSON.stringify({ priceId, billingCycle }),
});
// Redirect to Stripe Checkout URL
window.location.href = data.data.url;
```

## Integration Points

| Component | Integrates With | Pattern |
|-----------|----------------|---------|
| Pricing.tsx | /api/subscriptions/checkout | POST with priceId, returns checkout URL |
| SubscriptionSuccess.tsx | /api/auth/me | Refresh user data for tier update |
| AIUsageCounter.tsx | /api/ai/usage | GET for daily usage stats |
| UpgradePrompt.tsx | /pricing | Navigate for upgrade |
| TierCard.tsx | i18n pricing namespace | useTranslation('pricing') |

## Self-Check: PASSED

- [x] src/components/subscription/TierCard.tsx exists (145 lines)
- [x] src/components/subscription/SubscriptionBadge.tsx exists (55 lines)
- [x] src/components/subscription/UpgradePrompt.tsx exists (63 lines)
- [x] src/pages/Pricing.tsx exists (213 lines)
- [x] src/pages/SubscriptionSuccess.tsx exists (99 lines)
- [x] src/components/subscription/AIUsageCounter.tsx exists (91 lines)
- [x] public/locales/en/pricing.json exists
- [x] public/locales/de/pricing.json exists
- [x] public/locales/fr/pricing.json exists
- [x] Commit 17066dd exists
- [x] Commit 6956f02 exists
- [x] Commit bde8ee4 exists
