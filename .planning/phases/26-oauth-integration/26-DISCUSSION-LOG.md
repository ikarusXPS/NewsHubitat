# Phase 26: OAuth Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 26-oauth-integration
**Areas discussed:** Account linking, UI/UX flow, Provider data, Unlink behavior

---

## Account Linking

| Option | Description | Selected |
|--------|-------------|----------|
| Require re-auth (Recommended) | If OAuth email matches existing account, require email+password login first, then link. Prevents account takeover if email was compromised at provider. | ✓ |
| Auto-link by email | If OAuth email matches existing account, link automatically. Simpler UX but security risk if provider email was hacked. | |
| Create new account | Always create separate account for OAuth. Users manually merge later. No security risk but confusing UX. | |

**User's choice:** Require re-auth (Recommended)
**Notes:** Chosen for security — prevents account takeover scenarios

---

| Option | Description | Selected |
|--------|-------------|----------|
| Modal with password field | Show modal: 'This email already has an account. Enter your password to link Google/GitHub.' Single password field + confirm. | |
| Redirect to Settings | After OAuth, redirect to Settings page with 'Link Provider' section. User initiates linking from there. | |
| You decide | Claude chooses based on existing UX patterns | ✓ |

**User's choice:** You decide
**Notes:** Claude will determine based on UX patterns

---

| Option | Description | Selected |
|--------|-------------|----------|
| No password required | OAuth-only accounts work without password. If user wants to unlink later, they set password then. | ✓ |
| Optional password prompt | After OAuth signup, show optional 'Set a password for backup login?' prompt. Skip if they decline. | |
| Require password | Force all users to set password during registration, even if they used OAuth. Ensures fallback access. | |

**User's choice:** No password required
**Notes:** OAuth-only accounts are acceptable

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, multiple providers | User can link Google + GitHub. Login with either. More flexible but complex account state. | |
| One provider only | Each account can have at most one OAuth provider. Simpler model, user chooses which. | |
| You decide | Claude chooses based on UX and implementation simplicity | ✓ |

**User's choice:** You decide
**Notes:** Claude will decide — recommend multiple for flexibility

---

| Option | Description | Selected |
|--------|-------------|----------|
| Block — must match | Only allow linking if OAuth email matches account email. Prevents confusion about which email is primary. | ✓ |
| Allow — any email | Allow linking any OAuth account. User could have account@work.com and link personal@gmail.com via Google. | |
| Warn but allow | Show warning: 'OAuth email differs from your account email.' Let user proceed if they confirm. | |

**User's choice:** Block — must match
**Notes:** Email must match for account linking

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip verification (Recommended) | OAuth providers already verify email. Mark emailVerified=true automatically for OAuth signups. | ✓ |
| Still verify | Send verification email even for OAuth signups. Ensures we can reach user via email. | |
| You decide | Claude chooses based on industry practice | |

**User's choice:** Skip verification (Recommended)
**Notes:** OAuth providers already verify email ownership

---

| Option | Description | Selected |
|--------|-------------|----------|
| Verify and link | OAuth confirms email ownership. Mark account verified, then link OAuth provider. | |
| Still require re-auth | Same as verified accounts: require password entry before linking (but unverified users forgot to verify, may not remember password). | |
| You decide | Claude picks the most user-friendly approach | ✓ |

**User's choice:** You decide (for unverified accounts trying OAuth)
**Notes:** Claude will determine — recommend auto-verify and link

---

| Option | Description | Selected |
|--------|-------------|----------|
| Block OAuth linking | If account email is disposable, don't allow linking OAuth. User must update email first. | |
| Allow linking | Allow OAuth linking regardless of original email. OAuth email becomes fallback contact. | |
| You decide | Claude picks based on existing disposable email policy | ✓ |

**User's choice:** You decide (disposable email accounts linking OAuth)
**Notes:** Claude will determine — recommend blocking for consistency

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — auth only | Use OAuth only for authentication. Don't store tokens for future API calls. Simpler and more secure. | ✓ |
| Yes — store encrypted | Store refresh tokens encrypted in DB. Allows future features like 'sync bookmarks to GitHub Gists' etc. | |

**User's choice:** No — auth only
**Notes:** No refresh token storage — auth only

---

## UI/UX Flow

| Option | Description | Selected |
|--------|-------------|----------|
| AuthModal only | Add 'Sign in with Google' and 'Sign in with GitHub' buttons to existing AuthModal, above email/password form. | ✓ |
| Separate OAuth page | Create dedicated /login page with OAuth buttons. AuthModal links to it. | |
| Both places | OAuth buttons in AuthModal AND a dedicated /login page for direct linking | |

**User's choice:** AuthModal only
**Notes:** Keep OAuth in existing modal

---

| Option | Description | Selected |
|--------|-------------|----------|
| OAuth first (Recommended) | OAuth buttons at top, then 'or' divider, then email/password form. Promotes faster signup. | ✓ |
| Email first | Email/password form at top, OAuth buttons below. Keeps current form prominent. | |
| You decide | Claude chooses based on modern auth patterns | |

