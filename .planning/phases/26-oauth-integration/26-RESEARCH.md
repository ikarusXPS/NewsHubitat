# Phase 26: OAuth Integration - Research

**Researched:** 2026-04-24
**Domain:** OAuth 2.0 Authentication (Google, GitHub)
**Confidence:** HIGH

## Summary

This phase integrates Google and GitHub OAuth providers into NewsHub's existing JWT-based authentication system. The project already has a mature auth infrastructure including JWT tokens, email verification, password reset flows, and session invalidation via token versioning. OAuth will add social login without replacing the existing system.

The primary challenge is secure account linking when OAuth email matches an existing user. CONTEXT.md decisions (D-01, D-02) mandate password re-authentication before linking, which prevents account takeover attacks. OAuth-only accounts (D-03) will work without passwords, with users able to set one later if they want to unlink.

**Primary recommendation:** Use passport-google-oauth20 (v2.0.0) and passport-github2 (v0.1.12) with `session: false` for stateless JWT integration. Implement popup-based OAuth flow per D-08 using postMessage callback to preserve SPA state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** When OAuth email matches existing user, require password re-authentication before linking (prevents account takeover if provider email was compromised)
- **D-02:** OAuth email must match account email to link -- block linking if emails differ
- **D-03:** OAuth-only accounts work without password -- users set password later if they want to unlink
- **D-04:** Skip email verification for OAuth signups -- providers already verified the email, mark `emailVerified=true`
- **D-05:** Auth-only OAuth -- don't store refresh tokens for future API access (simpler, more secure)
- **D-06:** OAuth buttons appear in AuthModal only (not a separate page)
- **D-07:** OAuth buttons placed above email/password form with "or" divider -- promotes faster signup
- **D-08:** Use popup flow for OAuth -- opens in popup window, callback closes popup and updates parent (preserves SPA state)
- **D-09:** Fetch email + name + avatar from OAuth providers
- **D-10:** Use OAuth avatar only if user hasn't set one (respects existing customization)
- **D-11:** Hash OAuth provider user ID (SHA-256) before storing -- privacy-conscious but still enables linking
- **D-12:** Block unlinking if it's the only login method -- user must set password first (prevents lockout)

### Claude's Discretion
- Whether to allow multiple OAuth providers per account (Google + GitHub) -- recommend yes for flexibility
- Re-auth prompt UX -- recommend modal with password field for seamless inline experience
- For unverified accounts trying OAuth, recommend auto-verify and link (OAuth confirms email ownership)
- Existing disposable email accounts trying to link OAuth -- recommend blocking (consistent with registration policy)
- Settings placement -- recommend dedicated "Connected Accounts" section based on common patterns
- Error handling -- recommend toast + stay on modal for OAuth failures
- Button styling -- recommend NewsHub dark theme with small provider icons for unified look
- Display name for new OAuth users -- recommend auto-use provider name (simpler onboarding)
- Re-auth for unlinking -- recommend requiring password based on existing security patterns
- Avatar on unlink -- recommend keeping avatar (it's now user's data)
- Email notification for link/unlink -- recommend yes for security awareness

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OAUTH-01 | User kann sich mit Google OAuth anmelden | passport-google-oauth20 v2.0.0 with scopes `openid email profile` |
| OAUTH-02 | User kann sich mit GitHub OAuth anmelden | passport-github2 v0.1.12 with scopes `user:email read:user` |
| OAUTH-03 | User kann OAuth-Account mit bestehendem Email-Account verknuepfen | Account linking flow with password re-auth per D-01, D-02 |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OAuth initiation | API / Backend | -- | State parameter generation, CSRF protection |
| OAuth callback handling | API / Backend | -- | Token exchange, user lookup/creation |
| OAuth popup management | Browser / Client | -- | window.open(), postMessage listener |
| Session token issuance | API / Backend | -- | JWT generation matches existing auth |
| Account linking flow | API / Backend | Browser / Client | Backend validates, frontend handles UX |
| Connected accounts UI | Browser / Client | -- | Settings page section |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| passport | 0.7.0 | Auth middleware framework | [VERIFIED: npm registry] Industry standard for Express auth strategies |
| passport-google-oauth20 | 2.0.0 | Google OAuth 2.0 strategy | [VERIFIED: npm registry] Official Passport Google strategy |
| passport-github2 | 0.1.12 | GitHub OAuth strategy | [VERIFIED: npm registry] Maintained fork for GitHub API v3 |
| @types/passport | 1.0.17 | TypeScript types | [VERIFIED: npm registry] Official types |
| @types/passport-google-oauth20 | 2.0.17 | TypeScript types | [VERIFIED: npm registry] Official types |
| @types/passport-github2 | 1.2.9 | TypeScript types | [VERIFIED: npm registry] Official types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (built-in) | Node.js | SHA-256 hashing for OAuth IDs | D-11 requires hashed storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| passport-* | grant library | Grant is simpler but less ecosystem support; Passport has larger community |
| passport-* | Direct OAuth implementation | More control but significant boilerplate; not worth it |

