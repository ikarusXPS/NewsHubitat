# Phase 3: Auth Completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 03-auth-completion
**Areas discussed:** Verification behavior, Password reset flow, Error handling, Database schema

---

## Verification Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Soft block (Recommended) | Can login, see limited features, prompted to verify | ✓ |
| Hard block | Cannot login until email verified | |
| No block | Full access, verification just marks account as trusted | |

**User's choice:** Soft block (Recommended)
**Notes:** User can login but with limited features

---

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours (Recommended) | Standard — gives users time to check email | ✓ |
| 1 hour | Strict — forces immediate action | |
| 7 days | Relaxed — max flexibility | |

**User's choice:** 24 hours (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with rate limit (Recommended) | Max 3 per hour to prevent abuse | ✓ |
| Yes, unlimited | No restrictions | |
| No | One email only, must wait for expiry | |

**User's choice:** Yes, with rate limit (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only (Recommended) | Can browse/read, but no bookmarks, AI chat, or settings changes | |
| No limitations | Full features, just show verification banner | |
| No AI features only | Block only AI/expensive features | |

**User's choice:** Read-only and no AI features (custom combination)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Top banner (Recommended) | Persistent dismissible banner across all pages | ✓ |
| Modal on login | One-time modal after each login | |
| Settings page only | Subtle indicator in settings | |

**User's choice:** Top banner (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| German only (Recommended) | Matches existing email templates | |
| Bilingual DE/EN | Both languages in same email | ✓ |
| User language pref | Send in user's selected language setting | |

**User's choice:** Bilingual DE/EN

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show already verified page (Recommended) | Friendly message, link to login | ✓ |
| Redirect to login | Silent redirect, no message | |
| Show error | Token invalid/expired error | |

**User's choice:** Show already verified page (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately after registration (Recommended) | Standard flow | ✓ |
| On first login attempt | Delayed | |
| Manual trigger only | User must click button | |

**User's choice:** Immediately after registration (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Success page with login link (Recommended) | Clear feedback | ✓ |
| Auto-login + redirect to dashboard | Seamless | |
| Redirect to login page | User must enter credentials | |

**User's choice:** Success page with login link (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Crypto random string (Recommended) | 32-byte hex token | ✓ |
| JWT with expiry | Self-contained token | |
| UUID v4 | Standard UUID format | |

**User's choice:** Crypto random string (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, SHA-256 hash (Recommended) | Security best practice | ✓ |
| No, store plaintext | Simpler | |

**User's choice:** Yes, SHA-256 hash (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Old links stop working | ✓ |
| No | All unexpired tokens remain valid | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No (Recommended for v1) | Accept all valid email formats | |
| Yes, block disposables | Check against known disposable email domains list | ✓ |

**User's choice:** Yes, block disposables
**Notes:** User asked why recommended was "No" — explained complexity tradeoff. User decided to block disposables.

---

| Option | Description | Selected |
|--------|-------------|----------|
| NPM package (Recommended) | Use 'disposable-email-domains' package | ✓ |
| Static local list | Hard-code top 100 known disposable domains | |
| External API | Call verification API like mailcheck.ai | |

**User's choice:** NPM package (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, after 30 days (Recommended) | Clean up abandoned registrations, GDPR-friendly | ✓ |
| No auto-delete | Keep all users indefinitely | |
| Yes, after 7 days | Aggressive cleanup | |

**User's choice:** Yes, after 30 days (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Server startup + daily interval (Recommended) | Run once on start, then every 24 hours | ✓ |
| Cron/scheduled job | External scheduler | |
| Manual only | Admin triggers cleanup | |

**User's choice:** Server startup + daily interval (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Simple verification only (Recommended) | Just the link and basic instructions | |
| Feature preview | List benefits: AI chat, bookmarks, personalization | ✓ |
| Urgency messaging | Countdown/warning about account deletion | |

**User's choice:** Feature preview
**Notes:** User mentioned "later maybe become a SaaS" — wants to highlight premium features

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI + Bookmarks + Preferences (Recommended) | Core features | ✓ |
| All features | Full list | |
| You decide | Claude picks subset | |

**User's choice:** AI + Bookmarks + Preferences (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No countdown (Recommended) | Simple verify prompt | |
| Yes, show days left | "Verify within 27 days or account is deleted" | ✓ |

**User's choice:** Yes, show days left

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Yellow → Orange → Red as deadline nears | ✓ |
| No | Same appearance | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, at 7 days remaining (Recommended) | One warning email | |
| Yes, at 7 days and 1 day | Two warning emails | ✓ |
| No reminder | Silent deletion | |

**User's choice:** Yes, at 7 days and 1 day

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, basic events (Recommended) | Log: sent, clicked, verified, expired, resent | ✓ |
| Yes, detailed | Add: IP, user agent, timestamp | |
| No logging | Privacy-first | |

**User's choice:** Yes, basic events (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Console logger (Recommended) | Use existing logger.info() | ✓ |
| Database table | Create VerificationEvent table | |
| Both | Log to console + persist in DB | |

**User's choice:** Console logger (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Token only (Recommended) | /verify-email?token=xxx | ✓ |
| Token + email | Include email in URL | |

**User's choice:** Token only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No (Recommended) | Success page is sufficient | ✓ |
| Yes | Send "Your email is now verified" email | |

**User's choice:** No (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No (Recommended) | Block digest signup until verified | ✓ |
| Yes | Allow digest even without verification | |