**User's choice:** OAuth first (Recommended)
**Notes:** OAuth buttons above email form

---

| Option | Description | Selected |
|--------|-------------|----------|
| Popup flow (Recommended) | OAuth opens in popup window. Callback closes popup and updates parent. No full page navigation. | ✓ |
| Redirect flow | Full page redirect to provider, then back to /auth/callback. Simpler but loses SPA state. | |
| You decide | Claude picks based on existing SPA architecture | |

**User's choice:** Popup flow (Recommended)
**Notes:** Preserves SPA state

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated 'Connected Accounts' section | New section in Settings showing linked providers with connect/disconnect buttons. | |
| Under 'Security' section | Add OAuth linking to existing security settings (next to password change). | |
| You decide | Claude chooses based on Settings page structure | ✓ |

**User's choice:** You decide (Settings placement)
**Notes:** Claude will determine placement

---

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + stay on modal | Show error toast 'Google sign-in was cancelled' and keep AuthModal open. User can retry or use email. | |
| Error state in modal | Show inline error in AuthModal with 'Try again' button. More prominent than toast. | |
| You decide | Claude picks based on existing error patterns | ✓ |

**User's choice:** You decide (error handling)
**Notes:** Claude will determine based on existing patterns

---

| Option | Description | Selected |
|--------|-------------|----------|
| Official brand colors | Google button uses Google's colors/style, GitHub uses GitHub's dark style. Follows brand guidelines. | |
| Match NewsHub dark theme | Both buttons use NewsHub's dark theme styling with small provider icons. Unified look. | |
| You decide | Claude picks based on existing button patterns | ✓ |

**User's choice:** You decide (button styling)
**Notes:** Claude will determine styling

---

## Provider Data

| Option | Description | Selected |
|--------|-------------|----------|
| Email + name + avatar | Fetch email, display name, and profile picture. Use avatar if user hasn't set one. | ✓ |
| Email only | Just email for authentication. User sets name/avatar manually. Minimal data collection. | |
| Email + name only | Name for account creation, no avatar. Avoids external image hosting dependencies. | |

**User's choice:** Email + name + avatar
**Notes:** Full profile data fetching

---

| Option | Description | Selected |
|--------|-------------|----------|
| Use if none set | Only use OAuth avatar if user hasn't uploaded/chosen one. Respects existing customization. | ✓ |
| Always update | Always sync OAuth avatar on each login. Keeps profile fresh with provider. | |
| User chooses | Ask 'Use your Google profile picture?' during linking. Explicit consent. | |

**User's choice:** Use if none set
**Notes:** Respect existing user customization

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — required | Store googleId/githubId to uniquely identify user at provider. Needed for linking and returning user recognition. | |
| Hash it | Store SHA-256 hash of provider ID. Same functionality but more privacy-conscious. | ✓ |

**User's choice:** Hash it
**Notes:** Privacy-conscious storage of provider IDs

---

| Option | Description | Selected |
|--------|-------------|----------|
| Use provider name | Auto-set display name from OAuth profile (e.g., 'John Doe' from Google). | |
| Ask to confirm | Pre-fill from OAuth but show editable field: 'Confirm your name: [John Doe]' | |
| You decide | Claude picks based on registration flow simplicity | ✓ |

**User's choice:** You decide (display name)
**Notes:** Claude will determine

---

## Unlink Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Block — must have fallback | Can't unlink OAuth if no password is set. Must set password first. Prevents lockout. | ✓ |
| Allow with warning | Warn 'You will lose access!' but let them proceed. User responsibility. | |
| Force password | Unlinking always requires setting a password first. No exceptions. | |

**User's choice:** Block — must have fallback
**Notes:** Prevent account lockout

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — password/OAuth | Re-enter password or re-authenticate with OAuth before unlinking. Prevents unauthorized changes. | |
| No — just confirm | Just show 'Are you sure?' dialog. User is already logged in. | |
| You decide | Claude picks based on existing security patterns | ✓ |

**User's choice:** You decide (re-auth for unlinking)
**Notes:** Claude will determine based on existing security patterns

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep avatar | Avatar stays even after unlinking. It's now user's avatar, not provider's. | |
| Remove avatar | Clear avatar when unlinking. Falls back to default/initials. | |
| You decide | Claude picks based on user experience | ✓ |

**User's choice:** You decide (avatar on unlink)
**Notes:** Claude will determine

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — security email | Send 'Google was linked/unlinked to your account' email. Alerts user to unauthorized changes. | |
| No — silent | No email notification. Action is visible in Settings but no email sent. | |
| You decide | Claude picks based on existing email patterns | ✓ |

**User's choice:** You decide (email notification)
**Notes:** Claude will determine

---

## Claude's Discretion

- Re-auth prompt UX for existing accounts
- Multiple providers per account (recommended: yes)
- Unverified account + OAuth flow
- Disposable email accounts + OAuth
- Settings page placement
- Error handling UX
- Button styling
- Display name for new OAuth users
- Re-auth for unlinking
- Avatar retention on unlink
- Email notifications for link/unlink

## Deferred Ideas

None — discussion stayed within phase scope
