# Phase 26: OAuth Integration - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 9 (6 new, 3 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/services/oauthService.ts` | service | request-response | `server/services/authService.ts` | exact |
| `server/routes/oauth.ts` | route | request-response | `server/routes/auth.ts` | exact |
| `server/config/passport.ts` | config | config | `server/config/rateLimits.ts` | role-match |
| `src/components/oauth/OAuthButton.tsx` | component | event-driven | `src/components/sharing/ShareButtons.tsx` | role-match |
| `src/pages/OAuthCallback.tsx` | page | request-response | N/A (minimal HTML) | research-based |
| `src/hooks/useOAuthPopup.ts` | hook | event-driven | `src/hooks/useShare.ts` | role-match |
| `src/components/AuthModal.tsx` (modify) | component | event-driven | self | modify-in-place |
| `src/pages/Settings.tsx` (modify) | page | CRUD | self | modify-in-place |
| `prisma/schema.prisma` (modify) | model | CRUD | self | modify-in-place |

## Pattern Assignments

### `server/services/oauthService.ts` (service, request-response)

**Analog:** `server/services/authService.ts`

**Imports pattern** (lines 1-8):
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { generateSecureToken, hashToken, getTokenExpiry, isTokenExpired } from '../utils/tokenUtils';
import { isDisposableEmail } from '../utils/disposableEmail';
import { EmailService } from './emailService';
import { CacheService, CACHE_TTL } from './cacheService';
```

**Singleton pattern** (lines 47-59):
```typescript
export class AuthService {
  private static instance: AuthService;

  private constructor() {
    console.log('Auth service initialized with Prisma');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
```

**SafeUser type pattern** (lines 22-31):
```typescript
// Safe user type without password hash
interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;  // Added for verification status
}
```

**Password verification pattern** (lines 129-151):
```typescript
async login(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = this.generateToken(user);

  // Return user without password
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}
```

**Token generation pattern** (lines 518-526):
```typescript
private generateToken(user: { id: string; email: string; tokenVersion?: number }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
  };

  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}
```

**Hash utility usage for D-11** (from `server/utils/tokenUtils.ts` lines 19-24):
```typescript
/**
 * Hash a token for database lookup
 * Used when verifying incoming tokens from email links
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

---

### `server/routes/oauth.ts` (route, request-response)

**Analog:** `server/routes/auth.ts`

**Imports pattern** (lines 1-3):
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, authMiddleware } from '../services/authService';
```

**Router setup pattern** (lines 5-7):
```typescript
export const authRoutes = Router();

const authService = AuthService.getInstance();
```

**AuthRequest interface pattern** (lines 9-11):
```typescript
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}
```

**Zod validation schema pattern** (lines 14-22):
```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
});
```

**Zod error formatting pattern** (lines 60-62):
```typescript
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

**Route handler pattern** (lines 65-90):
```typescript
// Register
authRoutes.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { email, password, name } = result.data;

  try {
    const authResult = await authService.register(email, password, name);
    res.status(201).json({
      success: true,
      data: authResult,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    });
  }
});
```

**Protected route pattern with authMiddleware** (lines 121-136):
```typescript
// Get current user
authRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
});
```

---

### `server/config/passport.ts` (config, config)

**Analog:** `server/config/rateLimits.ts`

**Config export pattern** (lines 1-55):
```typescript
/**
 * Rate Limit Configuration (D-05)
 * Tiered limits by endpoint category
 */

export const RATE_LIMITS = {
  /**
   * Auth endpoints (strict) - 5 req/min per IP
   * Protects against brute force attacks
   */
  auth: {
    windowMs: 60_000,  // 1 minute
    max: 5,
    keyBy: 'ip' as const,
    paths: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/request-reset',
      '/api/auth/reset-password',
    ],
  },
  // ... more config
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;
```

---

### `src/components/oauth/OAuthButton.tsx` (component, event-driven)

**Analog:** `src/components/sharing/ShareButtons.tsx`

**Imports pattern** (lines 1-7):
```typescript
import { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, Globe, Send, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useShareClick, type ShareUrls } from '../../hooks/useShare';
```

**Props interface pattern** (lines 9-14):
```typescript
interface ShareButtonsProps {
  shareCode: string;
  title: string;
  urls: ShareUrls;
  className?: string;
}
```

**Platform config pattern** (lines 16-38):
```typescript
// Platform colors per D-03 (using generic icons - social brand icons not in lucide-react)
const PLATFORM_CONFIG = {
  twitter: {
    icon: AtSign, // X/Twitter
    color: '#1DA1F2',
    hoverClass: 'hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]',
  },
  linkedin: {
    icon: Send, // LinkedIn
    color: '#0A66C2',
    hoverClass: 'hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]',
  },
  // ...
} as const;

