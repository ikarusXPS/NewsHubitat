# Phase 39: Mobile Apps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 39-mobile-apps
**Areas discussed:** Delivery framework, Push notification stack, App Store payment compliance, Biometric + offline scope

---

## Area selection

User selected all four presented gray areas: Delivery framework, Push notification stack, App Store payment compliance, Biometric + offline scope.

---

## Delivery framework

### Q1: Capacitor only vs RN vs hybrid

| Option | Description | Selected |
|--------|-------------|----------|
| Capacitor only (Recommended) | Wrap apps/web in iOS + Android shells. Reinterpret MOB-07 as 'core screens feel native' delivered via Capacitor plugins + GPU-accelerated CSS. 60%+ sharing automatic. RN deferred. | ✓ |
| Capacitor base + RN hot screens | Capacitor wraps apps/web; rewrite 1–2 perf-critical screens in RN, embed via native bridge. Adds packages/mobile-native. | |
| Standalone React Native app | apps/mobile RN app with own UI. packages/types + extracted api-client + state shared. ~doubles v1.6 scope. | |
| Both in parallel | Capacitor + separate RN app. Two builds, two store submissions. Highest maintenance. | |

**User's choice:** Capacitor only (Recommended) → D-01.
**Notes:** MOB-07 "RN native performance" reinterpreted; Capacitor reuses the SPA bundle so MOB-08 60% target is satisfied trivially.

### Q2a: Native-feel polish tier

| Option | Description | Selected |
|--------|-------------|----------|
| Standard polish (Recommended) | @capacitor/haptics + status-bar + splash + keyboard + app, themed to dark cyber palette. Reuse existing mobile components. 1–2 days. | ✓ |
| Maximal polish | Standard + native page transitions + native gestures + per-platform tweaks. 4–5 extra days. | |
| Minimum viable | Just enough for App Review. Skips polish, ships faster. App Review risk. | |

**User's choice:** Standard polish (Recommended) → D-02.

### Q2b: Project layout

| Option | Description | Selected |
|--------|-------------|----------|
| apps/mobile (Recommended) | New apps/mobile workspace with capacitor.config.ts, android/, ios/. Cap sync against apps/web/dist. | ✓ |
| Inside apps/web | capacitor.config.ts at apps/web root; android/ and ios/ co-located. Smaller delta but blurs boundaries. | |

**User's choice:** apps/mobile (Recommended) → D-03.

---

## Push notification stack

### Q3a: Push backend

| Option | Description | Selected |
|--------|-------------|----------|
| FCM + APNs only (Recommended) | @capacitor/push-notifications native; firebase-admin backend. Web keeps socket.io. Single send path. | ✓ |
| FCM + APNs + Web Push (VAPID) | Adds web-push and PWA push subscription. Two backend paths, ~50% more code. iOS PWA push flaky. | |
| Web Push (VAPID) only | Skip native FCM/APNs. Capacitor WKWebView doesn't support reliably; fails MOB-03 on iOS. | |

**User's choice:** FCM + APNs only (Recommended) → D-04.

### Q3b: Alert triggers (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Region-match breaking news (Recommended) | Article tagged breaking + matches user defaultRegions. Reuses existing data. | ✓ |
| Reading-history affinity | Top-N entities/topics from last 30d ReadingHistory. Cold-start needed. | ✓ |
| User keyword-watch list | New KeywordWatch table + Settings UI. Highest signal-to-noise. | ✓ |
| Daily digest at user-chosen time | Single morning push; reuses emailDigest preferences. | ✓ |

**User's choice:** All four → D-05.
**Notes:** Cold-start handled by skipping affinity/digest until user has 5+ history entries.

### Q4a: Tier gating

| Option | Description | Selected |
|--------|-------------|----------|
| Free: breaking only — Premium: rest (Recommended) | Mirrors Phase 36 model; drives upgrade conversions. | ✓ |
| All free | No incremental Premium value beyond what exists. | |
| All premium | FREE users see push prompt but can't receive — confusing. | |
| Free: breaking + digest — Premium: affinity + keyword-watch | Wider free tier; weaker upgrade hook. | |

**User's choice:** Free: breaking only — Premium: rest (Recommended) → D-06.

### Q4b: Volume cap

| Option | Description | Selected |
|--------|-------------|----------|
| Hard daily cap + dedup (Recommended) | 5/day FREE, 10/day PREMIUM, Redis counter. Per-article dedup. Quiet hours 22–07 user-local. | ✓ |
| Per-trigger caps only | Breaking 3 + Affinity 2 + Keyword 5 + Digest 1 = up to 11/day worst case. | |
| User-controlled in Settings | More UI work; better power-user UX. | |

