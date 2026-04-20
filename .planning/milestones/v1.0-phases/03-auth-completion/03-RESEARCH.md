# Phase 3: Auth Completion - Research

**Researched:** 2026-04-18
**Domain:** Email verification and password reset flows
**Confidence:** HIGH

## Summary

This phase adds email verification and password reset functionality to the existing NewsHub authentication system. The implementation builds on established patterns: singleton services (AuthService, EmailService), Prisma for database access, Zod for validation, and JWT for sessions. The existing EmailService already has `sendPasswordReset()` and `sendWelcome()` methods that need bilingual updates.

Key technical decisions from CONTEXT.md: soft block for unverified users (read-only + no AI features), 32-byte crypto random tokens stored as SHA-256 hashes, tokenVersion counter for session invalidation, and `disposable-email-domains` package for blocking throwaway emails. The cleanup job for unverified accounts runs on server startup and daily interval.

**Primary recommendation:** Extend existing User model with verification/reset fields, add token generation utilities using Node.js crypto module, update EmailService for bilingual templates, and create new frontend pages (VerifyEmail, ForgotPassword, ResetPassword) plus VerificationBanner component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Soft block for unverified users -- can login but see limited features, prompted to verify
- **D-02:** Verification link expires after 24 hours
- **D-03:** Resend verification allowed with rate limit: max 3 per hour
- **D-04:** Unverified users are read-only + no AI features -- can browse/read but no bookmarks, AI chat, preferences, or digests
- **D-05:** Verification prompt via persistent top banner (dismissible)
- **D-06:** Banner shows countdown of days remaining until account deletion
- **D-07:** Banner urgency escalates: cyan -> yellow (7 days) -> orange (3 days) -> red (1 day)
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
- **D-25:** Reset link expires after 1 hour
- **D-26:** Rate limit: max 3 reset requests per hour per email
- **D-27:** All existing sessions invalidated after password reset via tokenVersion counter
- **D-28:** Token version field in User model, incremented on reset, checked in auth middleware
- **D-29:** Reset email shows user's name only (no partial email for privacy)
- **D-30:** After successful reset, show success page with login link (no auto-login)
- **D-31:** Password reset also marks email as verified (if not already)
- **D-32:** Send confirmation email after password is changed
- **D-33:** Confirmation email includes "wasn't you?" recovery link (generates new reset token)
- **D-34:** Generic response on reset request: "If account exists, email sent" -- prevents enumeration
- **D-35:** Reset token is single-use -- invalidated after password is set
- **D-36:** Requesting new reset invalidates previous reset tokens
- **D-37:** New password cannot match old password
- **D-38:** Reset email is bilingual (DE/EN)
- **D-39:** Password strength indicator on reset form
- **D-40:** Show/hide password toggle on reset form
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
- **D-51:** Add fields to User model (not separate Token model)
- **D-52:** Keep existing role field for admin distinction, use emailVerified boolean for verification
- **D-53:** Add indexes on verificationTokenHash and resetTokenHash for fast lookups
- **D-54:** Hard delete unverified users after 30 days using Prisma deleteMany

