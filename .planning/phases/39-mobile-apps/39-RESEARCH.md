# Phase 39: Mobile Apps - Research

**Researched:** 2026-04-29
**Domain:** Cross-platform mobile delivery via Capacitor (iOS + Android), FCM/APNs push, biometric auth, App-Store reader-app exemption
**Confidence:** HIGH on stack/version picks; MEDIUM on Apple-Review-text minutiae; LOW on a few dated UX defaults that the planner can lock during /gsd-plan-phase.

## Summary

Phase 39 wraps the existing `apps/web` SPA into Capacitor 8.3.1 binaries for iOS and Android, adds a server-side FCM/APNs push pipeline driven by `firebase-admin@13.8.0`, layers biometric login over JWT storage in iOS Keychain / Android Keystore via `@capgo/capacitor-native-biometric@8.4.2`, reuses the existing `vite-plugin-pwa` service worker for offline read mode, and complies with the App Store reader-app exemption by hiding every pricing surface behind a `Capacitor.getPlatform()` branch. CONTEXT.md has 15 LOCKED decisions; this research closes the 5 open questions Q-01..Q-05 and surfaces one CONTEXT-vs-reality mismatch the planner must reconcile (Q-04 was framed as "Capacitor 6 vs 7" but **Capacitor 8 is current as of 2026-04-29** with 7.6.2 as the previous-major).