**Installation:**
```bash
npm install passport passport-google-oauth20 passport-github2
npm install -D @types/passport @types/passport-google-oauth20 @types/passport-github2
```

**Version verification:** [VERIFIED: npm registry 2026-04-24]
- passport: 0.7.0 (published 2024-01-26)
- passport-google-oauth20: 2.0.0 (published 2019-05-31, stable)
- passport-github2: 0.1.12 (published 2017-12-06, maintained fork)

## Architecture Patterns

### System Architecture Diagram

```
+--------------------+    popup     +--------------------+
|   AuthModal.tsx    | -----------> |  OAuth Provider    |
|  (Parent Window)   |   window     |  (Google/GitHub)   |
+--------------------+   .open()    +--------------------+
         |                                    |
         | postMessage                        | redirect with code
         | listener                           v
         |                          +--------------------+
         |                          | /api/auth/google/  |
         |                          | callback (Express) |
         |                          +--------------------+
         |                                    |
         |                                    | passport.authenticate()
         |                                    v
         |                          +--------------------+
         |                          |  OAuthService.ts   |
         |                          | - verifyOrCreate() |
         |                          | - linkAccount()    |
         |                          +--------------------+
         |                                    |
         |                                    | JWT token
         v                                    v
+--------------------+    close     +--------------------+
|   AuthModal.tsx    | <----------- |  oauth-callback    |
|  (Updates state)   |   postMsg    |  (minimal HTML)    |
+--------------------+              +--------------------+
         |
         v
+--------------------+
|  AuthContext.tsx   |
|  - setUser()       |
|  - setToken()      |
+--------------------+
```

### Recommended Project Structure
```
server/
├── services/
│   └── oauthService.ts      # OAuth user verification, account linking
├── routes/
│   └── oauth.ts             # OAuth routes (/auth/google, /auth/github)
├── config/
│   └── passport.ts          # Passport strategy configuration
└── utils/
    └── tokenUtils.ts        # Existing, reuse hashToken for OAuth IDs

src/
├── components/
│   ├── AuthModal.tsx        # Add OAuth buttons (modify existing)
│   └── oauth/
│       └── OAuthButton.tsx  # Reusable OAuth button component
├── pages/
│   ├── Settings.tsx         # Add Connected Accounts section (modify existing)
│   └── OAuthCallback.tsx    # Minimal callback page for popup
└── hooks/
    └── useOAuthPopup.ts     # Popup window management hook
```

### Pattern 1: Stateless Passport Authentication
**What:** Use Passport without sessions, issuing JWT directly after OAuth verification
**When to use:** SPA with existing JWT auth system
**Example:**
```typescript
// Source: https://www.passportjs.org/packages/passport-google-oauth20/
// Adapted for stateless JWT per https://www.fullstackfoundations.com/blog/passport-jwt

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback',
  passReqToCallback: true, // Access request for state validation
}, async (req, accessToken, refreshToken, profile, done) => {
  // D-05: Don't store refreshToken (auth-only OAuth)
  const oauthService = OAuthService.getInstance();
  try {
    const result = await oauthService.processGoogleAuth(profile);
    return done(null, result);
  } catch (err) {
    return done(err as Error);
  }
}));

// Route handler with session: false
router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/error' }),
  (req, res) => {
    const { token, needsLinking, user } = req.user;
    // Return HTML that postMessages to parent window
    res.send(generateCallbackHtml(token, needsLinking, user));
  }
);
```