### Claude's Discretion
- Exact wording of verification/reset email copy (within DE/EN bilingual structure)
- Password strength meter algorithm and visual styling
- Specific retry backoff timing (within 3 attempts guideline)
- Console log format for verification events

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User receives email verification after registration | Token generation via crypto.randomBytes, SHA-256 hash storage, EmailService.sendVerification(), VerificationBanner component, cleanup job for unverified accounts |
| AUTH-02 | User can reset password via email link | Token generation, EmailService.sendPasswordReset() bilingual update, tokenVersion for session invalidation, ForgotPassword and ResetPassword pages, password strength meter using @zxcvbn-ts/core |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Token generation & hashing | API / Backend | -- | Security-critical crypto operations must happen server-side |
| Token storage & validation | Database / Storage | API / Backend | Prisma User model stores hashed tokens, backend validates |
| Email sending | API / Backend | -- | SMTP operations via nodemailer in EmailService |
| Disposable email blocking | API / Backend | -- | Server-side validation at registration time |
| Session invalidation (tokenVersion) | API / Backend | -- | Auth middleware checks tokenVersion on every request |
| Verification banner | Frontend Server (SSR) | Browser / Client | Banner state derived from user.emailVerified in AuthContext |
| Password strength meter | Browser / Client | -- | Client-side UX feedback using zxcvbn-ts |
| Rate limiting (UI feedback) | Browser / Client | API / Backend | Backend enforces limits, frontend shows cooldown toast |
| Cleanup job scheduling | API / Backend | -- | setInterval-based job runs server-side |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| crypto (Node.js built-in) | -- | Token generation (randomBytes) and hashing (SHA-256) | [VERIFIED: Node.js docs] Native module, no dependencies, cryptographically secure |
| bcryptjs | 3.0.3 | Password hashing | [VERIFIED: existing] Already in project for password hashing |
| jsonwebtoken | 9.0.3 | JWT token management | [VERIFIED: existing] Already in project for session tokens |
| nodemailer | 8.0.5 | Email sending | [VERIFIED: existing] Already in project via EmailService |
| zod | 4.3.6 | Request validation | [VERIFIED: existing] Already in project for API validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| disposable-email-domains | 1.0.62 | Block throwaway email addresses | [VERIFIED: npm] Registration validation (D-16) |
| @zxcvbn-ts/core | 3.0.4 | Password strength estimation | [VERIFIED: npm] Reset form password meter (D-39) |
| @zxcvbn-ts/language-common | 3.0.4 | Common password dictionaries | [VERIFIED: npm] Required by @zxcvbn-ts/core |
| @zxcvbn-ts/language-en | 3.0.2 | English password dictionaries | [VERIFIED: npm] English word patterns |
| @zxcvbn-ts/language-de | 3.0.2 | German password dictionaries | [VERIFIED: npm] German word patterns (bilingual app) |
| node-cron | 4.2.1 | Scheduled cleanup jobs | [VERIFIED: npm] Alternative to setInterval for daily cleanup (D-18) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @zxcvbn-ts/core | zxcvbn (original) | Original is 4.4.2 but @zxcvbn-ts is TypeScript-native with better tree-shaking |
| disposable-email-domains | @usex/disposable-email-domains | More features (DNS validation) but heavier; simple list check is sufficient |
| node-cron | setInterval | node-cron has better cron syntax but setInterval is simpler for "daily at startup" pattern |

**Installation:**
```bash
npm install disposable-email-domains @zxcvbn-ts/core @zxcvbn-ts/language-common @zxcvbn-ts/language-en @zxcvbn-ts/language-de
npm install -D @types/disposable-email-domains
```

**Note:** node-cron is optional -- setInterval with 24-hour interval works for D-18. If more precise scheduling is needed later, add node-cron.

## Architecture Patterns

### System Architecture Diagram

```
Registration Flow:
  [User] --> [POST /api/auth/register]
              |
              v
         [Zod Validation]
              |
              v
         [Disposable Email Check] -- (block) --> [400 Error]
              |
              v
         [Create User + Generate Token]
              |
              +---> [Store Token Hash in DB]
              |
              +---> [Queue Verification Email]
                         |
                         v
                    [EmailService.sendVerification()]
                         |
                    (success/fail)
                         |
              +----------+----------+
              |                     |
              v                     v
         [Return JWT]         [Log Warning]
         (soft unverified)    (D-46: registration still succeeds)

Verification Flow:
  [User clicks /verify-email?token=xxx]
              |
              v
         [GET /api/auth/verify-email]
              |
              v
         [Hash token, lookup in DB]
              |
         +----+----+----+
         |         |    |
         v         v    v
      [Valid]  [Expired] [Invalid/Used]
         |         |         |
         v         v         v
    [Set emailVerified=true]  [Show resend page]  [Generic error]
    [Clear token fields]
         |
         v
    [Redirect to success page]

Password Reset Flow:
  [User] --> [POST /api/auth/request-reset]
              |
              v
         [Rate limit check]
              |
              v
         [Lookup user by email]
              |
         +----+----+
         |         |
      [Exists]  [Not found]
         |         |
         v         v
    [Generate token]  [Same response (D-34)]
    [Email reset link]     |
         |                 |
         v-----------------+
    [Generic success: "If account exists, email sent"]

  [User clicks /reset-password?token=xxx]
              |
              v
         [Validate token (hashed lookup)]
              |
              v
         [Show reset form with password strength meter]
              |
              v
         [POST /api/auth/reset-password]
              |
              v
         [Validate: not same as old, meets requirements]
              |
              v
         [Update password, increment tokenVersion]
         [Clear reset token fields]
         [Set emailVerified=true (D-31)]
              |
              v
         [Send confirmation email with "wasn't you?" link]
              |
              v
         [Redirect to success page]

Session Invalidation:
  [Every authenticated request]
              |
              v
         [authMiddleware]
              |
              v
         [Decode JWT (has tokenVersion)]
              |
              v
         [Lookup user.tokenVersion in DB]
              |
              v
         [JWT.tokenVersion !== user.tokenVersion?]
              |
         +----+----+
         |         |
       [Match]  [Mismatch]
         |         |
         v         v
    [Continue]  [401 Unauthorized]
```

