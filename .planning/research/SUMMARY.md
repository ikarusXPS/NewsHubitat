# Research Summary: NewsHub v1.4 User & Community Features

**Domain:** Multi-perspective news analysis platform
**Researched:** 2026-04-23
**Overall confidence:** HIGH

## Executive Summary

Research validates that v1.4 features (OAuth, i18n, Mobile Responsive, Social Sharing, Comments, Team Collaboration) follow well-established industry patterns with mature tooling available. NewsHub's existing infrastructure (JWT auth, Redis caching, Socket.io, PostgreSQL via Prisma, Zustand state, Tailwind CSS) provides strong foundations for all planned features.

The primary technical challenges are: (1) OAuth account linking with existing email accounts requires careful security handling, (2) i18n string extraction across 150+ components is labor-intensive but straightforward, (3) SSR/dynamic rendering is needed for Open Graph meta tags which the current SPA architecture doesn't support natively, and (4) comment moderation at scale requires either AI-based filtering or significant manual effort.

The recommended stack is passport.js for OAuth, react-i18next for internationalization, existing Tailwind CSS with mobile-first patterns for responsive design, and custom implementations leveraging existing Socket.io for real-time comments. Team collaboration follows standard RBAC patterns that align with existing auth middleware.

## Key Findings

**Stack:**
- OAuth: passport-google-oauth20 + passport-github2 (industry standard, Express 5 compatible)
- i18n: react-i18next (largest ecosystem, hooks-based, lazy loading support)
- Responsive: Tailwind CSS v4 mobile-first utilities (already in use)
- Comments: Custom with Socket.io (existing WebSocket infrastructure)
- Teams: Custom RBAC with CASL (simple owner/admin/member, isomorphic permissions)

**Architecture:**
- OAuth adds `OAuthProvider` model linked to User, preserves existing JWT flow
- i18n requires t() wrapper on all user-facing strings, translation JSON files per locale
- Mobile requires responsive audit of all pages, new BottomNav component, hamburger menu
- Sharing requires server-side rendering for OG meta tags (bot detection approach recommended)
- Comments add Comment model with parentId for replies, integrate with existing Badge system
- Teams add Team/TeamMember models with role-based middleware

**Critical pitfall:** OAuth account linking without re-authentication is a security risk. Must require users to prove ownership of both accounts before merging.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **i18n Foundation** - Setup react-i18next, extract strings, establish translation workflow
   - Addresses: Multi-language UI, localized dates/numbers
   - Avoids: Retrofitting i18n later (weeks of work if deferred)
   - Rationale: Unblocks all UI work; every subsequent feature benefits

2. **Mobile Responsive** - Audit and fix all pages, add mobile navigation
   - Addresses: Touch-friendly layouts, responsive breakpoints, bottom nav
   - Avoids: Desktop-only trap, alienating 60%+ mobile users
   - Rationale: Can run parallel with i18n, no dependencies

3. **Social Sharing** - OG tags, share buttons, short URLs
   - Addresses: Rich social previews, share analytics
   - Avoids: Empty link previews killing virality
   - Rationale: SharedContent model exists, relatively low complexity

4. **OAuth Integration** - Google + GitHub social login with account linking
   - Addresses: Frictionless signup, developer audience (GitHub)
   - Avoids: Email collision exploits, orphaned accounts
   - Rationale: Standalone auth enhancement, builds on existing JWT

5. **Comments System** - Article comments with replies, moderation basics
   - Addresses: User engagement, community building
   - Avoids: Spam/abuse through rate limiting and reporting
   - Rationale: Uses existing auth, WebSocket, rate limiting

6. **Team Collaboration** - Workspaces, invites, shared resources
   - Addresses: B2B use case, team knowledge sharing
   - Avoids: Over-engineering with complex RBAC
   - Rationale: Depends on comments for team-scoped discussions

**Phase ordering rationale:**
- i18n first because adding it later to 150+ components is painful
- Mobile parallel because it's independent and high user impact
- Sharing before OAuth because lower complexity and quick wins
- OAuth before comments because comments need reliable auth
- Teams last because highest complexity and depends on comments

**Research flags for phases:**
- Phase 3 (Sharing): Needs SSR investigation for SPA OG tag limitation
- Phase 4 (OAuth): Account linking requires security review
- Phase 5 (Comments): Moderation strategy needs finalization (AI vs manual vs hybrid)
- Phase 6 (Teams): Enterprise features (SSO/SCIM) deferred to v1.5+

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| OAuth | HIGH | Passport.js well-documented, Google/GitHub OAuth mature |
| i18n | HIGH | react-i18next dominant, patterns well-established |
| Mobile Responsive | HIGH | Tailwind CSS mobile-first is standard practice |
| Social Sharing | HIGH | OG protocol stable since 2010, simple implementation |
| Comments | MEDIUM | Core implementation clear, moderation strategy needs work |
| Teams | MEDIUM | RBAC patterns clear, but scope boundaries need definition |

## Files Created

| File | Purpose |
|------|---------|
| `.planning/research/SUMMARY.md` | Executive summary with roadmap implications (this file) |
| `.planning/research/STACK.md` | Technology recommendations and installation |
| `.planning/research/FEATURES.md` | Feature landscape with table stakes/differentiators |
| `.planning/research/ARCHITECTURE.md` | System structure, component boundaries, patterns |
| `.planning/research/PITFALLS.md` | Domain pitfalls and prevention strategies |

## Gaps to Address

- **SSR for OG Tags**: Current Vite SPA can't serve dynamic meta tags. Recommended approach: bot detection middleware that serves pre-rendered HTML with OG tags to social crawlers while redirecting humans to SPA.
- **Comment Moderation**: Research identified hybrid AI+human as best practice, but specific tooling (Akismet vs custom AI) needs evaluation during implementation phase.
- **OAuth Provider Selection**: Research focused on Google/GitHub; Apple Sign-In deferred but may be requested by iOS users.
- **RTL Language Support**: Arabic/Hebrew i18n requires significant layout work; defer to v1.5+.
- **Team Feature Limits**: Free vs paid team sizes, feature gating for monetization not yet defined.
- **Zustand Store Migration**: Adding `version` field to persist config should happen before v1.4 to enable graceful schema migrations.