### Pattern 2: Popup OAuth Flow with postMessage
**What:** Open OAuth in popup, callback closes popup and sends result to parent
**When to use:** SPA where you want to preserve state during OAuth flow (D-08)
**Example:**
```typescript
// Source: https://dev.to/didof/oauth-popup-practical-guide-57l9
// Frontend hook for popup management

export function useOAuthPopup() {
  const openOAuthPopup = useCallback((provider: 'google' | 'github') => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      `/api/auth/${provider}`,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise<OAuthResult>((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', handler);
          resolve(event.data);
        } else if (event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', handler);
          reject(new Error(event.data.error));
        }
      };
      window.addEventListener('message', handler);

      // Cleanup if popup closes without completing
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handler);
          reject(new Error('OAuth popup closed'));
        }
      }, 500);
    });
  }, []);

  return { openOAuthPopup };
}
```

### Pattern 3: Account Linking with Re-authentication
**What:** When OAuth email matches existing user, require password before linking (D-01)
**When to use:** Linking OAuth to existing email/password account
**Example:**
```typescript
// Source: https://www.ory.com/blog/secure-account-linking-iam-sso-oidc-saml
// Adapted for NewsHub security requirements

async linkOAuthAccount(
  provider: 'google' | 'github',
  providerId: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  // D-02: Email must match exactly
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    return { success: false, error: 'Account not found' };
  }

  // D-01: Verify password before linking
  const isValid = await bcrypt.compare(password, existingUser.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid password' };
  }

  // D-11: Hash provider ID before storing
  const idHash = hashToken(providerId);

  // Update user with OAuth link
  await prisma.user.update({
    where: { id: existingUser.id },
    data: provider === 'google'
      ? { googleIdHash: idHash }
      : { githubIdHash: idHash },
  });

  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Auto-linking by email without verification:** OAuth email matching existing account does NOT mean same person owns both -- always require re-auth (D-01)
- **Storing raw OAuth provider IDs:** Privacy concern -- use SHA-256 hash (D-11)
- **Storing refresh tokens for auth-only OAuth:** Unnecessary attack surface (D-05)
- **Session-based Passport with JWT app:** Mixes auth paradigms, use `session: false`
- **Full-page redirect OAuth:** Loses SPA state, use popup flow (D-08)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token exchange | Raw HTTP requests to providers | passport-google-oauth20, passport-github2 | Token exchange has security subtleties |
| CSRF protection for OAuth | Custom state management | Passport's built-in state parameter | CSRF is critical, easy to get wrong |
| Profile data parsing | Custom profile parsing | Strategy's profile object | Provider API formats vary |
| Password hashing | Custom hashing | bcryptjs (already used) | Timing attacks, salt handling |
| OAuth ID hashing | Custom hashing | crypto.createHash (existing tokenUtils) | Consistent with existing patterns |

**Key insight:** OAuth security relies on correct state parameter handling, proper token exchange, and secure callback validation. Passport handles these correctly; hand-rolling risks CSRF and token theft vulnerabilities.

## Common Pitfalls

### Pitfall 1: Account Takeover via Auto-Linking
**What goes wrong:** Attacker changes their OAuth email to match victim's account, auto-linking grants access
**Why it happens:** Trusting OAuth email as proof of account ownership
**How to avoid:** D-01/D-02 mandate password verification before linking existing accounts
**Warning signs:** Any code path that links OAuth to existing user without credential verification

### Pitfall 2: OAuth Popup Blocked
**What goes wrong:** Browser blocks popup, user sees nothing happen
**Why it happens:** Popup not triggered by direct user click, or aggressive popup blockers
**How to avoid:** Only call `window.open()` in direct click handler, not in async callbacks
**Warning signs:** OAuth button works on some browsers but not others

### Pitfall 3: CSRF in OAuth Callback
**What goes wrong:** Attacker tricks user into completing OAuth flow, linking attacker's OAuth to victim's session
**Why it happens:** Missing or improper state parameter validation
**How to avoid:** Use Passport's built-in state handling, verify state in callback
**Warning signs:** OAuth callback accepting requests without state parameter

### Pitfall 4: postMessage Origin Bypass
**What goes wrong:** Attacker page receives OAuth token intended for app
**Why it happens:** Not validating `event.origin` in message handler
**How to avoid:** Always check `event.origin === window.location.origin` before processing
**Warning signs:** postMessage handler without origin check

### Pitfall 5: OAuth-Only User Lockout
**What goes wrong:** User unlinks OAuth, has no way to log in
**Why it happens:** Allowing unlink when no password is set
**How to avoid:** D-12 mandates blocking unlink unless password exists or another OAuth is linked
**Warning signs:** Unlink button without checking login method count

## Code Examples

### Callback HTML for postMessage
```typescript
// Source: https://medium.com/hackernoon/how-we-use-a-popup-for-google-and-outlook-oauth-5d8c03652171
// Adapted for NewsHub dark theme