### Recommended Project Structure
```
server/
├── services/
│   ├── authService.ts         # Extended with verification/reset methods
│   ├── emailService.ts        # Extended with bilingual verification emails
│   └── cleanupService.ts      # NEW: Unverified account cleanup job
├── routes/
│   └── auth.ts                # Extended with new endpoints
├── utils/
│   ├── tokenUtils.ts          # NEW: Token generation and hashing utilities
│   └── disposableEmail.ts     # NEW: Disposable email domain checker

src/
├── pages/
│   ├── VerifyEmail.tsx        # NEW: Verification success/error page
│   ├── ForgotPassword.tsx     # NEW: Request password reset form
│   └── ResetPassword.tsx      # NEW: Set new password form
├── components/
│   ├── VerificationBanner.tsx # NEW: Persistent banner for unverified users
│   ├── PasswordStrengthMeter.tsx # NEW: Visual password strength indicator
│   ├── ResendVerificationModal.tsx # NEW: Modal for resending verification
│   └── LockedFeature.tsx      # NEW: Lock icon wrapper for disabled features
├── contexts/
│   └── AuthContext.tsx        # Extended with emailVerified state
└── hooks/
    └── useVerificationStatus.ts # NEW: Hook for verification state management
```

### Pattern 1: Secure Token Generation and Storage
**What:** Generate cryptographically secure tokens and store only their hashes
**When to use:** Any token that grants access (verification, reset, API keys)
**Example:**
```typescript
// Source: https://nodejs.org/api/crypto.html [CITED]
import { randomBytes, createHash } from 'crypto';

function generateToken(): { token: string; hash: string } {
  // 32 bytes = 64 hex characters (D-13)
  const token = randomBytes(32).toString('hex');
  // Store only the hash (D-14)
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### Pattern 2: Rate Limiting with Database Fields
**What:** Track request counts and timestamps per user for rate limiting
**When to use:** Verification resends (D-03), password reset requests (D-26)
**Example:**
```typescript
// Source: Project pattern [VERIFIED: existing codebase]
async function checkRateLimit(
  userId: string,
  countField: 'verificationSendCount' | 'resetSendCount',
  lastSentField: 'lastVerificationSentAt' | 'lastResetSentAt',
  maxPerHour: number
): Promise<{ allowed: boolean; minutesRemaining?: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false };

  const lastSent = user[lastSentField];
  const count = user[countField];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Reset counter if last send was more than an hour ago
  if (!lastSent || lastSent < oneHourAgo) {
    return { allowed: true };
  }

  if (count >= maxPerHour) {
    const minutesRemaining = Math.ceil(
      (lastSent.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000)
    );
    return { allowed: false, minutesRemaining };
  }

  return { allowed: true };
}
```

### Pattern 3: Token Version for Session Invalidation
**What:** Include tokenVersion in JWT, check against DB on each request
**When to use:** Invalidating all sessions after password reset (D-27, D-28)
**Example:**
```typescript
// Source: Project pattern, JWT best practices [ASSUMED]
// In generateToken:
const payload = {
  userId: user.id,
  email: user.email,
  tokenVersion: user.tokenVersion, // Include in JWT
};

