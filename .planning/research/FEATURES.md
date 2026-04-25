# Feature Landscape

**Domain:** Multi-perspective news analysis platform - User & Community Features Milestone
**Researched:** 2026-04-23

## Overview

This document maps features for v1.4 (OAuth, i18n, Mobile Responsive, Social Sharing, Comments, Team Collaboration) categorized by user expectation level, implementation complexity, and dependencies on existing NewsHub systems.

---

## 1. OAuth Social Login (Google, GitHub)

### Table Stakes

Features users expect from any modern OAuth implementation.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| One-click Google/GitHub login | Industry standard since 2015, reduces friction | Medium | Existing User model | passport-google-oauth20, passport-github2 |
| Profile photo from provider | Social login users expect avatar import | Low | User.avatarUrl field | Already exists in schema |
| Email pre-population | OAuth returns verified email | Low | User.email field | Map to existing email |
| Account linking (same email) | Users expect social + email accounts to merge | High | Existing auth flow | CRITICAL: Must handle email collision |
| Session persistence | Seamless re-login on return visits | Low | JWT system | Existing JWT works, add OAuth provider tracking |
| Logout revocation | Logout should work consistently | Low | Token blacklist (Redis) | Existing system handles this |

### Differentiators

Features that improve UX but are not strictly expected.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Link multiple providers | "Also login with GitHub" in settings | Medium | New OAuthProvider model | Lets user add Google AND GitHub to one account |
| Provider-specific profile sync | Auto-update avatar when changed on Google | Low | OAuth refresh token | Optional, nice UX |
| Smart account suggestion | "Found existing account with this email - link it?" | High | Email lookup + UI flow | Prevents duplicates, improves conversion |
| Organization member invitation | Invite via social provider | Medium | Team feature | Future: "Invite team via Google Workspace" |

### Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-link accounts without verification | Security risk - anyone with your email could take over | Always require re-auth before linking |
| Password requirement for OAuth-only users | Frustrating UX for social-only users | Allow password-optional accounts |
| Over-requesting OAuth scopes | Users abandon consent screens with too many permissions | Request only `openid email profile` |
| Facebook/Instagram OAuth | Privacy concerns, declining usage in news-savvy audience | Stick with Google + GitHub |
| Apple Sign-In (initially) | Complex implementation, requires Apple Developer account | Consider for v1.5+ if requested |

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Passport.js setup | Medium | Well-documented, existing patterns |
| Google OAuth | Medium | OAuth 2.0, requires Google Cloud Console setup |
| GitHub OAuth | Low | Simpler OAuth flow, developer-friendly |
| Account linking logic | High | Email collision handling, UI flows, database migrations |
| Database changes | Medium | New `OAuthProvider` relation to User |

### Dependencies on Existing Systems

- **User model**: Must extend with OAuth provider relations
- **Auth service**: Add OAuth callback handlers, preserve JWT flow
- **Email verification**: OAuth emails are pre-verified by provider
- **Redis token blacklist**: Works unchanged for OAuth sessions

---

## 2. i18n Multi-Language UI

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Language picker in settings | Must be discoverable | Low | Zustand store | Extend existing `language` state |
| Persist language preference | Remember choice across sessions | Low | LocalStorage | Already in Zustand persist |
| All UI strings translated | Incomplete translations feel broken | Medium-High | All components | 150+ components to audit |
| Date/time localization | "Apr 23" vs "23. Apr" vs "23/04" | Low | Intl.DateTimeFormat or i18n library | Browser-native, easy |
| Number formatting | "1,234.56" vs "1.234,56" | Low | Intl.NumberFormat | Already in browsers |
| Pluralization rules | "1 article" vs "2 articles" | Medium | react-i18next | ICU message format needed |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Auto-detect browser language | Zero-friction first visit | Low | navigator.language | Fall back to EN if unsupported |
| RTL layout support | Arabic, Hebrew audiences | High | Tailwind CSS dir attribute | Major layout changes |
| Lazy-load translations | Smaller initial bundle | Medium | react-i18next backend | ~3KB base, lazy per locale |
| User-contributed translations | Community-driven localization | High | Translation management system | Defer to v1.6+ |
| AI-assisted translation QA | Detect poor translations | High | AI service | Future enhancement |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Machine-translate everything | Quality suffers, especially for news analysis | Professional translations for UI, MT for content |
| Language per-page URL (/de/news) | Complex routing, SEO not priority | Query param or header-based |
| Auto-translate user comments | Could distort meaning in discussions | Let users write in their language, show original |
| Inline translation toggle per string | Clutters UI, confusing | Global language switch only |

### Initial Language Targets

