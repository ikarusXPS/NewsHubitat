# Domain Pitfalls

**Domain:** User & Community Features (OAuth, i18n, Mobile Responsive, Social Sharing, Comments, Team Collaboration)
**Context:** Adding to existing NewsHub (v1.4) with JWT auth, DE/EN content translations, desktop-first UI, user gamification
**Researched:** 2026-04-23

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security breaches.

### CP-01: OAuth Account Linking Email Case Mismatch

**What goes wrong:** OAuth provider returns `JohnDoe@Gmail.com` but existing user registered as `johndoe@gmail.com`. System creates duplicate account or fails to link.

**Why it happens:** NewsHub stores emails as-is from registration. OAuth providers return emails in various cases. Lookup uses strict string comparison.

**Consequences:**
- Users can't access existing accounts via OAuth
- Duplicate accounts with split bookmarks, reading history, badges
- User data fragmentation destroys gamification progress

**Prevention:**
- Normalize all emails to lowercase before storage and comparison
- Add migration to lowercase existing `User.email` values
- Update Prisma schema: add `@@map` for case-insensitive index on PostgreSQL

**Detection:**
- Test OAuth flow with email `TestUser@Example.COM` against existing `testuser@example.com`
- Monitor for duplicate User records with same normalized email

**Phase:** OAuth Login (early in implementation)

---

### CP-02: OAuth Creates Passwordless Users Breaking Existing Auth Flow

**What goes wrong:** User signs up via Google OAuth, then tries to use "Forgot Password" flow. No password exists. System sends reset email, but there's nothing to reset.

**Why it happens:** NewsHub's auth routes (`/auth/login`, `/auth/request-reset`) assume all users have `passwordHash`. OAuth users don't.

**Consequences:**
- Password reset crashes or creates security vulnerability
- Users locked out of alternative login methods
- Support tickets spike

**Prevention:**
- Add `authProvider` enum to User model: `'local' | 'google' | 'github'`
- Allow nullable `passwordHash` for OAuth users
- Add "Set Password" flow for OAuth users who want local fallback
- Update `resetPassword` to check if user has local auth configured

**Detection:**
- Warning signs: Password reset endpoint receives OAuth user email
- Test: Create OAuth user, attempt password reset

**Phase:** OAuth Login (schema design)

---

### CP-03: JWT Token Version Breaks OAuth Login

**What goes wrong:** Existing `tokenVersion` in User model (for session invalidation) doesn't account for OAuth. OAuth refresh tokens have different lifecycle.

**Why it happens:** NewsHub increments `tokenVersion` on password change to invalidate all sessions. OAuth users don't change passwords, but may need session revocation.

**Consequences:**
- OAuth users can't be logged out remotely
- Token revocation doesn't work for OAuth sessions
- Security gap if OAuth account is compromised

**Prevention:**
- Track OAuth tokens separately from JWT session tokens
- Store OAuth refresh tokens with `provider` field
- Implement OAuth-specific revocation (Google/GitHub revoke APIs)
- `tokenVersion` should invalidate ALL session types

**Detection:**
- After adding OAuth: Test logout across all auth methods
- Verify Google account unlink revokes access

**Phase:** OAuth Login (token management)

---

### CP-04: i18n Retrofitting Leaves Hardcoded Strings

**What goes wrong:** After "completing" i18n, production users report untranslated UI elements. Strings hardcoded in JSX weren't caught.

**Why it happens:** 17,000 lines of TypeScript. Manual search misses strings in:
- Error messages in catch blocks
- Placeholder attributes
- aria-label accessibility attributes
- Toast notifications
- Confirmation dialogs
- Conditional rendering (`isAdmin && "Admin Panel"`)

**Consequences:**
- Mixed-language UI (German button labels with English error messages)
- Accessibility failures (screen readers read English on German UI)
- Professional credibility damage

**Prevention:**
- Use ESLint rule `@shopify/jsx-no-hardcoded-content`
- Run extraction script BEFORE implementation
- Test with pseudo-locale (e.g., `[en-XA]` for English Pseudo)
- CI gate: No new hardcoded strings after i18n phase