// In authMiddleware:
const payload = jwt.verify(token, JWT_SECRET);
const user = await prisma.user.findUnique({ where: { id: payload.userId } });
if (user.tokenVersion !== payload.tokenVersion) {
  return res.status(401).json({ error: 'Session invalidated' });
}
```

### Pattern 4: Bilingual Email Templates
**What:** Single email with both DE and EN content sections
**When to use:** All transactional emails (D-08, D-38)
**Example:**
```typescript
// Source: Claude's discretion [ASSUMED]
function generateBilingualEmail(params: {
  name: string;
  verifyUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="background-color: #0a0a0f; font-family: sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #00f0ff;">
    <!-- German Section -->
    <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #374151;">
      <h2 style="color: #00f0ff;">Bestaetige deine E-Mail</h2>
      <p style="color: #e5e7eb;">Hallo ${params.name},</p>
      <p style="color: #9ca3af;">Klicke auf den Button, um dein Konto zu verifizieren und alle Features freizuschalten:</p>
      <ul style="color: #9ca3af;">
        <li>KI-Chat und Analyse</li>
        <li>Lesezeichen speichern</li>
        <li>Personalisierte Einstellungen</li>
      </ul>
      <a href="${params.verifyUrl}" style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Jetzt verifizieren
      </a>
    </div>

    <!-- English Section -->
    <div>
      <h2 style="color: #00f0ff;">Verify your email</h2>
      <p style="color: #e5e7eb;">Hello ${params.name},</p>
      <p style="color: #9ca3af;">Click the button below to verify your account and unlock all features:</p>
      <ul style="color: #9ca3af;">
        <li>AI Chat & Analysis</li>
        <li>Save Bookmarks</li>
        <li>Personalized Settings</li>
      </ul>
      <a href="${params.verifyUrl}" style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Verify Now
      </a>
    </div>
  </div>
</body>
</html>
  `;
}
```

### Anti-Patterns to Avoid
- **Storing plaintext tokens:** Always hash tokens before storage (D-14). Use SHA-256 for lookup tokens, bcrypt for passwords.
- **Timing attacks on token lookup:** Use constant-time comparison when validating tokens. Node.js `crypto.timingSafeEqual()` prevents timing-based enumeration.
- **Email enumeration:** Always return same response regardless of whether email exists (D-34, D-50).
- **Using Math.random() for tokens:** Never use `Math.random()` for security-sensitive values. Always use `crypto.randomBytes()`.
- **Blocking event loop with sync crypto:** Use async methods for password hashing in production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random token generation | Custom RNG | `crypto.randomBytes(32)` | [CITED: Node.js docs] Cryptographically secure, OS entropy source |
| Password strength | Regex rules | @zxcvbn-ts/core | [CITED: zxcvbn-ts GitHub] Pattern matching, dictionary attacks, entropy estimation |
| Disposable email detection | Manual domain list | disposable-email-domains | [CITED: npm] 3000+ domains maintained, updated regularly |
| Email sending | HTTP to SMTP | nodemailer | [VERIFIED: existing] Already in project, handles encoding, attachments |
| Token hashing | MD5 or custom hash | SHA-256 via crypto | [CITED: Node.js docs] Collision-resistant, standard |

**Key insight:** Security primitives (RNG, hashing, password strength) are deceptively complex. Edge cases include timing attacks, insufficient entropy, and rainbow tables. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Token Hash Collisions in Database Lookups
**What goes wrong:** Looking up token by plaintext value instead of hash
**Why it happens:** Confusion between the sent token and stored hash
**How to avoid:** Always hash incoming token before database lookup
**Warning signs:** "Token not found" errors despite valid email clicks

### Pitfall 2: Race Conditions on Token Invalidation
**What goes wrong:** User generates two verification emails, uses first token after second is generated
**Why it happens:** Previous token hash remains valid in DB
**How to avoid:** D-15 requires invalidating (nulling) previous token when generating new one. Use atomic Prisma update.
**Warning signs:** Old verification links still working

### Pitfall 3: Session Persists After Password Reset
**What goes wrong:** Attacker with stolen session continues accessing account after password reset
**Why it happens:** JWT doesn't check tokenVersion, or tokenVersion not incremented
**How to avoid:** D-27/D-28 require tokenVersion check in authMiddleware. Verify with test: login, reset password, original session should fail.
**Warning signs:** "Logout all devices" doesn't work

### Pitfall 4: Email Timing Leaks User Existence
**What goes wrong:** Reset request responds faster for non-existent emails
**Why it happens:** Early return when user not found, skipping email send
**How to avoid:** D-34 requires same response and similar timing. Add small delay or async email send regardless of user existence.
**Warning signs:** Security scan flags timing difference

### Pitfall 5: Verification Banner Flashes on Load
**What goes wrong:** Banner briefly appears for verified users while auth loads
**Why it happens:** isLoading state not properly handled in banner visibility
**How to avoid:** Hide banner while `isLoading` is true in AuthContext
**Warning signs:** Users report seeing banner despite being verified

### Pitfall 6: Cleanup Job Deletes Active Session Users
**What goes wrong:** User registers, receives verification email, but account deleted before they verify
**Why it happens:** Cleanup job doesn't account for recent registrations
**How to avoid:** D-17 specifies 30-day window. Ensure query filters by `createdAt < 30_DAYS_AGO AND emailVerified = false`
**Warning signs:** Users complain about "account doesn't exist" right after registering

## Code Examples

### Token Generation Utility
```typescript
// Source: Node.js crypto docs [CITED: https://nodejs.org/api/crypto.html]
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

export function generateSecureToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex'); // 64 chars (D-13)
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTokenHash(token: string, storedHash: string): boolean {
  const tokenHash = hashToken(token);
  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(tokenHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  return timingSafeEqual(tokenBuffer, storedBuffer);
}
```

### Disposable Email Check
```typescript
// Source: disposable-email-domains npm [CITED: https://www.npmjs.com/package/disposable-email-domains]
import disposableDomains from 'disposable-email-domains';

const disposableSet = new Set(disposableDomains);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableSet.has(domain) : false;
}
```

### Verification Email Send with Retry
```typescript
// Source: Project pattern [VERIFIED: existing emailService.ts]
async function sendVerificationWithRetry(
  email: string,
  name: string,
  token: string,
  attempt = 1
): Promise<boolean> {
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [1000, 2000, 4000]; // D-47

  try {
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    await emailService.send(email, 'Verify your NewsHub account',
      generateBilingualVerificationEmail({ name, verifyUrl }));

    logger.info(`verification:sent email=${email}`);
    return true;
  } catch (error) {
    logger.error(`verification:send_failed email=${email} attempt=${attempt}`, error);

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
      return sendVerificationWithRetry(email, name, token, attempt + 1);
    }

    return false;
  }
}
```

### Password Strength Meter Component
```typescript
// Source: @zxcvbn-ts/core docs [CITED: https://github.com/zxcvbn-ts/zxcvbn]
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import * as zxcvbnDePackage from '@zxcvbn-ts/language-de';

// Initialize once on app load
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
    ...zxcvbnDePackage.dictionary,
  },
};
zxcvbnOptions.setOptions(options);

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_COLORS = ['#ff0044', '#ff6600', '#ffee00', '#00ff88', '#00f0ff'];
const STRENGTH_LABELS = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const result = password ? zxcvbn(password) : null;
  const score = result?.score ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: i <= score ? STRENGTH_COLORS[score] : '#374151',
            }}
          />
        ))}
      </div>
      {password && (
        <p className="text-xs" style={{ color: STRENGTH_COLORS[score] }}>
          {STRENGTH_LABELS[score]}
          {result?.feedback.warning && ` - ${result.feedback.warning}`}
        </p>
      )}
    </div>
  );
}
```

### Verification Banner Component
```typescript
// Source: Project pattern [VERIFIED: existing OfflineBanner.tsx]
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

function getDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const deletionDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining <= 1) return '#ff0044'; // red (D-07)
  if (daysRemaining <= 3) return '#ff6600'; // orange
  if (daysRemaining <= 7) return '#ffee00'; // yellow
  return '#00f0ff'; // cyan (default)
}

export function VerificationBanner() {
  const { user, isLoading } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show while loading, if verified, or if dismissed
  if (isLoading || !user || user.emailVerified || isDismissed) {
    return null;
  }

  const daysRemaining = getDaysRemaining(user.createdAt);
  const urgencyColor = getUrgencyColor(daysRemaining);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="border-b"
        style={{ borderColor: `${urgencyColor}30` }}
      >
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ backgroundColor: `${urgencyColor}10` }}
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" style={{ color: urgencyColor }} />
            <div>
              <span className="text-sm font-mono text-white">
                Verify your email to unlock all features
              </span>
              <span className="text-xs ml-2" style={{ color: urgencyColor }}>
                ({daysRemaining} days remaining)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* Open resend modal */}}
              className="px-4 py-1.5 rounded text-sm font-mono"
              style={{ backgroundColor: urgencyColor, color: '#0a0a0f' }}
            >
              Resend Email
            </button>
            <button onClick={() => setIsDismissed(true)}>
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MD5/SHA1 for tokens | SHA-256 minimum | 2015+ | MD5 collision attacks make it unsuitable for security |
| Plaintext token storage | Hash-only storage | Always best practice | Prevents database breach from exposing valid tokens |
| Regex password rules | Entropy-based (zxcvbn) | 2016+ (Dropbox paper) | Better UX, catches dictionary/pattern attacks |
| Email-based rate limiting | Per-user + per-email rate limiting | Always | Prevents both spam and enumeration attacks |
| Magic links (passwordless) | Still requires verification | N/A | Magic links are alternative, not replacement for verification |

**Deprecated/outdated:**
- **MD5 for any security purpose:** Collision attacks make it unsuitable
- **SHA1 for tokens:** While not broken like MD5, SHA-256 is standard
- **Password complexity rules (8+ chars, special char):** zxcvbn provides better security UX

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JWT tokenVersion pattern for session invalidation is standard | Architecture Patterns | If JWT library doesn't support custom claims, would need alternative approach |
| A2 | setInterval is sufficient for daily cleanup job | Standard Stack | If server restarts frequently, jobs might cluster; node-cron would be safer |
| A3 | Bilingual email structure (DE/EN in same email) is acceptable UX | Code Examples | Users might prefer single-language emails; would need user preference |

## Open Questions

1. **Email provider configuration**
   - What we know: EmailService uses nodemailer with SMTP config from env vars
   - What's unclear: Is SMTP configured in production? What's the sender domain?
   - Recommendation: Verify SMTP credentials work before deployment; test with real emails

2. **Rate limit window reset behavior**
   - What we know: D-03 says "max 3 per hour" with count and lastSentAt fields
   - What's unclear: Does hour window slide or reset at fixed intervals?
   - Recommendation: Implement sliding window (reset count if last sent > 1 hour ago)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| SMTP credentials | Email sending | Unknown | N/A | Console log emails in dev; warn user in prod |
| Node.js crypto | Token generation | Yes | Built-in | -- |
| SQLite/Prisma | Token storage | Yes | Existing | -- |

**Missing dependencies with no fallback:**
- SMTP credentials for production email delivery (verify before deployment)

**Missing dependencies with fallback:**
- If SMTP not configured, D-46 allows registration to succeed with warning

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | bcrypt for passwords, tokenVersion for session invalidation |
| V3 Session Management | Yes | JWT with tokenVersion, 7-day expiry |
| V4 Access Control | Yes | emailVerified check for feature access |
| V5 Input Validation | Yes | Zod schemas for all endpoints |
| V6 Cryptography | Yes | crypto.randomBytes for tokens, SHA-256 for hashing |

### Known Threat Patterns for Authentication

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Email enumeration | Information Disclosure | Generic responses (D-34, D-50) |
| Token brute force | Elevation of Privilege | 32-byte random tokens (D-13), rate limiting |
| Timing attacks | Information Disclosure | timingSafeEqual for token comparison |
| Session hijacking | Spoofing | tokenVersion invalidation (D-27, D-28) |
| Disposable email abuse | Spoofing | disposable-email-domains check (D-16) |
| Replay attacks | Tampering | Single-use tokens (D-35) |

## Sources

### Primary (HIGH confidence)
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) - randomBytes, createHash, timingSafeEqual
- [disposable-email-domains npm](https://www.npmjs.com/package/disposable-email-domains) - package usage and version
- [@zxcvbn-ts/core GitHub](https://github.com/zxcvbn-ts/zxcvbn) - TypeScript password strength library
- Existing codebase files (authService.ts, emailService.ts, auth.ts) - established patterns

### Secondary (MEDIUM confidence)
- [npm registry](https://www.npmjs.com) - Package version verification for all dependencies

### Tertiary (LOW confidence)
- None - all critical claims verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified against npm registry, existing patterns confirmed
- Architecture: HIGH - Follows established project patterns (singleton services, Prisma, Zod)
- Pitfalls: HIGH - Based on common auth implementation issues and CONTEXT.md decisions
- Security: HIGH - Follows OWASP ASVS guidelines, crypto best practices from Node.js docs

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days - stable domain, locked decisions from CONTEXT.md)