**User's choice:** Hard daily cap + dedup (Recommended) → D-07.

---

## App Store payment compliance

### Q5: Payment path

| Option | Description | Selected |
|--------|-------------|----------|
| Reader-app exemption (Recommended) | iOS/Android hide pricing & CTAs. Subscribe on web only. App reads tier from /api/auth/me. ~1 day. No 30% cut. | ✓ |
| Apple IAP + Google Play Billing | RevenueCat or @capacitor-community/in-app-purchases-2. Backend receipt validation. 30% cut. 5–7 days. | |
| External browser link out | Tap Upgrade → Capacitor browser to Stripe Checkout. NOT App Store-safe. | |
| Hide premium UI entirely in app | Free tier only on mobile this phase. Loses cross-platform funnel. | |

**User's choice:** Reader-app exemption (Recommended) → D-08, D-10.

### Q6: Free-tier UX in mobile when hitting Premium gate

| Option | Description | Selected |
|--------|-------------|----------|
| Generic 'feature unavailable' (Recommended) | "Not available on your current plan. Visit newshub.example from your browser." Plain-text URL, no clickable link, no price, no Premium label. | ✓ |
| Web link to a non-purchase page | "Manage your account at newshub.example/account" — clickable since not a direct purchase target. | |
| Zero indication | Premium gates silently fail. Lowest App Review risk; worst UX. | |

**User's choice:** Generic 'feature unavailable' (Recommended) → D-09.

---

## Biometric + offline scope

### Q7a: Biometric scope

| Option | Description | Selected |
|--------|-------------|----------|
| Login replacement after first password (Recommended) | First launch: password+email login → JWT in iOS Keychain / Android Keystore. Subsequent launches: biometric unlocks JWT. Falls back to password after 3 fails. User can disable in Settings. | ✓ |
| Re-auth gate after N minutes idle | Biometric prompts only on foreground after 15-min idle. Lighter implementation. | |
| Sensitive-action gate only | Biometric only for delete account / data export / password change. Doesn't match MOB-05 spirit. | |

**User's choice:** Login replacement after first password (Recommended) → D-11.

### Q7b: Offline scope

| Option | Description | Selected |
|--------|-------------|----------|
| PWA service worker only (Recommended) | Trust existing SW. Capacitor's WKWebView/Android WebView runs same SW. Add "you are offline" UI banner. ~0 days. | ✓ |
| + explicit IndexedDB article cache | Eagerly cache last N articles + bookmarks. Survives SW eviction. ~2 days. | |
| + Capacitor SQLite for full offline | Full native SQLite. Bookmarks/history/search local. Heavyweight ~5 days. True offline-first. | |

**User's choice:** PWA service worker only (Recommended) → D-12.

---

## Claude's Discretion

These were left to researcher/planner because they are implementation details that don't change the phase's contract:

- Q-01 — Which biometric Capacitor plugin (`@capgo/capacitor-native-biometric` vs `@aparajita/capacitor-biometric-auth` vs `@capacitor-community/biometric-auth`).
- Q-02 — Secure-storage plugin pairing.
- Q-03 — FCM/APNs payload schema.
- Q-04 — Capacitor major version (6 vs 7).
- Q-05 — Whether push prefs live on the existing SettingsPage or a new `/settings/notifications` route.

Also left for researcher: CI/CD pipeline choice for mobile builds (GitHub Actions matrix vs EAS Build vs Capacitor-native CI) — D-14.

## Deferred Ideas

- React Native (any form) — v1.7+ candidate.
- Web Push (VAPID) for browser PWA users — v1.7+ if needed.
- Apple IAP / Google Play Billing — v1.7+ if mobile-acquisition data shows revenue gap.
- Eager IndexedDB article cache — v1.7+ if SW gaps appear.
- Capacitor SQLite for full offline — v1.7+ if IndexedDB still insufficient.
- Apple Watch / Wear OS / Widgets / Deep links — already in REQUIREMENTS.md MOB-F01..F03.
- Apple Sign-In — already in REQUIREMENTS.md "Out of Scope".
- Quiet-hours per-trigger-category override — single global window for now.
- Per-trigger user-configurable caps — defaulted instead.

## Operational threads to track in STATE.md

- Apple Developer + Google Play Console account provisioning (user owns; needed for D-15 bundle ID `com.newshub.app` registration before any TestFlight / Play Internal upload).
- iOS / Android signing keys and CI secrets — researcher specifies which secrets are needed; user provisions before execute-phase.