| Language | Priority | Rationale |
|----------|----------|-----------|
| English (en) | Must have | Default, widest reach |
| German (de) | Must have | Already have DE content translations |
| French (fr) | Nice to have | EU coverage, 300M speakers |
| Spanish (es) | Nice to have | Latin America perspective users |
| Arabic (ar) | Future | RTL requires layout work |

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| react-i18next setup | Low | Well-documented, React 19 compatible |
| Extracting strings | Medium-High | 150+ components need audit |
| Translation file structure | Low | Namespace per feature area |
| Date/number formatting | Low | Browser Intl API |
| RTL support | High | Tailwind/CSS direction, layout mirroring |

### Dependencies on Existing Systems

- **Zustand store**: Already has `language` state, extend to more locales
- **Content translations**: Article `titleTranslated`/`contentTranslated` already JSONB
- **Components**: All user-facing strings must use t() function
- **Backend**: Error messages need translation keys

---

## 3. Mobile Responsive Layouts

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Readable on 320px screens | iPhone SE minimum | Medium | All components | Test each page |
| Touch-friendly tap targets | 44x44px minimum | Low | Buttons, links | Tailwind sizing utilities |
| Hamburger menu for nav | Limited horizontal space | Low | Header component | Replace desktop nav |
| No horizontal scroll | Content must fit viewport | Medium | All layouts | Audit flex/grid usage |
| Thumb-zone navigation | Bottom nav for primary actions | Medium | New BottomNav component | iOS/Android pattern |
| Responsive images | srcset, lazy loading | Low | Image components | Already have some |
| Pull-to-refresh | Mobile expectation for feeds | Medium | NewsFeed component | Native feel |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Swipe gestures (article cards) | "Swipe to bookmark" | Medium | react-swipeable | Discoverability challenge |
| Bottom sheet filters | Modern mobile filter UX | Medium | Dialog component | Replaces sidebar on mobile |
| Adaptive layout (tablet) | 3-column on tablet, 1 on phone | Low | md: breakpoint | Tailwind handles this |
| Offline reading mode | Save articles for subway | High | Service Worker + IndexedDB | PWA already partially built |
| Reduced motion support | Accessibility | Low | prefers-reduced-motion | CSS media query |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Hidden gestures without visual cues | Users won't discover them | Visual hints + optional accelerators |
| Tiny text (<14px body) | Readability suffers | 16px minimum body text |
| Fixed headers eating screen space | Precious mobile real estate | Auto-hide on scroll down |
| Desktop-only features hidden | Frustrates mobile users | Adapt, don't remove features |
| Aggressive skeleton loading | Feels slow if too prominent | Subtle shimmer, quick resolve |

### Breakpoint Strategy

| Breakpoint | Width | Device Target | Layout Changes |
|------------|-------|---------------|----------------|
| Default | <640px | Mobile phone | Single column, bottom nav, hamburger |
| sm: | 640px+ | Large phone | Minor spacing adjustments |
| md: | 768px+ | Tablet portrait | 2-column layouts |
| lg: | 1024px+ | Tablet landscape | Side navigation visible |
| xl: | 1280px+ | Desktop | Full 3-column, rich UI |

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Global layout responsive | Medium | Header, nav, footer changes |
| Page-specific responsive | Medium-High | Each of 8+ pages needs audit |
| Touch gestures | Medium | Swipe handling, edge cases |
| Bottom navigation | Low | New component, simple |
| Performance on mobile | Medium | Bundle size, image optimization |

### Dependencies on Existing Systems

- **Tailwind CSS v4**: Already mobile-first, extend breakpoints
- **Components**: Every page component needs responsive audit
- **Globe/Map**: Already has touch support via globe.gl
- **NewsFeed**: Grid/list toggle partially responsive

---

## 4. Social Media Sharing

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Share buttons (X, Facebook, LinkedIn) | Basic social presence | Low | ShareButton component | URL + text intent |
| Open Graph meta tags | Rich previews in social posts | Medium | Dynamic OG in SSR/SSG | og:title, og:image, og:description |
| Twitter Card meta tags | X-specific preview | Low | Added with OG tags | twitter:card, twitter:image |
| Copy link button | Non-social sharing | Low | Clipboard API | Most used share method |
| WhatsApp share | Mobile messaging | Low | wa.me intent | Major channel |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Share analytics | Track which shares convert | Medium | ShareClick model | Already in schema |
| Short shareable URLs | /s/abc123 format | Low | SharedContent model | Already in schema |
| Article comparison share | "Compare US vs EU coverage" | Medium | Cluster sharing | Unique to NewsHub |
| Shareable AI insights | "Share this analysis" | Medium | AI response export | Differentiator |
| Telegram share | Tech-savvy audience | Low | t.me intent | Add to lineup |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-post to social | Privacy invasion | Manual share only |
| Share popup on every article | Annoying, reduces engagement | Subtle persistent buttons |
| Pinterest share | Not relevant for news analysis | Stick to text-focused platforms |
| Facebook SDK integration | Privacy concerns, GDPR | Use simple intent URLs |
| QR codes everywhere | Clutters UI, rarely scanned | Optional on share modal |

