# Phase 26: OAuth Integration - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can sign up and log in with Google or GitHub accounts. Existing email account users can link OAuth providers after re-authentication. OAuth-only accounts work without passwords. This phase covers OAuth provider configuration, account linking flow, UI integration in AuthModal, and Settings page for managing connected accounts.

</domain>

<decisions>
## Implementation Decisions

### Account Linking Security
- **D-01:** When OAuth email matches existing user, require password re-authentication before linking (prevents account takeover if provider email was compromised)
- **D-02:** OAuth email must match account email to link — block linking if emails differ
- **D-03:** OAuth-only accounts work without password — users set password later if they want to unlink
- **D-04:** Skip email verification for OAuth signups — providers already verified the email, mark `emailVerified=true`
- **D-05:** Auth-only OAuth — don't store refresh tokens for future API access (simpler, more secure)

### UI/UX Flow
- **D-06:** OAuth buttons appear in AuthModal only (not a separate page)
- **D-07:** OAuth buttons placed above email/password form with "or" divider — promotes faster signup
- **D-08:** Use popup flow for OAuth — opens in popup window, callback closes popup and updates parent (preserves SPA state)

### Provider Data
- **D-09:** Fetch email + name + avatar from OAuth providers
- **D-10:** Use OAuth avatar only if user hasn't set one (respects existing customization)
- **D-11:** Hash OAuth provider user ID (SHA-256) before storing — privacy-conscious but still enables linking

### Unlink Behavior
- **D-12:** Block unlinking if it's the only login method — user must set password first (prevents lockout)

### Claude's Discretion
- Whether to allow multiple OAuth providers per account (Google + GitHub) — recommend yes for flexibility
- Re-auth prompt UX — recommend modal with password field for seamless inline experience
- For unverified accounts trying OAuth, recommend auto-verify and link (OAuth confirms email ownership)
- Existing disposable email accounts trying to link OAuth — recommend blocking (consistent with registration policy)
- Settings placement — recommend dedicated "Connected Accounts" section based on common patterns
- Error handling — recommend toast + stay on modal for OAuth failures
- Button styling — recommend NewsHub dark theme with small provider icons for unified look
- Display name for new OAuth users — recommend auto-use provider name (simpler onboarding)
- Re-auth for unlinking — recommend requiring password based on existing security patterns
- Avatar on unlink — recommend keeping avatar (it's now user's data)
- Email notification for link/unlink — recommend yes for security awareness

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Auth Infrastructure
- `server/services/authService.ts` — JWT auth, token versioning, blacklist, email verification
- `server/routes/auth.ts` — All auth endpoints with Zod validation
- `src/components/AuthModal.tsx` — Login/register modal (add OAuth buttons here)
- `src/contexts/AuthContext.tsx` — Frontend auth state management

### Database Schema
- `prisma/schema.prisma` — User model (needs migration for OAuth fields: googleIdHash, githubIdHash, etc.)

### Research Reference (from STATE.md)
- Stack decision: passport-google-oauth20 + passport-github2
- Research flag: Account linking requires security review (addressed in D-01, D-02)

### Related Features
- Email verification flow: `server/services/emailService.ts`
- Token utilities: `server/utils/tokenUtils.ts` — for hashing OAuth IDs
- Settings page: `src/pages/Settings.tsx` — add Connected Accounts section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **hashToken()** from `tokenUtils.ts`: Can hash OAuth provider IDs
- **AuthModal**: Add OAuth buttons above existing form
- **toast notifications**: Existing pattern for success/error feedback
- **CacheService**: Redis integration for potential OAuth state caching
- **EmailService**: For link/unlink security notifications

### Established Patterns
- Singleton services with getInstance() pattern
- Zod validation for all API inputs
- JWT with tokenVersion for session invalidation
- bcrypt for password hashing, SHA-256 for token hashing

### Integration Points
- AuthModal: OAuth buttons at top, "or" divider, existing form below
- Express server: New `/api/auth/google` and `/api/auth/github` callback routes
- Prisma User model: Add googleIdHash, githubIdHash, hasPassword fields
- Settings page: New "Connected Accounts" section

### Database Migration Required
```prisma
// New fields for User model
googleIdHash  String?  @unique
githubIdHash  String?  @unique
hasPassword   Boolean  @default(true)  // false for OAuth-only accounts
```

</code_context>

<specifics>
## Specific Ideas

- Popup flow: Use `window.open()` with small dimensions, listen for `postMessage` callback
- OAuth state parameter for CSRF protection
- Store minimal scopes: `email` and `profile` only (Google), `user:email` and `read:user` (GitHub)
- Re-auth modal for linking: "This email already has an account. Enter your password to link [Provider]."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-oauth-integration*
*Context gathered: 2026-04-24*