**Detection:**
- Visual audit: Switch language, check every screen
- Grep for common patterns: `"Submit"`, `"Error"`, `"Loading..."`

**Phase:** Multi-Language UI (extraction phase, before translation)

---

### CP-05: i18n String Concatenation Breaks Non-English Languages

**What goes wrong:** Code like `t('hello') + ' ' + user.name + '!'` renders broken output in German where word order differs.

**Why it happens:** English-centric development. Direct translation of "Hello John!" fails when German needs "Hallo, John!" or formal "Guten Tag, Herr Schmidt!".

**Consequences:**
- Grammatically incorrect text
- Cultural insensitivity
- Professional credibility damage
- Can't fix without code changes

**Prevention:**
- NEVER concatenate translated strings
- Use interpolation: `t('greeting', { name: user.name })`
- Review ALL `t()` calls for adjacent string operations

**Detection:**
- Grep for pattern: `t\(['"]\w+['"]\)\s*\+`
- Review by native speaker of target language

**Phase:** Multi-Language UI (extraction phase)

---

### CP-06: Mobile Responsive: Fixed-Width Layouts from Desktop-First Design

**What goes wrong:** Globe visualization, HeroSection stats panel, and data tables overflow on mobile. Horizontal scroll appears everywhere.

**Why it happens:** Existing components use fixed pixel values (`width: 960px`, `padding: 200px`). Desktop-first design didn't consider mobile constraints.

**Specific NewsHub risks:**
- `GlobeView` with fixed dimensions
- `NewsFeed` grid layouts
- `HeroSection` stats panels
- Article detail modals
- Analysis comparison tables

**Consequences:**
- Unusable mobile experience
- High bounce rate from mobile users (often 60%+ of traffic)
- Google mobile-first indexing penalty (SEO impact)
- CLS (Cumulative Layout Shift) failures

**Prevention:**
- Audit ALL width/height declarations before mobile phase
- Replace px with rem, vw, clamp()
- Test every component at 375px (iPhone SE) minimum

**Detection:**
- Lighthouse mobile audit
- Device testing at 320px, 375px, 428px widths

**Phase:** Mobile Responsive (audit before implementation)

---

### CP-07: Social Sharing: Open Graph Tags Missing for SPA

**What goes wrong:** Shared links show "title missing" and default image on Facebook/LinkedIn/Twitter. No rich previews.

**Why it happens:** NewsHub is a React SPA. Social media crawlers don't execute JavaScript. React Helmet meta tags are client-side only.

**Consequences:**
- Shares look unprofessional (plain URL, no preview)
- Click-through rates drop 50-80%
- Viral potential destroyed
- Users stop sharing

**Prevention:**
- Implement SSR for share URLs OR
- Create separate server-rendered share pages (`/share/:id`)
- Use prerendering service for social bots
- Test with Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector

**Detection:**
- Share any article URL to private Facebook post
- Check preview in Slack/Discord/Telegram

**Phase:** Social Media Sharing (architecture decision early)

---

### CP-08: Comments: No Moderation Strategy Leads to Toxic Cesspool

**What goes wrong:** Comments launch. Within weeks: spam, abuse, flame wars, potential legal liability. Team scrambles to react.

**Why it happens:** Focus on feature (adding comments) without operations strategy (managing comments). News content is inherently controversial.

**Consequences:**
- Brand damage
- Moderator burnout (research shows emotional exhaustion)
- Legal risks (defamation, GDPR compliance for user content)
- User churn (quality users leave toxic environments)
- May need to disable comments entirely (admit failure)

**Prevention:**
- Define moderation strategy BEFORE implementation
- Decide: Pre-moderation, post-moderation, or AI-assisted?
- Set clear community guidelines
- Plan moderation staffing/tools
- Consider: Is commenting worth the operational cost?

**Detection:**
- Red flag: No moderation plan in requirements
- Warning: "We'll figure it out after launch"

**Phase:** Article Comments (planning phase, not implementation)

---

### CP-09: Team Collaboration: Data Isolation Failures

**What goes wrong:** Team A sees Team B's private article bookmarks, reading history, or shared collections. Data cross-contamination.

