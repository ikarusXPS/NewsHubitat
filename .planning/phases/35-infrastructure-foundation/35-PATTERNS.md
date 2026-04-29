# Phase 35: Infrastructure Foundation - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 13 new/modified files
**Analogs found:** 11 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `pnpm-workspace.yaml` | config | build-time | N/A | no-analog |
| `.npmrc` | config | build-time | N/A | no-analog |
| `package.json` (root) | config | build-time | `package.json` (existing) | exact |
| `packages/types/package.json` | config | build-time | N/A | new-pattern |
| `packages/types/index.ts` | types | compile-time | `src/types/index.ts` | exact |
| `prisma/schema.prisma` | model | database | `prisma/schema.prisma` (existing) | exact |
| `server/services/apiKeyService.ts` | service | CRUD | `server/services/authService.ts` | role-match |
| `server/openapi/generator.ts` | utility | build-time | N/A | new-pattern |
| `server/middleware/apiKeyAuth.ts` | middleware | request-response | `server/middleware/rateLimiter.ts` | role-match |
| `server/middleware/apiKeyRateLimiter.ts` | middleware | request-response | `server/middleware/rateLimiter.ts` | exact |
| `server/routes/publicApi.ts` | route | request-response | `server/routes/news.ts` | exact |
| `server/routes/apiKeys.ts` | route | CRUD | `server/routes/auth.ts` | role-match |
| `src/pages/DevelopersPage.tsx` | component | user-interface | `src/pages/Profile.tsx` | role-match |

## Pattern Assignments

### `packages/types/index.ts` (types, compile-time)

**Analog:** `src/types/index.ts`

**Imports pattern** (lines 1-150 represent full file structure):
```typescript
export type PerspectiveRegion = 'usa' | 'europa' | 'deutschland' | 'nahost' | 'tuerkei' | 'russland' | 'china' | 'asien' | 'afrika' | 'lateinamerika' | 'ozeanien' | 'kanada' | 'alternative';
export type Sentiment = 'positive' | 'negative' | 'neutral';
export type OwnershipType = 'state' | 'private' | 'public' | 'mixed';

export interface NewsSource {
  id: string;
  name: string;
  // ... more fields
}

export interface NewsArticle {
  id: string;
  title: string;
  // ... more fields
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

**Pattern notes:**
- Extract common types used by both frontend and backend
- Preserve existing type definitions exactly
- Use barrel export pattern (`export type`, `export interface`)
- No runtime code, only TypeScript definitions

---

### `server/services/apiKeyService.ts` (service, CRUD)

**Analog:** `server/services/authService.ts`

**Imports pattern** (lines 1-7):
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { generateSecureToken, hashToken, getTokenExpiry, isTokenExpired } from '../utils/tokenUtils';
import { EmailService } from './emailService';
import { CacheService, CACHE_TTL } from './cacheService';
```

**Singleton pattern** (lines 47-58):
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