type Platform = keyof typeof PLATFORM_CONFIG;
```

**Button with motion pattern** (lines 100-113):
```typescript
<motion.button
  onClick={handleNativeShare}
  className={cn(
    'flex items-center gap-2 rounded-lg bg-gray-700/50 px-4 py-2 text-gray-300',
    'hover:bg-gray-600/50 transition-colors min-h-[44px]',
    className
  )}
  whileTap={{ scale: 0.95 }}
  aria-label={t('buttons.share')}
>
  <Share2 className="h-4 w-4" />
  <span className="text-sm font-mono">{t('buttons.share')}</span>
</motion.button>
```

---

### `src/hooks/useOAuthPopup.ts` (hook, event-driven)

**Analog:** `src/hooks/useShare.ts`

**Imports pattern** (lines 1-2):
```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import type { NewsArticle } from '../types';
```

**Types interface pattern** (lines 4-14):
```typescript
// Types matching backend
export interface ShareUrls {
  direct: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
  email: string;
}
```

**useMutation pattern** (lines 35-62):
```typescript
export function useCreateShare() {
  return useMutation({
    mutationFn: async (article: NewsArticle): Promise<ShareUrls> => {
      const response = await fetch('/api/share/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({
          article: {
            id: article.id,
            title: article.title,
            summary: article.summary || article.content?.slice(0, 200) || '',
            imageUrl: article.imageUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      return data.data as ShareUrls;
    },
  });
}
```

---

### `src/components/AuthModal.tsx` (modify, component)

**Current structure** (lines 1-9):
```typescript
import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Form structure** (lines 103-177):
```typescript
<form onSubmit={handleSubmit} className="space-y-4">
  {mode === 'register' && (
    <div>
      <label className="mb-1 block text-sm text-gray-400">Name</label>
      <div className="relative">
        <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name"
          required
          className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )}
  // ... email and password fields
  <button type="submit" ...>
</form>
```

**Modification point: OAuth buttons above form per D-07**
Insert OAuth buttons before `<form>` with "or" divider:
```typescript
{/* OAuth Buttons - D-06, D-07 */}
<div className="space-y-3 mb-6">
  <OAuthButton provider="google" onClick={handleGoogleAuth} />
  <OAuthButton provider="github" onClick={handleGithubAuth} />
</div>
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-600" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-gray-800 px-2 text-gray-400">oder</span>
  </div>
</div>
```

---

### `src/pages/Settings.tsx` (modify, page)

**Section pattern** (lines 188-301):
```typescript
{/* Account Section */}
<div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
  <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
    <User className="h-5 w-5 text-[#00f0ff]" />
    {t('settings:account.title')}
  </h2>

  {isAuthenticated && user ? (
    <div className="space-y-4">
      {/* User Info */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-700/50">
        // ... content
      </div>
    </div>
  ) : (
    <div className="text-center py-6">
      // ... unauthenticated state
    </div>
  )}
</div>
```

**Modification point: Add Connected Accounts section after Account Section**
Use same section pattern with toggle buttons for linked accounts:
```typescript
{/* Connected Accounts Section - D-discretion */}
{isAuthenticated && user && (
  <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
    <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
      <Link2 className="h-5 w-5 text-[#00f0ff]" />
      {t('settings:connectedAccounts.title')}
    </h2>
    <div className="space-y-3">
      {/* Google Account */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
        // ... provider row with link/unlink button
      </div>
      {/* GitHub Account */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
        // ... provider row with link/unlink button
      </div>
    </div>
  </div>
)}
```

---

### `prisma/schema.prisma` (modify, model)

**User model pattern** (lines 66-122):
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  bookmarks    Bookmark[]
  readingHistory ReadingHistory[]
  preferences  Json?    // D-13: JSONB stores user preferences

  // Email verification (AUTH-01 per D-51)
  emailVerified          Boolean   @default(false)
  verificationTokenHash  String?
  verificationTokenExpiry DateTime?
  // ... more fields

  // Indexes for token lookups (D-53)
  @@index([verificationTokenHash])
  @@index([resetTokenHash])
  @@index([emailVerified, createdAt])  // For cleanup job queries
}
```

**Modification: Add OAuth fields per CONTEXT.md**
```prisma
// OAuth Integration (Phase 26)
googleIdHash     String?   @unique  // D-11: SHA-256 hash of Google ID
githubIdHash     String?   @unique  // D-11: SHA-256 hash of GitHub ID
hasPassword      Boolean   @default(true)  // D-03: false for OAuth-only accounts

@@index([googleIdHash])
@@index([githubIdHash])
```

---

### `src/contexts/AuthContext.tsx` (modify, context)

**AuthContext interface** (lines 20-33):
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  addBookmark: (articleId: string) => Promise<void>;
  removeBookmark: (articleId: string) => Promise<void>;
  resendVerification: () => Promise<{ success: boolean; rateLimited?: boolean; minutesRemaining?: number }>;
}
```

**Modification: Add OAuth methods**
```typescript
// OAuth methods to add to interface
loginWithOAuth: (token: string, user: User) => void;
linkOAuthAccount: (provider: 'google' | 'github', password: string) => Promise<{ success: boolean; error?: string }>;
unlinkOAuthAccount: (provider: 'google' | 'github', password: string) => Promise<{ success: boolean; error?: string }>;
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `server/services/authService.ts` (lines 559-603)
**Apply to:** OAuth callback routes that need to verify existing sessions
```typescript
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const authService = AuthService.getInstance();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // D-01, D-02: Check token blacklist (Redis)
  const cacheService = CacheService.getInstance();
  const isBlacklisted = await cacheService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    res.status(401).json({ success: false, error: 'Token revoked' });
    return;
  }

  // Add user info to request
  (req as unknown as { user: JWTPayload }).user = payload;
  next();
}
```

### Error Response Pattern
**Source:** `server/routes/auth.ts`
**Apply to:** All OAuth routes
```typescript
// Validation error
res.status(400).json({
  success: false,
  error: formatZodError(result.error),
});

