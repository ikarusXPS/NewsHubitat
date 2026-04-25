---
phase: 26-oauth-integration
plan: 02
subsystem: auth
tags: [oauth, passport, routes, api]
dependency_graph:
  requires: [oauth-schema, passport-config, oauth-service]
  provides: [oauth-routes, oauth-endpoints]
  affects: [auth-flow, server-initialization]
tech_stack:
  added: []
  patterns: [passport-authenticate, zod-validation, popup-callback-flow]
key_files:
  created:
    - server/routes/oauth.ts
  modified:
    - server/index.ts
decisions:
  - D-05 Stateless JWT - Passport initialized with session:false
  - D-08 Popup flow - Callbacks return HTML that posts to parent window
  - D-01 Link endpoint requires password verification via Zod validation
  - D-12 Unlink endpoint enforces lockout protection via authMiddleware
metrics:
  duration: 2m
  completed: 2026-04-24T21:35:00Z
  tasks_completed: 3/3
  files_changed: 2
---

# Phase 26 Plan 02: OAuth Routes + Server Configuration Summary

OAuth API routes exposing Google/GitHub authentication with account linking endpoints

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verify OAuth dependencies | (verified) | package.json (from Plan 01) |
| 2 | Create OAuth routes | 1e32311 | server/routes/oauth.ts |
| 3 | Register routes and configure Passport | d4624fe | server/index.ts |

## Implementation Details

### OAuth Routes Created (`server/routes/oauth.ts`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/google` | GET | - | Initiates Google OAuth flow |
| `/api/auth/google/callback` | GET | - | Handles Google callback, returns popup HTML |
| `/api/auth/github` | GET | - | Initiates GitHub OAuth flow |
| `/api/auth/github/callback` | GET | - | Handles GitHub callback, returns popup HTML |
| `/api/auth/oauth/link` | POST | - | Link OAuth to existing account (requires password) |
| `/api/auth/oauth/unlink` | POST | JWT | Unlink OAuth from account (D-12 protection) |
| `/api/auth/oauth/providers` | GET | JWT | Get connected providers for user |

### Server Configuration (`server/index.ts`)

1. **Imports added:**
   - `passport` from 'passport'
   - `configurePassport` from './config/passport'
   - `oauthRoutes` from './routes/oauth'

2. **Initialization added:**
   - `app.use(passport.initialize())` - No session per D-05
   - `configurePassport()` - Registers Google/GitHub strategies

3. **Route registration:**
   - `app.use('/api/auth', oauthRoutes)` - After existing authRoutes

### Zod Validation Schemas

```typescript
// Link account - D-01 requires password
linkAccountSchema = z.object({
  provider: z.enum(['google', 'github']),
  providerId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

// Unlink account - password optional if user has other OAuth
unlinkAccountSchema = z.object({
  provider: z.enum(['google', 'github']),
  password: z.string().optional(),
});
```

## Security Implementations

- **T-26-05**: Passport validates OAuth state parameter automatically
- **T-26-06**: Link endpoint requires bcrypt password verification
- **T-26-07**: OAuth routes inherit existing auth rate limits
- **T-26-08**: Generic error messages, no stack traces exposed

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

```
npm run typecheck: 0 errors
Dependencies verified: passport@0.7.0, passport-google-oauth20@2.0.0, passport-github2@0.1.12
```

## Self-Check: PASSED

- [x] server/routes/oauth.ts exists and exports oauthRoutes
- [x] server/routes/oauth.ts contains `/google` route with passport.authenticate
- [x] server/routes/oauth.ts contains `/google/callback` route
- [x] server/routes/oauth.ts contains `/github` route with passport.authenticate
- [x] server/routes/oauth.ts contains `/github/callback` route
- [x] server/routes/oauth.ts contains `/oauth/link` with Zod validation
- [x] server/routes/oauth.ts contains `/oauth/unlink` with authMiddleware
- [x] server/routes/oauth.ts contains `/oauth/providers` with authMiddleware
- [x] server/index.ts imports passport and configurePassport
- [x] server/index.ts contains passport.initialize()
- [x] server/index.ts contains oauthRoutes registration
- [x] Commit 1e32311 exists
- [x] Commit d4624fe exists