### Open Graph Requirements

```html
<!-- Required for all shared pages -->
<meta property="og:title" content="[Article Title] - NewsHub" />
<meta property="og:description" content="[First 200 chars of summary]" />
<meta property="og:image" content="[Article image or NewsHub default]" />
<meta property="og:url" content="https://newshub.app/article/[id]" />
<meta property="og:type" content="article" />

<!-- Twitter specifics -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@NewsHubApp" />
```

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Share buttons UI | Low | Simple intent URLs |
| Open Graph tags | Medium | Server-side rendering needed for crawlers |
| Short URL system | Low | SharedContent model exists |
| Share analytics | Low | ShareClick model exists |
| Dynamic OG images | High | On-demand image generation |

### Dependencies on Existing Systems

- **SharedContent model**: Already exists in Prisma schema
- **ShareClick model**: Already tracks platform clicks
- **Server routes**: Need SSR for OG tags (currently SPA)
- **Article pages**: Need per-article OG meta

---

## 5. Article Comments

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Add comment (auth required) | Basic engagement | Medium | New Comment model | Auth-gated |
| View comments on article | Read discussions | Low | Comment list component | Sorted by date |
| Edit/delete own comments | Correct mistakes | Low | CRUD endpoints | Time-limited edits |
| Nested replies (1 level) | Threaded discussion | Medium | parentId relation | Limit depth for UX |
| Comment count badge | Show engagement level | Low | Count query | Per article |
| Report inappropriate | User-driven moderation | Medium | ReportedComment model | Queue for review |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Perspective labeling | "Comment from EU perspective reader" | Low | User.preferredRegions | Unique to NewsHub |
| Real-time updates | See new comments live | Medium | Socket.io | Existing WebSocket system |
| Markdown support | Rich formatting | Low | marked.js | Code blocks, links |
| Comment on specific quote | Highlight + comment | High | TextSelection API | Complex UX |
| Gamification integration | Earn badges for quality comments | Medium | Badge system | Already built |
| Upvote/downvote | Community curation | Medium | CommentVote model | Reddit-style |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Anonymous comments | Invites abuse | Require authentication |
| Unlimited nesting | Unreadable threads | Max 2 levels (comment + reply) |
| Auto-moderation removing content | False positives anger users | Flag for review, don't auto-remove |
| Requiring email verification to comment | Too much friction | Auth is enough |
| Editing comments indefinitely | Could distort threads | 15-minute edit window |
| Rich media embeds | Security risk, performance | Text + markdown only |

### Moderation Strategy

| Layer | Implementation | Notes |
|-------|----------------|-------|
| Spam filter | Akismet-style API or AI detection | First-line defense |
| Rate limiting | 10 comments/hour per user | Prevent flooding |
| Link filtering | Hold comments with 2+ links | Spam indicator |
| First-time hold | First comment requires approval | New user check |
| User reports | 3 reports = auto-hide for review | Community-driven |
| Admin dashboard | Review queue, ban users | Human oversight |

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Comment model | Low | Simple schema |
| Comment CRUD | Medium | Auth, validation, rate limiting |
| Nested replies | Medium | Recursive rendering, parent tracking |
| Real-time updates | Medium | Extend existing Socket.io |
| Moderation system | High | Spam detection, reporting, admin UI |
| Gamification hooks | Low | Extend existing badge triggers |

### Dependencies on Existing Systems

- **User model**: Comment author relation
- **Auth middleware**: Protect write endpoints
- **Socket.io**: Real-time comment notifications
- **Badge system**: "First comment" badge trigger
- **Rate limiting**: Existing express-rate-limit

---

## 6. Team Collaboration

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Create team/workspace | Grouping mechanism | Medium | New Team model | Owner creates team |
| Invite members by email | Add collaborators | Medium | Email service | Send invite link |
| Member roles (owner, admin, member) | Permission levels | Medium | TeamMember model | RBAC basics |
| Shared bookmarks | Team reading lists | Low | TeamBookmark model | Like personal bookmarks |
| Leave team | Remove self | Low | TeamMember delete | Cascade checks |
| Team settings | Name, description, logo | Low | Team CRUD | Basic management |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Shared AI conversations | "Team asked AI about Ukraine" | High | Conversation history per team | Knowledge base |
| Team reading activity | "What's trending in team" | Medium | Aggregate team history | Insights |
| Annotation sharing | Highlight + note visible to team | High | Annotation model | Collaboration layer |
| Team-scoped comments | Private team discussions | Medium | Comment.teamId | Separate from public |
| Role-based content access | Premium teams see more | Medium | Feature flags per team | Monetization path |
| SCIM/SSO integration | Enterprise onboarding | High | SAML/OIDC | v1.6+ consideration |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complex permission hierarchies | Over-engineering for v1 | Simple owner/admin/member |
| Organization > Team > Sub-team | Too much structure | Flat teams only |
| Per-document permissions | Complexity explosion | Team-level sharing only |
| Real-time collaborative editing | Not core to news reading | Async sharing model |
| Built-in chat | Competes with Slack, not our focus | Link to external tools |

