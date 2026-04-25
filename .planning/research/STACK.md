# Technology Stack Additions for v1.4

**Project:** NewsHub v1.4 - User & Community Features
**Researched:** 2026-04-23
**Mode:** Incremental (additions to existing stack)

## Executive Summary

This document identifies the minimum libraries needed for OAuth, i18n, mobile responsive, social sharing, comments, and team collaboration features. The existing React 19, Express 5, PostgreSQL/Prisma 7, Zustand, TanStack Query, and Socket.io stack is validated and should NOT be changed.

**Key decisions:**
- OAuth: Passport.js 0.7 (mature, Express-compatible, 480+ strategies)
- i18n: react-i18next 17 + i18next 26 (de-facto standard, React 19 compatible)
- Mobile: NO new libraries (Tailwind v4 already provides responsive utilities)
- Social Sharing: Native Web Share API + fallback (no library needed)
- Comments: Custom build using existing Prisma + Socket.io (no library needed)
- Team/RBAC: CASL 6.8 (isomorphic, Prisma-native, TypeScript-first)

## Existing Stack (DO NOT MODIFY)

| Category | Technology | Version | Status |
|----------|------------|---------|--------|
| Frontend | React | 19.2.0 | Keep |
| Build | Vite | 8.0.8 | Keep |
| Language | TypeScript | 6.0.3 | Keep |
| Styling | Tailwind CSS | 4.2.1 | Keep |
| State | Zustand | 5.0.11 | Keep |
| Server State | TanStack Query | 5.90.21 | Keep |
| Backend | Express | 5.2.1 | Keep |
| Database | PostgreSQL + Prisma | 7.7.0 | Keep |
| Real-time | Socket.io | 4.8.3 | Keep |
| Auth | JWT (jsonwebtoken) | 9.0.3 | Keep |
| Validation | Zod | 4.3.6 | Keep |

---

## NEW: OAuth Authentication

### Recommended Stack

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| passport | ^0.7.0 | OAuth authentication middleware | HIGH |
| passport-google-oauth20 | ^2.0.0 | Google OAuth 2.0 strategy | HIGH |
| passport-github2 | ^0.1.12 | GitHub OAuth 2.0 strategy | HIGH |
| @types/passport | ^1.0.16 | TypeScript definitions | HIGH |
| @types/passport-google-oauth20 | ^2.0.14 | TypeScript definitions | HIGH |
| @types/passport-github2 | ^1.2.9 | TypeScript definitions | HIGH |

### Why Passport.js

1. **Express-native**: Designed for Connect-style middleware, integrates cleanly with Express 5
2. **Strategy ecosystem**: 480+ strategies for any OAuth provider needed in future
3. **Session-optional**: Can work with existing JWT-based auth (no session dependency)
4. **Proven at scale**: Used by major platforms, mature and stable

### Integration Points

```typescript
// server/routes/auth.ts - Extend existing auth routes
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';

// OAuth strategies use existing User model
// Add optional fields to schema:
// - googleId: String? @unique
// - githubId: String? @unique
// - provider: String @default("local")
```

### Schema Changes Required

```prisma
model User {
  // Existing fields...

  // OAuth provider IDs (v1.4)
  googleId    String?  @unique
  githubId    String?  @unique
  provider    String   @default("local")  // local, google, github
  avatarUrl   String?  // Already exists, populated from OAuth profile
}
```

### Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5173/auth/github/callback
```

### Sources

- [Passport.js Official](https://www.passportjs.org/)
- [passport-google-oauth20](https://www.passportjs.org/packages/passport-google-oauth20/)
- [passport-github2 npm](https://www.npmjs.com/package/passport-github2)

---

## NEW: Internationalization (i18n)

### Recommended Stack

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| i18next | ^26.0.6 | Core i18n framework | HIGH |
| react-i18next | ^17.0.2 | React integration | HIGH |
| i18next-browser-languagedetector | ^8.0.4 | Auto-detect user language | HIGH |
| i18next-http-backend | ^3.0.3 | Load translations via HTTP | MEDIUM |

### Why i18next + react-i18next

1. **React 19 compatible**: Version 17 includes fixes for React 19 warnings (key prop, ref warnings)
2. **Hook-based**: `useTranslation()` hook fits existing functional component patterns
3. **Lazy loading**: Load translations on-demand to reduce bundle size
4. **Proven ecosystem**: 6,173+ projects on npm, extensive documentation

### Integration Architecture

```
src/
  locales/
    en/
      common.json      # Shared UI strings
      dashboard.json   # Dashboard-specific
      analysis.json    # Analysis page strings
    de/
      common.json
      dashboard.json
      analysis.json
    tr/                # Future: Turkish (significant user base)
      ...
  i18n/
    config.ts          # i18n initialization
    index.ts           # Export hook wrappers
```

### Configuration Pattern

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    ns: ['common', 'dashboard', 'analysis'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
```

### Zustand Integration

```typescript
// Extend existing store
interface AppState {
  language: 'en' | 'de' | 'tr';  // Expand from current 'de' | 'en'
  setLanguage: (lang: 'en' | 'de' | 'tr') => void;
}

// Language change syncs with i18next
setLanguage: (lang) => {
  i18n.changeLanguage(lang);
  set({ language: lang });
},
```

### Sources