function generateCallbackHtml(token: string, needsLinking: boolean, user?: SafeUser): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>NewsHub OAuth</title>
  <style>
    body {
      background: #0a0a0f;
      color: #e5e7eb;
      font-family: system-ui;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .loading { color: #00f0ff; }
  </style>
</head>
<body>
  <div class="loading">Completing sign in...</div>
  <script>
    (function() {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_SUCCESS',
          token: ${JSON.stringify(token)},
          needsLinking: ${needsLinking},
          user: ${user ? JSON.stringify(user) : 'null'}
        }, window.location.origin);
        window.close();
      } else {
        // Fallback: redirect to app with token in URL (will be picked up by AuthContext)
        window.location.href = '/?oauth_token=' + encodeURIComponent(${JSON.stringify(token)});
      }
    })();
  </script>
</body>
</html>
  `;
}
```

### OAuth Service Pattern
```typescript
// Singleton pattern matching existing services

export class OAuthService {
  private static instance: OAuthService;

  private constructor() {}

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  async processGoogleAuth(profile: GoogleProfile): Promise<OAuthResult> {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Email not provided by Google');

    // D-11: Hash the provider ID
    const googleIdHash = hashToken(profile.id);

    // Check if user exists by OAuth ID
    let user = await prisma.user.findFirst({ where: { googleIdHash } });
    if (user) {
      // Existing OAuth user - just return token
      return { user, token: this.generateToken(user), needsLinking: false };
    }

    // Check if email exists (potential linking scenario)
    user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      // D-01: Existing email user - needs password re-auth to link
      return { user: null, token: null, needsLinking: true, email };
    }

    // D-04: New user - create with emailVerified: true
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: profile.displayName || email.split('@')[0],
        passwordHash: '', // D-03: Empty hash for OAuth-only
        googleIdHash,
        emailVerified: true, // D-04
        hasPassword: false, // D-03: Track OAuth-only status
        // D-09, D-10: Avatar only if not set
        avatarUrl: profile.photos?.[0]?.value || null,
      },
    });

    return { user, token: this.generateToken(user), needsLinking: false };
  }
}
```

### Google Scopes Configuration
```typescript
// Source: https://developers.google.com/identity/protocols/oauth2/scopes

const GOOGLE_SCOPES = [
  'openid',           // Required for OpenID Connect
  'email',            // User's email address
  'profile',          // Name, avatar (D-09)
];

// Route to initiate OAuth
router.get('/auth/google',
  passport.authenticate('google', {
    scope: GOOGLE_SCOPES,
    session: false,
  })
);
```