**Why it happens:** Existing NewsHub is single-tenant. Adding team features requires tenant isolation. Every query needs `WHERE teamId = ?` clause. Miss one, data leaks.

**Specific NewsHub risks:**
- `Bookmark` table has no team scope
- `ReadingHistory` is user-scoped, not team-scoped
- `SharedContent` can be viewed by anyone with URL

**Consequences:**
- Data breach between organizations
- GDPR violations (exposing user data)
- Trust destruction with enterprise customers
- Legal liability

**Prevention:**
- Add `teamId` to ALL user-generated content tables
- Use PostgreSQL Row Level Security (RLS)
- Middleware that enforces team context on EVERY request
- Automated tests for cross-tenant access attempts

**Detection:**
- Security audit: Every API endpoint
- Test: User from Team A tries to access Team B resource

**Phase:** Team Collaboration (database schema, before any features)

---

### CP-10: Zustand Store Migration Breaks Existing Users

**What goes wrong:** Adding `language: 'fr'` (new) to store. Existing users have `language: 'de'` persisted. After update, app crashes or shows English fallback.

**Why it happens:** Zustand persist middleware doesn't automatically migrate schema changes. NewsHub's `newshub-storage` localStorage has no version number.

**Specific NewsHub risks:**
- Current store has no `version` field
- Adding i18n languages requires new `language` values
- Feed preferences may need restructuring for teams
- Reading history format changes

**Consequences:**
- App crash on load for existing users
- Lost user preferences (bookmarks, history, theme)
- Users think site is broken, leave

**Prevention:**
- Add `version: 1` to persist config NOW (before v1.4)
- Define migration functions for each version increment
- Use `partialize` to exclude functions from persistence
- Test: Manually edit localStorage to old format, verify graceful handling

**Detection:**
- Load app after clearing localStorage vs. with old data
- Check for hydration errors in console

**Phase:** First phase that touches store (likely i18n or OAuth)

---

## High Severity Pitfalls

Significant problems requiring substantial rework.

### HP-01: i18n Date/Number Formatting Ignored

**What goes wrong:** Dates show `04/23/2026` (US format) to German users expecting `23.04.2026`. Currency shows `$1,000.00` instead of `1.000,00 EUR`.

**Why it happens:** Focus on text translation, forgetting locale-aware formatting. JavaScript's default Date.toString() is locale-independent.

**Prevention:**
- Use `Intl.DateTimeFormat(locale)` for all dates
- Use `Intl.NumberFormat(locale)` for all numbers
- Centralize formatting in utility functions
- Search for `toLocaleDateString()` without locale parameter

**Phase:** Multi-Language UI (during implementation)

---

### HP-02: i18n Missing RTL Support for Future Languages

**What goes wrong:** Adding Arabic/Hebrew/Persian later requires CSS rewrite. Layout mirrors incorrectly.

**Why it happens:** LTR (left-to-right) assumptions baked into CSS: `padding-left`, `text-align: left`, `float: left`.

**Prevention:**
- Use CSS logical properties: `padding-inline-start` not `padding-left`
- Add `dir="ltr"` to `<html>` element
- Plan for `dir="rtl"` toggle in theme
- Even if not adding RTL now, use logical properties

**Phase:** Multi-Language UI (CSS refactoring)

---

### HP-03: Mobile Responsive Navigation Failures

**What goes wrong:** Desktop nav with 8+ items becomes unusable hamburger menu. Deep dropdowns can't be tapped accurately.

**Specific NewsHub risks:**
- Main nav: Dashboard, Analysis, Monitor, Timeline, EventMap, Community + user menu
- Sub-navigation within pages
- Filter panels with many options

**Prevention:**
- Redesign navigation for mobile FIRST, then scale up to desktop
- Consider bottom navigation bar for primary actions
- Test touch targets: minimum 44x44px
- Test with actual mobile device, not just Chrome DevTools

**Phase:** Mobile Responsive (design phase)

---

### HP-04: Social Sharing Image Requirements Not Met

**What goes wrong:** Shared images appear stretched, cropped awkwardly, or not at all.