**Crypto pattern (bcrypt hashing)** (lines 86, 139, 419):
```typescript
// Hash password/key
const passwordHash = await bcrypt.hash(password, 10);

// Verify hash
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Error handling pattern** (lines 61-90):
```typescript
async register(email: string, password: string, name: string): Promise<{ user: SafeUser; token: string; emailSent: boolean }> {
  // Validate email format
  if (!this.isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // ... business logic

  // Return safe user (omit sensitive fields)
  const { passwordHash: _ph, verificationTokenHash: _vth, resetTokenHash: _rth, ...safeUser } = user;
  return { user: safeUser as SafeUser, token: jwtToken, emailSent };
}
```

**Pattern notes:**
- Use singleton getInstance() for all services
- Hash sensitive data with bcrypt (factor 10)
- Throw Error with user-friendly messages
- Return typed results with omitted sensitive fields
- Always lowercase emails before DB operations

---

### `server/middleware/apiKeyAuth.ts` (middleware, request-response)

**Analog:** `server/middleware/rateLimiter.ts` + `server/services/authService.ts` (authMiddleware pattern, lines 559-603)

**Extended Request type** (lines 14-16):
```typescript
// Extended request type with optional user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}
```

**Middleware signature pattern** (lines 559-563):
```typescript
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
```

**Header extraction + validation** (lines 564-578):
```typescript
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
```

**Redis cache check with graceful degradation** (lines 580-587):
```typescript
// D-01, D-02: Check token blacklist (Redis)
// D-03: Graceful degradation - if Redis unavailable, skip check
const cacheService = CacheService.getInstance();
const isBlacklisted = await cacheService.isTokenBlacklisted(token);
if (isBlacklisted) {
  res.status(401).json({ success: false, error: 'Token revoked' });
  return;
}
```

**Attach to request and continue** (lines 600-602):
```typescript
// Add user info to request
(req as unknown as { user: JWTPayload }).user = payload;
next();
```

**Pattern notes:**
- Extend Request interface for type safety
- Use async/await with Promise<void> return
- Check cache with graceful degradation (skip if Redis down)
- Attach validated data to request object
- Call next() only after all checks pass

---

### `server/middleware/apiKeyRateLimiter.ts` (middleware, request-response)

**Analog:** `server/middleware/rateLimiter.ts`

**Imports pattern** (lines 6-11):
```typescript
import { rateLimit, type RateLimitRequestHandler, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { CacheService } from '../services/cacheService';
import { RATE_LIMITS, type RateLimitTier } from '../config/rateLimits';
import logger from '../utils/logger';
```

**Key generator pattern** (lines 22-40):
```typescript
/**
 * Key generator for IP-based limiting
 * Uses X-Forwarded-For if behind proxy, falls back to req.ip
 */
function ipKeyGenerator(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

/**
 * Key generator for user-based limiting (AI endpoints)
 * Falls back to IP if not authenticated
 */
function userKeyGenerator(req: AuthenticatedRequest): string {
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  // Fallback to IP for unauthenticated requests
  return ipKeyGenerator(req);
}
```

**RedisStore setup with fallback** (lines 56-64):
```typescript
// Build store - use Redis if available, otherwise memory store
let store: RedisStore | undefined;
if (redisClient) {
  store = new RedisStore({
    sendCommand: (command: string, ...args: string[]) =>
      redisClient.call(command, ...args) as Promise<RedisReply>,
    prefix: 'rl:',  // Rate limit key prefix
  });
}
```

**Rate limiter options** (lines 67-98):
```typescript
const options: Partial<Options> = {
  windowMs: config.windowMs,
  max: config.max,
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  keyGenerator,

  // D-06: HTTP 429 with Retry-After header
  handler: (_req, res, _next, opts) => {
    const retryAfter = Math.ceil(opts.windowMs / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter,
    });
  },

  // D-03: Skip rate limiting if Redis unavailable (graceful degradation)
  skip: () => {
    if (!cacheService.isAvailable()) {
      logger.debug('Rate limiting skipped: Redis unavailable (D-03)');
      return true;
    }
    return false;
  },

  // Use Redis store if available
  store,

  ...overrides,
};

return rateLimit(options);
```

**Pattern notes:**
- Use express-rate-limit with RedisStore
- Enable standardHeaders: true for IETF-compliant RateLimit-* headers
- Implement skip() for graceful degradation
- Custom handler returns 429 with Retry-After header
- Support both IP-based and user-based key generators

---

### `server/config/rateLimits.ts` (config, static data)

**Analog:** `server/config/rateLimits.ts` (existing)

**Full pattern** (lines 1-69):
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

  /**
   * AI endpoints (moderate) - 10 req/min per user
   * Limits AI API costs while allowing reasonable usage
   */
  ai: {
    windowMs: 60_000,
    max: 10,
    keyBy: 'user' as const,
    paths: [
      '/api/ai/ask',
      '/api/analysis/clusters',
      '/api/analysis/framing',
    ],
  },

  // ... more tiers
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;
```

**Pattern notes:**
- Export const object with tier configs
- Use `as const` for type inference
- Document rationale for each tier
- Include paths array for reference
- Define keyBy strategy ('ip' | 'user')

---

### `server/routes/publicApi.ts` (route, request-response)

**Analog:** `server/routes/news.ts`

**Imports and Router setup** (lines 1-5):
```typescript
import { Router, Request, Response } from 'express';
import type { PerspectiveRegion, Sentiment } from '../../src/types';
import type { NewsAggregator } from '../services/newsAggregator';

export const newsRoutes = Router();
```

**Query parameter parsing** (lines 11-20):
```typescript
const regions = req.query.regions
  ? (req.query.regions as string).split(',') as PerspectiveRegion[]
  : undefined;
const topics = req.query.topics
  ? (req.query.topics as string).split(',')
  : undefined;
const limit = parseInt(req.query.limit as string) || 20;
const offset = parseInt(req.query.offset as string) || 0;
const search = req.query.search as string | undefined;
const sentiment = req.query.sentiment as Sentiment | undefined;
```

**Response with Cache-Control headers** (lines 34-48):
```typescript
// Cache for 5 minutes - news changes frequently
res.set('Cache-Control', 'public, max-age=300');
res.set('Vary', 'Accept-Encoding');

res.json({
  success: true,
  data: articles,
  meta: {
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  },
});
```

**Error response pattern** (lines 81-87):
```typescript
if (!article) {
  res.status(404).json({
    success: false,
    error: 'Article not found',
  });
  return;
}
```

**Pattern notes:**
- Export const router = Router()
- Parse query params with type casting and defaults
- Set Cache-Control headers for all responses
- Use ApiResponse<T> format: { success, data?, error?, meta? }
- Return early on errors (no else blocks)

---

### `server/routes/apiKeys.ts` (route, CRUD)

**Analog:** `server/routes/auth.ts`

**Imports with Zod validation** (lines 1-5):
```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, authMiddleware } from '../services/authService';

export const authRoutes = Router();
```

**Zod schema pattern** (lines 14-36):
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

**Zod error formatter** (lines 60-62):
```typescript
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}
```

**Route with Zod validation** (lines 65-90):
```typescript
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

**Protected route pattern** (lines 121-136):
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

**Pattern notes:**
- Define Zod schemas at top of file
- Use .safeParse() instead of .parse()
- Format Zod errors with helper function
- Wrap service calls in try/catch
- Apply authMiddleware to protected routes
- Use req.user! (non-null assertion) after authMiddleware

---

### `src/pages/DevelopersPage.tsx` (component, user-interface)

**Analog:** `src/pages/Profile.tsx`

**Imports pattern** (lines 1-26):
```typescript
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Mail,
  Calendar,
  Shield,
  // ... more lucide-react icons
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Toast } from '../components/Toast';
import type { NewsArticle } from '../types';
```

**Component structure** (lines 28-32):
```typescript
export function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { bookmarkedArticles, readingHistory, language } = useAppStore();
```

**React Query usage** (lines 35-61):
```typescript
const { data: historyArticles } = useQuery({
  queryKey: ['profile-history-articles', historyIds.slice(0, 50)],
  queryFn: async () => {
    const map = new Map<string, NewsArticle>();
    const results = await Promise.all(
      historyIds.slice(0, 50).map(async (id) => {
        try {
          const response = await fetch(`/api/news/${id}`);
          if (response.ok) {
            const data = await response.json();
            return { id, article: data.data as NewsArticle };
          }
        } catch {
          // Ignore fetch errors
        }
        return null;
      })
    );
    results.forEach((r) => {
      if (r) map.set(r.id, r.article);
    });
    return map;
  },
  enabled: historyIds.length > 0 && isAuthenticated,
  staleTime: 5 * 60 * 1000,
});
```

**Toast state management** (lines 69-77):
```typescript
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
  message: '',
  type: 'info',
  isOpen: false,
});

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  setToast({ message, type, isOpen: true });
};
```

**Form submission pattern** (lines 79-100):
```typescript
const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  setIsSubmitting(true);
  try {
    const response = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    // ... handle response
  } catch {
    showToast('Failed to update password', 'error');
  } finally {
    setIsSubmitting(false);
  }
}
```

**Pattern notes:**
- Use named export function (not default)
- Import hooks from relevant libraries
- Use useAuth() for authentication state
- Use useQuery for data fetching with staleTime
- Centralize toast state with showToast helper
- Use localStorage.getItem for auth token
- Always use try/catch/finally with loading states

---

### `prisma/schema.prisma` (model, database)

**Analog:** `prisma/schema.prisma` (existing User model, lines 66-135)

**Model definition pattern** (lines 66-90):
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
  verificationSendCount  Int       @default(0)
  lastVerificationSentAt DateTime?

  // Password reset (AUTH-02 per D-51)
  resetTokenHash         String?
  resetTokenExpiry       DateTime?
  resetSendCount         Int       @default(0)
  lastResetSentAt        DateTime?

  // Session invalidation (D-27, D-28)
  tokenVersion           Int       @default(0)
```

