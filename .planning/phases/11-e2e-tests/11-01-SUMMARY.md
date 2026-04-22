---
phase: 11
plan: 01
subsystem: e2e-testing
tags: [playwright, auth, storageState, infrastructure]
dependency_graph:
  requires: []
  provides:
    - playwright-auth-setup
    - storageState-pattern
  affects:
    - playwright.config.ts
    - e2e/auth.setup.ts
tech_stack:
  added: []
  patterns:
    - Playwright project dependencies for auth isolation
    - storageState-based session persistence
key_files:
  created:
    - e2e/auth.setup.ts
    - playwright/.auth/.gitkeep
  modified:
    - playwright.config.ts
    - .gitignore
decisions:
  - Test user e2e-test@newshub.test with password test-password-123 for E2E auth
  - Three Playwright projects: setup, chromium (unauthenticated), chromium-auth (authenticated)
  - Auth-required tests: profile, bookmarks, settings, history specs
metrics:
  duration_minutes: 5
  completed: "2026-04-22T08:36:19Z"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 11 Plan 01: Playwright Auth Infrastructure Summary

Playwright auth setup using storageState pattern with project dependencies for authenticated vs unauthenticated test isolation.

## What Was Built

### 1. Auth Setup File (e2e/auth.setup.ts)
- Global authentication setup that logs in once and saves session state
- Uses test user `e2e-test@newshub.test` per D-13 decision
- Saves storageState to `playwright/.auth/user.json` for reuse
- Pattern follows existing auth.spec.ts login modal interaction

### 2. Playwright Config Projects (playwright.config.ts)
- **setup** project: Matches `*.setup.ts` files, runs first
- **chromium** project: Unauthenticated tests, ignores auth-required specs
- **chromium-auth** project: Authenticated tests with storageState, depends on setup

### 3. Auth Directory Structure
- Created `playwright/.auth/` directory with `.gitkeep`
- Added `playwright/.auth/user.json` to `.gitignore` (T-11-01 mitigation)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 253fda3 | feat | Add Playwright auth setup with storageState |
| 82b6a00 | feat | Configure Playwright project dependencies for auth |
| a360ece | chore | Add .auth directory and gitignore session state |

## Verification Results

```
$ npx playwright test --list | grep setup
  [setup] › auth.setup.ts:5:1 › authenticate
```

All three projects configured correctly:
- setup: matches auth.setup.ts
- chromium: runs all tests except auth-required ones
- chromium-auth: runs only auth-required tests with storageState (no matching tests yet)

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Test User Credentials**: Using `e2e-test@newshub.test` / `test-password-123` per D-13. This user must exist in the database for auth setup to succeed.

2. **Auth-Required Test Files**: Four files will use authenticated context:
   - profile.spec.ts
   - bookmarks.spec.ts
   - settings.spec.ts
   - history.spec.ts

3. **Security Mitigation**: Added `playwright/.auth/user.json` to `.gitignore` to prevent accidental commit of session tokens (threat T-11-01).

## Dependencies Enabled

Future plans can now:
- Create profile.spec.ts, bookmarks.spec.ts, settings.spec.ts, history.spec.ts
- These will automatically run with authenticated context via storageState
- No per-test login required - session is reused from setup project

## Self-Check: PASSED

- [x] e2e/auth.setup.ts exists
- [x] playwright.config.ts has 3 projects (setup, chromium, chromium-auth)
- [x] playwright/.auth/.gitkeep exists
- [x] .gitignore contains playwright/.auth/user.json
- [x] Commits 253fda3, 82b6a00, a360ece verified in git log