**Why it happens:** Different platforms have different requirements:
- Facebook OG: 1200x630px, 1.91:1 ratio
- Twitter: 1200x628px, or 800x418px for summary_large_image
- LinkedIn: 1200x627px

**Prevention:**
- Generate platform-specific images OR
- Use 1200x630 as universal baseline
- Never use SVG (social crawlers don't render)
- Always use absolute HTTPS URLs
- Test with each platform's debugger tool

**Phase:** Social Media Sharing (implementation)

---

### HP-05: Comments Without Threading Creates Chaos

**What goes wrong:** Flat comments become unreadable at scale. Users can't follow conversations. Replies to specific comments get lost.

**Why it happens:** Flat comment list is easier to implement. Threading adds complexity.

**Prevention:**
- Decide on comment structure early: flat, single-level threading, or full threading
- Consider use case: news comments often benefit from simple upvote/downvote ranking over threading
- Plan database schema for reply relationships

**Phase:** Article Comments (design phase)

---

### HP-06: Team Collaboration Database Design for Single-Tenant App

**What goes wrong:** Adding `teamId` everywhere requires massive migration. Performance degrades because indexes weren't planned for multi-tenant queries.

**Specific NewsHub risks:**
- `Bookmark` needs team scope (or should remain user-only?)
- `ReadingHistory` needs team scope
- `LeaderboardSnapshot` needs team partitioning
- `Badge` progress: per-user or per-team?

**Prevention:**
- Design team schema comprehensively BEFORE any migration
- Decide: Shared schema vs. schema-per-team vs. database-per-team
- Add composite indexes for `(teamId, userId, ...)` patterns
- Consider PostgreSQL Row Level Security

**Phase:** Team Collaboration (planning, before implementation)

---

### HP-07: OAuth Token Storage Security

**What goes wrong:** OAuth refresh tokens stored insecurely, leading to account compromise.

**Why it happens:** Focus on "making it work" over secure storage.

**Prevention:**
- Store OAuth tokens in httpOnly cookies, not localStorage
- Encrypt refresh tokens at rest in database
- Implement token rotation
- Never expose tokens in API responses or logs

**Phase:** OAuth Login (implementation)

---

### HP-08: i18n Loading All Locales Upfront

**What goes wrong:** Bundle includes all language files. 200KB of unused translations loaded on every page.

**Why it happens:** Simple setup loads all locales. Lazy loading requires additional configuration.

**Prevention:**
- Use `i18next-http-backend` for lazy loading
- Load only current locale on initial render
- Fetch additional locales on language switch
- Measure bundle size before and after i18n

**Phase:** Multi-Language UI (implementation)

---

## Moderate Pitfalls

Problems causing delays or quality issues.

### MP-01: OAuth Implicit Grant Usage

**What goes wrong:** Using OAuth implicit flow (returns token in URL fragment) instead of Authorization Code + PKCE.

**Why it happens:** Old tutorials show implicit flow. Simpler to implement.

**Prevention:**
- ONLY use Authorization Code + PKCE for user-facing OAuth
- Implicit flow is deprecated and insecure

**Phase:** OAuth Login (implementation)

---

### MP-02: Missing OAuth Fallback for Blocked Corporate Networks

**What goes wrong:** Enterprise users behind corporate firewalls can't use Google OAuth. No way to access account.

**Prevention:**
- Always offer email/password as fallback
- Allow OAuth users to add password to their account
- Test from corporate VPN/proxy environments

**Phase:** OAuth Login (after initial implementation)

---

### MP-03: i18n Missing Pluralization Rules

**What goes wrong:** "1 articles" or "You have 5 badge" shown to users.

**Why it happens:** English has 2 plural forms. Polish has 4. Arabic has 6. Hardcoded `count === 1 ? 'article' : 'articles'` fails.

**Prevention:**
- Use i18n library's pluralization: `t('articles', { count: n })`
- Define all plural forms in translation files
- Test with 0, 1, 2, 5, 21 (covers most pluralization rules)

**Phase:** Multi-Language UI (translation phase)

---

### MP-04: Mobile Responsive Images Not Optimized

**What goes wrong:** Desktop-sized images load on mobile, wasting bandwidth, slowing page load.

**Prevention:**
- Use `srcset` and `sizes` attributes
- Serve different image sizes for different viewports
- Consider next-gen formats (WebP, AVIF)
- Lazy load below-fold images

**Phase:** Mobile Responsive (implementation)

---

### MP-05: Social Sharing Platform Deprecation

**What goes wrong:** Twitter/X API changes break share functionality. Facebook API deprecates endpoints.

**Prevention:**
- Use platform's official share URLs (not APIs) where possible
- Implement share fallback (copy to clipboard)
- Monitor platform changelog/deprecation notices
- Abstract sharing logic for easy updates

**Phase:** Social Media Sharing (architecture)

---

### MP-06: Comments Missing Rate Limiting

**What goes wrong:** Spam bots post hundreds of comments per minute. Legitimate comments drowned out.

**Prevention:**
- Rate limit: X comments per user per minute
- CAPTCHA for anonymous or new users
- Require email verification before commenting
- Implement spam detection (keywords, URLs, repeated content)

**Phase:** Article Comments (implementation)

---

### MP-07: Team Invitation Email Spoofing

**What goes wrong:** Attacker sends fake team invitation emails that look like they're from NewsHub. Users click and enter credentials.

**Prevention:**
- Use signed invitation tokens
- Verify invitation on server, not just email click
- SPF, DKIM, DMARC for email authentication
- Clear branding and verification instructions in emails

**Phase:** Team Collaboration (email integration)

---

### MP-08: i18n TypeScript Performance Issues

**What goes wrong:** Large translation files (800+ keys) cause TypeScript compiler to hang or run out of memory.

**Why it happens:** react-i18next v12+ changed type inference. Large namespaces cause quadratic type checking.

**Prevention:**
- Enable `enableSelector: "optimize"` in i18next config
- Split translations into smaller namespaces
- Use `const` assertions for literal types
- Monitor TypeScript build times

**Phase:** Multi-Language UI (if using TypeScript strict mode)

---

## Minor Pitfalls

Issues causing friction or minor bugs.

### mP-01: OAuth State Parameter Not Validated

**What goes wrong:** CSRF attacks on OAuth callback.

**Prevention:** Generate cryptographic state parameter, validate on callback.

**Phase:** OAuth Login

---

### mP-02: i18n Translation Key Naming Inconsistency

**What goes wrong:** Keys like `homePage.submitButton` vs `submit_button` vs `SUBMIT`. Hard to maintain.

**Prevention:** Define naming convention. Use linter to enforce.

**Phase:** Multi-Language UI

---

### mP-03: Mobile Touch Target Size Violations

**What goes wrong:** Small buttons can't be tapped accurately on mobile.

**Prevention:** Minimum 44x44px touch targets per Apple HIG / Material Design.

**Phase:** Mobile Responsive

---

### mP-04: Social Share Count Caching

**What goes wrong:** Share counts don't update, or API rate limits hit.

**Prevention:** Cache share counts, refresh periodically (not on every page load).

**Phase:** Social Media Sharing

---

### mP-05: Comment Edit Window Missing

**What goes wrong:** Users post typos, can't fix them. Either no edit, or unlimited edit (allows abuse).

**Prevention:** Allow edits within time window (e.g., 5 minutes). Show edit indicator.

**Phase:** Article Comments

---

### mP-06: Team Role Permission Granularity

**What goes wrong:** Only "admin" and "member" roles. Can't give someone comment moderation without full admin.

**Prevention:** Design granular permissions early. Use role-based access control (RBAC).

**Phase:** Team Collaboration

---

## Phase-Specific Warnings

| Phase | Most Likely Pitfall | Mitigation |
|-------|---------------------|------------|
| OAuth Login | CP-01: Email case mismatch | Normalize emails before any comparison |
| OAuth Login | CP-02: Passwordless users | Add `authProvider` to User model |
| Multi-Language UI | CP-04: Hardcoded strings | Run extraction script FIRST |
| Multi-Language UI | CP-05: String concatenation | Use interpolation ONLY |
| Mobile Responsive | CP-06: Fixed widths | Audit before implementation |
| Social Sharing | CP-07: No OG tags for SPA | SSR or prerendering required |
| Article Comments | CP-08: No moderation | Define strategy before coding |
| Team Collaboration | CP-09: Data isolation | PostgreSQL RLS + middleware |
| ALL | CP-10: Store migration | Add version number NOW |

---

## Pre-Implementation Checklist

Before starting each phase:

- [ ] OAuth: Email normalization plan documented
- [ ] OAuth: User model schema changes approved
- [ ] i18n: String extraction script ready
- [ ] i18n: Linting rules configured
- [ ] Mobile: Fixed-width audit complete
- [ ] Social: OG tag rendering strategy decided
- [ ] Comments: Moderation strategy approved
- [ ] Teams: Data isolation approach designed
- [ ] Store: Migration system implemented

---

## Sources

### OAuth & Authentication
- [OAuth vs JWT: Key Differences](https://supertokens.com/blog/oauth-vs-jwt) - MEDIUM confidence
- [OAuth Account Linking Email Case Issue](https://github.com/better-auth/better-auth/issues/7806) - HIGH confidence
- [Auth0 Account Linking Docs](https://auth0.com/docs/manage-users/user-accounts/user-account-linking) - HIGH confidence

### Internationalization
- [20 i18n Mistakes in React Apps](https://www.translatedright.com/blog/20-i18n-mistakes-developers-make-in-react-apps-and-how-to-fix-them/) - HIGH confidence
- [React + react-i18next Guide 2026](https://intlpull.com/blog/react-i18next-internationalization-guide-2026) - MEDIUM confidence
- [i18next Migration Guide](https://www.i18next.com/misc/migration-guide) - HIGH confidence

### Mobile Responsive
- [Responsive Retrofit Limitations](https://www.wearediagram.com/blog/understanding-the-limitations-of-a-responsive-retrofit) - HIGH confidence
- [Responsive Challenges 2026](https://medium.com/@akashnagpal112/responsive-web-design-challenges-you-cant-ignore-in-2026-552d8e9d7b73) - MEDIUM confidence
- [UXPin Responsive Best Practices](https://www.uxpin.com/studio/blog/best-practices-examples-of-excellent-responsive-design/) - MEDIUM confidence

### Social Sharing
- [Open Graph Benefits & Pitfalls](https://prerender.io/blog/benefits-of-using-open-graph/) - HIGH confidence
- [Meta for Developers: Sharing](https://developers.facebook.com/docs/sharing/webmasters/) - HIGH confidence
- [Social Traffic Decline for News](https://www.niemanlab.org/2026/04/social-traffic-kinda-stinks-for-news-publishers-now-in-3-charts/) - MEDIUM confidence

### Comments & Moderation
- [Content Moderation Trends 2026](https://imagga.com/blog/the-future-of-content-moderation-trends-for-2026-and-beyond/) - MEDIUM confidence
- [Killing Comments Was a Mistake](https://www.techdirt.com/2026/02/03/whoops-websites-realize-that-killing-their-comment-sections-was-a-mistake/) - MEDIUM confidence
- [Moderating Comments Hurts Trust](https://mediaengagement.org/research/moderating-uncivil-comments/) - HIGH confidence

### Team Collaboration & Multi-Tenancy
- [Multi-Tenant SaaS Guide 2026](https://techexactly.com/blogs/multi-tenant-saas-applications) - MEDIUM confidence
- [Multi-Tenant Data Integration](https://cdatasoftware.medium.com/the-2026-multi-tenant-data-integration-playbook-for-scalable-saas-1371986d2c2c) - MEDIUM confidence
- [Complete Guide to Multi-Tenant SaaS](https://evilmartians.com/chronicles/the-complete-guide-to-multi-tenant-saas-part-1-collaboration) - HIGH confidence

### Zustand & State Management
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/reference/middlewares/persist) - HIGH confidence
- [Zustand Migration Discussion](https://github.com/pmndrs/zustand/discussions/1717) - HIGH confidence
- [How to Migrate Zustand Store](https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp) - MEDIUM confidence
