---
phase: 39-mobile-apps
plan: "01"
subsystem: mobile
tags: [capacitor, ios, android, mobile, pnpm-workspace, native]
dependency_graph:
  requires: []
  provides:
    - apps/mobile workspace with Capacitor 8.3.1 config
    - apps/mobile/ios/ Xcode project shell (Swift Package Manager)
    - apps/mobile/android/ Gradle project shell
    - Capacitor bridge deps in apps/web (Plans 3-5 can now import @capacitor/*)
  affects:
    - pnpm-lock.yaml (new workspace member + bridge deps)
    - apps/web/package.json (Capacitor bridge runtime deps)
tech_stack:
  added:
    - "@capacitor/core@8.3.1"
    - "@capacitor/cli@8.3.1"
    - "@capacitor/ios@8.3.1"
    - "@capacitor/android@8.3.1"
    - "@capacitor/push-notifications@8.0.3"
    - "@capacitor/haptics@8.0.2"
    - "@capacitor/status-bar@8.0.2"
    - "@capacitor/splash-screen@8.0.1"
    - "@capacitor/app@8.1.0"
    - "@capacitor/keyboard@8.0.3"
    - "@capacitor/preferences@8.0.1"
    - "@capgo/capacitor-native-biometric@8.4.2"
  patterns:
    - Capacitor 8 with Swift Package Manager (no CocoaPods/Podfile)
    - pnpm workspace member consuming apps/web/dist via webDir
key_files:
  created:
    - apps/mobile/package.json
    - apps/mobile/capacitor.config.ts
    - apps/mobile/tsconfig.json
    - apps/mobile/.gitignore
    - apps/mobile/android/ (entire Gradle project shell, 50+ files)
    - apps/mobile/ios/ (entire Xcode project shell, 20+ files)
    - apps/mobile/ios/App/App/App.entitlements
  modified:
    - apps/web/package.json (added 8 Capacitor bridge deps)
    - apps/mobile/android/app/src/main/AndroidManifest.xml (POST_NOTIFICATIONS)
    - apps/mobile/ios/App/App.xcodeproj/project.pbxproj (CODE_SIGN_ENTITLEMENTS)
    - pnpm-lock.yaml
decisions:
  - "iOS scaffold succeeded on Windows via Capacitor 8 + SPM (no pod install needed; no macOS required)"
  - "POST_NOTIFICATIONS added manually — not auto-injected by cap sync in Capacitor 8"
  - "App.entitlements created manually — Capacitor 8 + SPM on Windows does not auto-create it"
  - "pnpm-workspace.yaml apps/* glob already covers apps/mobile — no edit needed (confirmed)"
  - "TypeScript ~6.0.3 used in apps/mobile matching apps/web (devDependency)"
metrics:
  duration: "~38 minutes (execution time)"
  completed: "2026-04-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 75+
  files_modified: 4
---

# Phase 39 Plan 01: Capacitor 8 Mobile Workspace Bootstrap Summary

Bootstrap `apps/mobile/` pnpm workspace with Capacitor 8.3.1, generating iOS (Swift Package Manager) and Android (Gradle) native project shells, with bridge deps installed in apps/web so the SPA can call native plugins from Plans 3-5.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create apps/mobile workspace skeleton + Capacitor config | 6a372b9 | apps/mobile/{package.json,capacitor.config.ts,tsconfig.json,.gitignore}, .nvmrc |
| 2 | Add Capacitor bridge deps to apps/web | 35a4c16 | apps/web/package.json, pnpm-lock.yaml |
| 3 | Generate iOS and Android native projects via cap add | 8faac2c | apps/mobile/android/ (52 files), apps/mobile/ios/ (20 files), App.entitlements |

## Versions Pinned

| Package | Version | Notes |
|---------|---------|-------|
| `@capacitor/core` | 8.3.1 | Latest as of 2026-04-29 |
| `@capacitor/cli` | 8.3.1 | Dev dep in apps/mobile only |
| `@capacitor/push-notifications` | 8.0.3 | Verified npm view 2026-04-29 |
| `@capgo/capacitor-native-biometric` | 8.4.2 | Q-01 pick; ships own Keychain/Keystore wrapper |
| All other plugins | Per RESEARCH.md | No version drift found |

No version drift from RESEARCH.md — all packages matched their expected latest.

## iOS Scaffold: Succeeded on Windows

`cap add ios` succeeded on Windows (Git Bash) with Capacitor 8 + Swift Package Manager. This was possible because Capacitor 8 replaced CocoaPods with SPM for iOS dependency resolution — no `pod install` needed, which was the macOS-only gating step in older Capacitor versions. The iOS project is fully committed with:
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — `PRODUCT_BUNDLE_IDENTIFIER = com.newshub.app`
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — SPM manifest with 8 plugins
- `apps/mobile/ios/App/App/App.entitlements` — `aps-environment = development`
- `apps/mobile/ios/debug.xcconfig` — debug build configuration

**Plan 6 still needs to run on macOS-latest** (or equivalent) for code signing and TestFlight upload. SPM resolution (`swift package resolve`) runs during Xcode build, not in this scaffold.

## pnpm-workspace.yaml

No edit needed. The existing `apps/*` glob in `pnpm-workspace.yaml` already covers `apps/mobile`. Confirmed via `pnpm list --recursive --depth=-1` which shows `@newshub/mobile@0.1.0` as a registered workspace member.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] POST_NOTIFICATIONS permission not auto-injected**
- **Found during:** Task 3 verification
- **Issue:** Plan stated "The push-notifications plugin's `cap sync` step adds `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` to `AndroidManifest.xml`". In Capacitor 8.3.1, `cap sync` does NOT auto-inject this permission — it must be added manually.
- **Fix:** Added `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` to `apps/mobile/android/app/src/main/AndroidManifest.xml` with explanatory comment.
- **Files modified:** `apps/mobile/android/app/src/main/AndroidManifest.xml`
- **Commit:** 8faac2c

**2. [Rule 2 - Missing Critical] App.entitlements not auto-created by cap add**
- **Found during:** Task 3 verification
- **Issue:** Plan stated "Capacitor 8 with the push plugin configures `App.entitlements` with `aps-environment` set to `development` for Debug builds." In Capacitor 8.3.1 on Windows with SPM, no `App.entitlements` file is created. Without it, APNs push notifications will not work on iOS when the project is eventually signed and deployed.
- **Fix:** Created `apps/mobile/ios/App/App/App.entitlements` with `aps-environment = development`; wired `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` into both Debug and Release build configurations in `project.pbxproj`.
- **Files modified:** `apps/mobile/ios/App/App/App.entitlements` (new), `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
- **Commit:** 8faac2c

### Pre-existing State Note

Task 1's workspace skeleton files (`apps/mobile/package.json`, `capacitor.config.ts`, `tsconfig.json`, `.gitignore`) were already committed to the branch as commit `6a372b9` (a prior plan execution attempt). The files matched the spec exactly, so no changes were needed. The `pnpm install` that followed registered `@newshub/mobile` in the workspace lockfile without creating new commits (lockfile was already current).

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The `apps/mobile/` workspace is client-only scaffolding. The `apps/web` package additions are bridge libraries that are no-ops in a browser context (`Capacitor.getPlatform()` returns `'web'` unless running inside the native wrapper).

The threat mitigations from the plan's threat register are confirmed in place:
- **T-39-01-01** (supply chain): All packages pinned to `^8.x.y` minor-floor; lockfile committed.
- **T-39-01-02** (information disclosure): `.gitignore` excludes `*.ipa`, `*.aab`, `build/`, `Pods/`.
- **T-39-01-03** (bundle ID): `com.newshub.app` set in config; Apple/Play enrollment deferred to Plan 6.
- **T-39-01-04** (webDir traversal): `webDir: '../web/dist'` resolves correctly; `cap sync` validated path during execution.

## Known Stubs

None. This plan produces scaffolding/configuration only — no UI components, no data sources, no placeholder text flows to any UI rendering surface.

## Self-Check: PASSED

All claimed files verified to exist on disk. All commit hashes verified in git log.

| Item | Status |
|------|--------|
| apps/mobile/package.json | FOUND |
| apps/mobile/capacitor.config.ts | FOUND |
| apps/mobile/tsconfig.json | FOUND |
| apps/mobile/.gitignore | FOUND |
| .nvmrc | FOUND |
| apps/mobile/android/app/build.gradle | FOUND |
| apps/mobile/android/app/src/main/AndroidManifest.xml | FOUND |
| apps/mobile/ios/App/App.xcodeproj/project.pbxproj | FOUND |
| apps/mobile/ios/App/App/App.entitlements | FOUND |
| .planning/phases/39-mobile-apps/39-01-SUMMARY.md | FOUND |
| commit 6a372b9 (Task 1 - pre-existing scaffold) | FOUND |
| commit 35a4c16 (Task 2 - bridge deps) | FOUND |
| commit 8faac2c (Task 3 - native projects) | FOUND |