**Relations pattern** (lines 118-123):
```prisma
// Relations for features
emailSubscription EmailSubscription?
emailDigests      EmailDigest[]
userPersonas      UserPersona[]
badges            UserBadge[]
comments          Comment[]
teamMemberships   TeamMember[]
```

**Index pattern** (lines 125-135):
```prisma
// Indexes for token lookups (D-53)
@@index([verificationTokenHash])
@@index([resetTokenHash])
@@index([emailVerified, createdAt])  // For cleanup job queries
@@index([googleIdHash])
@@index([githubIdHash])

// Leaderboard query optimization (D-05, DB-02 - Phase 34)
// Query: WHERE showOnLeaderboard = true AND emailVerified = true
@@index([showOnLeaderboard, emailVerified])
```

**Pattern notes:**
- Use cuid() for IDs, not autoincrement
- Mark hashed fields with "Hash" suffix (verificationTokenHash, not verificationToken)
- Add comments explaining rationale for fields
- Group related fields with comment headers
- Add indexes for lookup fields and common query patterns
- Use compound indexes for multi-field WHERE clauses
- Use Json type for flexible JSONB storage

---

## Shared Patterns

### Authentication Middleware
**Source:** `server/services/authService.ts` (authMiddleware, lines 559-603)
**Apply to:** All API key routes

