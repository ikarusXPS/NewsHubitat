<!-- generated-by: gsd-doc-writer -->

# @newshub/mobile

Capacitor 8 native wrapper for NewsHub on iOS and Android. This package contains no UI code of its own — it consumes the production bundle from `apps/web/dist` and ships it inside a WKWebView (iOS) or Android WebView, achieving roughly 95% code reuse with the browser PWA.

Part of the [NewsHub monorepo](../../README.md).

## What this package is (and isn't)

- **Is**: thin Capacitor 8 shell + native projects (`ios/`, `android/`) + plugin configuration. The whole app is the same React bundle the browser serves.
- **Isn't**: a separate UI codebase. There is no `src/` here. Component changes happen in `apps/web/src/`.
- **Bundle ID**: `com.newshub.app` (both platforms; defined in `capacitor.config.ts`)
- **`webDir`**: `../web/dist` — Capacitor reads from the web app's Vite build output directly.

The same `vite-plugin-pwa` service worker that powers the browser PWA runs inside the native WebView, so offline reading works out of the box without a second offline implementation.

## Installation

This is a private workspace package — install the monorepo from the root:

```bash
pnpm install
```

The native projects under `ios/` and `android/` are committed and were generated via `cap add`. You should not need to regenerate them; if you ever do, run `pnpm cap:add:ios` or `pnpm cap:add:android` from this directory.

## Build flow

The build is two steps: produce the web bundle, then sync it into both native projects.

```bash
# From the repo root — does both steps
pnpm --filter @newshub/mobile build
```

That single command runs:

1. `pnpm --filter @newshub/web build` — produces `apps/web/dist/`
2. `cap sync` — copies `apps/web/dist/` into:
   - `apps/mobile/ios/App/App/public/`
   - `apps/mobile/android/app/src/main/assets/public/`
   - and updates native plugin registrations

If `apps/web/dist/` is already current (e.g. you just ran the web build), you can skip step 1:

```bash
pnpm --filter @newshub/mobile cap:sync          # both platforms
pnpm --filter @newshub/mobile cap:sync:ios      # iOS only
pnpm --filter @newshub/mobile cap:sync:android  # Android only
```

## Opening native IDEs

```bash
pnpm --filter @newshub/mobile cap:open:ios      # macOS only — opens Xcode
pnpm --filter @newshub/mobile cap:open:android  # opens Android Studio
```

iOS builds and signing require macOS + Xcode. Android builds run anywhere Android Studio runs.

## Native plugins

Configured in `capacitor.config.ts` and declared in `package.json`:

| Plugin | Version | Purpose |
|--------|---------|---------|
| `@capacitor/app` | ^8.1.0 | App lifecycle (resume/pause, deep links) |
| `@capacitor/haptics` | ^8.0.2 | Haptic feedback |
| `@capacitor/keyboard` | ^8.0.3 | Soft-keyboard events and resize behavior (`resize: 'native'`) |
| `@capacitor/push-notifications` | ^8.0.3 | APNs / FCM push (badge, sound, alert) |
| `@capacitor/splash-screen` | ^8.0.1 | Launch screen (`launchAutoHide: false` — splash stays visible until the app explicitly calls `SplashScreen.hide()`; `#0a0e1a` background) |
| `@capacitor/status-bar` | ^8.0.2 | Status bar style (`DARK`, `#0a0e1a`, no overlay) |
| `@capacitor/preferences` | ^8.0.1 | Native key-value storage |
| `@capgo/capacitor-native-biometric` | ^8.4.2 | Face ID / Touch ID / Android biometrics |

Plugin runtime config (splash duration, push presentation options, keyboard resize mode, etc.) lives in `capacitor.config.ts`.

## Detecting native context from web code

When the web bundle needs to behave differently on native, **always** use the `isNativeApp()` helper — never check `Capacitor` directly in components:

```ts
import { isNativeApp } from '@/lib/platform';

if (isNativeApp()) {
  // running inside iOS or Android WebView
}
```

`isNativeApp()` lives in `apps/web/src/lib/platform.ts` and wraps `Capacitor.getPlatform() === 'ios' | 'android'`. Centralizing this check keeps the reader-app exemption (below) consistent across the app.

> **Note:** `platform.ts` is currently a Phase 39 stub that returns `false`. The real `Capacitor.getPlatform()` detection ships with Phase 39. No consumers need to change when the stub is replaced.

## Reader-app exemption (CRITICAL)

Per Apple Rule 3.1.3 (and Google Play's equivalent), the iOS and Android builds ship as **reader apps** — users sign in with an account whose subscription was purchased on the web. The native app must not advertise or link to external purchasing.

When `isNativeApp()` is `true`, the web UI hides every pricing surface:

- `TierCard`
- `UpgradePrompt`
- `AIUsageCounter` upgrade link
- any `/pricing` route reference

For FREE-tier feature gates, the native build shows a generic "feature not available" message plus a **plain-text** `newshub.example` URL. The URL must not be clickable — clickable external purchase links are an App Review risk under Apple Rule 3.1.1(a).

Subscriptions are managed entirely on the web. The app reads `user.subscriptionTier` from `GET /api/auth/me` and gates features accordingly.

**No in-app purchases this milestone.** Apple In-App Purchase and Google Play Billing integration is deferred to v1.7+.

## Testing

There is no separate test suite for this package — the shell itself has no logic to test. The web bundle tests live in `apps/web/`:

```bash
# Unit tests (from repo root)
pnpm test:run

# E2E tests (from repo root)
pnpm test:e2e
```

Native-specific behavior (biometrics, push, deep links) is validated manually on device or simulator after running `pnpm --filter @newshub/mobile build` and opening the native IDE.

## License

MIT — see [LICENSE](../../LICENSE) at the monorepo root.