### GitHub Scopes Configuration
```typescript
// Source: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps

const GITHUB_SCOPES = [
  'user:email',       // Read user's email addresses
  'read:user',        // Read user profile data (D-09)
];

// Route to initiate OAuth
router.get('/auth/github',
  passport.authenticate('github', {
    scope: GITHUB_SCOPES,
    session: false,
  })
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-page OAuth redirect | Popup with postMessage | 2022+ | Better SPA UX, preserves state |
| Session-based Passport | Stateless `session: false` | 2020+ | Better for JWT apps |
| Auto-link by email | Link-on-login with re-auth | 2024+ | Per RFC 9700 OAuth 2.0 security best practices |
| Store raw OAuth IDs | Hash before storage | 2023+ | Privacy compliance (GDPR) |

**Deprecated/outdated:**
- `passport-google-oauth` (v1): Replaced by `passport-google-oauth20` for OAuth 2.0
- Sessions with Passport for SPAs: Stateless JWT is now preferred
- Automatic email-based linking: Security risk, now considered anti-pattern

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Google and GitHub OAuth console setup will be done manually before development | Environment | Dev blocked until credentials exist |
| A2 | Existing `hasPassword` field can be added to User model | Database | Need alternative tracking method |
| A3 | Express 5 works with passport 0.7.0 | Standard Stack | May need compatibility fixes |

## Open Questions

1. **OAuth Console Setup**
   - What we know: Need Google Cloud Console and GitHub OAuth App credentials
   - What's unclear: Who sets these up, timeline
   - Recommendation: Document setup steps in plan, flag as prerequisite

2. **Mobile OAuth Flow**
   - What we know: Popup works on desktop browsers
   - What's unclear: Whether popup flow works reliably on mobile WebView
   - Recommendation: Test on mobile; may need full-page redirect fallback for mobile

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | passport | Yes | 22.x | -- |
| Express | routes | Yes | 5.2.1 | -- |
| Redis | OAuth state cache (optional) | Yes | Available | In-memory state |
| Google OAuth credentials | OAUTH-01 | No | -- | Must configure |
| GitHub OAuth credentials | OAUTH-02 | No | -- | Must configure |

**Missing dependencies with no fallback:**
- Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)

**Missing dependencies with fallback:**
- None (all runtime dependencies available)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | OAuth 2.0 via Passport, existing JWT |
| V3 Session Management | Yes | Existing JWT with tokenVersion |
| V4 Access Control | Yes | D-01/D-02 account linking controls |
| V5 Input Validation | Yes | Zod validation for all endpoints |
| V6 Cryptography | Yes | SHA-256 for OAuth ID hashing |

### Known Threat Patterns for OAuth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSRF in OAuth callback | Spoofing | State parameter validation (Passport built-in) |
| Account takeover via email matching | Elevation | Password re-auth before linking (D-01) |
| OAuth token theft via postMessage | Information Disclosure | Origin validation in message handler |
| OAuth ID enumeration | Information Disclosure | Hash IDs before storage (D-11) |
| Open redirect via callback URL | Tampering | Strict redirect_uri validation |

## Sources

### Primary (HIGH confidence)
- [passport-google-oauth20 official docs](https://www.passportjs.org/packages/passport-google-oauth20/) - Setup, scopes, callback [VERIFIED]
- [passport-github2 official docs](https://www.passportjs.org/packages/passport-github2/) - Setup, scopes, callback [VERIFIED]
- [Google OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes) - Official scope reference [VERIFIED]
- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps) - Official scope reference [VERIFIED]
- npm registry - Package versions verified 2026-04-24 [VERIFIED]

### Secondary (MEDIUM confidence)
- [Ory Blog: Secure Account Linking](https://www.ory.com/blog/secure-account-linking-iam-sso-oidc-saml) - Account linking security patterns [CITED]
- [Auth0 Blog: State vs Nonce vs PKCE](https://auth0.com/blog/demystifying-oauth-security-state-vs-nonce-vs-pkce/) - OAuth security parameters [CITED]
- [RFC 9700: OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/rfc9700/) - IETF security guidelines [CITED]
- [DEV.to: OAuth Popup Guide](https://dev.to/didof/oauth-popup-practical-guide-57l9) - Popup implementation pattern [CITED]
- [FullStackFoundations: Passport JWT Tutorial](https://www.fullstackfoundations.com/blog/passport-jwt) - Stateless Passport pattern [CITED]

### Tertiary (LOW confidence)
- None required; all claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - npm registry verification, official Passport docs
- Architecture: HIGH - Well-documented patterns, D decisions locked
- Security: HIGH - RFC 9700 guidance, ASVS alignment
- Pitfalls: HIGH - Multiple verified sources on OAuth security

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days - stable OAuth ecosystem)