**Core pattern:**
```typescript
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
  // 1. Extract header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // 2. Validate token
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // 3. Check blacklist (graceful degradation)
  const cacheService = CacheService.getInstance();
  const isBlacklisted = await cacheService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    res.status(401).json({ success: false, error: 'Token revoked' });
    return;
  }

  // 4. Attach to request
  (req as unknown as { user: Payload }).user = payload;
  next();
}
```

### Redis Graceful Degradation
**Source:** `server/services/cacheService.ts` (lines 111-113, 155-159)
**Apply to:** All Redis-dependent middleware

**Core pattern:**
```typescript
isAvailable(): boolean {
  return this.isConnected && this.client !== null;
}

// In consuming code:
if (!this.isAvailable()) {
  logger.debug('Redis unavailable, skipping check');
  return false; // Or default behavior
}
```

### Rate Limit Tier Configuration
**Source:** `server/config/rateLimits.ts` (lines 6-67)
**Apply to:** New API tier config

**Core pattern:**
```typescript
export const RATE_LIMITS = {
  tier_name: {
    windowMs: 60_000,  // milliseconds
    max: 10,           // requests per window
    keyBy: 'ip' as const,  // or 'user'
    paths: ['/api/endpoint1', '/api/endpoint2'],
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;
```

### Zod Validation
**Source:** `server/routes/auth.ts` (lines 14-62)
**Apply to:** All API routes with request bodies

**Core pattern:**
```typescript
// 1. Define schema
const schema = z.object({
  email: z.string().email('Invalid email format'),
  // ... more fields
});

// 2. Helper for errors
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// 3. In route
const result = schema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({
    success: false,
    error: formatZodError(result.error),
  });
  return;
}

const { email, password } = result.data;
// ... proceed with validated data
```

### Singleton Service Pattern
**Source:** `server/services/authService.ts` (lines 47-58)
**Apply to:** All new services

**Core pattern:**
```typescript
export class ServiceName {
  private static instance: ServiceName;

  private constructor() {
    console.log('Service initialized');
  }

  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }

  // ... methods
}
```

### API Response Format
**Source:** `server/routes/news.ts` (lines 38-48, 81-87)
**Apply to:** All API endpoints

**Success:**
```typescript
res.json({
  success: true,
  data: result,
  meta?: { total, page, limit, hasMore },
});
```

**Error:**
```typescript
res.status(404).json({
  success: false,
  error: 'Human-readable error message',
});
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `pnpm-workspace.yaml` | config | build-time | New monorepo pattern - use RESEARCH.md Pattern 1 |
| `.npmrc` | config | build-time | New pnpm config - use RESEARCH.md Pattern 1 |
| `server/openapi/generator.ts` | utility | build-time | New OpenAPI generation - use RESEARCH.md Pattern 3 |
| `packages/types/package.json` | config | build-time | New package pattern - use RESEARCH.md Pattern 1 |

## Metadata

**Analog search scope:**
- `server/services/` (38 files)
- `server/routes/` (22 files)
- `server/middleware/` (2 files)
- `src/pages/` (18 files)
- `src/types/` (1 file)
- `prisma/` (1 file)

**Files scanned:** 82
**Pattern extraction date:** 2026-04-26

**Key observations:**
- Strong existing patterns for auth middleware, rate limiting, and service singletons
- CacheService.isAvailable() used consistently for graceful degradation
- Zod validation is standard across all auth routes
- ApiResponse<T> format used in all routes
- All services use getInstance() singleton pattern
- Prisma models use cuid() for IDs and include detailed indexes

**Recommended approach:**
1. Copy rate limiter pattern exactly (proven robust with Redis + fallback)
2. Extend authMiddleware pattern for API key validation
3. Replicate Zod validation pattern from auth.ts
4. Follow singleton service pattern for apiKeyService
5. Use RESEARCH.md patterns for monorepo files (no existing analogs)