**Primary recommendation:** Pin **Capacitor 8.3.1**, **`@capacitor/push-notifications@8.0.3`**, **`@capgo/capacitor-native-biometric@8.4.2`** (it ships its own iOS Keychain / Android Keystore wrapper — no separate secure-storage plugin needed), **`firebase-admin@13.8.0`** (single backend SDK serves both FCM and APNs HTTP v1), and **GitHub Actions with `macos-latest` + `ubuntu-latest` matrix using Fastlane match for iOS code signing + repo-secret keystore for Android**. Settings push-prefs UI lives on the existing `SettingsPage` in a new `<NotificationsSection />` (no separate route).

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Capacitor only; no React Native this phase. MOB-07 reinterpreted as "core screens feel native via Capacitor plugins". MOB-08 60% code-share trivially satisfied (SPA bundle IS the mobile app).
- **D-02** Native polish standard tier: `@capacitor/haptics`, `@capacitor/status-bar` (themed `#0a0e1a`), `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor/app`. No Ionic Animations / Ionic React.
- **D-03** Capacitor projects in `apps/mobile/` (new pnpm workspace member; `pnpm-workspace.yaml`'s `apps/*` glob already covers it). Build: `pnpm --filter @newshub/web build` then `npx cap sync` against `apps/web/dist`.
- **D-04** FCM + APNs only; NO Web Push / VAPID. Backend dependency: `firebase-admin`. Client plugin: `@capacitor/push-notifications`. New Prisma model `PushSubscription { id, userId, platform, token, createdAt, lastSeenAt }` with `@@unique([userId, token])`.
- **D-05** All four alert triggers ship: (1) region-match breaking, (2) reading-history affinity (top-N entities/topics from last 30d), (3) `KeywordWatch` user list, (4) daily digest at user-chosen time (reuses `emailDigest` time-of-day). Cold-start: skip affinity/digest until ≥5 history entries.
- **D-06** Tier gating: FREE = breaking only; PREMIUM = all four. Server-side enforcement in fanout job. Mobile keyword-watch UI shows D-09 "feature not available" message for FREE.
- **D-07** Hard daily volume cap: FREE 5/day, PREMIUM 10/day. Redis counter `push:count:{userId}:{YYYY-MM-DD}`. Same `articleId` only once per user across all triggers (Redis SET `push:sent:{userId}:{articleId}` 7-day TTL). Quiet hours default 22:00–07:00 user-local from `User.timezone` (UTC fallback).
- **D-08** Reader-app exemption (Apple Rule 3.1.3, Google Play similar). iOS/Android builds hide `TierCard`, `UpgradePrompt`, `AIUsageCounter`'s upgrade link, `/pricing` route. Detection seam: `Capacitor.getPlatform()`.
- **D-09** Generic "feature not available" UX. When FREE mobile user hits Premium gate (e.g., 11th `/api/ai/ask` returning 429), neutral text: *"This feature is not available on your current plan. Visit newshub.example from your browser to learn more."* Plain text URL, no clickable link, no price, no Premium label, no Upgrade button.
- **D-10** No Apple IAP, no Google Play Billing. Cross-platform native receipts deferred.
- **D-11** Login replacement after first password. JWT in iOS Keychain / Android Keystore. Biometric prompt on subsequent launches. 3-fail fallback to password.
- **D-12** PWA service worker only; no new offline storage. Add "You are offline — showing cached articles" banner above the feed driven by `useBackendStatus` / `navigator.onLine`.
- **D-13** Sharing target satisfied trivially. No new `packages/api-client` or `packages/state` extraction this phase.
- **D-14** CI/CD path: researcher's call (closed below — GitHub Actions + Fastlane match recommended).
- **D-15** Bundle ID `com.newshub.app` for both platforms. Apple Developer + Google Play Console accounts are operational items the user owns.

### Claude's Discretion
- **Q-01** Biometric plugin pick.
- **Q-02** Secure-storage plugin pairing (driven by Q-01).
- **Q-03** Push payload schema for FCM/APNs.
- **Q-04** Capacitor major version (CONTEXT.md says "6.x vs 7.x" — research updates to **6.x vs 7.x vs 8.x** because Capacitor 8.3.1 is current `latest` on npm).
- **Q-05** Settings push-prefs UI: existing `SettingsPage` vs dedicated `/settings/notifications` route.

### Deferred Ideas (OUT OF SCOPE)
- React Native app (any form) — deferred to v1.7+.
- Web Push (VAPID).
- Apple IAP / Google Play Billing.
- Eager IndexedDB article cache.
- Capacitor SQLite for full offline.
- Apple Watch / Wear OS (MOB-F01).
- Widgets / home-screen news (MOB-F02).
- Universal Links / deep linking for shared articles (MOB-F03).
- Apple Sign-In (already deferred in REQUIREMENTS.md "Out of Scope").
- Push payload internationalization beyond DE/EN/FR.
- Per-trigger quiet-hours overrides (single global window for now).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOB-01 | User can install app from iOS App Store via Capacitor wrapper | Capacitor 8 iOS project + Fastlane TestFlight upload (Architecture > "iOS distribution"); reader-app exemption text + plain-text URL contract (Architecture > "App Store compliance") |
| MOB-02 | User can install app from Google Play Store via Capacitor wrapper | Capacitor 8 Android project + repo-secret keystore.json + Fastlane Play Console upload (Architecture > "Android distribution") |
| MOB-03 | User receives push notifications for breaking news | `firebase-admin` HTTP v1 + `@capacitor/push-notifications` v8 listeners; payload schema in Q-03; fanout hook on `emitBreakingNews(article)` in `newsAggregator.ts:291` (Architecture > "Push fanout pipeline") |
| MOB-04 | User receives personalized alerts based on reading patterns | All four trigger systems (D-05); affinity-driven trigger reads top-N entities/topics from `ReadingHistory` last 30d; tier gating per D-06 (Architecture > "Trigger systems") |
| MOB-05 | User can authenticate via biometric (Face ID/Touch ID/fingerprint) | `@capgo/capacitor-native-biometric@8.4.2` setCredentials/getCredentials wrapping iOS Keychain + Android Keystore; integrates with `AuthContext.login` / `logout` (Q-01, Q-02) |
| MOB-06 | App works offline with cached articles (read-only) | Existing `vite-plugin-pwa` runtimeCaching (NetworkFirst /api/, CacheFirst static) + `navigateFallback: '/offline.html'` runs unchanged inside WKWebView/WebView; new offline banner reuses `navigator.onLine` (D-12) |
| MOB-07 | React Native app provides native performance for core screens | **Reinterpreted per D-01** — delivered via `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/app`, GPU-accelerated CSS, and existing mobile components (`BottomNav`, `PullToRefresh`, `SwipeableCard`) |
| MOB-08 | Mobile apps share 60%+ business logic with web | **Trivially satisfied per D-13** — `apps/mobile` consumes `apps/web/dist` via `cap sync`. 100% of state/fetch/auth/UI/hooks shared by definition. |

## Project Constraints (from CLAUDE.md)

The following directives in `D:\NewsHub\CLAUDE.md` apply to Phase 39 plans and must be enforced:

- **Monorepo discipline:** Files write under `apps/` and `packages/`. The Phase-36.3/36.4/36.5 anti-pattern marker (`.planning/.continue-here.md`) forbids new files under root `server/`, `prisma/`, `src/`, `e2e/`. **Phase 39 introduces `apps/mobile/`** — that's allowed (it's an `apps/*` workspace member) but plans MUST NOT write under root.
- **Singleton services:** New `pushService.ts`, `notificationFanoutService.ts`, `pushVolumeLimiter` follow `getInstance()` pattern (e.g. CleanupService at `cleanupService.ts:29-34`).
- **Zod-validated boundaries:** `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/keyword-watch/*`, `/api/notifications/preferences` all need Zod schemas in `server/openapi/schemas.ts`. `pnpm openapi:generate` must succeed after schema additions.
- **Stripe webhook raw-body anchor stays put:** Push routes are JSON-bodied — they register in the normal `app.use('/api/...', authMiddleware, ...)` block, NOT before `express.json()`.
- **IPv4 in E2E:** Capacitor builds get smoke-tested separately on real devices (TestFlight + Play Internal). The existing E2E suite continues to validate the SPA via `127.0.0.1:3001` (per CLAUDE.md §"E2E Conventions").
- **Z-index ladder:** New mobile-only overlays must respect: scan-line `z-0` < Header `z-20` < AuthModal `z-50` < FocusOnboarding `z-[90]` < ConsentBanner `z-[100]`. Recommend offline-banner `z-30` (above content, below ConsentBanner). Capacitor's native splash overlays the entire WebView before SPA mount, so it's outside the CSS z-index ladder.
- **Performance budgets:** Lighthouse CI runs on web only (90+ on perf/a11y/best-practices/SEO post-deploy on master). Mobile builds don't run Lighthouse but should stay within the existing 250KB initial-JS budget — Capacitor adds no JS overhead beyond what's already in `apps/web/dist`.
- **Branch protection:** `master` requires Lint, Type Check, Unit Tests, Build Docker Image, E2E Tests. Mobile build artifacts ship via separate workflows (recommend `mobile-ios.yml`, `mobile-android.yml` triggered on tag push only, NOT on every PR — keeps the required-checks list lean).
- **vitest 80% / 75% branches:** New backend code (push services, fanout job, KeywordWatch routes) must pass coverage gates. Plans should bundle vitest scaffolding alongside service code.
- **i18n DE/EN/FR locked:** New strings (push permission rationale, biometric prompts, D-09 "feature not available", offline banner) need entries in all three locales.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capacitor wrapper build (cap sync, native projects) | Mobile / Native | Frontend Server (Vite SPA bundle source) | `apps/mobile/` consumes `apps/web/dist`; Capacitor CLI orchestrates native compile |
| Push token registration | Browser/Client (Capacitor WebView) | API/Backend (`/api/push/subscribe`) | Plugin acquires token from APNs/FCM, client POSTs to backend |
| Push token storage | Database/Storage (`PushSubscription` table) | API/Backend (writes/reads via Prisma) | Tokens persist server-side keyed by user; Redis only caches dedup + volume counters |
| Push fanout (FCM/APNs send) | API/Backend (server worker) | External services (Firebase) | `firebase-admin` runs in Node — never the client |
| Biometric prompt + Keychain/Keystore I/O | Mobile / Native (Capacitor plugin) | Browser/Client (AuthContext hand-off) | Plugin abstracts native APIs; web no-ops |
| JWT issuance | API/Backend (`/api/auth/login`) | — | Backend mints JWT; mobile is a consumer |
| Reader-app gating (hide pricing UI) | Browser/Client (Capacitor.getPlatform check) | — | Detection seam runs in WebView; backend doesn't know whether request came from native wrapper (and shouldn't — backend stays platform-agnostic) |
| Offline article display | Browser/Client (Service Worker cache) | CDN/Static (no — already runs in-WebView) | `vite-plugin-pwa` SW runs unchanged in WKWebView/WebView |
| Offline mutation queue | Browser/Client (`syncService.ts` + IndexedDB) | API/Backend (replay on reconnect) | Existing pattern, no Capacitor-specific change |
| Quiet hours / volume cap enforcement | API/Backend (fanout job) | Database/Storage (Redis counter) | Server-side; client cannot be trusted to throttle itself |
| Trigger evaluation (region/affinity/keyword/digest) | API/Backend (`notificationFanoutService.ts`) | Database/Storage (Prisma read of `User`, `ReadingHistory`, `KeywordWatch`) | Hooks `emitNewArticle` / `emitBreakingNews` from `newsAggregator.ts:288-291` |
| Settings push-prefs UI (Q-05) | Browser/Client (`SettingsPage`) | API/Backend (`/api/notifications/preferences`) | Form lives on existing settings route |
| Splash + status bar theming | Mobile / Native (Capacitor config + plugins) | — | Native shell only |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor/core` | `^8.3.1` [VERIFIED: `npm view @capacitor/core dist-tags latest` = 8.3.1, last published 2026-04-29] | Web-to-native bridge runtime | Latest major; supersedes the "6.x vs 7.x" framing in CONTEXT.md Q-04. iOS deployment target 15.0, Android SDK 36, Node 22+, Xcode 26+, Android Studio Otter+. |
| `@capacitor/cli` | `^8.3.1` [VERIFIED: `npm view`] | `cap init`, `cap add`, `cap sync` orchestration | Required to scaffold `apps/mobile/{ios,android}/` and bundle `apps/web/dist`. |
| `@capacitor/ios` | `^8.3.1` [VERIFIED: `npm view`] | iOS native project shell | Pairs with `@capacitor/core@8`. |
| `@capacitor/android` | `^8.3.1` [VERIFIED: `npm view`] | Android native project shell | Pairs with `@capacitor/core@8`. |
| `@capacitor/push-notifications` | `^8.0.3` [VERIFIED: `npm view`] | FCM (Android) + APNs (iOS) registration + listeners | Official plugin; peerDependency `@capacitor/core@>=8`. |
| `@capgo/capacitor-native-biometric` | `^8.4.2` [VERIFIED: `npm view`] | Face ID/Touch ID/fingerprint + Keychain/Keystore credential storage | **Pick for Q-01 and Q-02** — single dependency, ships its own keychain wrapper, peer `@capacitor/core@>=8`. See "Q-01: Biometric plugin pick" below. |
| `firebase-admin` | `^13.8.0` [VERIFIED: `npm view firebase-admin version`] | Server-side FCM HTTP v1 + APNs send | Single SDK delivers both transports per D-04. `getMessaging().send()` and `.sendEachForMulticast()`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@capacitor/haptics` | `^8.0.2` [VERIFIED: `npm view`] | Native haptic feedback | Wire inside `useHapticFeedback` (replace `navigator.vibrate` when running in Capacitor; keep web fallback) |
| `@capacitor/status-bar` | `^8.0.2` [VERIFIED: `npm view`] | Status bar style + color | `StatusBar.setStyle({ style: 'DARK' })`, `setBackgroundColor({ color: '#0a0e1a' })` |
| `@capacitor/splash-screen` | `^8.0.1` [VERIFIED: `npm view`] | Native splash on launch | Theme `#0a0e1a`, `pwa-512x512.svg` logo, `launchShowDuration: 1000`, `launchAutoHide: true` |
| `@capacitor/app` | `^8.1.0` [VERIFIED: `npm view`] | Lifecycle (back-button, appStateChange) | Android hardware-back-button intercept, lifecycle notifications |
| `@capacitor/keyboard` | `^8.0.3` [VERIFIED: `npm view`] | Keyboard show/hide events + iOS keyboard-resize | Adjust feed bottom padding on iOS so virtual keyboard doesn't cover input |
| `@capacitor/preferences` | `^8.0.1` [VERIFIED: `npm view`] | Cross-platform key-value store (NSUserDefaults / SharedPreferences) | Stash non-secret per-device settings (e.g., "biometric enabled" flag, last-shown-permission-prompt timestamp). NOT for the JWT — that goes in the biometric-gated keychain. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@capgo/capacitor-native-biometric` (Q-01 pick) | `@aparajita/capacitor-biometric-auth@10.0.0` [VERIFIED: `npm view`] | Aparajita has stricter biometry-strength typing and arguably cleaner API but **NO built-in credential storage** — would need pairing with `capacitor-secure-storage-plugin` (extra dependency, more code surface). Pick Capgo. [CITED: capgo.app/blog and aparajita README, 2026-04] |
| `@capgo/capacitor-native-biometric` | `@capacitor-community/biometric-auth` | **Does not exist on npm registry** as of 2026-04-29 (`npm view` returns 404 for `@capacitor-community/biometric-auth`). The CONTEXT.md candidate name is stale; only `@capgo/...` and `@aparajita/...` are live. [VERIFIED: npm registry probe] |
| Capacitor 7.x | Capacitor 8.x (current pick) | Capacitor 7.6.2 is `latest-7` on npm, last patch 2026 timeframe. Capacitor 8 requires Node 22, Xcode 26, Android Studio Otter, SDK 36 — all available. **Capacitor 8 is mandatory** for `@capacitor/push-notifications@8.0.3` (peer `>=8`) and `@capgo/capacitor-native-biometric@8.4.2` (peer `>=8`). Going with 7.x means picking older biometric/push plugin majors. |
| Capacitor 6.x | Capacitor 8.x (current pick) | Capacitor 6.2.1 (`latest-6`) released ~2025, EOL approaching. iOS deployment target 13.0, no SPM iOS support — outdated for App Store submission targeting iOS 18+. Reject. |
| `firebase-admin` (D-04 lock) | OneSignal / Pusher Beams / native APNs HTTP/2 + native FCM HTTP v1 SDKs | D-04 already locks `firebase-admin`. The "single SDK both transports" property is the value: APNs key (`.p8`) is uploaded to Firebase project, then `firebase-admin.send({ token, ... })` routes by token type. No separate APNs HTTP/2 implementation needed. |
| `@capacitor/push-notifications` | `@capacitor-firebase/messaging` (community) | Official plugin is fine for our use case (single Firebase project, no analytics/in-app-messaging SDK pull-in). Community plugin would couple us to the broader Firebase JS SDK; not worth the size. |
| GitHub Actions + Fastlane (D-14 pick) | EAS Build / Capgo Cloud | EAS is Expo-managed; Capgo Cloud is a paid SaaS. GHA is free, repo-secret-driven, fits existing CI in `.github/workflows/`. See "Q-D-14: CI/CD pick" below. |
| Single-repo monorepo (D-03 lock) | Separate `newshub-mobile` repo | Locked: `apps/mobile/` is a workspace member. Pros: one PR for SPA-bundle change + mobile rebuild; one source of truth for types; one CI lane. Cons: longer clone for native devs, but `pnpm-workspace.yaml` filtering keeps it manageable. |

**Installation (run from repo root):**
```bash
# In apps/mobile/ workspace (created by Plan 1)
pnpm --filter @newshub/mobile add \
  @capacitor/core@^8.3.1 \
  @capacitor/cli@^8.3.1 \
  @capacitor/ios@^8.3.1 \
  @capacitor/android@^8.3.1 \
  @capacitor/push-notifications@^8.0.3 \
  @capacitor/haptics@^8.0.2 \
  @capacitor/status-bar@^8.0.2 \
  @capacitor/splash-screen@^8.0.1 \
  @capacitor/app@^8.1.0 \
  @capacitor/keyboard@^8.0.3 \
  @capacitor/preferences@^8.0.1 \
  @capgo/capacitor-native-biometric@^8.4.2

# In apps/web/ workspace (the SPA needs the bridge to call native plugins)
pnpm --filter @newshub/web add \
  @capacitor/core@^8.3.1 \
  @capacitor/push-notifications@^8.0.3 \
  @capacitor/haptics@^8.0.2 \
  @capacitor/status-bar@^8.0.2 \
  @capacitor/splash-screen@^8.0.1 \
  @capacitor/app@^8.1.0 \
  @capacitor/keyboard@^8.0.3 \
  @capgo/capacitor-native-biometric@^8.4.2