### Role Permissions

| Permission | Owner | Admin | Member |
|------------|-------|-------|--------|
| Manage team settings | Yes | Yes | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes (not owner) | No |
| Share to team | Yes | Yes | Yes |
| View team content | Yes | Yes | Yes |
| Delete team | Yes | No | No |

### Complexity Assessment

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| Team/TeamMember models | Low | Simple relations |
| Invite system | Medium | Token-based invites, email |
| Permission middleware | Medium | Role checks per endpoint |
| Team bookmarks | Low | Mirror personal bookmarks |
| Team AI conversations | High | Shared context, access control |
| Team activity feed | Medium | Aggregate queries |

### Dependencies on Existing Systems

- **User model**: TeamMember relation
- **Email service**: Invite emails
- **Bookmark model**: Pattern for TeamBookmark
- **AI service**: Team-scoped conversation history
- **Auth middleware**: Team membership checks

---

## Feature Dependencies Summary

```
OAuth ──────────────────────────────────────┐
  └── Account linking ──────────────────────┤
                                            │
i18n ────────────────────────────────────── │ ── All UI components
  └── Translation management                │
                                            │
Mobile Responsive ──────────────────────────┤
  └── All page components                   │
  └── Navigation system                     │
                                            │
Social Sharing ─────────────────────────────┤
  └── SharedContent model (exists)          │
  └── SSR for OG tags (new requirement) ────┘

Comments ───────────────────────────────────┐
  └── User auth (exists)                    │
  └── Socket.io (exists)                    │
  └── Badge system (exists)                 │
  └── Rate limiting (exists)                │
                                            │
Team Collaboration ─────────────────────────┤
  └── User auth (exists)                    │
  └── Email service (exists)                │
  └── Bookmark pattern (exists)             │
  └── Comments (for team-scoped) ───────────┘
```

---

## Implementation Order Recommendation

Based on dependencies and complexity:

### Phase 1: Foundation (Low-Medium Complexity)
1. **i18n Setup** - Unblocks all UI work
2. **Mobile Responsive** - Parallel with i18n, no dependencies
3. **Social Sharing** - Low complexity, SharedContent exists

### Phase 2: Auth Enhancement (Medium Complexity)
4. **OAuth (Google + GitHub)** - Standalone, builds on existing auth

### Phase 3: Engagement (Medium-High Complexity)
5. **Comments** - Uses existing auth, rate limiting, WebSocket

### Phase 4: B2B (High Complexity)
6. **Team Collaboration** - Depends on comments for team-scoped discussions

---

## Sources

### OAuth
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google OAuth 2.0 Strategy](https://www.passportjs.org/packages/passport-google-oauth20/)
- [Auth0 User Account Linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking)
- [Clerk Account Linking](https://clerk.com/docs/authentication/social-connections/account-linking)

### i18n
- [react-i18next Guide 2026](https://intlpull.com/blog/react-i18next-internationalization-guide-2026)
- [Best i18n Libraries for React 2026](https://www.pkgpulse.com/blog/best-i18n-libraries-react-2026)
- [Internationalization in React Components 2026](https://thelinuxcode.com/implementing-internationalization-in-react-components-2026-a-practical-component-first-guide/)

### Mobile Responsive
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS Best Practices 2026](https://samioda.com/en/blog/tailwind-css-best-practices)
- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)

### Social Sharing
- [Open Graph Protocol](https://ogp.me/)
- [Open Graph Tags Guide 2026](https://www.imarkinfotech.com/open-graph-tags-boost-social-sharing-and-seo-in-2026/)

### Comments
- [Building Real-Time Commenting System in React](https://dev.to/pandasekh/building-a-real-time-commenting-system-in-react-part-1-3-3kep)
- [Content Moderation Best Practices 2025](https://arena.im/uncategorized/content-moderation-best-practices-for-2025/)
- [WordPress Comment Moderation Best Practices](https://akismet.com/blog/wordpress-comment-system/)

### Team Collaboration
- [Multi-Tenant RBAC Best Practices](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)
- [WorkOS Multi-Tenant RBAC Design](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- [Clerk Organizations Overview](https://clerk.com/docs/guides/organizations/overview)