// Auth error
res.status(401).json({
  success: false,
  error: 'Invalid email or password',
});

// Success
res.json({
  success: true,
  data: authResult,
});
```

### Toast Notification Pattern
**Source:** `src/pages/Settings.tsx` (lines 73-94)
**Apply to:** OAuth success/error feedback in AuthModal
```typescript
// Toast state
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
  message: '',
  type: 'info',
  isOpen: false,
});

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  setToast({ message, type, isOpen: true });
};
```

### API Response Format
**Source:** CLAUDE.md
**Apply to:** All new endpoints
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/pages/OAuthCallback.tsx` | page | request-response | Minimal HTML page for popup callback - use RESEARCH.md pattern |

**RESEARCH.md pattern for OAuthCallback.tsx:**
```typescript
// From RESEARCH.md lines 349-394
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
        window.location.href = '/?oauth_token=' + encodeURIComponent(${JSON.stringify(token)});
      }
    })();
  </script>
</body>
</html>
  `;
}
```

---

## Metadata

**Analog search scope:** `server/services/`, `server/routes/`, `server/config/`, `src/components/`, `src/hooks/`, `src/pages/`, `src/contexts/`
**Files scanned:** 47
**Pattern extraction date:** 2026-04-24

---

## Summary

### Key Patterns Identified

1. **Singleton service pattern** - All backend services use `getInstance()` with private constructor
2. **Zod validation** - All route handlers validate input with Zod schemas before processing
3. **ApiResponse format** - Consistent `{ success, data?, error? }` response shape
4. **SafeUser pattern** - Strip passwordHash and sensitive fields before returning user data
5. **hashToken utility** - Reuse existing `tokenUtils.ts` for D-11 OAuth ID hashing
6. **authMiddleware** - Existing middleware handles JWT verification, blacklist check, tokenVersion validation
7. **Toast notifications** - Settings.tsx pattern for OAuth success/error feedback
8. **Section card pattern** - Settings page sections use consistent `rounded-lg border border-gray-700 bg-gray-800 p-4` styling
9. **Motion button pattern** - ShareButtons.tsx uses framer-motion for interactive feedback