# Backend
pnpm --filter @newshub/web add firebase-admin@^13.8.0
```

**Version verification (probed 2026-04-29):**
- `@capacitor/core@8.3.1` — published 2026-04-29 [VERIFIED: `npm view @capacitor/core time.modified` = 2026-04-29T15:43:04Z]
- `@capacitor/push-notifications@8.0.3` — current [VERIFIED: `npm view`]
- `@capgo/capacitor-native-biometric@8.4.2` — published 2026-02-21 [VERIFIED: `npm view @capgo/capacitor-native-biometric time.modified`]
- `firebase-admin@13.8.0` — current [VERIFIED: `npm view`]
- `@aparajita/capacitor-biometric-auth@10.0.0` — published 2026-02-09 (alternative; NOT picked) [VERIFIED: `npm view`]

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │  apps/web/dist  (SPA build, ALREADY EXISTS)     │
                    │  - React 19 + Vite 8 + Zustand + TanStack       │
                    │  - vite-plugin-pwa SW with NetworkFirst /api/   │
                    │  - mobile components (BottomNav, MobileDrawer…) │
                    └────────┬────────────────────────┬───────────────┘
                             │ cap sync               │ vite dev/build
            ┌────────────────▼────────┐    ┌──────────▼────────────────┐
            │  apps/mobile/ios/       │    │  Browser PWA (existing)   │
            │  - Capacitor 8.3.1 iOS  │    │  - Web Push: NOT shipped  │
            │  - APNs entitlement     │    │  - Stripe Checkout shown  │
            │  - Bundle com.newshub.app│   └───────────────────────────┘
            └────────┬────────────────┘
                     │
            ┌────────▼────────────────┐
            │  apps/mobile/android/   │
            │  - Capacitor 8.3.1 Android │
            │  - google-services.json │
            │  - applicationId com.newshub.app │
            │  - POST_NOTIFICATIONS perm │
            └────────┬────────────────┘
                     │
            ┌────────▼─────────────────────────────────────────────────┐
            │  Native WebView (capacitor://localhost on iOS,           │
            │                  https://localhost on Android)           │
            │  Runs identical SPA bundle. Capacitor.getPlatform()      │
            │  → 'ios' | 'android' (D-08 reader-app gate seam)         │
            └────────┬───────────────────────────┬─────────────────────┘
                     │                           │
                     ▼                           ▼
            ┌─────────────────────┐    ┌──────────────────────────┐
            │ Biometric flow      │    │ Push notification flow   │
            │ (D-11)              │    │ (D-04, D-05, D-06, D-07) │
            │                     │    │                          │
            │ 1. First login →    │    │ 1. App start → register  │
            │    AuthContext.login│    │    (POST_NOTIFICATIONS   │
            │ 2. JWT stored in    │    │    perm on Android 13+,  │
            │    Keychain (iOS) / │    │    APNs auth on iOS)     │
            │    Keystore via     │    │ 2. token via 'registration'│
            │    @capgo plugin    │    │    listener              │
            │ 3. Subsequent launch│    │ 3. POST /api/push/subscribe│
            │    → Face ID prompt │    │    {platform,token}      │
            │ 4. JWT decrypted →  │    │ 4. Server stores in      │
            │    AuthContext      │    │    PushSubscription table│
            │ 5. /api/auth/me     │    └──────────┬───────────────┘
            └─────────────────────┘               │
                                                  ▼
            ┌─────────────────────────────────────────────────────────┐
            │  Backend: apps/web/server/                              │
            │                                                          │
            │  newsAggregator.ts:288 emitNewArticle(article)          │
            │  newsAggregator.ts:291 emitBreakingNews(article)        │
            │            │                                             │
            │            ▼                                             │
            │  notificationFanoutService.ts (NEW, singleton)          │
            │  ├── Trigger 1: region-match breaking (D-05)            │
            │  ├── Trigger 2: reading-history affinity (D-05+D-06)    │
            │  ├── Trigger 3: KeywordWatch (D-05+D-06)                │
            │  └── Trigger 4: daily digest cron (D-05+D-06)           │
            │            │                                             │
            │  Per-recipient gates:                                    │
            │    • subscriptionTier check (D-06)                      │
            │    • Redis volume counter push:count:{userId}:{YYYY-MM-DD}│
            │      ≤ 5 (FREE) / ≤ 10 (PREMIUM)  (D-07)                │
            │    • Redis dedup SET push:sent:{userId}:{articleId}     │
            │      7-day TTL  (D-07)                                  │
            │    • Quiet-hours window check (User.timezone, D-07)     │
            │            │                                             │
            │            ▼                                             │
            │  pushService.ts (NEW, singleton, wraps firebase-admin)  │
            │    getMessaging().sendEachForMulticast({ tokens, … })   │
            │    └── On error.code == 'messaging/registration-token-not-registered' │
            │        OR 'messaging/invalid-registration-token':       │
            │        DELETE PushSubscription row (token cleanup)      │
            └────────────────┬───────────┬────────────────────────────┘
                             │           │
                             ▼           ▼
                       ┌──────────┐  ┌──────────┐
                       │   APNs   │  │   FCM    │
                       │ (iOS)    │  │ (Android)│
                       └─────┬────┘  └────┬─────┘
                             │            │
                             ▼            ▼
                       Device notification tray
                       → tap → pushNotificationActionPerformed listener
                       → navigate(`/article/${data.articleId}`)
                         OR `/feed?keyword=${data.keyword}`
                         depending on data.triggerKind
```

### Recommended Project Structure

```
NewsHub/
├── apps/
│   ├── web/                          # UNCHANGED — Capacitor consumes its build output
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── platform.ts       # NEW (D-08 seam): isNativeApp() / getPlatform()
│   │   │   ├── hooks/
│   │   │   │   ├── useHapticFeedback.ts  # MODIFIED: try @capacitor/haptics first
│   │   │   │   ├── useInstallPrompt.ts   # MODIFIED: short-circuit when isNativeApp()
│   │   │   │   ├── useBiometricAuth.ts   # NEW: wraps @capgo plugin + AuthContext
│   │   │   │   └── usePushNotifications.ts # NEW: register + listener wiring
│   │   │   ├── components/
│   │   │   │   ├── OfflineBanner.tsx           # NEW (D-12)
│   │   │   │   ├── settings/
│   │   │   │   │   └── NotificationsSection.tsx # NEW (Q-05): in SettingsPage
│   │   │   │   ├── subscription/
│   │   │   │   │   ├── TierCard.tsx            # MODIFIED (D-08 gate)
│   │   │   │   │   ├── UpgradePrompt.tsx       # MODIFIED (D-08, D-09)
│   │   │   │   │   └── AIUsageCounter.tsx      # MODIFIED (D-08, D-09)
│   │   │   │   └── InstallPromptBanner.tsx     # MODIFIED (early-return on native)
│   │   │   └── contexts/
│   │   │       └── AuthContext.tsx              # MODIFIED: hooks biometric save/restore
│   │   ├── server/
│   │   │   ├── services/
│   │   │   │   ├── pushService.ts               # NEW (singleton, firebase-admin wrap)
│   │   │   │   ├── notificationFanoutService.ts # NEW (singleton, trigger orchestration)
│   │   │   │   ├── digestSchedulerService.ts    # NEW (cron for D-05 trigger 4)
│   │   │   │   ├── newsAggregator.ts            # MODIFIED: hooks fanout on emit
│   │   │   │   └── cleanupService.ts            # MODIFIED: prune stale PushSubscription
│   │   │   ├── routes/
│   │   │   │   ├── push.ts                      # NEW: /api/push/{subscribe,unsubscribe}
│   │   │   │   ├── keywordWatch.ts              # NEW: /api/keyword-watch/* (D-05)
│   │   │   │   └── notifications.ts             # NEW: /api/notifications/preferences
│   │   │   ├── openapi/
│   │   │   │   └── schemas.ts                   # MODIFIED: add Zod schemas for new routes
│   │   │   └── middleware/
│   │   │       └── pushVolumeLimiter.ts         # NEW (mirrors aiTierLimiter pattern)
│   │   └── prisma/
│   │       └── schema.prisma                    # MODIFIED: add PushSubscription, KeywordWatch, NotificationPreference
│   └── mobile/                       # NEW WORKSPACE (D-03)
│       ├── package.json              # name: @newshub/mobile
│       ├── capacitor.config.ts       # appId: com.newshub.app, webDir: ../web/dist
│       ├── android/                  # generated by `cap add android`
│       │   ├── app/
│       │   │   ├── google-services.json   # MANUAL: dropped in by user from Firebase Console
│       │   │   └── src/main/AndroidManifest.xml
│       │   └── build.gradle
│       └── ios/                      # generated by `cap add ios`
│           ├── App/
│           │   ├── App/
│           │   │   ├── GoogleService-Info.plist  # MANUAL: from Firebase Console
│           │   │   └── App.entitlements          # aps-environment
│           │   └── Podfile (or Package.swift)    # SPM in Capacitor 8
│           └── fastlane/
│               ├── Fastfile          # match + TestFlight upload lanes
│               └── Matchfile
└── .github/workflows/
    ├── ci.yml                        # UNCHANGED
    ├── mobile-ios.yml                # NEW: macos-latest + Fastlane match + TestFlight
    └── mobile-android.yml            # NEW: ubuntu-latest + keystore from secret + Play Console
```

### Pattern 1: Platform Detection Seam (D-08, D-09)

**What:** Single helper that all pricing-related components import. Single change point if detection logic ever evolves.

**When to use:** Anywhere the UI must differ between web and Capacitor wrapper.

**Example:**
```typescript
// apps/web/src/lib/platform.ts (NEW)
import { Capacitor } from '@capacitor/core';

export type NativePlatform = 'ios' | 'android' | 'web';

export function getPlatform(): NativePlatform {
  // Capacitor.getPlatform() returns 'ios' | 'android' | 'web' at runtime.
  // In SSR we'd need to guard, but NewsHub ships a pure SPA — this runs client-side only.
  return Capacitor.getPlatform() as NativePlatform;
}

export function isNativeApp(): boolean {
  const p = getPlatform();
  return p === 'ios' || p === 'android';
}
```

