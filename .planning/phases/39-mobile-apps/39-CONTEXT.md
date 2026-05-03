# Phase 39: Mobile Apps - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship installable iOS and Android apps to the Apple App Store and Google Play Store. The apps are Capacitor-wrapped builds of the existing `apps/web` SPA, polished with a focused set of native plugins (haptics, status bar, splash, push, biometric secure storage). The phase delivers:

- A new `apps/mobile/` workspace with Capacitor configs, `android/` and `ios/` projects, and a `pnpm build` step that produces signed iOS and Android binaries from the same `apps/web` bundle.
- Native push notifications via FCM (Android) + APNs (iOS) backed by a new server-side push subscription registry, four trigger systems (region-match breaking, reading-history affinity, keyword-watch list, daily digest), and tiered gating + dedup + quiet-hours enforcement.
- Biometric login that replaces password re-entry on subsequent app launches by storing the JWT in iOS Keychain / Android Keystore via a Capacitor secure-storage plugin.
- Offline reading via the existing PWA service worker (no new storage layer), surfaced behind an "offline cached articles" UI banner.
- Reader-app-exemption-compliant payment UX: every pricing surface (`TierCard`, `UpgradePrompt`, `AIUsageCounter`'s upgrade link) is hidden in iOS/Android builds and replaced with a generic "feature not available on your current plan" message that mentions `newshub.example` as plain text only.

**Out of scope** (deferred or rejected this phase):
- React Native or any non-Capacitor delivery (MOB-07 reinterpreted as "core screens feel native via Capacitor plugins").
- Web Push / VAPID for browser users (web stays on existing socket.io live-updates banner).
- Apple IAP / Google Play Billing (reader-app exemption avoids the 30% cut and the receipt-validation backend).
- Capacitor SQLite or eager IndexedDB pre-caching for offline (PWA service worker is sufficient).

</domain>

<decisions>
## Implementation Decisions

### Delivery framework
- **D-01 [LOCKED]** — **Capacitor only**. The native iOS and Android builds are Capacitor wrappers around `apps/web`'s production bundle. No React Native app is built this phase. **MOB-07 ("React Native native performance for core screens") is reinterpreted as "core screens feel native via Capacitor plugins"** — delivered through `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/app`, GPU-accelerated CSS transitions, and reuse of the existing mobile components (`BottomNav`, `PullToRefresh`, `SwipeableCard`, `MobileDrawer`, `useScrollDirection`, `useHapticFeedback`). 60%+ code-sharing target (MOB-08) is satisfied trivially because the SPA bundle IS the mobile app.
- **D-02 [LOCKED]** — **Native polish: standard tier**. The plugin baseline is `@capacitor/haptics` + `@capacitor/status-bar` (themed to `#0a0e1a` matching PWA manifest) + `@capacitor/splash-screen` + `@capacitor/keyboard` + `@capacitor/app` (back-button + state). No Ionic Animations, no Ionic React, no per-platform large-title nav rewrites. Maximal-polish tier rejected as out-of-scope; minimum-viable rejected as App-Review-risky.
- **D-03 [LOCKED]** — **Capacitor projects live in `apps/mobile/`**, a new pnpm workspace member (`pnpm-workspace.yaml` already covers `apps/*`). Layout: `apps/mobile/capacitor.config.ts`, `apps/mobile/android/`, `apps/mobile/ios/`, `apps/mobile/package.json` with a `build` script that runs `pnpm --filter @newshub/web build` then `npx cap sync` against `apps/web/dist`. Co-locating in `apps/web/` rejected because it pollutes the web app's CI matrix and signing-key surface.

### Push notification stack
- **D-04 [LOCKED]** — **FCM + APNs only**. Android uses Firebase Cloud Messaging; iOS uses APNs via Firebase project configuration (HTTP v1 API). Backend dependency: `firebase-admin`. Client plugin: `@capacitor/push-notifications`. **No Web Push / VAPID** — web users keep the existing socket.io live-updates banner; iOS Safari PWA push is too flaky to support reliably and adding VAPID doubles the backend send paths for marginal value. New Prisma model `PushSubscription { id, userId, platform: 'ios'|'android', token, createdAt, lastSeenAt }` with `@@unique([userId, token])`.
- **D-05 [LOCKED]** — **All four alert triggers ship this phase**: (1) region-match breaking news (matches `defaultRegions` against `breaking` flag or `severity:critical` events), (2) reading-history affinity (top-N entities/topics from last 30d), (3) user keyword-watch list (new `KeywordWatch { userId, keyword, regionsScope[] }` table + Settings UI), (4) daily digest at user-chosen time (reuses existing `emailDigest` preference structure for time-of-day). Cold-start handled by skipping affinity/digest until the user has 5+ history entries.
- **D-06 [LOCKED]** — **Tier gating: FREE = breaking only; PREMIUM = all four**. Mirrors Phase 36's gating model: free gets value preview, premium gets personalization. Server-side enforcement in the push-fanout job — checks `user.subscriptionTier` before emitting affinity/keyword/digest pushes. The keyword-watch UI in Settings shows a "feature not available" message for FREE users in mobile (per D-12 reader-app rules).
- **D-07 [LOCKED]** — **Hard daily volume cap + dedup + quiet hours**. Server-side: max 5 pushes/day for FREE, 10/day for PREMIUM, Redis counter keyed `push:count:{userId}:{YYYY-MM-DD}`. Same `articleId` can fire only once per user across all four triggers (Redis SET `push:sent:{userId}:{articleId}` with 7-day TTL). Quiet hours: default 22:00–07:00 user-local (read from existing user `timezone` field; UTC fallback if unset). User-configurable in Settings.

### App Store payment compliance
- **D-08 [LOCKED]** — **Reader-app exemption** (Apple Rule 3.1.3, Google Play similar). iOS and Android builds **hide every pricing surface and every purchase CTA**. Specifically: `TierCard`, `UpgradePrompt`, `AIUsageCounter`'s upgrade link, and any `/pricing` route reference. Detection: `Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android'` returns `true` only inside the wrapper, false in the browser PWA. Web continues to ship the full Stripe Checkout funnel unchanged. App reads existing `user.subscriptionTier` from `/api/auth/me` so feature unlocking still works for users who subscribed on web.
- **D-09 [LOCKED]** — **Generic "feature not available" UX for FREE-tier mobile users**. When a FREE user in the iOS/Android app hits a Premium gate (e.g., 11th `/api/ai/ask` returning 429, attempted `/api/account/export`, hit 7-day history limit), they see neutral text: *"This feature is not available on your current plan. Visit newshub.example from your browser to learn more."* No price, no Premium label, no Upgrade button. The `newshub.example` URL renders as **plain text, not a clickable link** — clickable links to a purchase flow are App Review risk per Apple Rule 3.1.1(a). Existing `UpgradePrompt`, `TierCard`, `AIUsageCounter` components branch on `Capacitor.getPlatform()`.
- **D-10 [LOCKED]** — **No Apple IAP, no Google Play Billing this phase**. Cross-platform sync of native receipts is deferred to a future phase if/when the user-acquisition data shows mobile-native subscriptions are leaving money on the table. The 30% cut + receipt-validation backend + `subscriptionService` cross-source merge are all v1.7+ candidates.

### Biometric authentication
- **D-11 [LOCKED]** — **Login replacement after first password**. Flow: first launch → email+password login → JWT (and `tokenVersion`) stored in iOS Keychain / Android Keystore via `@capgo/capacitor-native-biometric` or `@aparajita/capacitor-biometric-auth` (researcher picks). Subsequent launches → biometric prompt unlocks the stored JWT and silently re-hydrates `AuthContext`. Fallback: 3 consecutive biometric failures or device biometric removal → fall through to password login. User can disable biometric in Settings, which clears the keychain entry. Re-auth-gate and sensitive-action-only options rejected as not matching MOB-05's spirit ("authenticate via biometric").

### Offline reading
- **D-12 [LOCKED]** — **PWA service worker only — no new storage layer**. Capacitor's WKWebView (iOS) and Android WebView both run the existing service worker registered via `vite-plugin-pwa`. Already-fetched article responses render offline because of `runtimeCaching` + `navigateFallback: '/offline.html'` (already configured). New work: a thin "You are offline — showing cached articles" banner that subscribes to the existing `useBackendStatus` hook (or a new `navigator.onLine` listener) and renders above the feed. Eager IndexedDB pre-cache and Capacitor SQLite are out of scope; both are reasonable v1.7 candidates if usage data shows offline gaps.

### Code sharing (MOB-08)
- **D-13 [LOCKED]** — **Sharing target satisfied trivially via Capacitor**. Because `apps/mobile` consumes `apps/web/dist` directly, 100% of the SPA business logic (state, fetch layer, auth context, UI components, hooks) is shared by definition. No new `packages/api-client` or `packages/state` extraction is needed for this phase. `packages/types` continues to be the only dedicated shared package. If/when an RN app is added in a later phase, the api-client/state extractions become real work; not now.

### Build, signing, and distribution
- **D-14 [LOCKED]** — **CI/CD for mobile builds is researcher's call**. Two reasonable paths: (a) GitHub Actions matrix with `macos-latest` runner for iOS + `ubuntu-latest` for Android, signing keys in repo secrets, Fastlane for store upload; (b) EAS Build / Capacitor's own CI integration. Researcher picks based on cost + maintainability. This phase delivers at least one **manual signed build per platform** (testable on TestFlight + Google Play Internal Testing); fully-automated store submission can be a follow-up if the manual flow is complex.
- **D-15 [LOCKED]** — **Bundle ID convention**: `com.newshub.app` for both iOS and Android. App store identity / Apple Developer + Google Play Console accounts are operational items the user owns; planning docs note them as prerequisites but do not block the phase code work. Open thread to track in STATE.md: "Mobile-store credentials provisioning."

### Claude's Discretion
- **Q-01** — Which biometric Capacitor plugin (`@capgo/capacitor-native-biometric` vs `@aparajita/capacitor-biometric-auth` vs `@capacitor-community/biometric-auth`). Researcher picks based on maintenance status, TypeScript types, Capacitor 6/7 compatibility, and bundle size.
- **Q-02** — Exact secure-storage plugin pairing (e.g., `@capacitor-community/secure-storage` vs the biometric plugin's built-in keychain wrapper). Driven by Q-01.
- **Q-03** — Push payload schema for FCM/APNs (`title`, `body`, `data.articleId`, `data.deeplink`). Researcher specifies; planner locks.
- **Q-04** — Exact Capacitor version (6.x vs 7.x). Researcher picks based on plugin ecosystem maturity at planning time.
- **Q-05** — Whether the Settings push-prefs UI lives on the existing `SettingsPage` or a dedicated `/settings/notifications` route. Planner picks; UI-spec phase if needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 39 source-of-truth
- `.planning/ROADMAP.md` §"Phase 39: Mobile Apps" — Goal + 7 success criteria + dependency on Phase 35.
- `.planning/REQUIREMENTS.md` §"Mobile Experience" — MOB-01 through MOB-08 verbatim.
- `.planning/PROJECT.md` — Product vision incl. "Capacitor wrapper for app stores" and "React Native cross-platform app" mention (the latter is reinterpreted per D-01).

### Prior-phase decisions that constrain Phase 39
- `.planning/phases/35-infrastructure-foundation/` — Monorepo structure with pnpm workspaces; `packages/types` is the only existing shared package; `apps/*` glob already covers a future `apps/mobile/`.
- `.planning/phases/36-monetization-core/` — `subscriptionTier` field on `User`, `aiTierLimiter` middleware, `requireTier` gate, `UpgradePrompt` / `TierCard` / `AIUsageCounter` components — all of which need a Capacitor.getPlatform() branch per D-08/D-09.
- `.planning/phases/36.4-relocate-monetization-artifacts/36.4-CONTEXT.md` — `/pricing` route registration, FREE-tier 429 + `upgradeUrl: "/pricing"` semantics. Mobile must intercept that 429 and render the D-09 generic message instead of routing to `/pricing`.
- `.planning/phases/24-mobile-responsive/` — md: breakpoint primary, safe-area insets via `env(safe-area-inset-*)`, existing mobile components (`BottomNav`, `MobileDrawer`, `PullToRefresh`, `SwipeableCard`, `ScrollToTopFAB`).
- `.planning/phases/16-pwa-service-worker/` — `vite-plugin-pwa` config with `runtimeCaching`, `navigateFallback: '/offline.html'`, manifest theme `#0a0e1a` — Capacitor splash + status bar must match.
- `.planning/phases/38-advanced-ai-features/38-CONTEXT.md` — Source credibility, fact-check, framing analysis surfaces. Reader-app-exemption gating per D-08/D-09 must apply to any Premium-only AI surfaces (e.g., `aiTierLimiter`'s 429 today flows through `/api/ai/ask`, `/api/ai/fact-check`, `/api/ai/framing`).

### Existing code that downstream agents MUST extend, not replace
- `apps/web/vite.config.ts` (lines ~12–80) — VitePWA plugin config; manifest, theme color, runtimeCaching, navigateFallback. Capacitor splash/status-bar must theme-match.
- `apps/web/src/components/InstallPromptBanner.tsx` + `apps/web/src/hooks/useInstallPrompt.ts` — PWA install banner; iOS/Android Capacitor wrapper should suppress this banner (it's redundant once the user is in the native app).
- `apps/web/src/components/UpgradePrompt.tsx` — primary Premium upgrade CTA; needs Capacitor.getPlatform() branch per D-09.
- `apps/web/src/components/subscription/TierCard.tsx`, `apps/web/src/components/subscription/SubscriptionBadge.tsx`, `apps/web/src/components/subscription/AIUsageCounter.tsx` — all pricing/tier surfaces; Capacitor platform-aware rendering required.
- `apps/web/src/contexts/AuthContext.tsx` — JWT lifecycle; biometric flow stores/retrieves JWT through this context's `login` / `logout` API.
- `apps/web/src/services/syncService.ts` — IndexedDB queue for offline mutations (bookmarks, history). Already used by web; no Capacitor-specific change required for D-12 (SW + syncService is sufficient).
- `apps/web/src/components/mobile/{BottomNav,MobileDrawer,PullToRefresh,ScrollToTopFAB,SwipeableCard}.tsx` — existing mobile components reused as-is.
- `apps/web/src/hooks/{useHapticFeedback,useScrollDirection,useMediaQuery,useBackendStatus,useServiceWorker}.ts` — existing hooks reused; `useHapticFeedback` will be wired to `@capacitor/haptics` when running inside Capacitor (with web vibration fallback).
- `apps/web/server/middleware/aiTierLimiter.ts` (or equivalent — researcher confirms exact path) — emits 429 + `upgradeUrl: "/pricing"`; mobile must intercept the 429 and surface D-09 message instead of routing.
- `apps/web/prisma/schema.prisma` — `User` model already has `subscriptionTier`, `timezone`, `defaultRegions`, `emailDigest`. New models (`PushSubscription`, `KeywordWatch`) extend it; do not duplicate user-pref fields elsewhere.

### CLAUDE.md cross-references (operational gotchas)
- `CLAUDE.md` §"E2E Testing Structure / E2E Conventions" — Capacitor wraps the same `apps/web` bundle; existing E2E suite continues to validate the SPA. Capacitor builds get smoke-tested separately on real devices via TestFlight / Play Internal.
- `CLAUDE.md` §"Z-index ladder" — Capacitor splash overlay and any new permission-prompt sheet must layer above scan-line (z-0) but below ConsentBanner (z-100). Recommend status-bar overlay z-150 if needed.
- `CLAUDE.md` §"Branch protection" — `production` environment gates protected-branch-only deploys; mobile build artifacts will need their own deploy-target story (separate from Docker push to ghcr.io).

### External docs (researcher will validate during phase research)
- Capacitor v6/v7 docs (capacitorjs.com/docs) — researcher picks version + plugin set per D-04/Q-04.
- Apple App Store Review Guidelines §3.1 (Payments) — reader-app exemption text, the rule D-08 relies on.
- Google Play Policy Center §"Payments" — Android equivalent.
- Firebase Cloud Messaging HTTP v1 API — single backend SDK delivers both FCM and APNs (D-04).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Mobile component library** at `apps/web/src/components/mobile/` — `BottomNav`, `MobileDrawer`, `PullToRefresh`, `ScrollToTopFAB`, `SwipeableCard` already exist from Phase 24. Capacitor build reuses them without modification.
- **Mobile-aware hooks** — `useHapticFeedback` (currently navigator.vibrate fallback; gets `@capacitor/haptics` in Capacitor), `useScrollDirection`, `useMediaQuery`, `useBackendStatus`, `useServiceWorker`, `useInstallPrompt`.
- **Service worker + offline shell** — `vite-plugin-pwa` with `runtimeCaching` for static assets (CacheFirst) and `navigateFallback: '/offline.html'` already work inside WKWebView/Android WebView. D-12 banks on this.
- **Sync service** — `apps/web/src/services/syncService.ts` queues offline bookmark/history mutations in IndexedDB and replays via Background Sync API (Chromium) or reconnect listener. Capacitor-side: same code path runs.
- **Auth + tier infrastructure** — `AuthContext` (JWT, tokenVersion, OAuth callback handling), `subscriptionTier` field, `aiTierLimiter`, `requireTier` middleware, `attachUserTier` soft middleware. All reused; biometric (D-11) only changes WHERE the JWT is stored, not how it's used.
- **i18n bundles** — DE/EN/FR locales at `apps/web/src/i18n/locales/`. New strings: D-09's "feature not available" message + push permission rationale + biometric prompt copy. ~6–10 new keys per locale.

### Established Patterns
- **Singleton services** — All backend services use `getInstance()` (per `CLAUDE.md`). New `pushService.ts` and `notificationFanoutService.ts` follow the same pattern.
- **Tiered rate limiting** — `aiTierLimiter` (24h sliding window, 10/day FREE) provides the template for `pushVolumeLimiter` (5/day FREE, 10/day PREMIUM) per D-07.
- **Redis-cached, in-memory fallback** — `cacheService` wrapper. Push dedup keys + volume counters use the same cache layer.
- **Zod-validated API boundaries** — All public endpoints validate via Zod schemas. New routes (`/api/push/subscribe`, `/api/push/unsubscribe`, `/api/keyword-watch/*`, `/api/notifications/preferences`) follow suit. Code-first OpenAPI auto-updates via `@asteasolutions/zod-to-openapi`.
- **Stripe webhook raw-body anchor** — Per `CLAUDE.md` §"Subscription Tiers", webhook routes register before `express.json()`. Push routes are JSON-bodied, so they register in the normal API block — no anchor concerns.
- **GDPR cleanup** — `cleanupService.ts` runs daily; new pattern: stale `PushSubscription` rows (lastSeenAt > 90d) get hard-deleted alongside unverified accounts.

### Integration Points
- **Capacitor.getPlatform()** is the single platform-detection seam used in D-08/D-09. Wrap it in a small `apps/web/src/lib/platform.ts` helper (`isNativeApp()` returns `true` for ios/android, `false` for web). All pricing-surface components import from this helper — single change point if detection logic ever evolves.
- **Push fanout hook** — `newsAggregator.ts` already emits a Socket.io event when a new article is ingested. The notification-fanout service hooks the same emission point: emit → check breaking-flag → fan out to FCM tokens whose user matches region/affinity/keyword.
- **Service worker registration** — Capacitor WebView serves the SPA from `capacitor://localhost` (iOS) or `https://localhost` (Android). The existing service worker scope must be `/` (already is). No additional registration step.
- **AuthContext biometric hand-off** — `AuthContext.login(jwt)` and `AuthContext.logout()` are the only places the JWT is written/read. Biometric storage wraps these with a `@capacitor/preferences` + `@capgo/capacitor-native-biometric` (or equivalent) keychain layer that's a no-op on web.
- **Reader-app gating** — Web's `/pricing` route stays mounted; mobile build never navigates there because every CTA that would route there is platform-branched. The route itself is not removed (web users still need it).

</code_context>

<specifics>
## Specific Ideas

- **Splash + status bar theme**: must match PWA manifest `#0a0e1a` background and dark cyber aesthetic (cyan `#00f0ff` accent). Splash shows the existing `pwa-512x512.svg` logo on `#0a0e1a` for ~1s.
- **Bundle ID**: `com.newshub.app` for both platforms (D-15).
- **Push opt-in copy**: must clearly state "We send up to 5 notifications a day" (FREE) or "10/day" (PREMIUM) plus quiet-hours default — App Store reviewers reject vague permission rationales.
- **Biometric copy**: "Use Face ID to sign in to NewsHub" (or Touch ID / fingerprint variant detected at runtime).
- **iOS/Android offline indicator banner**: text-only, dismissible, sits above the feed; reuses dark cyber palette; no new design work.
- **No PWA install banner inside Capacitor wrapper**: `useInstallPrompt` short-circuits when `isNativeApp()` is true.

</specifics>

<deferred>
## Deferred Ideas

- **React Native app** (any form, including hot-screens-only) — deferred to a hypothetical v1.7+. Triggers: Capacitor performance shows real bottlenecks under user load, OR a strategic reason emerges (e.g., a deep-link pattern that Capacitor can't service).
- **Web Push (VAPID)** for browser PWA users — deferred. Would double the push backend code paths for marginal value given iOS Safari's flaky web-push support and the existing socket.io live-updates banner already covering most browser-real-time needs.
- **Apple IAP / Google Play Billing** for in-app subscription — deferred. The reader-app exemption removes the urgency; revisit when mobile-acquisition data shows un-subscribed mobile users at high volume.
- **Eager IndexedDB article cache** — deferred. SW handles "last visited" cleanly. Revisit if user reports of "I bookmarked this article but can't read it offline" appear.
- **Capacitor SQLite for full offline** — deferred (heavyweight; revisit only if SW + IndexedDB prove insufficient).
- **Apple Watch / Wear OS companion** (REQUIREMENTS.md "MOB-F01") — explicitly out of scope, future requirement.
- **Widgets / Home-screen news updates** ("MOB-F02") — explicitly out of scope, future requirement.
- **Deep linking for shared articles** ("MOB-F03") — explicitly out of scope; basic universal-links / Android App Links may be a small follow-up phase.
- **Apple Sign-In** — already noted in REQUIREMENTS.md "Out of Scope" (deferred to future OAuth expansion).
- **Push payload internationalization** beyond DE/EN/FR — currently locked to those three locales (Phase 23); add when project i18n scope expands.
- **Quiet-hours per-trigger-category overrides** (e.g., "still send breaking even at night") — single global quiet-hours window for now; revisit if users ask.

</deferred>

---

*Phase: 39-mobile-apps*
*Context gathered: 2026-04-29*