- [react-i18next npm](https://www.npmjs.com/package/react-i18next) (v17.0.2)
- [i18next npm](https://www.npmjs.com/package/i18next) (v26.0.6)
- [react-i18next documentation](https://react.i18next.com/)

---

## Mobile Responsive: NO NEW LIBRARIES NEEDED

### Rationale

Tailwind CSS v4 (already installed at 4.2.1) provides complete mobile-first responsive utilities.

### Existing Capabilities

| Feature | Tailwind v4 Solution |
|---------|---------------------|
| Breakpoints | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` prefixes |
| Container queries | `@container`, `@sm:`, `@md:` (built-in, no plugin) |
| Mobile navigation | Build with existing components + `md:hidden`/`md:flex` |
| Touch targets | `min-h-12` (48px minimum), `p-4` padding |
| Viewport units | `h-dvh` (dynamic viewport height) |

### Default Breakpoints (Tailwind v4)

| Prefix | Width | Use Case |
|--------|-------|----------|
| (none) | 0px+ | Mobile-first base |
| `sm:` | 640px+ | Large phones |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |
| `xl:` | 1280px+ | Desktops |
| `2xl:` | 1536px+ | Large screens |

### Mobile Navigation Pattern

```tsx
// Use existing @headlessui/react Dialog for mobile drawer
// Already compatible with Tailwind v4
import { Dialog, DialogPanel } from '@headlessui/react';

// Mobile menu toggle
<button className="md:hidden">
  <Menu className="h-6 w-6" />
</button>

// Desktop nav visible on md+
<nav className="hidden md:flex">
  ...
</nav>
```

### What to Add (Optional)

| Library | Version | Purpose | When |
|---------|---------|---------|------|
| @headlessui/react | ^2.2.10 | Accessible dialogs/menus | IF mobile drawer needed |

**Note**: Check if Radix Dialog (already installed: `@radix-ui/react-dialog ^1.1.15`) meets needs before adding Headless UI.

### Sources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS v4 Container Queries](https://bordermedia.org/blog/tailwind-css-4-breakpoint-override)

---

## Social Sharing: MINIMAL LIBRARY APPROACH

### Recommended Approach

Use native **Web Share API** with fallback to direct share URLs. No library needed.

### Why No Library

1. **Web Share API**: Native on mobile, covers 85%+ of share use cases
2. **Direct URLs**: Simple `window.open()` fallback for desktop
3. **Bundle size**: Zero additional bytes vs 6KB+ for react-share
4. **Already have SharedContent model**: Schema exists in Prisma

### Implementation Pattern

```typescript
// src/lib/share.ts
export async function shareContent(data: ShareData): Promise<boolean> {
  // Native share on supported browsers (mobile)
  if (navigator.canShare?.(data)) {
    await navigator.share(data);
    return true;
  }

  // Fallback: open share dialog
  return false;
}

// Direct share URLs for fallback
export const shareUrls = {
  twitter: (text: string, url: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  facebook: (url: string) =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  linkedin: (url: string) =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  whatsapp: (text: string) =>
    `https://wa.me/?text=${encodeURIComponent(text)}`,
  telegram: (text: string, url: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
};
```

### Existing Schema Support

```prisma
// Already exists in schema.prisma
model SharedContent {
  id            String   @id
  shareCode     String   @unique
  contentType   String   // article, cluster, comparison, digest
  contentId     String
  // ... analytics fields
}

model ShareClick {
  platform      String   // twitter, facebook, linkedin, whatsapp, telegram, copy, email
  // ... tracking fields
}
```

### Optional: If Library Preferred

| Library | Version | Size | When to Use |
|---------|---------|------|-------------|
| react-share | ^5.1.2 | 6KB gzip | If custom button styling needed |

### Sources

- [Web Share API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Using Web Share API in React](https://www.brannen.dev/posts/using-the-web-share-api-in-react)
- [react-share npm](https://www.npmjs.com/package/react-share)

---

## Comments System: CUSTOM BUILD

### Recommended Approach

Build custom using existing Prisma + Socket.io stack. No external library needed.

### Why Custom Build

1. **Socket.io already installed**: Real-time updates for new comments
2. **Prisma models extensible**: Add Comment model with self-referencing for threads
3. **No good React 19 libraries**: react-comments-section is 2+ years old
4. **Control over moderation**: Custom allows AI-based spam detection integration

### Schema Design

```prisma
model Comment {
  id          String    @id @default(cuid())
  content     String
  articleId   String
  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String

  // Threading
  parent      Comment?  @relation("CommentThread", fields: [parentId], references: [id])
  parentId    String?
  replies     Comment[] @relation("CommentThread")

  // Moderation
  status      String    @default("published")  // published, hidden, flagged
  reportCount Int       @default(0)

  // Engagement
  upvotes     Int       @default(0)
  downvotes   Int       @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([articleId])
  @@index([authorId])
  @@index([parentId])
  @@index([status])
}

model CommentVote {
  id          String   @id @default(cuid())
  comment     Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  commentId   String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  vote        Int      // 1 = upvote, -1 = downvote

  @@unique([commentId, userId])
}
```

### Real-time Integration

```typescript
// server/services/websocketService.ts
// Extend existing WebSocket service

socket.on('comment:new', (articleId) => {
  io.to(`article:${articleId}`).emit('comment:added', comment);
});

socket.on('comment:reply', (parentId) => {
  io.to(`comment:${parentId}`).emit('comment:replied', reply);
});
```

### Sources

- [react-comments-section npm](https://www.npmjs.com/package/react-comments-section) (outdated, avoid)
- [Building Nested Comments in React](https://www.saikatsamanta.dev/blog/create-nested-comment-section-with-react)

---

## Team Collaboration & RBAC

### Recommended Stack

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| @casl/ability | ^6.8.0 | Core permissions engine | HIGH |
| @casl/react | ^5.0.1 | React integration (Can component) | HIGH |
| @casl/prisma | ^1.6.1 | Prisma query filtering | HIGH |

### Why CASL

1. **Isomorphic**: Same permission logic on frontend and backend
2. **Prisma-native**: `accessibleBy()` generates WHERE clauses automatically
3. **TypeScript-first**: Full type safety with ability definitions
4. **Minimal size**: 6KB gzipped core
5. **Action-based**: Matches REST patterns (create, read, update, delete)

### Permission Architecture

```typescript
// shared/permissions.ts
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, Subjects } from '@casl/prisma';

type AppSubjects =
  | Subjects<{ Article: Article; Comment: Comment; Team: Team }>
  | 'all';

type AppAbility = PureAbility<[string, AppSubjects], PrismaQuery>;

export function defineAbilitiesFor(user: User, teamMembership?: TeamMember) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>();

  // Everyone can read public articles
  can('read', 'Article', { isPublic: true });

  if (user) {
    // Logged-in users can comment
    can('create', 'Comment');
    can('update', 'Comment', { authorId: user.id });
    can('delete', 'Comment', { authorId: user.id });
  }

  if (teamMembership?.role === 'admin') {
    can('manage', 'Team', { id: teamMembership.teamId });
    can('manage', 'Comment', { teamId: teamMembership.teamId });
  }

  return build();
}
```

### Schema Design (Teams)

```prisma
model Team {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  description String?
  avatarUrl   String?

  members     TeamMember[]
  sharedFeeds TeamFeed[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([slug])
}

model TeamMember {
  id        String   @id @default(cuid())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  role      String   @default("member")  // owner, admin, member, viewer
  joinedAt  DateTime @default(now())

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model TeamFeed {
  id          String   @id @default(cuid())
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId      String
  name        String
  filters     Json     // Saved source/region/topic filters
  isDefault   Boolean  @default(false)
  createdBy   String
  createdAt   DateTime @default(now())

  @@index([teamId])
}
```

### React Integration

```tsx
// src/components/Can.tsx
import { Can as CaslCan } from '@casl/react';
import { useAbility } from '../hooks/useAbility';

export function Can({ children, ...props }) {
  const ability = useAbility();
  return <CaslCan ability={ability} {...props}>{children}</CaslCan>;
}

// Usage
<Can I="delete" a="Comment" this={comment}>
  <button onClick={handleDelete}>Delete</button>
</Can>
```

### Sources

- [CASL Official](https://casl.js.org/)
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability) (v6.8.0)
- [@casl/prisma npm](https://www.npmjs.com/package/@casl/prisma) (v1.6.1)
- [Building RBAC with CASL (2026)](https://benmukebo.medium.com/how-i-built-a-production-ready-rbac-system-in-react-with-casl-fd5b16354e3d)

---

## Installation Summary

### NPM Install Command

```bash
# OAuth
npm install passport passport-google-oauth20 passport-github2
npm install -D @types/passport @types/passport-google-oauth20 @types/passport-github2

# i18n
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend

# RBAC (Team Collaboration)
npm install @casl/ability @casl/react @casl/prisma
```

### What NOT to Install

| Library | Reason |
|---------|--------|
| tailwindcss-responsive | Already have Tailwind v4 |
| @headlessui/react | Already have Radix Dialog |
| react-share | Native Web Share API sufficient |
| react-comments-section | Outdated, build custom |
| permit.io / cerbos | CASL is simpler for this scale |
| express-session | Keep JWT-based auth (no session) |

---

## Bundle Impact Analysis

| Addition | Size (gzip) | Impact |
|----------|-------------|--------|
| passport + strategies | ~15KB | Server only |
| i18next + react-i18next | ~25KB | Moderate |
| @casl/* | ~10KB | Minimal |
| **Total frontend** | ~35KB | Acceptable |

### Mitigation

- i18next: Lazy-load translations per route
- CASL: Tree-shake unused features
- Translations: Load on-demand via HTTP backend

---

## Integration Priority

| Feature | Priority | Dependencies | Est. Effort |
|---------|----------|--------------|-------------|
| OAuth (Google/GitHub) | HIGH | Schema migration | 2-3 days |
| i18n | HIGH | Translation files | 3-4 days |
| Mobile Responsive | MEDIUM | None | 2-3 days |
| Social Sharing | MEDIUM | None (schema exists) | 1-2 days |
| Comments | LOW | Schema migration | 3-4 days |
| Team Collaboration | LOW | Schema + RBAC | 5-7 days |

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| OAuth (Passport) | HIGH | Mature library, official docs verified, Express 5 compatible |
| i18n (react-i18next) | HIGH | React 19 compatibility confirmed in v17, npm verified |
| Mobile (Tailwind v4) | HIGH | Already installed, official docs confirm capabilities |
| Social Sharing | HIGH | Native API + simple fallback, no dependencies |
| Comments | MEDIUM | Custom build, patterns researched but not library-backed |
| RBAC (CASL) | HIGH | Recent npm versions, Prisma integration documented |

---

*Research completed 2026-04-23. Sources include npm registry, official documentation, and verified 2026 blog posts.*