```typescript
// apps/web/src/components/subscription/UpgradePrompt.tsx (MODIFIED)
import { isNativeApp } from '../../lib/platform';

// ... existing component body ...
// Before navigate('/pricing') call sites, branch:
if (isNativeApp()) {
  // D-09: generic "feature not available" message
  return (
    <div className="...">
      <p>{t('upgrade.notAvailableOnPlan')}</p>
      <p className="text-gray-400">
        {t('upgrade.visitWebsiteHint', { domain: 'newshub.example' })}
      </p>
      {/* NOTE: 'newshub.example' renders as plain TEXT — no <a href>, no clickable link.
          Apple Rule 3.1.1(a) treats clickable purchase-flow links as IAP-circumvention. */}
    </div>
  );
}
// existing browser CTA continues below
```
[Source: Capacitor docs https://capacitorjs.com/docs/core-apis/web (Capacitor.getPlatform); Apple Reader-App Exemption https://developer.apple.com/support/reader-apps/]

### Pattern 2: Biometric Hand-Off into AuthContext (D-11, Q-01, Q-02)

**What:** Capgo plugin's `setCredentials` writes JWT to iOS Keychain (Secure Enclave) / Android Keystore. `getCredentials` requires biometric prompt to decrypt.

**When to use:** Once at first-login (`setCredentials`); on every subsequent app open before SPA mount (`getCredentials` → AuthContext.loginWithOAuth-equivalent).

**Example:**
```typescript
// apps/web/src/hooks/useBiometricAuth.ts (NEW)
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { isNativeApp } from '../lib/platform';

const BIO_SERVER = 'newshub-jwt';

export async function persistJwtBehindBiometric(jwt: string, userId: string) {
  if (!isNativeApp()) return;  // web: no-op
  const { isAvailable } = await NativeBiometric.isAvailable();
  if (!isAvailable) return;     // device has no enrolled biometric
  await NativeBiometric.setCredentials({
    username: userId,
    password: jwt,
    server: BIO_SERVER,
  });
}

export async function unlockJwtWithBiometric(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Use Face ID to sign in to NewsHub',
      title: 'Sign in',
      negativeButtonText: 'Use password',  // Android 3-fail fallback per D-11
    });
    const creds = await NativeBiometric.getCredentials({ server: BIO_SERVER });
    return creds.password;  // = the JWT
  } catch {
    return null;  // 3 fails → fall through to password
  }
}

export async function clearBiometricJwt() {
  if (!isNativeApp()) return;
  await NativeBiometric.deleteCredentials({ server: BIO_SERVER }).catch(() => {});
}
```

`AuthContext.login` calls `persistJwtBehindBiometric(jwt, userId)` after a successful password login. App-bootstrap reads the JWT via `unlockJwtWithBiometric()` before falling through to the existing `verifyToken` path.
[Source: capgo docs https://capgo.app/plugins/capacitor-native-biometric/ + npm README]

### Pattern 3: Push Fanout with `firebase-admin` (D-04, D-05, D-07, Q-03)

**What:** Single backend SDK delivers FCM (Android) and APNs (iOS). Token-type routing happens automatically — same `messaging.send({token, …})` call.

**When to use:** Every time `notificationFanoutService` decides a user should receive a push.

**Example:**
```typescript
// apps/web/server/services/pushService.ts (NEW)
import * as admin from 'firebase-admin';
import { prisma } from '../db/prisma';

const TOKEN_DEAD_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',  // catch INVALID_ARGUMENT per FCM HTTP v1
]);

export class PushService {
  private static instance: PushService;
  private app: admin.app.App;

  private constructor() {
    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  static getInstance() { /* ... singleton ... */ }

  async sendToTokens(tokens: string[], payload: Q03Payload) {
    if (tokens.length === 0) return;
    // Note: sendEachForMulticast caps at 500 tokens per call; chunk if needed.
    // GOAWAY HTTP/2 issues reported above ~214 tokens — chunk to 200.
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 200) chunks.push(tokens.slice(i, i + 200));

    for (const chunk of chunks) {
      const res = await admin.messaging(this.app).sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body },
        data: {
          articleId: payload.articleId ?? '',
          deeplink: payload.deeplink,
          triggerKind: payload.triggerKind,
        },
        apns: {
          payload: {
            aps: { sound: 'default', 'mutable-content': 1, category: payload.triggerKind },
          },
        },
        android: {
          priority: 'high',
          notification: { channelId: 'breaking' },
        },
      });

      // Token cleanup: delete dead tokens from PushSubscription
      const dead: string[] = [];
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error && TOKEN_DEAD_CODES.has(r.error.code)) {
          dead.push(chunk[idx]);
        }
      });
      if (dead.length) {
        await prisma.pushSubscription.deleteMany({ where: { token: { in: dead } } });
      }
    }
  }
}
```
[Source: firebase.google.com/docs/cloud-messaging/send/admin-sdk + firebase.google.com/docs/cloud-messaging/error-codes; GitHub issue #2943 for HTTP/2 GOAWAY chunking]

### Anti-Patterns to Avoid

- **DO NOT** use `Capacitor.getPlatform() !== 'web'` everywhere — it's a magic string scattered through the codebase. Use `isNativeApp()` from `apps/web/src/lib/platform.ts` (D-08 single seam).
- **DO NOT** clickable-link the website URL on iOS in D-09 messaging. Apple Rule 3.1.1(a) treats clickable links to purchase flows as IAP circumvention. Plain text only.
- **DO NOT** store JWT in `localStorage` on iOS/Android once biometric is set up. Capacitor's WebView storage IS persisted (it's not the wild west of Safari ITP) but biometric unlock is the whole point of D-11 — bypassing it via `localStorage` defeats the user's expectation of "Face ID protects my account."
- **DO NOT** ship Web Push (VAPID) — D-04 explicitly excludes it.
- **DO NOT** call `firebase-admin` from the client SDK. The Admin SDK requires a service-account private key and must run only in `apps/web/server/`.
- **DO NOT** put the offline banner above z-100 — it would cover ConsentBanner. `z-30` is correct.
- **DO NOT** trust the client to enforce volume caps or quiet hours. All gating per D-06/D-07 happens server-side in `notificationFanoutService`.
- **DO NOT** set `iosScheme: 'http'` in `capacitor.config.ts` — WKWebView reserves http/https. Use the default `capacitor://localhost` on iOS, default `https://localhost` on Android.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS Keychain / Android Keystore I/O | Custom NSKeychain wrapper or Bridge plugin | `@capgo/capacitor-native-biometric` | Plugin handles per-OS quirks (iCloud-keychain-sync flag, KeyStore alias rotation, biometric-strong vs weak gating). Hand-rolling means writing Swift+Kotlin native code that the project's pure-TypeScript surface avoids. |
| FCM HTTP v1 + APNs HTTP/2 send | Direct fetch to FCM/APNs endpoints | `firebase-admin` `getMessaging().sendEachForMulticast()` | One SDK. Token routing automatic. Built-in JWT signing for FCM, APNs auth-key handling, retry logic, error-code surfacing. Hand-rolling needs OAuth2 token mint, HTTP/2 stream management, and APNs error-payload parsing. |
| iOS `aps-environment` toggle | Manual `.entitlements` editing | Capacitor `cap sync` + Xcode capability auto-add | `cap sync` regenerates the entitlements file when push plugin is present. |
| Android FCM SDK init | Manual `FirebaseApp.initializeApp` in MainActivity.kt | `@capacitor/push-notifications` plugin auto-init | Plugin's `Plugin.load()` handles SDK init from `google-services.json`. |
| Push payload schema versioning | Custom envelope inside `data` | Plain flat keys with `triggerKind` discriminator (Q-03) | FCM/APNs `data` is `Map<String,String>` — no nested objects allowed. Stick to flat keys. |
| Quiet-hours timezone math | Custom DST handling | `date-fns-tz` (or built-in `Intl.DateTimeFormat` with timeZone option) | `User.timezone` is a IANA TZ string. Don't reinvent DST. |
| iOS code-signing | Manual Xcode certificate dance per release | Fastlane `match` | `match` stores certificates encrypted in a private git repo, syncs to CI via deploy key. Solo-dev's biggest CI papercut is signing certs expiring; `match` autorenews. |
| Android keystore in CI | Plaintext keystore in repo | Repo secret as base64-encoded `.jks` + decode step in workflow | Secret-based keystore is the standard pattern; no extra tool needed. |

**Key insight:** Capacitor itself is the "don't hand-roll" answer to native packaging. The plugins listed above each solve a problem that would otherwise require Swift+Kotlin code in a TypeScript-first codebase.

## Runtime State Inventory

> Phase 39 introduces NEW runtime state but does not rename existing state. Items below are mostly forward-looking for the planner.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | NEW Prisma tables: `PushSubscription`, `KeywordWatch`, `NotificationPreference`. NEW `User` columns optional (`notificationsEnabled: Boolean`, `quietHoursStart: String?`, `quietHoursEnd: String?`, but quiet hours can also live in `NotificationPreference`). | Plan a `prisma migrate dev` migration; never use `--accept-data-loss` against prod. |
| Live service config | Firebase Console (project, APNs `.p8` upload, FCM server key). Apple Developer Portal (App ID, push capability, provisioning profiles). Google Play Console (app listing, signing config). All live OUTSIDE git. | Document as prerequisite operational items — D-15 already calls this "user owns these." Plans should reference STATE.md "Mobile-store credentials provisioning" thread. |
| OS-registered state | iOS APNs device tokens (re-issued on app reinstall). Android FCM tokens (re-issued on app reinstall + Google Play services update). Both end up in `PushSubscription.token`. Stale tokens cleaned via `cleanupService` 90-day pattern + per-send dead-code cleanup in `pushService`. | None at phase rollout — handled at runtime. |
| Secrets/env vars | NEW: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service-account JSON fields). For mobile CI: `MATCH_PASSWORD`, `MATCH_GIT_URL`, `APP_STORE_CONNECT_API_KEY` (iOS), `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_PLAY_JSON_KEY`. | Add to `.env.example`. CI secrets configured in repo Settings → Secrets and variables → Actions. |
| Build artifacts / installed packages | `apps/mobile/android/build/` (gradle output), `apps/mobile/ios/App/build/` (Xcode output), generated `.ipa` and `.aab` files. Capacitor regenerates `apps/mobile/{ios,android}/app/src/main/assets/` on every `cap sync`. | `.gitignore` additions: `apps/mobile/android/app/build/`, `apps/mobile/ios/App/build/`, `apps/mobile/android/.gradle/`, etc. The native project files themselves (Xcode project, gradle wrapper) ARE committed. |

**Nothing found in category:** OS-registered state at the host machine level — N/A (this is a mobile target, not a desktop daemon).

## Common Pitfalls

### Pitfall 1: CORS breaks on Android because origin is `https://localhost`
**What goes wrong:** Backend CORS allowlist is configured for `https://newshub.example` (production) and `http://localhost:5173` (dev). Capacitor Android WebView serves the SPA from `https://localhost` — the backend rejects fetches with CORS error. iOS works because `capacitor://localhost` is treated as an opaque origin and bypasses CORS for same-domain.
**Why it happens:** Android scheme is `https` (not custom), so it triggers full CORS preflight; iOS scheme is `capacitor` (custom) so the WebView treats it differently.
**How to avoid:** Add `https://localhost` and `capacitor://localhost` to the backend's CORS `origin` list. Alternatively, use `CapacitorHttp` plugin to bypass WebView XHR/fetch entirely (native HTTP, no CORS). Recommended: the CORS allowlist approach — keeps the SPA fetch code path uniform across web and mobile.
**Warning signs:** "blocked by CORS policy: No 'Access-Control-Allow-Origin' header" in Android logcat; works on iOS but not Android.
[CITED: github.com/ionic-team/capacitor/issues/6936]

### Pitfall 2: Push notifications work on dev but not production
**What goes wrong:** APNs has separate `aps-environment` values: `development` (sandbox) and `production`. TestFlight builds use production APNs but development provisioning profile = silently dropped notifications.
**Why it happens:** The entitlement value defaults based on build configuration (Debug vs Release), but Firebase routes based on which APNs server it last saw the token from.
**How to avoid:** Ensure `aps-environment: production` in `App.entitlements` for Release builds. Test via TestFlight + Firebase Console "Test" send tool. Don't rely on `xcode build` Debug for push verification.
**Warning signs:** Notifications work in Xcode-attached debug builds but fail on TestFlight.

### Pitfall 3: Android 13+ silent permission denial
**What goes wrong:** App calls `PushNotifications.register()` directly, gets a token, but the device never shows notifications because `POST_NOTIFICATIONS` permission was never granted (Android 13 introduced runtime permission gate).
**Why it happens:** Plugin's `register()` does not auto-request `POST_NOTIFICATIONS` — caller must invoke `requestPermissions()` first.
**How to avoid:** Always call `checkPermissions()` → `requestPermissions()` → `register()` in that order. The pattern in the official Capacitor docs is correct (shown in Pattern 3 above).
**Warning signs:** Token is acquired and stored server-side, server-side `firebase-admin.send()` reports success, but device tray stays empty.
[CITED: capacitorjs.com/docs/apis/push-notifications]

### Pitfall 4: FCM token cleanup never runs
**What goes wrong:** Users uninstall the app, FCM invalidates the token, but `PushSubscription.token` rows accumulate forever. Each fanout-job send hits unregistered tokens, wasting Firebase quota and showing inflated subscriber counts in admin metrics.
**Why it happens:** Forgetting that `firebase-admin.sendEachForMulticast()` returns per-token results that include error codes — `messaging/registration-token-not-registered` and `messaging/invalid-registration-token` mean "delete this token now."
**How to avoid:** Pattern 3 above shows the cleanup logic. Also have `cleanupService.ts` prune `PushSubscription` rows where `lastSeenAt > 90 days` (matches existing 90d ShareClick retention).
**Warning signs:** Firebase dashboard "Failure rate" trending up week over week.
[CITED: firebase.google.com/docs/cloud-messaging/manage-tokens]

### Pitfall 5: iCloud Keychain syncs the JWT across the user's other devices
**What goes wrong:** User signs in on iPhone, biometric flow stores JWT in Keychain, iCloud Keychain syncs the entry to their Mac/iPad — the same JWT is now usable on three devices, but `tokenVersion` and biometric prompts only protect the original device.
**Why it happens:** iOS Keychain entries default to `kSecAttrSynchronizable: true` unless the app sets `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`.
**How to avoid:** `@capgo/capacitor-native-biometric` documents an option to mark credentials as device-only (verify in plugin docs at planning time). If the plugin doesn't expose this knob, file an upstream issue or use `capacitor-secure-storage-plugin`'s `accessibility: 'whenPasscodeSetThisDeviceOnly'`. Worst case, a thin Swift bridge.
**Warning signs:** "I logged in on my iPhone but my iPad opened straight to the feed" — the JWT shouldn't have moved.
[ASSUMED: cross-device sync defaults are an iOS-platform behavior; specific Capgo plugin knob needs validation during planning. Confidence LOW on the exact API surface.]

### Pitfall 6: Splash screen sticks because the SPA bundle is large
**What goes wrong:** `@capacitor/splash-screen` auto-hides only if the splash plugin's `launchAutoHide: true` (default) AND the WebView's `DOMContentLoaded` fires within the `launchShowDuration` (default 500ms). NewsHub's bundle is ~250KB initial JS — DOMContentLoaded happens fast, but if launchShowDuration is too short, splash flickers.
**Why it happens:** Wrong tuning of `launchShowDuration` vs SPA mount time.
**How to avoid:** Set `launchShowDuration: 1000`, `launchAutoHide: false`, and call `SplashScreen.hide()` from React after first paint (e.g., in `App.tsx` `useEffect(() => { SplashScreen.hide(); }, [])`). This guarantees the splash hides only once React has rendered.

### Pitfall 7: Reader-app review rejection due to "feature parity advertising"
**What goes wrong:** App Review sees the FREE-tier 429 error pop a Toast saying "Upgrade to Premium for unlimited AI" — even without a clickable link, the **mention of "Premium" + the upsell tone** triggers Apple Rule 3.1.1.
**Why it happens:** The reader-app exemption is narrow: "go to example.com to create or manage your account" is allowed, but "upgrade to unlock features" wording is borderline.
**How to avoid:** D-09's exact wording — *"This feature is not available on your current plan. Visit newshub.example from your browser to learn more."* — is intentionally generic. NO mention of "Premium" / "Pro" / "Upgrade" / "Subscribe" in mobile copy. The user clicking through to the website discovers the tier name there.
**Warning signs:** Review feedback citing "guideline 3.1.1 — In-App Purchase" — that's IAP-circumvention territory.
[CITED: developer.apple.com/support/reader-apps/]

## Code Examples

### Capacitor 8 config

```typescript
// apps/mobile/capacitor.config.ts (NEW)
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newshub.app',                  // D-15
  appName: 'NewsHub',
  webDir: '../web/dist',                      // D-03: consume sibling workspace's build
  server: {
    androidScheme: 'https',                   // default; produces https://localhost on Android
    // iosScheme defaults to 'capacitor' → capacitor://localhost; do NOT change
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: false,                  // hide manually after React mounts (Pitfall 6)
      backgroundColor: '#0a0e1a',             // matches PWA manifest
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',                          // dark cyber theme
      backgroundColor: '#0a0e1a',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'native',                       // iOS keyboard resize behavior
      style: 'DARK',
    },
  },
};

export default config;
```
[Source: capacitorjs.com/docs/config (Capacitor 8)]

### App-bootstrap biometric unlock

```typescript
// apps/web/src/main.tsx — additions before ReactDOM.render
import { isNativeApp } from './lib/platform';
import { unlockJwtWithBiometric } from './hooks/useBiometricAuth';

async function bootstrap() {
  if (isNativeApp()) {
    const jwt = await unlockJwtWithBiometric();
    if (jwt) {
      localStorage.setItem('newshub-auth-token', jwt);
      // AuthContext's mount-time verifyToken effect will pick it up.
    }
  }
  // ... existing render call ...
}
bootstrap();
```

### Push registration on app start

```typescript
// apps/web/src/hooks/usePushNotifications.ts (NEW)
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { isNativeApp } from '../lib/platform';

export function usePushNotifications() {
  const { token: jwt, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || !isAuthenticated || !jwt) return;

    const init = async () => {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== 'granted') return;
      await PushNotifications.register();
    };

    const cleanups: Array<() => void> = [];
    PushNotifications.addListener('registration', async (t) => {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ platform: Capacitor.getPlatform(), token: t.value }),
      });
    }).then(h => cleanups.push(() => h.remove()));

    PushNotifications.addListener('pushNotificationActionPerformed', (n) => {
      const articleId = n.notification.data?.articleId;
      if (articleId) window.location.href = `/article/${articleId}`;
    }).then(h => cleanups.push(() => h.remove()));

    init();

    return () => cleanups.forEach(c => c());
  }, [jwt, isAuthenticated]);
}
```
[Source: capacitorjs.com/docs/apis/push-notifications]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cordova / PhoneGap wrappers | Capacitor 8 | 2026 (Cordova archived 2024) | Plain Capacitor — no Cordova plugin compat layer needed |
| FCM HTTP legacy API | FCM HTTP v1 API | Legacy deprecated 2024, removed 2024 | Use `firebase-admin@13` which speaks HTTP v1 only — older `firebase-admin@<11` no longer works. |
| iOS Keychain-only biometric | TouchID + FaceID + Optic ID (Vision Pro) unified by `LAContext` | iOS 17+ | Plugin abstracts; we don't ship Vision Pro this phase. |
| Capacitor 6 deployment target iOS 13 | Capacitor 8 deployment target iOS 15 | Capacitor 8 release | Lose ~2% of installed iOS base (iOS 13/14 users). Acceptable. |
| Cordova-style `cordova plugin add` | npm-installed Capacitor plugins | Capacitor 1.0 (2019) | Plugins live in `package.json`, version-pinnable. |
| iOS APNs HTTP/2 hand-rolled | `firebase-admin` `apns` channel | Always (since SDK launch) | No reason to hand-roll APNs HTTP/2. |
| Apple IAP for digital goods | Reader-app exemption (where eligible) | App Store guidelines 3.1.3(a) (2022 update) + 2025 US-storefront external link rules | NewsHub qualifies as a reader app (news content) — no IAP required this phase per D-10. |
| In-app payment buttons that go to web | Plain-text URL only on iOS | Apple Rule 3.1.1(a) | D-09 codifies plain-text rendering. |

**Deprecated/outdated:**
- **Capacitor 5 and earlier**: EOL. Plugins stop receiving updates 12 months after a new major. Capacitor 5 (released ~2023) is firmly EOL by 2026-04.
- **`@capacitor-community/biometric-auth`**: NOT on npm registry as of 2026-04-29. CONTEXT.md's mention is stale; only `@capgo/...` and `@aparajita/...` are live.
- **Web Push (VAPID) for cross-platform parity**: D-04 explicitly excludes. iOS Safari PWA push remains flaky; supporting it doubles backend code paths.

## Q-01: Biometric Plugin Pick

**Pick: `@capgo/capacitor-native-biometric@^8.4.2`**

**Reasoning (date-stamped 2026-04-29):**

| Criterion | `@capgo/capacitor-native-biometric@8.4.2` | `@aparajita/capacitor-biometric-auth@10.0.0` | `@capacitor-community/biometric-auth` |
|-----------|-------------------------------------------|---------------------------------------------|---------------------------------------|
| Capacitor 8 compat | ✓ peer `@capacitor/core@>=8.0.0` | ✓ peer `@capacitor/core@>=8.0.0` (description: "Capacitor 7+") | **NOT ON NPM** [VERIFIED: `npm view` returns 404] |
| TypeScript types | ✓ shipped with package | ✓ shipped with package | N/A |
| Last release | 2026-02-21 [VERIFIED: `npm view time.modified`] | 2026-02-09 [VERIFIED: `npm view time.modified`] | N/A |
| Maintenance | Single maintainer (`riderx`); active Capgo company; commercial backing | Single maintainer (Aparajita Sinha); pure OSS | N/A |
| iOS Keychain wrapper built-in | ✓ `setCredentials` / `getCredentials` / `deleteCredentials` | ✗ — pair with `capacitor-secure-storage-plugin` | N/A |
| Android Keystore wrapper built-in | ✓ via BiometricPrompt + CryptoObject | ✗ — pair with secure-storage plugin | N/A |
| Bundle size delta (estimate) | small (single plugin) | small + secure-storage plugin = larger | N/A |
| iOS/Android keychain feature parity | ✓ (Capgo's main selling point) | partial (delegated to companion plugin) | N/A |
| Strong-vs-weak biometry distinction | implicit (BiometricPrompt) | explicit (`isAvailable` / `strongBiometryIsAvailable`) | N/A |

**Decision:** Capgo wins on the "single dependency for D-11" axis. We don't need fine-grained strong-vs-weak biometry distinction — D-11 says "biometric replaces password", which BiometricPrompt's default constraints satisfy. The built-in credential storage means **we close Q-02 by adopting Capgo (no separate secure-storage plugin needed)**.

**Risk:** Capgo plugin is maintained by a commercial entity (capgo.app) — if they pivot, we'd need to swap. Mitigation: the plugin's API surface we use (`isAvailable`, `verifyIdentity`, `setCredentials`, `getCredentials`, `deleteCredentials`) is a well-known shape; replacing with `aparajita + capacitor-secure-storage-plugin` is a 1-day migration if needed.

[Source: npmjs.com/package/@capgo/capacitor-native-biometric (verified 2026-04-29); github.com/aparajita/capacitor-biometric-auth (verified 2026-04-29); capgo.app/blog/biometric-authentication-in-capacitor-apps]

## Q-02: Secure-Storage Plugin Pairing

**Pick: NONE — `@capgo/capacitor-native-biometric` ships its own keychain/keystore wrapper.**

**Reasoning (date-stamped 2026-04-29):** Q-01's pick of Capgo subsumes Q-02. Capgo's `setCredentials`/`getCredentials` writes to iOS Keychain (Secure Enclave-backed when available) and Android Keystore. The biometric prompt is required to decrypt — exactly what D-11 calls for.

**If we had picked `@aparajita/capacitor-biometric-auth` instead:** the pairing would be `capacitor-secure-storage-plugin@^0.13.0` (peer `@capacitor/core@>=8`, last released 2026-01-10). Aparajita's plugin only handles biometric prompt — actual storage would go through this companion plugin.

**Open question for the planner:** verify Capgo's plugin exposes a `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`-equivalent option to prevent iCloud Keychain sync (Pitfall 5). If not, this affects Q-02 and we may need to swap to `aparajita + capacitor-secure-storage-plugin`. **Recommended action during /gsd-plan-phase:** plan a 30-min spike task that reads the Capgo plugin's iOS source to confirm the device-only flag is set or settable.

[ASSUMED: cross-device sync flag exposure; needs validation. Confidence MEDIUM.]

## Q-03: Push Payload Schema

**Lock the following schema for FCM/APNs payloads (TypeScript types + concrete JSON examples).**

```typescript
// packages/types/src/push.ts (NEW shared type)
export type PushTriggerKind = 'breaking' | 'affinity' | 'keyword' | 'digest';

export interface PushPayload {
  // Visible in tray
  title: string;          // localized: "Breaking: Major Earthquake in Turkey"
  body: string;           // localized: "Magnitude 7.2 reported near Ankara — 3 hours ago"

  // Routing data — flat (FCM/APNs `data` is Map<String,String>, no nested objects)
  articleId?: string;     // present for triggers 1, 2, 3 (breaking/affinity/keyword)
  deeplink: string;       // e.g., "/article/abc123" or "/digest/2026-04-29"
  triggerKind: PushTriggerKind;
  keyword?: string;       // present only when triggerKind === 'keyword'
  region?: string;        // present only when triggerKind === 'breaking'
  digestDate?: string;    // ISO-8601 date, present only when triggerKind === 'digest'
  locale: 'de' | 'en' | 'fr';  // mirrors user preference
}
```

### Concrete examples

**Trigger 1 — Region-match breaking news (notification + data):**
```json
{
  "message": {
    "token": "<FCM_OR_APNS_TOKEN>",
    "notification": {
      "title": "Breaking: Earthquake in Turkey",
      "body": "Magnitude 7.2 near Ankara — sources confirming"
    },
    "data": {
      "articleId": "art_2YxK3gA8Bn",
      "deeplink": "/article/art_2YxK3gA8Bn",
      "triggerKind": "breaking",
      "region": "tuerkei",
      "locale": "de"
    },
    "apns": {
      "payload": {
        "aps": { "sound": "default", "mutable-content": 1, "category": "breaking" }
      }
    },
    "android": {
      "priority": "high",
      "notification": { "channelId": "breaking" }
    }
  }
}
```

**Trigger 2 — Affinity (notification + data):**
```json
{
  "message": {
    "token": "<TOKEN>",
    "notification": {
      "title": "New: Article on AI Regulation in EU",
      "body": "Matches your reading interest in 'EU policy'"
    },
    "data": {
      "articleId": "art_5cMmXQ19f0",
      "deeplink": "/article/art_5cMmXQ19f0",
      "triggerKind": "affinity",
      "locale": "en"
    }
  }
}
```

**Trigger 3 — Keyword watch (notification + data):**
```json
{
  "message": {
    "token": "<TOKEN>",
    "notification": {
      "title": "Watch: 'OpenAI'",
      "body": "OpenAI announces new model — Reuters"
    },
    "data": {
      "articleId": "art_9TBlk22n4z",
      "deeplink": "/feed?keyword=OpenAI",
      "triggerKind": "keyword",
      "keyword": "OpenAI",
      "locale": "en"
    }
  }
}
```

**Trigger 4 — Daily digest (notification + data):**
```json
{
  "message": {
    "token": "<TOKEN>",
    "notification": {
      "title": "Your Daily NewsHub Digest",
      "body": "12 articles across 5 regions"
    },
    "data": {
      "deeplink": "/digest/2026-04-29",
      "triggerKind": "digest",
      "digestDate": "2026-04-29",
      "locale": "fr"
    }
  }
}
```

**Data-only / silent (NOT shipped this phase):** D-04 + Pitfall: iOS silent notifications (`content-available: 1` without alert) require special entitlement and don't fire `pushNotificationReceived` reliably on Capacitor — skip silent payloads entirely. All four triggers ship as visible (notification + data combo).

**Channel naming (Android):** Use channel IDs `breaking`, `personalized`, `digest`. Create channels in app boot via `PushNotifications.createChannel(...)`. Importance: `breaking` = HIGH (4), `personalized` and `digest` = DEFAULT (3).

[Source: firebase.google.com/docs/cloud-messaging/ios/receive (FCM-on-iOS payload anatomy); developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html]

## Q-04: Capacitor Major Version Pick

**Pick: Capacitor 8.x (specifically `^8.3.1` at planning time).**

**Reasoning (date-stamped 2026-04-29):**

CONTEXT.md framed Q-04 as "6.x vs 7.x". This was already stale at the time CONTEXT was gathered: as of 2026-04-29, npm dist-tags show `latest = 8.3.1`, `latest-7 = 7.6.2`, `latest-6 = 6.2.1` [VERIFIED: `npm view @capacitor/core dist-tags`].

| Criterion | Capacitor 6.x | Capacitor 7.x | Capacitor 8.x (PICK) |
|-----------|--------------|---------------|---------------------|
| Status | `latest-6` (legacy) | `latest-7` (n-1) | `latest` |
| iOS deployment target | 13.0 | 14.0 | 15.0 |
| Android SDK target | 34 | 35 | 36 |
| Node version required | 18+ | 20+ | **22+** [VERIFIED: `engines: {node: ">=22.0.0"}`] |
| Xcode version required | 15+ | 16+ | **26+** |
| Android Studio | Iguana+ | Koala+ | Otter (2025.2.1+) |
| iOS native deps | CocoaPods | CocoaPods | **SPM** (Swift Package Manager) [CITED: capacitorjs.com/docs/updating/8-0] |
| Edge-to-Edge mandatory? | no | optional | **yes** |
| Plugin ecosystem maturity | mature but EOL approaching | mature | active; community plugins migrating |
| `@capacitor/push-notifications` peer | `@capacitor/core@>=6` | `@capacitor/core@>=7` | `@capacitor/core@>=8` (only 8.0.x exists) |
| `@capgo/capacitor-native-biometric` peer | `>=6` (older majors) | `>=7` | `>=8.0.0` (current 8.4.2 supports) |

**Why 8.x over 7.x:**
1. Both target plugins (`@capacitor/push-notifications`, `@capgo/capacitor-native-biometric`) ship Capacitor 8-targeted versions; using 7.x means picking older plugin majors.
2. iOS 15+ minimum is fine (covers 99%+ of installed base in 2026).
3. SPM iOS support reduces native build flakiness vs CocoaPods.
4. Edge-to-Edge enforcement aligns with NewsHub's existing safe-area-inset CSS (Phase 24).
5. Xcode 26 is the only Xcode that submits to App Store Connect as of 2026-04 (Apple typically requires latest-1 within 6 months of release).
6. Solo-dev + balanced model_profile = stay on `latest`, not `latest-7`. Less context-switching; security patches go to `latest`.

**Why NOT 9.0 nightlies:** They exist (`9.0.0-dev-20260319` etc.) but no stable 9.x. Don't ship pre-release.

**Migration impact for our codebase:** This is a greenfield mobile workspace — there's no Capacitor 6/7 project to migrate. Plain `cap init` against 8.x.

[Source: capacitorjs.com/docs/updating/8-0; ionic.io/blog/announcing-capacitor-8; npm registry probe 2026-04-29]

## Q-05: Settings Push-Prefs UI Location

**Pick: Existing `SettingsPage` with a new `<NotificationsSection />` component (NOT a separate `/settings/notifications` route).**

**Reasoning (date-stamped 2026-04-29):**

The push-prefs UI surface area:
- Master push opt-in toggle (1 control)
- Quiet hours: start time + end time pickers (2 controls)
- Quiet hours timezone display (read-only, derived from `User.timezone`)
- Per-trigger toggles: breaking, affinity, keyword, digest (4 controls)
- Daily digest time-of-day picker (1 control)
- Keyword-watch list: add/remove entries with regions scoping (variable, list management)

Total: ~9 controls + 1 list manager.

**Heuristic against a separate route:**
- **Discoverability:** Settings is a mobile user's "control panel" entry point. Burying notifications under another route adds a tap.
- **Existing nav pattern:** `SettingsPage` already groups account/email/privacy/etc. Notifications fits the same mental model.
- **Native iOS convention:** iOS apps put notification settings inside Settings, not a top-level item.
- **D-12 offline banner is a SettingsPage neighbor:** if we add an "Offline Cached Articles" indicator, it lives in Settings too — co-locating notifications keeps the spec coherent.
- **Surface area is moderate, not large:** 9 controls + 1 list is well within a single-page section. Compare to an Account section that already has email + password + OAuth links + delete-account = ~6 controls.

**Where to put the keyword-watch list specifically:** inside `<NotificationsSection />`, collapsed by default into an accordion ("Keyword Watch (3 active)") so it doesn't dominate the section visually.

**Heuristic FOR a separate route (rejected):** if we expected push prefs to grow significantly (e.g., per-region quiet hours, snooze schedules, custom sounds per trigger), the separate route would future-proof. But D-deferred-ideas explicitly defers per-trigger quiet-hours overrides, so growth is bounded.

**Implementation note:** Create `apps/web/src/components/settings/NotificationsSection.tsx`. Drop into existing `SettingsPage` after the AccountSection.

[CITED: existing pattern at apps/web/src/components/subscription/AIUsageCounter.tsx and apps/web/src/contexts/AuthContext.tsx — settings already uses this section-component approach.]

## Q-D-14: CI/CD Path

**Pick: GitHub Actions matrix (`macos-latest` + `ubuntu-latest`) + Fastlane match for iOS + repo-secret keystore for Android.**

**Reasoning (date-stamped 2026-04-29):**

| Criterion | GHA + Fastlane (PICK) | EAS Build | Capacitor Cloud (Capgo) |
|-----------|----------------------|-----------|-------------------------|
| Cost (solo dev, ~10 builds/mo) | $0 — `macos-latest` runner free for public repos, paid minutes for private (~$0.08/min × ~15 min/build = ~$1.20/build) | Free tier 30 builds/mo, then $99+/mo | Paid SaaS, similar tier |
| Signing key safety | repo Secrets (encrypted), Fastlane match auto-renews | EAS-managed (vendor lock-in) | Capgo-managed (vendor lock-in) |
| Maintainability for solo dev | Standard pattern, well-documented | Vendor docs only | Vendor docs only |
| Existing CI fit | `.github/workflows/` already in use | Separate dashboard | Separate dashboard |
| Monorepo handling | Native — `working-directory: apps/mobile` + pnpm filter | Configurable (eas.json `cwd`) | Configurable |
| TestFlight upload | Fastlane `upload_to_testflight` lane, automated | Native | Native |
| Play Console upload | Fastlane `upload_to_play_store` lane, automated | Native | Native |
| Lock-in risk | LOW (everything is open) | HIGH | HIGH |

**Concrete ingredients:**

**iOS (`.github/workflows/mobile-ios.yml`):**
- Trigger: `push: tags: ['v*']` (don't run on every PR)
- Runner: `macos-latest` (Xcode 26 preinstalled)
- Steps:
  1. Checkout, Node 22, pnpm install
  2. `pnpm --filter @newshub/web build` (produces `apps/web/dist`)
  3. `pnpm --filter @newshub/mobile exec cap sync ios`
  4. `cd apps/mobile/ios/App && pod install` (or SPM resolve)
  5. Fastlane: `match appstore --readonly` (pulls cert from private match repo)
  6. Fastlane: `gym` (build) + `upload_to_testflight`
- Required secrets: `MATCH_PASSWORD`, `MATCH_GIT_BASIC_AUTHORIZATION` (deploy-key URL), `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_BASE64`

**Android (`.github/workflows/mobile-android.yml`):**
- Trigger: `push: tags: ['v*']`
- Runner: `ubuntu-latest`
- Steps:
  1. Checkout, Node 22, pnpm install, JDK 21
  2. `pnpm --filter @newshub/web build`
  3. `pnpm --filter @newshub/mobile exec cap sync android`
  4. Decode keystore: `echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > apps/mobile/android/app/release.keystore`
  5. `cd apps/mobile/android && ./gradlew bundleRelease`
  6. Upload AAB via `r0adkll/upload-google-play@v1` action
- Required secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `GOOGLE_PLAY_JSON_KEY` (service account)

**Fastlane match repo:** Create a private GitHub repo `newshub-mobile-certs` (separate from the main repo). Use a deploy key on the main repo to pull during CI.

**Phase scope per D-14:** This phase delivers AT LEAST ONE manual signed build per platform (testable on TestFlight + Internal Testing). Fully automated tag-based CI is in scope but the Fastlane lanes can land in a follow-up plan if 39's plan budget gets tight.

[Source: capgo.app/blog/automatic-capacitor-ios-build-github-action-with-match (Capacitor + GHA + match guide); capgo.app/blog/automatic-capacitor-android-build-github-action]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@capgo/capacitor-native-biometric` exposes a `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`-equivalent flag to prevent iCloud Keychain sync of the JWT entry | Pitfall 5; Q-02 | If wrong, JWT might sync across user's iCloud devices. Mitigation: 30-min spike during planning to read the plugin's iOS source. Fallback: swap to `aparajita + capacitor-secure-storage-plugin`. |
| A2 | Apple App Review treats "Visit newshub.example from your browser to learn more" + plain-text URL as compliant under the reader-app exemption when there's no clickable link, no price, no Premium label | Pitfall 7; D-09 | If wrong, App Store rejection on first submission. Mitigation: review submission notes will explain reader-app classification; have D-09 wording approved by counsel before submitting if budget allows. |
| A3 | iOS Edge-to-Edge enforcement in Capacitor 8 doesn't break NewsHub's existing safe-area-inset CSS (Phase 24) | Q-04 | If wrong, status bar overlap or content hidden behind home indicator. Mitigation: Capacitor 8 adds a "System Bars" plugin that exposes insets via CSS env vars — Phase 24 already uses `env(safe-area-inset-*)`, should be compatible. Visual smoke test on first device build. |
| A4 | `firebase-admin@13.8.0` `sendEachForMulticast` chunked at 200 tokens avoids HTTP/2 GOAWAY errors observed at >214 tokens | Pattern 3; Pitfall 4 | If wrong, intermittent send failures in fanout. Mitigation: chunk size is conservative; can adjust if profiling shows safe ceiling. |
| A5 | Capacitor 8.x's `@capacitor/push-notifications@8.0.3` `pushNotificationActionPerformed` listener fires reliably from killed-app state on Android (cold tap from notification tray) | usePushNotifications hook | If wrong, deep-link tap fails when app was force-killed. Mitigation: add `@capacitor/app` `appUrlOpen` listener as fallback. Common Capacitor pattern. |
| A6 | iOS `aps-environment: production` is auto-set by Capacitor on Release builds when push plugin is present | Pitfall 2 | If wrong, TestFlight notifications silently dropped. Mitigation: Plan should include explicit Xcode capability check step in QA. |
| A7 | Bundle ID `com.newshub.app` is available in both Apple Developer Portal and Google Play Console (not yet registered by anyone else) | D-15 | If wrong, need to pick alternate bundle ID. Mitigation: D-15 already says user owns the credentials provisioning thread; confirm during STATE.md "Mobile-store credentials provisioning" closure. |

**Total assumptions:** 7. Most are LOW-MEDIUM risk and resolved during planning or first-build QA. None are blocking for plan generation.

## Open Questions

1. **Should the offline banner (D-12) be dismissible?**
   - What we know: D-12 says "thin 'You are offline — showing cached articles' banner." Dismissibility not specified.
   - What's unclear: If user dismisses, when does it reappear? On next offline event? Never until next session?
   - Recommendation: Make it dismissible per session — `useState(true)` reset on app start. Auto-rehides when `navigator.onLine` flips to true. Dismiss button hides for the current online/offline cycle only.

2. **What should happen to the existing PWA `InstallPromptBanner` on iOS Safari for users who install the App Store app then visit the website?**
   - What we know: `useInstallPrompt` listens for `beforeinstallprompt` event (Chromium only). On iOS Safari it never fires anyway.
   - What's unclear: Should the website detect "this user is on iOS and has the App Store app installed" and surface a different banner ("You have the app — open it")? Out of phase scope?
   - Recommendation: Out of scope for Phase 39. Existing `useInstallPrompt` short-circuits when `isNativeApp()` is true (covered above). iOS Safari users continue to see no install prompt (current behavior) — the App Store badge in marketing copy is a website concern, not a mobile-app concern.

3. **Daily digest cron: in-process scheduler vs. external trigger?**
   - What we know: Existing `cleanupService.ts` uses `setInterval(...)` daily-cycle pattern. Phase 22 SMTP + EmailDigest model already exists. D-05 trigger 4 says "reuses existing emailDigest preference structure for time-of-day."
   - What's unclear: Does the digest run as a single daily cron at 06:00 UTC for all users (with per-user delivery time within that window)? Or per-user firings respecting `User.timezone` × user-chosen hour?
   - Recommendation: Plan a single hourly cron (`setInterval` 3600000ms) that finds users whose digest-hour-in-their-timezone matches the current UTC hour, and dispatches. This is simpler than per-user setTimeouts. Predictable load. Document in plan.

4. **Universal Links / Android App Links for `data.deeplink` taps when app is killed?**
   - What we know: MOB-F03 deep linking is deferred. Within-app navigation (warm/cold tap → `pushNotificationActionPerformed` → `window.location.href = ...`) works inside Capacitor.
   - What's unclear: If a user shares a notification deep-link via screenshot+message, the recipient tapping the URL won't open the app — they'll hit a 404 because we don't have universal-links setup.
   - Recommendation: Out of scope (MOB-F03 deferred). Phase 39 deep-links work only from in-app notification taps.

5. **Does CONTEXT.md's Q-04 framing ("6.x vs 7.x") need a STATE.md decision update?**
   - What we know: Research recommends Capacitor 8 — outside the originally-framed Q-04 options.
   - What's unclear: Is this drift acceptable per the discussion-phase, or should /gsd-discuss-phase be re-invoked?
   - Recommendation: Auto-mode says "make reasonable assumptions and proceed." Capacitor 8 is the only viable choice given plugin compat — this should land as a planner-locked decision in PLAN.md and a STATE.md Decisions row, not require re-discussion. Flag it explicitly in /gsd-plan-phase output.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 22 | Capacitor 8 CLI + plugins | ✓ assumed (CI uses Node 22 per repo) | TBD on dev machines | Document `.nvmrc` requirement |
| pnpm | All workspaces | ✓ (existing) | 10.x | none — repo uses pnpm exclusively |
| Xcode 26+ | iOS builds | ✗ (not installable on Windows; user is on Win 11 per env block) | — | **Use macOS CI (`macos-latest` GHA runner)** for iOS builds. Solo dev does not need a Mac for iOS dev — CI handles signing + build. |
| Android Studio Otter (2025.2.1+) | Android Gradle build | likely ✓ on dev machine; ✗ on dev's Windows shell | TBD | CI handles release builds; dev can debug via `adb` + emulator |
| JDK 21 | Android Gradle | likely ✓ (Android Studio bundle) | TBD | Install if missing for local builds |
| Firebase project | FCM + APNs send | ✗ (operational item per D-15) | — | **Blocking — user creates Firebase project before Plan 4 (push) ships.** Document in STATE.md "Mobile-store credentials provisioning." |
| Apple Developer account | iOS signing + APNs key | ✗ (operational item per D-15) | — | **Blocking — user enrolls before Plan 5 (mobile signing/CI) ships.** |
| Google Play Console | Android signing + Play upload | ✗ (operational item per D-15) | — | **Blocking — user enrolls before Plan 5.** |
| `firebase-admin` env (project, client_email, private_key) | Backend push send | ✗ (depends on Firebase project) | — | None — required for any push functionality. Plan 4 ships only after Firebase project exists. |

**Missing dependencies with no fallback:**
- Firebase project + APNs auth key + Google Play service account JSON. These are the operational prereqs flagged by D-15 and are NOT something planning phase can synthesize. The plan should sequence these as **prerequisite tasks** (manual operational steps tracked in STATE.md) before push-related plans can ship.

**Missing dependencies with fallback:**
- Xcode on Windows — fallback is GHA `macos-latest` for iOS builds. Solo developer can develop the SPA on Windows, ship to mobile via CI. Local iOS smoke testing requires either: (a) borrowing a Mac, (b) using `cap run ios --target=<TestFlight>` workflow remotely, or (c) accepting that iOS QA happens via TestFlight only (acceptable for v1).

## Security Domain

> Included because `security_enforcement` is the default (config.json doesn't set it false).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT issued by existing `authService` (unchanged); biometric is a UX layer, NOT a new auth principal. `tokenVersion` invalidation still applies. |
| V3 Session Management | yes | JWT TTL unchanged from web (7 days, Redis blacklist). Biometric storage is per-device; Keychain entry is wiped on logout per `clearBiometricJwt()`. |
| V4 Access Control | yes | `requireTier` middleware unchanged. Mobile clients hit the same backend gates as web. |
| V5 Input Validation | yes | New `/api/push/*`, `/api/keyword-watch/*`, `/api/notifications/preferences` use Zod schemas (CLAUDE.md pattern). Push tokens validated as base64ish FCM/APNs token shape. |
| V6 Cryptography | yes | iOS Keychain (Secure Enclave when available) + Android Keystore (StrongBox when available) for JWT-at-rest. **Never hand-roll.** Capgo plugin abstracts. FCM service-account private key stored in `FIREBASE_PRIVATE_KEY` env var, parsed via `replace(/\\n/g, '\n')`. |

### Known Threat Patterns for Capacitor + push + biometric

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Push token enumeration / spam | Information Disclosure | Backend gates `/api/push/subscribe` by JWT auth; rate-limit subscribe endpoint via existing `authLimiter` pattern (5/min). |
| Stolen device + biometric bypass | Spoofing | 3-fail biometric → password fallback (D-11). User can revoke `tokenVersion` from web Settings → all devices forced to re-login. |
| iCloud Keychain sync exposes JWT to other devices | Information Disclosure | Pitfall 5 — Capgo plugin device-only flag (assumption A1). Mitigation if A1 wrong: swap secure-storage plugin. |
| Push payload injection (XSS via deeplink) | Injection | Server-side: `deeplink` field constructed from server-side templates, never user-controlled keyword interpolated into URL. Client-side: `window.location.href = deeplink` is route-only (`/article/{id}`) — `id` Zod-validated as cuid. |
| FCM private key leak | Information Disclosure | Stored in env vars (NEVER committed), accessed only from `apps/web/server/`. Sentry source maps hidden (per existing `vite.config.ts` `sourcemap: 'hidden'`). |
| Volume-cap bypass via multiple devices | Tampering | Volume cap keyed by `userId`, not by token. User with 3 devices still capped at 5/day FREE. |
| Token replay after logout | Authentication | `clearBiometricJwt()` on logout deletes the Keychain entry. Stolen JWT still subject to `tokenVersion` invalidation. |
| Reader-app review rejection (compliance threat) | Compliance | D-08, D-09 enforce; Pitfall 7 calls out wording. Plain-text URL only, no clickable purchase links. |
| Push opt-in deceptive permission rationale | Compliance (App Store reviewer rejection) | Specific rationale in `Info.plist` `NSUserNotificationsUsageDescription`: "We send breaking news alerts up to 5 times per day, with quiet hours from 22:00–07:00 by default." |

## Sources

### Primary (HIGH confidence)
- npm registry probes 2026-04-29 — `@capacitor/core` (8.3.1), `@capacitor/cli` (8.3.1), `@capacitor/ios` (8.3.1), `@capacitor/android` (8.3.1), `@capacitor/push-notifications` (8.0.3), `@capacitor/haptics` (8.0.2), `@capacitor/status-bar` (8.0.2), `@capacitor/splash-screen` (8.0.1), `@capacitor/app` (8.1.0), `@capacitor/keyboard` (8.0.3), `@capacitor/preferences` (8.0.1), `@capgo/capacitor-native-biometric` (8.4.2), `@aparajita/capacitor-biometric-auth` (10.0.0), `firebase-admin` (13.8.0), `capacitor-secure-storage-plugin` (0.13.0). [VERIFIED]
- https://capacitorjs.com/docs/apis/push-notifications — Plugin v8 API, listener events, Android 13+ permission flow. [CITED]
- https://capacitorjs.com/docs/updating/8-0 — Capacitor 8 breaking changes (Node 22, Xcode 26, iOS 15, SDK 36, SPM, Edge-to-Edge). [CITED]
- https://firebase.google.com/docs/cloud-messaging/send/admin-sdk — `getMessaging().send` and `sendEachForMulticast` shapes. [CITED]
- https://firebase.google.com/docs/cloud-messaging/error-codes — UNREGISTERED / INVALID_ARGUMENT meanings; `messaging/registration-token-not-registered` mapping. [CITED]
- https://firebase.google.com/docs/cloud-messaging/manage-tokens — Token lifecycle and cleanup contract. [CITED]
- https://developer.apple.com/support/reader-apps/ — Reader-app exemption text, External Link Account Entitlement, plain-text URL constraints. [CITED]
- https://developer.apple.com/app-store/review/guidelines/ — Apple App Store Review Guidelines (3.1.1 IAP, 3.1.3(a) reader-app). [CITED]
- Repo files (existing patterns) — `apps/web/server/middleware/requireTier.ts`, `apps/web/server/middleware/rateLimiter.ts:115-174` (aiTierLimiter pattern for pushVolumeLimiter), `apps/web/server/services/cleanupService.ts` (90d retention pattern), `apps/web/server/services/newsAggregator.ts:288-291` (fanout hook point), `apps/web/src/contexts/AuthContext.tsx` (JWT lifecycle), `apps/web/vite.config.ts:27-107` (PWA SW config). [VERIFIED]

### Secondary (MEDIUM confidence)
- https://ionic.io/blog/announcing-capacitor-8 — Release announcement.
- https://capgo.app/blog/biometric-authentication-in-capacitor-apps — Capgo plugin guide.
- https://capgo.app/blog/automatic-capacitor-ios-build-github-action-with-match — GHA + Fastlane match recipe (Capacitor-specific).
- https://capgo.app/blog/automatic-capacitor-android-build-github-action — GHA Android build recipe.
- https://capawesome.io/blog/updating-to-capacitor-8/ — Migration guide.
- github.com/firebase/firebase-admin-node/issues/2943 — sendEachForMulticast HTTP/2 GOAWAY at >214 tokens.

### Tertiary (LOW confidence — flagged for validation)
- iCloud Keychain sync default for `kSecAttrSynchronizable` — A1 assumption; needs spike during planning.
- Capacitor 8 Edge-to-Edge interaction with existing safe-area-inset CSS — A3 assumption; smoke-test on first device build.
- Apple App Review wording threshold for reader-app vs IAP-circumvention — A2 assumption; rests on D-09's specific phrasing being "neutral enough." Production validation only.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified via npm registry probe at 2026-04-29.
- Architecture (push fanout hook point, biometric flow, reader-app gate): HIGH — fanout point at `newsAggregator.ts:288-291` confirmed by grep; aiTierLimiter pattern at `rateLimiter.ts:115-174` confirmed; AuthContext API at `AuthContext.tsx:93-115` confirmed.
- Pitfalls: MEDIUM — well-documented community knowledge. Pitfall 5 (iCloud Keychain) is the weakest link, flagged as assumption A1.
- App Store compliance: MEDIUM — official Apple text quoted; specific D-09 phrasing falls in interpretation territory, flagged as assumption A2.
- CI/CD pick: HIGH — GHA + Fastlane is the standard pattern for Capacitor in 2025–2026; multiple credible recipes available.
- Q-01 / Q-02 plugin pick: HIGH on Capacitor compat + maintenance; MEDIUM on iCloud Keychain device-only knob (A1).
- Q-03 payload schema: HIGH — schema follows FCM HTTP v1 + APNs payload anatomy directly.
- Q-04 Capacitor major: HIGH — Capacitor 8.3.1 is `latest` at probe time, plugin peer-deps require it.
- Q-05 Settings location: MEDIUM — heuristic call, justified but no objective metric.

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days; mobile ecosystem is moderately stable, but Capacitor minor releases land monthly — re-probe before any Plan that hardcodes a sub-minor version).

## RESEARCH COMPLETE
