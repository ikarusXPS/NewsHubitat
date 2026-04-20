# Phase 3: Auth Completion - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add email verification and password reset flows to the existing authentication system. Users can register, receive verification emails, verify their accounts, request password resets, and reset passwords via email links.

</domain>

<decisions>
## Implementation Decisions

### Email Verification Behavior (AUTH-01)
- **D-01:** Soft block for unverified users — can login but see limited features, prompted to verify
- **D-02:** Verification link expires after 24 hours
- **D-03:** Resend verification allowed with rate limit: max 3 per hour
- **D-04:** Unverified users are read-only + no AI features — can browse/read but no bookmarks, AI chat, preferences, or digests
- **D-05:** Verification prompt via persistent top banner (dismissible)
- **D-06:** Banner shows countdown of days remaining until account deletion
- **D-07:** Banner urgency escalates: cyan → yellow (7 days) → orange (3 days) → red (1 day)
- **D-08:** Verification email is bilingual (DE/EN both in same email)
- **D-09:** Email includes feature preview: AI chat, bookmarks, preferences unlock after verification
- **D-10:** Clicking already-verified link shows "already verified" page with login link
- **D-11:** Verification email sent immediately after registration
- **D-12:** After successful verification, show success page with login link (no auto-login)
- **D-13:** Token format: 32-byte crypto random hex string
- **D-14:** Tokens stored as SHA-256 hash in database (not plaintext)
- **D-15:** Generating new verification token invalidates previous tokens
- **D-16:** Block disposable email domains using `disposable-email-domains` NPM package
- **D-17:** Auto-delete unverified accounts after 30 days
- **D-18:** Cleanup job runs on server startup + daily interval
- **D-19:** Send reminder emails at 7 days and 1 day before deletion
- **D-20:** Log verification events (sent, clicked, verified, expired, resent) to console logger
- **D-21:** Verification URL format: `/verify-email?token=xxx` (no email param)
- **D-22:** No confirmation email after successful verification (success page is sufficient)
- **D-23:** Lock icons + tooltips on disabled features for unverified users
- **D-24:** Clicking locked feature opens verification resend modal

### Password Reset Flow (AUTH-02)
- **D-25:** Reset link expires after 1 hour
- **D-26:** Rate limit: max 3 reset requests per hour per email
- **D-27:** All existing sessions invalidated after password reset via tokenVersion counter
- **D-28:** Token version field in User model, incremented on reset, checked in auth middleware
- **D-29:** Reset email shows user's name only (no partial email for privacy)
- **D-30:** After successful reset, show success page with login link (no auto-login)
- **D-31:** Password reset also marks email as verified (if not already)
- **D-32:** Send confirmation email after password is changed
- **D-33:** Confirmation email includes "wasn't you?" recovery link (generates new reset token)
- **D-34:** Generic response on reset request: "If account exists, email sent" — prevents enumeration
- **D-35:** Reset token is single-use — invalidated after password is set
- **D-36:** Requesting new reset invalidates previous reset tokens
- **D-37:** New password cannot match old password
- **D-38:** Reset email is bilingual (DE/EN)
- **D-39:** Password strength indicator on reset form
- **D-40:** Show/hide password toggle on reset form

### Error Handling
- **D-41:** Expired verification link shows error page with one-click resend button
- **D-42:** Invalid/tampered tokens show generic "Invalid link" error (no details)
- **D-43:** Error pages match dark cyber theme (dark background, cyan accents)
- **D-44:** Rate limit errors show toast with cooldown timer ("Try again in 45 minutes")
- **D-45:** Failed token validation attempts logged for security monitoring
- **D-46:** Email send failure: registration succeeds with warning "Email could not be sent, resend from settings"
- **D-47:** Auto-retry failed email sends: 3 attempts with exponential backoff (1s, 2s, 4s)
- **D-48:** Error messages are bilingual (DE/EN)
- **D-49:** Already-used reset token shows same generic error as invalid
- **D-50:** Reset request for disposable email shows same generic response (no leak)

### Database Schema
- **D-51:** Add fields to User model (not separate Token model):
  - `emailVerified: Boolean @default(false)`
  - `verificationTokenHash: String?`
  - `verificationTokenExpiry: DateTime?`
  - `resetTokenHash: String?`
  - `resetTokenExpiry: DateTime?`
  - `tokenVersion: Int @default(0)`
  - `verificationSendCount: Int @default(0)`
  - `lastVerificationSentAt: DateTime?`
  - `resetSendCount: Int @default(0)`
  - `lastResetSentAt: DateTime?`
  - `updatedAt: DateTime @updatedAt`
- **D-52:** Keep existing role field for admin distinction, use emailVerified boolean for verification
- **D-53:** Add indexes on verificationTokenHash and resetTokenHash for fast lookups
- **D-54:** Hard delete unverified users after 30 days using Prisma deleteMany

### Claude's Discretion
- Exact wording of verification/reset email copy (within DE/EN bilingual structure)
- Password strength meter algorithm and visual styling
- Specific retry backoff timing (within 3 attempts guideline)
- Console log format for verification events

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth System
- `server/services/authService.ts` — Core auth service with register, login, changePassword, JWT handling
- `server/routes/auth.ts` — Auth API endpoints with Zod validation
- `server/services/emailService.ts` — Email service with sendWelcome, sendPasswordReset methods (existing)

### Database
- `prisma/schema.prisma` — User model definition, needs new fields added

### Frontend Auth
- `src/contexts/AuthContext.tsx` — Auth context provider with token storage

### Design System
- Dark cyber theme with cyan accent `#00f0ff`
- Urgency colors: yellow `#ffee00`, orange `#ff6600`, red `#ff0044`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmailService.sendPasswordReset()` — Already has HTML template, needs bilingual update
- `EmailService.sendWelcome()` — Reference for email HTML structure
- `authMiddleware` — Needs tokenVersion check added
- Zod schemas in auth.ts — Pattern for request validation

### Established Patterns
- Singleton services with `getInstance()` pattern
- Prisma for database operations
- JWT with 7-day expiry for sessions
- Express router pattern for API endpoints
- Console logger (`logger.info/warn/error`) for logging

### Integration Points
- Registration flow: `authService.register()` needs verification token generation + email send
- Auth middleware: needs tokenVersion check for session invalidation
- New routes needed: `/verify-email`, `/request-reset`, `/reset-password`, `/resend-verification`
- New frontend pages: VerifyEmail, ResetPassword, ForgotPassword
- VerificationBanner component for unverified user UI

</code_context>

<specifics>
## Specific Ideas

- Feature preview in verification email highlights: AI chat, bookmarks, personalized settings
- SaaS-ready design — verification unlocks premium features
- "Wasn't you?" recovery link in password change notification for security

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-auth-completion*
*Context gathered: 2026-04-18*
