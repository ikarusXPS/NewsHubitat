---
phase: 26-oauth-integration
plan: 01
subsystem: auth
tags: [oauth, passport, database, security]
dependency_graph:
  requires: []
  provides: [oauth-schema, passport-config, oauth-service]
  affects: [user-model, auth-flow]
tech_stack:
  added: [passport, passport-google-oauth20, passport-github2]
  patterns: [singleton-service, sha256-hashing, popup-oauth-flow]
key_files:
  created:
    - server/config/passport.ts
    - server/services/oauthService.ts
    - server/utils/oauthCallbackHtml.ts
  modified:
    - prisma/schema.prisma
decisions:
  - D-11 OAuth ID hashing with SHA-256 via existing hashToken utility
  - D-03 hasPassword field tracks OAuth-only accounts
  - D-04 OAuth users get emailVerified:true automatically
  - D-01 linkOAuthAccount requires password verification
  - D-12 unlinkOAuthAccount blocks if only login method
  - Security notifications sent for link/unlink events
metrics:
  duration: 6m
  completed: 2026-04-24T21:28:59Z
  tasks_completed: 3/3
  files_changed: 4
---

# Phase 26 Plan 01: OAuth Database + Service Infrastructure Summary

JWT auth with refresh rotation using passport OAuth strategies and SHA-256 ID hashing

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add OAuth fields to User model | 2add979 | prisma/schema.prisma |
| 2 | Create Passport configuration | 6812d5e | server/config/passport.ts |
| 3 | Create OAuth service and callback HTML | be58abd | server/services/oauthService.ts, server/utils/oauthCallbackHtml.ts |

## Implementation Details

### Database Schema Changes

Added to User model in `prisma/schema.prisma`:
```prisma
// OAuth Integration (Phase 26)
googleIdHash     String?   @unique  // D-11: SHA-256 hash of Google provider ID
githubIdHash     String?   @unique  // D-11: SHA-256 hash of GitHub provider ID
hasPassword      Boolean   @default(true)  // D-03: false for OAuth-only accounts

@@index([googleIdHash])
@@index([githubIdHash])
```

### Passport Configuration

Created `server/config/passport.ts` with:
- Google OAuth strategy (scopes: openid, email, profile)
- GitHub OAuth strategy (scopes: user:email, read:user)
- Graceful skip when credentials not configured
- D-05: Auth-only OAuth (no refresh token storage)

### OAuth Service

Created `server/services/oauthService.ts` with:
- `processGoogleAuth(profile)` - New user creation or linking detection
- `processGitHubAuth(profile)` - Same logic with GitHub profile parsing
- `linkOAuthAccount(provider, providerId, email, password)` - D-01 password re-auth
- `unlinkOAuthAccount(userId, provider, password)` - D-12 lockout protection
- `getConnectedProviders(userId)` - For Settings page
- Security notification emails on link/unlink events

### Callback HTML Generator

Created `server/utils/oauthCallbackHtml.ts`:
- Generates popup callback page
- Posts result to parent via postMessage
- Fallback redirect for non-popup scenarios
- NewsHub dark theme styling

## Security Implementations

- **D-11**: OAuth provider IDs hashed with SHA-256 before storage
- **D-01**: Account linking requires password verification
- **D-02**: Email must match for linking
- **D-12**: Cannot unlink only login method
- **D-04**: OAuth signups get emailVerified: true
- Security notification emails for account changes

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
npx prisma validate: The schema at prisma\schema.prisma is valid
npm run typecheck: 0 errors
```

## Dependencies Installed

```
passport: ^0.7.0
passport-google-oauth20: ^2.0.0
passport-github2: ^0.1.12
@types/passport: ^1.0.17
@types/passport-google-oauth20: ^2.0.16
@types/passport-github2: ^1.2.9
```

## Self-Check: PASSED

- [x] prisma/schema.prisma exists and contains OAuth fields
- [x] server/config/passport.ts exists and exports configurePassport
- [x] server/services/oauthService.ts exists and exports OAuthService
- [x] server/utils/oauthCallbackHtml.ts exists and exports generateCallbackHtml
- [x] Commit 2add979 exists
- [x] Commit 6812d5e exists
- [x] Commit be58abd exists