**User's choice:** No (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Lock icon + tooltip on disabled features | ✓ |
| No | Just banner, features grayed out | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Click lock → modal with resend button | ✓ |
| No | Just show tooltip | |

**User's choice:** Yes (Recommended)

---

## Password Reset Flow

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hour (Recommended) | Industry standard | ✓ |
| 24 hours | Same as verification | |
| 15 minutes | Very strict | |

**User's choice:** 1 hour (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, 3 per hour per email (Recommended) | Prevent abuse | ✓ |
| Yes, 1 per hour | Strict | |
| No limit | Unlimited | |

**User's choice:** Yes, 3 per hour per email (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Force re-login everywhere | ✓ |
| No | Keep existing sessions | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Token version counter (Recommended) | Add tokenVersion to User | ✓ |
| JWT blacklist | Store revoked tokens | |
| Short JWT expiry | Use 15-min JWTs | |

**User's choice:** Token version counter (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Name only (Recommended) | "Hallo {name}" | ✓ |
| Nothing | Generic greeting | |
| Partial email | "Account: j***@e***le.com" | |

**User's choice:** Name only (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Success page + login link (Recommended) | Consistent with verification | ✓ |
| Auto-login + dashboard | Seamless | |
| Login page | Redirect with message | |

**User's choice:** Success page + login link (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Proves email ownership | ✓ |
| No | Keep verification separate | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Security best practice | ✓ |
| No | No notification email | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | "Wasn't you? Click here" | ✓ |
| No | Just notify | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — generic response (Recommended) | Prevents enumeration | ✓ |
| Yes — tell user | Show "No account found" | |

**User's choice:** No — generic response (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | One-time use | ✓ |
| No | Can be reused until expiry | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Only latest token works | ✓ |
| No | All unexpired tokens valid | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Block same password | ✓ |
| No | Allow using same password | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — bilingual (Recommended) | Consistent with verification | ✓ |
| German only | Match existing template | |

**User's choice:** Yes — bilingual (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Real-time strength meter | ✓ |
| No | Just validation errors | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Eye icon to reveal password | ✓ |
| No | Standard masked input | |

**User's choice:** Yes (Recommended)

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Error page + resend button (Recommended) | Clear message with one-click resend | ✓ |
| Generic error page | "Link expired" with instructions | |
| Redirect to login | Show error toast | |

**User's choice:** Error page + resend button (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error (Recommended) | "Invalid link" — no details | ✓ |
| Specific error | Distinguish between expired, used, invalid | |

**User's choice:** Generic error (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Dark background, cyan accents | ✓ |
| No | Simple white error page | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + cooldown timer (Recommended) | Show remaining wait time | ✓ |
| Toast only | "Too many attempts" | |
| Inline error | Error text below button | |

**User's choice:** Toast + cooldown timer (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Track for security monitoring | ✓ |
| No | Don't log failed attempts | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Registration succeeds + warning (Recommended) | Show "Email could not be sent" | ✓ |
| Registration fails | Rollback user creation | |
| Silent success | Proceed as normal | |

**User's choice:** Registration succeeds + warning (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| No (Recommended for v1) | User can manually resend | |
| Yes, with backoff | Auto-retry 3 times | ✓ |

**User's choice:** Yes, with backoff

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 attempts (Recommended) | Initial + 3 retries (1s, 2s, 4s) | ✓ |
| 5 attempts | More persistent | |
| 2 attempts | Quick fail | |

**User's choice:** 3 attempts (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Error pages show both languages | ✓ |
| User language only | Show in user's language | |
| German only | Match UI defaults | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same as invalid (Recommended) | Generic error | ✓ |
| Specific message | "This link has already been used" | |

**User's choice:** Same as invalid (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same generic response (Recommended) | No info leak | ✓ |
| Block explicitly | "Cannot reset for this email domain" | |

**User's choice:** Same generic response (Recommended)

---

## Database Schema

| Option | Description | Selected |
|--------|-------------|----------|
| User model fields (Recommended) | Add fields to User | ✓ |
| Separate Token model | New AuthToken model | |

**User's choice:** User model fields (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing role field (Recommended) | emailVerified is separate boolean | ✓ |
| Expand role system | Add 'unverified', 'verified', 'admin' | |

**User's choice:** Keep existing role field (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Index on verificationTokenHash, resetTokenHash | ✓ |
| No | Table scan is fine | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | tokenVersion field | ✓ |
| No | Handle differently | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in User model (Recommended) | verificationSendCount + lastVerificationSentAt | ✓ |
| In-memory rate limiter | Use express-rate-limit | |

**User's choice:** Yes, in User model (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | resetSendCount + lastResetSentAt | ✓ |
| No | Only verification has limits | |

**User's choice:** Yes (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma deleteMany query (Recommended) | Daily job runs deleteMany | ✓ |
| Soft delete | Add deletedAt field | |

**User's choice:** Prisma deleteMany query (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes (Recommended) | Track last modification | ✓ |
| No | createdAt is sufficient | |

**User's choice:** Yes (Recommended)

---

## Claude's Discretion

- Exact wording of verification/reset email copy (within DE/EN bilingual structure)
- Password strength meter algorithm and visual styling
- Specific retry backoff timing (within 3 attempts guideline)
- Console log format for verification events

## Deferred Ideas

None — discussion stayed within phase scope.
