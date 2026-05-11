<!-- generated-by: gsd-doc-writer -->
# API

> **Internal HTTP API reference** — used by the NewsHub web frontend and trusted server-side integrations. Authenticated with JWT Bearer tokens (issued by `/api/auth/login`).
>
> **Looking for the public, key-gated API?** That's a separate surface mounted at `/api/v1/public/*` and authenticated via the `X-API-Key` header. See the [Public API](#public-api-v1) section below or browse it interactively at [`/developers`](http://localhost:5173/developers) (Scalar UI, served by the React frontend) — spec served from [`/api/openapi.json`](http://localhost:3001/api/openapi.json).

## Authentication

The internal API uses JWT (JSON Web Token) bearer authentication for protected endpoints. Tokens are issued upon successful login and must be included in the `Authorization` header for authenticated requests.

### How to authenticate

Include the JWT token in the request header:

```http
Authorization: Bearer <your-jwt-token>
```

### Token lifecycle

- **Expiration**: Tokens are valid for 7 days from issuance
- **Refresh**: Re-authenticate via `/api/auth/login` to obtain a new token
- **Invalidation**: Tokens are blacklisted upon logout or password change (requires Redis)
- **Versioning**: Each user has a `tokenVersion` field; incrementing it invalidates all existing tokens for that user

### Security features

- **Password requirements**: Minimum 12 characters with at least one uppercase letter, one lowercase letter, and one number
- **Email verification**: Users must verify email addresses before accessing certain features
- **Rate limiting**: Tiered limits by endpoint category (see [Rate Limits](#rate-limits))
- **Token blacklist**: Logout and password change operations blacklist current tokens via Redis
- **Disposable email blocking**: Registration rejects disposable email providers
- **Auth endpoint hardening**: `/api/auth/login`, `/api/auth/register`, `/api/auth/request-reset`, `/api/auth/reset-password` are limited to **5 requests/min per IP**

### OAuth providers

In addition to email/password login, two OAuth providers are supported via passport (popup-flow callback HTML, no server-side session):

- `GET /api/auth/google` — initiate Google OAuth
- `GET /api/auth/google/callback` — Google callback (returns HTML that posts result to opener window)
- `GET /api/auth/github` — initiate GitHub OAuth
- `GET /api/auth/github/callback` — GitHub callback
- `POST /api/auth/oauth/link` — link an OAuth provider to an existing email/password account (requires password verification)
- `POST /api/auth/oauth/unlink` — remove a linked OAuth provider
- `GET /api/auth/oauth/providers` — list linked providers for the current user

## Endpoints overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| **Authentication** |||
| `POST` | `/api/auth/register` | Create new account | No |
| `POST` | `/api/auth/login` | Authenticate and receive JWT | No |
| `GET` | `/api/auth/me` | Get current user profile | Yes |
| `GET` | `/api/auth/verify` | Verify token validity | Yes |
| `POST` | `/api/auth/logout` | Blacklist current token | Yes |
| `PATCH` | `/api/auth/preferences` | Update user preferences | Yes |
| `PUT` | `/api/auth/password` | Change password | Yes |
| `GET` | `/api/auth/verify-email` | Verify email with token | No |
| `POST` | `/api/auth/resend-verification` | Resend verification email | Yes |
| `POST` | `/api/auth/request-reset` | Request password reset email | No |
| `GET` | `/api/auth/validate-reset-token` | Validate password reset token | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |
| `GET` | `/api/auth/verification-status` | Check email verification status | Yes |
| `GET` | `/api/auth/bookmarks` | List user bookmarks | Yes |
| `POST` | `/api/auth/bookmarks/:articleId` | Add bookmark | Yes |
| `DELETE` | `/api/auth/bookmarks/:articleId` | Remove bookmark | Yes |
| `GET` | `/api/auth/google` | Initiate Google OAuth | No |
| `GET` | `/api/auth/google/callback` | Google OAuth callback | No |
| `GET` | `/api/auth/github` | Initiate GitHub OAuth | No |
| `GET` | `/api/auth/github/callback` | GitHub OAuth callback | No |
| `POST` | `/api/auth/oauth/link` | Link OAuth provider to existing account | No (re-auths via password) |
| `POST` | `/api/auth/oauth/unlink` | Unlink OAuth provider | Yes |
| `GET` | `/api/auth/oauth/providers` | List linked OAuth providers | Yes |
| **News** |||
| `GET` | `/api/news` | List articles with filters | No |
| `GET` | `/api/news/:id` | Get single article | No |
| `GET` | `/api/news/sources` | List all 130 news sources | No |
| `GET` | `/api/news/sentiment` | Get sentiment statistics by region | No |
| `POST` | `/api/news/:id/translate` | Translate article on-demand | No |
| **Analysis** |||
| `GET` | `/api/analysis/clusters` | Get article clusters (`?summaries=true` for AI summaries) | Yes (tier-limited) |
| `POST` | `/api/analysis/summarize` | Generate topic summary | Yes (tier-limited) |
| `GET` | `/api/analysis/framing` | Get framing comparison | Yes (tier-limited) |
| `GET` | `/api/analysis/coverage-gaps` | Detect coverage gaps | Yes (tier-limited) |
| `GET` | `/api/analysis/status` | Check AI service availability | Yes (tier-limited) |
| **AI** |||
| `POST` | `/api/ai/ask` | RAG-based Q&A with article context | Yes (tier-limited) |
| `POST` | `/api/ai/propaganda` | Propaganda detection analysis | Yes (tier-limited) |
| `POST` | `/api/ai/fact-check` | Fact-check a single claim against an article (Phase 38) | Yes (tier-limited) |
| `GET` | `/api/ai/source-credibility/:sourceId` | Source credibility score (Phase 38) | Yes (tier-limited) |
| **Events** |||
| `GET` | `/api/events` | List timeline events from articles | No |
| `GET` | `/api/events/geo` | Get geo-located events | No |
| `GET` | `/api/events/timeline` | Get combined current+historical timeline | No |
| `GET` | `/api/events/historical` | Get historical events only | No |
| `GET` | `/api/events/stats/summary` | Get event statistics | No |
| `GET` | `/api/events/:id` | Get single event with related articles | No |
| **Markets** |||
| `GET` | `/api/markets` | Current market data snapshot | No |
| **Translation** |||
| `POST` | `/api/translate` | Translate text | No |
| `POST` | `/api/translate/batch` | Batch translate multiple texts | No |
| `GET` | `/api/translate/usage` | Get translation usage stats | No |
| **Comments** |||
| `POST` | `/api/comments` | Create comment (or threaded reply) | Yes |
| `GET` | `/api/comments/:articleId` | List comments for article | No |
| `PATCH` | `/api/comments/:id/edit` | Edit comment (15-min window) | Yes |
| `DELETE` | `/api/comments/:id` | Soft-delete comment | Yes |
| `POST` | `/api/comments/:id/flag` | Flag comment for moderation | Yes |
| **Teams** |||
| `POST` | `/api/teams` | Create team | Yes |
| `GET` | `/api/teams` | List user's teams | Yes |
| `GET` | `/api/teams/:teamId` | Get single team | Yes (member) |
| `PATCH` | `/api/teams/:teamId` | Update team | Yes (admin+) |
| `DELETE` | `/api/teams/:teamId` | Delete team | Yes (owner) |
| `GET` | `/api/teams/:teamId/members` | List team members | Yes (member) |
| `PATCH` | `/api/teams/:teamId/members/:userId` | Update member role | Yes (owner) |
| `DELETE` | `/api/teams/:teamId/members/:userId` | Remove or leave team | Yes (member) |
| `POST` | `/api/teams/:teamId/invite` | Send email invite | Yes (admin+) |
| `GET` | `/api/teams/:teamId/invites` | List pending invites | Yes (admin+) |
| `DELETE` | `/api/teams/:teamId/invites/:inviteId` | Cancel pending invite | Yes (admin+) |
| `POST` | `/api/teams/accept-invite/:token` | Accept team invite | Yes |
| `GET` | `/api/teams/:teamId/bookmarks` | List team bookmarks | Yes (member) |
| `POST` | `/api/teams/:teamId/bookmarks` | Add team bookmark | Yes (member) |
| `DELETE` | `/api/teams/:teamId/bookmarks/:bookmarkId` | Remove team bookmark | Yes (member) |
| **Subscriptions (Stripe)** |||
| `POST` | `/api/subscriptions/checkout` | Create Stripe Checkout session | Yes |
| `POST` | `/api/subscriptions/portal` | Create Stripe Customer Portal session | Yes |
| `GET` | `/api/subscriptions/status` | Get current subscription status | Yes |
| `POST` | `/api/webhooks/stripe` | Stripe webhook receiver (raw body) | Stripe signature |
| **Account / GDPR** |||
| `GET` | `/api/account/export` | Export user data (`?format=json\|csv`; pdf for Enterprise) | Yes |
| `POST` | `/api/account/delete-request` | Request account deletion (7-day grace) | Yes |
| `POST` | `/api/account/cancel-deletion` | Cancel pending deletion | Yes |
| **User Features** |||
| `POST` | `/api/bookmarks` | Create bookmark (idempotent) | Yes |
| `GET` | `/api/history` | List reading history (FREE: 7 days, Premium: unlimited) | Yes |
| `POST` | `/api/history` | Create reading history entry | Yes |
| **Profile** |||
| `GET` | `/api/profile/me` | Get current user profile | Yes |
| `PUT` | `/api/profile/name` | Update display name | Yes |
| `PUT` | `/api/profile/avatar/preset` | Set preset avatar | Yes |
| `POST` | `/api/profile/avatar/upload` | Upload custom avatar image | Yes |
| `PUT` | `/api/profile/leaderboard-visibility` | Toggle leaderboard opt-in | Yes |
| **Badges** |||
| `GET` | `/api/badges/definitions` | List all badge definitions | No |
| `GET` | `/api/badges/user` | List current user's earned badges | Yes |
| `GET` | `/api/badges/progress` | Per-badge progress for current user | Yes |
| `POST` | `/api/badges/award` | Award badge (server-side trigger) | Yes |
| `PUT` | `/api/badges/featured` | Pin badges to profile | Yes |
| **Leaderboard** |||
| `GET` | `/api/leaderboard` | Public leaderboard | No |
| `GET` | `/api/leaderboard/me` | Current user's rank | Yes |
| `GET` | `/api/leaderboard/weekly-winner` | This week's top user | No |
| **Focus / Suggestions** |||
| `GET` | `/api/focus/suggestions` | Top focus suggestions (tension spikes, breaking, gaps) | No |
| **AI Personas** |||
| `GET` | `/api/personas` | List built-in personas | No |
| `GET` | `/api/personas/:id` | Single persona | No |
| `POST` | `/api/personas/suggest` | Suggest persona for context | No |
| `POST` | `/api/personas/:id/analyze` | Analyze with persona | No |
| `GET` | `/api/personas/user/active` | Current user's active persona | Yes (header-based) |
| `POST` | `/api/personas/user/active` | Set active persona | Yes (header-based) |
| **Sharing** |||
| `GET` | `/api/share/my` | List shares created by current user | Yes |
| `POST` | `/api/share/article` | Create share link for an article | No |
| `POST` | `/api/share/cluster` | Create share link for a cluster | No |
| `POST` | `/api/share/comparison` | Create share link for a comparison | No |
| `GET` | `/api/share/:code` | Resolve share by code | No |
| `GET` | `/api/share/:code/og` | OpenGraph metadata for crawlers | No |
| `POST` | `/api/share/:code/click` | Increment share click counter | No |
| `GET` | `/api/share/:code/analytics` | Share analytics (owner only) | Yes |
| `GET` | `/api/share/trending` | Trending shares | No |
| **Email Digest** |||
| `GET` | `/api/email/status` | Email service availability | No |
| `GET` | `/api/email/subscription` | Get current digest subscription | Yes |
| `POST` | `/api/email/subscription` | Create digest subscription | Yes |
| `PUT` | `/api/email/subscription` | Update digest subscription | Yes |
| `DELETE` | `/api/email/subscription` | Cancel digest subscription | Yes |
| `POST` | `/api/email/test` | Send test digest email | Yes |
| `POST` | `/api/email/unsubscribe` | One-click unsubscribe (token-based) | No |
| `POST` | `/api/email/webhook` | Email provider webhook receiver | Provider signature |
| **API Keys (developer self-service)** |||
| `GET` | `/api/keys` | List user's API keys | Yes |
| `POST` | `/api/keys` | Create API key (max 3 per user) | Yes |
| `DELETE` | `/api/keys/:keyId` | Revoke API key | Yes |
| **Podcasts** (Phase 40) |||
| `GET` | `/api/podcasts` | List curated podcast feeds | No |
| `GET` | `/api/podcasts/:feedId/episodes` | Episodes for a curated feed | No |
| `GET` | `/api/podcasts/episodes/:episodeId` | Single episode by id | No |
| `GET` | `/api/podcasts/related/:articleId` | Episodes matched to an article | No |
| **Videos** (Phase 40) |||
| `GET` | `/api/videos/related/:articleId` | Videos matched to an article | No |
| `GET` | `/api/videos/channels` | List curated video channels | No |
| `GET` | `/api/videos/channel/:channelId/recent` | Recent videos for a channel | No |
| **Transcripts** (Phase 40) |||
| `GET` | `/api/transcripts/:contentType/:id` | Single transcript (segments + meta) | Yes (Premium) |
| `GET` | `/api/transcripts/:contentType/:id/search` | Full-text search within a transcript | Yes (Premium) |
| **Public API v1** (key-gated, see [Public API](#public-api-v1)) |||
| `GET` | `/api/v1/public/news` | List articles | API key |
| `GET` | `/api/v1/public/news/:id` | Single article | API key |
| `GET` | `/api/v1/public/events` | Geo-located events | API key |
| `GET` | `/api/v1/public/sentiment` | Sentiment stats by region | API key |
| **OpenAPI** |||
| `GET` | `/api/openapi.json` | OpenAPI 3.x spec (generated from Zod schemas) | No |
| **Health & Monitoring** |||
| `GET` | `/health` | Liveness probe (no `/api` prefix) | No |
| `GET` | `/readiness` | Readiness probe with DB+Redis check | No |
| `GET` | `/api/health` | Server health + service status | No |
| `GET` | `/api/health/db` | PostgreSQL connectivity check | No |
| `GET` | `/api/health/redis` | Redis connectivity and stats | No |
| `GET` | `/api/ping` | Trivial ping (no dependencies) | No |
| `GET` | `/metrics` | Prometheus metrics (text format) | No |

## Request/response formats

All API responses (with the exception of `/api/ai/ask`, `/api/ai/propaganda`, and `/metrics`) follow a consistent JSON envelope structure.

### Success response

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Error response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

> **Note**: `/api/ai/ask` and `/api/ai/propaganda` return raw JSON (no `{ success, data }` envelope) for token efficiency. The Phase 38 endpoints `/api/ai/fact-check` and `/api/ai/source-credibility/:sourceId` use the standard envelope. See the AI section below.

## Authentication endpoints

### POST /api/auth/register

Create a new user account. Sends email verification link.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

Validation: password ≥ 12 chars with uppercase, lowercase, and digit; name 2–100 chars.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "token": "jwt-token",
    "emailSent": true
  }
}
```

### POST /api/auth/login

Authenticate and receive JWT token.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true
    },
    "token": "jwt-token"
  }
}
```

### GET /api/auth/me

Get current authenticated user profile.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "emailVerified": true,
    "preferences": {
      "language": "de",
      "theme": "dark",
      "regions": ["usa", "europa", "deutschland"]
    }
  }
}
```

### POST /api/auth/logout

Blacklist the current token via Redis. The blacklist entry expires after the token's natural lifetime (7 days).

**Response (200):**

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

### PUT /api/auth/password

Change password. After success, the current token is blacklisted; the client must re-authenticate.

**Request body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456"
}
```

## News endpoints

### GET /api/news

List news articles with optional filters and pagination. Cached 5 minutes (`Cache-Control: public, max-age=300`).

**Query parameters:**

- `regions` (string): Comma-separated region codes (`usa,europa,deutschland`)
- `topics` (string): Comma-separated topic keywords
- `search` (string): Full-text search query
- `sentiment` (string): Filter by sentiment (`positive`, `negative`, `neutral`)
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset (default: 0)

**Example request:**

```http
GET /api/news?regions=usa,europa&sentiment=negative&limit=10
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "article-id",
      "title": "Article title",
      "titleTranslated": {
        "de": "German translation",
        "en": "English translation"
      },
      "content": "Article content",
      "summary": "Article summary",
      "source": {
        "id": "source-id",
        "name": "Source Name",
        "country": "US",
        "region": "usa"
      },
      "sentiment": "negative",
      "sentimentScore": -0.6,
      "perspective": "usa",
      "publishedAt": "2026-04-23T10:00:00Z",
      "url": "https://source.com/article",
      "topics": ["politics", "economy"]
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

### GET /api/news/:id

Get a single article by ID. Cached 10 minutes.

**Response (200):** Same article shape as above (single object, not array).

**Error (404):**
```json
{ "success": false, "error": "Article not found" }
```

### GET /api/news/sources

List all 130 configured news sources. Cached 24 hours.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cnn",
      "name": "CNN",
      "country": "US",
      "region": "usa",
      "language": "en",
      "bias": {
        "political": -0.2,
        "reliability": 7,
        "ownership": "private"
      }
    }
  ]
}
```

### GET /api/news/sentiment

Aggregated sentiment statistics by region. Cached 5 minutes.

### POST /api/news/:id/translate

Translate a specific article on-demand. Persists the translation in the article's `titleTranslated`/`contentTranslated` JSONB columns and invalidates relevant caches.

**Request body:**

```json
{
  "targetLang": "de"
}
```

`targetLang` must be `"de"` or `"en"`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "article-id",
    "titleTranslated": { "de": "Übersetzter Titel" },
    "contentTranslated": { "de": "Übersetzter Inhalt" }
  }
}
```

## AI endpoints

> All `/api/ai/*` and `/api/analysis/*` routes require authentication AND go through `aiTierLimiter` (FREE: 10 queries/24h; PREMIUM/ENTERPRISE: unlimited).

### POST /api/ai/ask

RAG-based question answering with article context and conversation history support.

**Request body:**

```json
{
  "question": "What are the main perspectives on this topic?",
  "context": [
    {
      "id": "article-1",
      "title": "Article title",
      "summary": "Article summary",
      "source": "CNN",
      "perspective": "usa",
      "url": "https://source.com/article"
    }
  ],
  "conversationHistory": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

**Response (200):**

```json
{
  "answer": "AI-generated answer with citations [1][2]",
  "sources": [
    {
      "id": "article-1",
      "title": "Article title",
      "url": "https://source.com/article"
    }
  ],
  "model": "claude-3-haiku"
}
```

The `sources` array contains only the articles actually cited in the answer (parsed from `[N]` markers).

**AI provider fallback chain** (in order):
1. **Gemini** (`gemini-2.0-flash`, free tier, 1500 req/day)
2. **OpenRouter** (`google/gemma-3-27b-it:free`, free model)
3. **Anthropic** (`claude-3-haiku-20240307`, premium fallback)
4. Returns HTTP 503 if no providers are configured

### POST /api/ai/propaganda

Analyze an article for propaganda indicators. Returns a 0–100 score plus tagged indicators.

**Request body:**

```json
{
  "title": "Article title",
  "content": "Article content",
  "source": "Source Name",
  "perspective": "usa"
}
```

**Response (200):**

```json
{
  "score": 35,
  "indicators": [
    {
      "type": "emotional_language",
      "description": "Uses emotionally charged words",
      "severity": "medium",
      "examples": ["outrageous", "shocking"]
    }
  ],
  "summary": "Analysis summary",
  "recommendations": [
    "Cross-check with other sources"
  ]
}
```

Score buckets: `0-30` low, `31-60` medium, `61-100` high. Indicator types include `emotional_language`, `one_sided`, `missing_sources`, `loaded_words`, `false_dilemma`, `appeal_to_fear`, `bandwagon`, `ad_hominem`.

### POST /api/ai/fact-check

Fact-check a single claim against a specific article. Phase 38 / Plan 38-02.

Validated by the Zod `FactCheckRequestSchema` from `apps/web/server/openapi/schemas.ts`. Belt-and-suspenders prompt-injection rejection: claims containing role-play markers (e.g., `ignore previous`, `system:`, `### instruction`, `assistant:`) are rejected at the route boundary with HTTP 400 before reaching the LLM.

**Request body:**

```json
{
  "claim": "The unemployment rate fell to 3.5% in March.",
  "articleId": "article-id",
  "language": "en"
}
```

`claim` is 10–500 chars; `language` is `"en"` or `"de"` (default: `"en"`).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "verdict": "supported|contradicted|unverifiable",
    "confidence": 0.85,
    "explanation": "Reasoning grounded in article excerpts...",
    "citations": [
      { "snippet": "...", "offset": 1234 }
    ]
  }
}
```

**Errors:** 400 invalid claim or injection-pattern hit; 401 missing auth; 429 tier-limit exceeded.

### GET /api/ai/source-credibility/:sourceId

Return a credibility score for a news source. Cached 10 minutes (`Cache-Control: public, max-age=600`). Phase 38 / Plan 38-02.

**Query parameters:**
- `locale` (string, optional): `"en"` or `"de"` (default: `"en"`)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "sourceId": "cnn",
    "score": 78,
    "tier": "high",
    "factors": { ... },
    "summary": "Locale-localized summary text..."
  }
}
```

> **Note**: Per the underlying `AIService.getSourceCredibility` fallback, the service NEVER throws on unknown `sourceId` — it returns a degraded `score: 0` result. The OpenAPI spec lists 404 only for forward compatibility.

## Analysis endpoints

### GET /api/analysis/clusters

Get article clusters with optional AI-generated summaries. Cached 10 minutes.

**Query parameters:**

- `summaries` (boolean): If `true`, include AI-generated summaries per cluster

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "topic": "Climate Policy",
      "articleCount": 12,
      "regions": ["usa", "europa", "china"],
      "articles": [
        {
          "id": "article-1",
          "title": "Article title",
          "source": "CNN",
          "perspective": "usa",
          "sentiment": "neutral",
          "url": "https://source.com/article"
        }
      ],
      "summary": "AI-generated cluster summary (if summaries=true)"
    }
  ],
  "meta": { "aiAvailable": true }
}
```

### POST /api/analysis/summarize

Generate an AI summary for a topic by searching matching articles.

**Request body:**

```json
{ "topic": "Climate Policy" }
```

**Response (200):** AI-generated summary in `data`. **Errors:** 404 if fewer than 2 articles match.

### GET /api/analysis/framing

Compare how different regions frame the same topic. Cached 10 minutes.

**Query parameters:**

- `topic` (string, optional): Topic filter; omit for all articles

**Response (200):**

```json
{
  "success": true,
  "data": {
    "topic": "Climate Policy",
    "regions": {
      "usa": { "count": 15, "avgSentiment": -0.2 },
      "europa": { "count": 22, "avgSentiment": 0.4 }
    },
    "framing": {
      "usa": "Economic impact focus",
      "europa": "Environmental urgency focus"
    },
    "bias": "...",
    "aiGenerated": true
  }
}
```

If AI is unavailable, the response still includes `regions` aggregates with `aiGenerated: false`.

### GET /api/analysis/coverage-gaps

Detect under-covered perspectives across the article corpus. Cached 10 minutes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalArticles": 500,
    "avgCoveragePerPerspective": 31.3,
    "maxCoverage": 89,
    "coverageDistribution": { "usa": 89, "europa": 60, "..." : 0 },
    "gaps": {
      "count": 4,
      "details": [
        {
          "perspective": "ozeanien",
          "currentCount": 0,
          "expectedCount": 31,
          "deficit": 31,
          "severity": "critical"
        }
      ],
      "recommendations": [
        { "perspective": "ozeanien", "recommendation": "Keine Artikel..." }
      ]
    },
    "overRepresented": {
      "count": 1,
      "details": [{ "perspective": "usa", "count": 89, "percentageOfTotal": 18 }]
    }
  }
}
```

### GET /api/analysis/status

Quick check whether the AI service is available.

```json
{ "success": true, "data": { "aiAvailable": true } }
```

## Events endpoints

### GET /api/events

List timeline events extracted from articles. Cached 2 minutes.

**Query parameters:**

- `category` (string): `military`, `diplomacy`, `humanitarian`, `protest`, `other`
- `limit` (number): Default 30

### GET /api/events/geo

Get geo-located events for map visualization. Cached 2 minutes.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "title": "Event title",
      "description": "Event description",
      "category": "conflict",
      "severity": "high",
      "location": {
        "lat": 48.8566,
        "lng": 2.3522,
        "name": "Paris"
      },
      "timestamp": "2026-04-23T10:00:00Z",
      "sourceArticles": ["article-1", "article-2"],
      "aiExtracted": true,
      "confidence": 0.85,
      "perspectives": ["europa", "usa"]
    }
  ],
  "meta": {
    "total": 25,
    "withLocation": 25,
    "totalArticles": 500
  }
}
```

`severity` is bucketed from a 0–10 score: `>=8` critical, `>=6` high, `>=4` medium, else low.

### GET /api/events/timeline

Get combined timeline with current and historical events. Cached 5 minutes.

**Query parameters:**

- `start` (ISO date): Start date filter
- `end` (ISO date): End date filter
- `historical` (boolean): Include historical events (default: `true`)
- `limit` (number): Maximum events (default: 50)

### GET /api/events/historical

Historical events only (curated dataset, not extracted from articles). Cached 1 hour.

**Query parameters:** `category`, `start`, `end`, `search`, `critical=true`.

### GET /api/events/stats/summary

Aggregated event statistics: counts by date, average severity by category, top mentioned locations. Cached 5 minutes.

### GET /api/events/:id

Get a single event with its related articles populated. Cached 5 minutes.

## Markets endpoints

### GET /api/markets

Returns the current market data snapshot from `MarketDataService`. Subject to the news-tier limiter (100 req/min/IP).

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-04-23T10:00:00Z"
}
```

## Translation endpoints

### POST /api/translate

Translate text using the multi-provider fallback chain (DeepL → Google Translate → LibreTranslate → Claude).

**Request body:**

```json
{
  "text": "Text to translate",
  "targetLang": "de",
  "sourceLang": "en"
}
```

`targetLang` must be `"de"` or `"en"`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "text": "Übersetzter Text",
    "provider": "deepl",
    "quality": 0.95
  }
}
```

### POST /api/translate/batch

Translate multiple texts in a single request.

```json
{
  "texts": ["Text 1", "Text 2", "Text 3"],
  "targetLang": "de"
}
```

### GET /api/translate/usage

Returns provider usage stats (requests, character count, last error).

## Comments endpoints

Comments support **2-level threading** (root + 1 reply level). Authenticated mutations are rate-limited at **5 requests/min per user** via `commentLimiter`.

### POST /api/comments

Create a comment or threaded reply.

**Request body:**

```json
{
  "articleId": "article-id",
  "text": "Comment text (1-5000 chars)",
  "parentId": "optional-parent-comment-id"
}
```

**Response (201):** Created comment object. **Errors:** 400 if attempting more than 2 levels of nesting; 404 if `parentId` not found.

### GET /api/comments/:articleId

Public listing of comments for an article. Returns nested thread structure.

### PATCH /api/comments/:id/edit

Edit a comment (own comments only, within a 15-minute window).

```json
{ "text": "Edited text" }
```

**Errors:** 403 unauthorized, 404 not found, 400 `Edit time expired`.

### DELETE /api/comments/:id

Soft-delete (own comments only).

### POST /api/comments/:id/flag

Flag a comment for moderation.

```json
{
  "reason": "spam",
  "details": "Optional context (≤ 500 chars)"
}
```

`reason` must be one of: `spam`, `harassment`, `misinformation`, `other`.

## Teams endpoints

Teams have three roles: `owner`, `admin`, `member`. Most routes require team membership; mutations require admin or owner.

### POST /api/teams

Create a new team. Limited to **10 teams per user**.

```json
{
  "name": "My Team",
  "description": "Optional description (≤ 500 chars)"
}
```

### GET /api/teams

List teams the current user belongs to.

### GET /api/teams/:teamId

Get a single team. Membership required.

### PATCH /api/teams/:teamId

Update team name/description. Requires `owner` or `admin`.

### DELETE /api/teams/:teamId

Delete team. Requires `owner`.

### POST /api/teams/:teamId/invite

Send email invite. Requires `owner` or `admin`. Rate-limited: **10 invites/hour per (team, user)** via `teamInviteLimiter`.

```json
{
  "email": "invitee@example.com",
  "role": "member"
}
```

`role` must be `admin` or `member`. Returns HTTP 400 with generic `Cannot invite this email` to prevent member enumeration.

### POST /api/teams/accept-invite/:token

Accept a team invite (the invitee must be authenticated). The token is delivered via the invite email.

### POST /api/teams/:teamId/bookmarks

Add a bookmark to the team's shared collection. Idempotent (uses upsert on `(teamId, articleId)`). Broadcasts to all team members via WebSocket.

```json
{
  "articleId": "article-id",
  "note": "Optional note (≤ 500 chars)"
}
```

### DELETE /api/teams/:teamId/bookmarks/:bookmarkId

Remove a team bookmark. Members can only remove their own bookmarks; admins/owners can remove any.

## Subscriptions endpoints (Stripe)

> Tiers: `FREE` / `PREMIUM` / `ENTERPRISE`. Tier-gated routes return HTTP 403 with `{ upgradeUrl: "/pricing" }` for ineligible users.

### POST /api/subscriptions/checkout

Create a Stripe Checkout session. The client redirects the browser to the returned URL.

**Request body:**

```json
{ "priceId": "price_xxxxxx" }
```

`priceId` must be on the **server-side whitelist** (monthly/annual price IDs from `STRIPE_CONFIG.priceIds`); arbitrary price IDs are rejected with HTTP 400 to prevent injection. Returns HTTP 503 if `STRIPE_SECRET_KEY` is not configured.

**Response (200):**

```json
{ "success": true, "data": { "url": "https://checkout.stripe.com/..." } }
```

### POST /api/subscriptions/portal

Create a Stripe Customer Portal session for self-service subscription management.

**Response (200):**

```json
{ "success": true, "data": { "url": "https://billing.stripe.com/..." } }
```

**Errors:** HTTP 400 `No active subscription found` if user has no Stripe customer record yet; 503 if Stripe not configured.

### GET /api/subscriptions/status

```json
{
  "success": true,
  "data": {
    "tier": "PREMIUM",
    "status": "ACTIVE",
    "endsAt": "2026-05-29T00:00:00.000Z"
  }
}
```

Status values: `ACTIVE`, `PAST_DUE` (7-day grace period), `CANCELED`, `PAUSED`. Cached 5 minutes per user.

### POST /api/webhooks/stripe

Stripe webhook receiver. **Critical implementation note**: this route is mounted with `express.raw({ type: 'application/json' })` **before** the global `express.json()` middleware in `apps/web/server/index.ts`, so the raw body buffer is preserved for HMAC signature verification.

- **Header**: `Stripe-Signature` (set by Stripe; verified with `STRIPE_WEBHOOK_SECRET`)
- **Idempotency**: Each event ID is dual-stored in Redis (24h) + the `ProcessedWebhookEvent` table to prevent double-processing
- **Retry behavior**: Returns HTTP 500 on processing errors so Stripe retries with exponential backoff (up to 3 days). The idempotency lock is released on failure so retries actually re-execute the handler.
- **Errors**: HTTP 401 `Invalid signature`; 503 if Stripe not configured

## Account / GDPR endpoints

### GET /api/account/export

Export the user's data per GDPR Articles 15 and 20. Available to all authenticated users.

**Query parameters:**

- `format` (string): `json` (default), `csv`, or `pdf`. PDF is reserved for `ENTERPRISE` tier only.

**Tier gating:**
- `FREE` / `PREMIUM`: `json`, `csv` — free per GDPR Art. 12(5) (right of access and portability must be provided at no cost)
- `ENTERPRISE`: `json`, `csv`, `pdf`
- Non-standard formats (e.g., `pdf` without Enterprise tier) return HTTP 400 with `{ allowedFormats, upgradeUrl: "/pricing" }`

**Response:** Streamed file download with `Content-Disposition: attachment; filename=newshub-export.{json,csv}`. Includes profile, badges, and bookmarks.

### POST /api/account/delete-request

Request account deletion per GDPR Article 17. Requires re-authentication via password + email confirmation. Sets `deletionRequestedAt` with a **7-day grace period** before actual deletion.

**Request body:**

```json
{
  "password": "current-password",
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Account scheduled for deletion",
  "deleteAt": "2026-05-06T00:00:00.000Z"
}
```

### POST /api/account/cancel-deletion

Cancel a pending deletion request (any time before the grace period expires).

## User feature endpoints

### POST /api/bookmarks

Create a bookmark for an article. Idempotent — returns 200 with the existing bookmark if one already exists, 201 on create.

**Request body:**

```json
{ "articleId": "article-id" }
```

### GET /api/history

List the current user's reading history.

- `FREE` tier: filtered to last 7 days, max 100 entries
- `PREMIUM` / `ENTERPRISE`: unlimited time range, up to 1000 entries

```json
{
  "success": true,
  "data": [...],
  "meta": { "tier": "FREE", "isPremium": false, "limit": "7 days" }
}
```

### POST /api/history

Create a reading history entry.

```json
{
  "articleId": "article-id",
  "title": "Article title",
  "source": "Source name",
  "readAt": "2026-04-23T10:00:00Z"
}
```

## Profile, Badges, Leaderboard, Personas

### Profile (`/api/profile`)

- `GET /api/profile/me` — current user profile
- `PUT /api/profile/name` — update display name
- `PUT /api/profile/avatar/preset` — set a preset avatar
- `POST /api/profile/avatar/upload` — upload custom avatar (multipart form data)
- `PUT /api/profile/leaderboard-visibility` — opt in/out of public leaderboard

### Badges (`/api/badges`)

- `GET /api/badges/definitions` — all badge definitions (public)
- `GET /api/badges/user` — current user's earned badges
- `GET /api/badges/progress` — per-badge progress for current user
- `POST /api/badges/award` — server-side trigger to award a badge
- `PUT /api/badges/featured` — pin badges to profile

### Leaderboard (`/api/leaderboard`)

- `GET /api/leaderboard` — public leaderboard (only opt-in users)
- `GET /api/leaderboard/me` — current user's rank
- `GET /api/leaderboard/weekly-winner` — top user this week

### Personas (`/api/personas`)

- `GET /api/personas` — list built-in AI personas (8 built-in)
- `GET /api/personas/:id` — single persona
- `POST /api/personas/suggest` — suggest a persona for a given context
- `POST /api/personas/:id/analyze` — analyze content using a persona
- `GET /api/personas/user/active` — current user's active persona (header-based ID)
- `POST /api/personas/user/active` — set active persona

## Focus suggestions

### GET /api/focus/suggestions

Returns top 5 focus suggestions based on current news patterns: tension spikes, breaking news (last 2h), and coverage gaps.

```json
{
  "success": true,
  "data": [...],
  "meta": { "count": 5, "generatedAt": "2026-04-23T10:00:00Z" }
}
```

## Sharing endpoints

Public share-link surface. Most endpoints are unauthenticated (creating shares from public articles is allowed); only owner-scoped reads (`/my`, `/:code/analytics`) require auth.

- `GET /api/share/my` — list shares created by the current user
- `POST /api/share/article` — create share for an article
- `POST /api/share/cluster` — create share for a cluster
- `POST /api/share/comparison` — create share for a comparison view
- `GET /api/share/:code` — resolve share by code
- `GET /api/share/:code/og` — OpenGraph metadata payload (used by `/s/:code` bot-detection branch)
- `POST /api/share/:code/click` — increment click counter
- `GET /api/share/:code/analytics` — share analytics (owner only)
- `GET /api/share/trending` — trending shares

## Email digest endpoints

- `GET /api/email/status` — service availability (provider configured?)
- `GET /api/email/subscription` — current user's digest subscription
- `POST /api/email/subscription` — create digest subscription
- `PUT /api/email/subscription` — update digest subscription
- `DELETE /api/email/subscription` — cancel digest subscription
- `POST /api/email/test` — send a test digest email
- `POST /api/email/unsubscribe` — one-click token-based unsubscribe (no auth)
- `POST /api/email/webhook` — provider webhook receiver (bounce / complaint events)

## API key management

Self-service developer key management for the [Public API v1](#public-api-v1). All routes require JWT auth.

### GET /api/keys

List the current user's API keys. Hashes are never returned — only metadata (`id`, `name`, `tier`, `environment`, `createdAt`, `lastUsedAt`, `requestCount`).

### POST /api/keys

Create a new API key. **Plaintext key is returned ONCE** — the user must store it immediately.

**Request body:**

```json
{
  "name": "My CI integration",
  "tier": "free",
  "environment": "live"
}
```

`name` is 3–50 chars; `tier` is `"free"` or `"pro"`; `environment` is `"live"` or `"test"`. Hard cap of **3 keys per user** (D-10) to prevent rate-limit bypass via key multiplication.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "key": "nh_live_abcd1234..._checksum",
    "keyData": {
      "id": "key-id",
      "name": "My CI integration",
      "tier": "free",
      "environment": "live",
      "createdAt": "2026-04-23T10:00:00Z"
    }
  },
  "message": "API key created. Copy it now - you won't see it again."
}
```

### DELETE /api/keys/:keyId

Revoke an API key. Backend verifies the caller's `userId` matches the key owner before revocation.

**Request body (optional):**

```json
{ "reason": "rotated" }
```

## Podcasts endpoints (Phase 40)

All podcast endpoints are FREE-tier and unauthenticated. Mounted at `/api/podcasts` behind `newsLimiter` (100 req/min/IP). Implementation: `apps/web/server/routes/podcasts.ts`.

### GET /api/podcasts

List curated podcast feeds from `PODCAST_FEEDS`. Cached 24 hours.

```json
{
  "success": true,
  "data": [
    {
      "id": "fixture-feed",
      "title": "Title",
      "region": "usa",
      "language": "en",
      "rssUrl": "https://...",
      "category": "news",
      "reliability": 8
    }
  ],
  "meta": { "total": 12 }
}
```

### GET /api/podcasts/:feedId/episodes

Episodes for a curated feed. `feedId` must match `^[a-z0-9-]+$` (1–64 chars). Cached 10 minutes.

**Query parameters:**
- `limit` (number, default 50, max 100): Number of episodes

**Errors:** 400 invalid feedId or limit; 404 feed not found.

### GET /api/podcasts/episodes/:episodeId

Single episode by id. Cached 1 hour.

> **Route ordering note**: This literal `/episodes/:episodeId` path is registered **before** `/:feedId/episodes` in the router. If reordered, Express's path-matcher would treat the literal segment `episodes` as a `feedId` and the dynamic route would swallow the request.

**Errors:** 400 invalid id; 404 not found.

### GET /api/podcasts/related/:articleId

Episodes matched to a NewsArticle. Cached 1 hour.

```json
{
  "success": true,
  "data": [...],
  "meta": { "total": 3 }
}
```

**Errors:** 400 invalid id; 500 with generic `Failed to fetch related podcasts` message (full detail server-side only — T-40-03-03 mitigation, no stack-trace leak).

## Videos endpoints (Phase 40)

All video endpoints are FREE-tier and unauthenticated. Mounted at `/api/videos` behind `newsLimiter`. The per-call YouTube Data API quota gate lives in `videoIndexService` (not the route layer). Implementation: `apps/web/server/routes/videos.ts`.

### GET /api/videos/related/:articleId

Related videos for a NewsArticle (max 3). Cached 5 minutes.

```json
{
  "success": true,
  "data": [...],
  "meta": { "source": "cache|youtube|...", "total": 3 }
}
```

> Response shapes never include third-party iframe markup (T-40-05-01 mitigation). Clients construct iframes via the lite-loader components.

### GET /api/videos/channels

Curated video channels list from `VIDEO_CHANNELS`. Cached 24 hours.

### GET /api/videos/channel/:channelId/recent

Recent videos for a channel (paginated). `channelId` must match `^UC[A-Za-z0-9_-]{22}$` (YouTube channel ID format). Cached 5 minutes.

**Query parameters:**
- `limit` (number, default 20, max 50)
- `offset` (number, default 0)

```json
{
  "success": true,
  "data": [...],
  "meta": { "limit": 20, "offset": 0, "total": 20 }
}
```

## Transcripts endpoints (Phase 40, Premium-gated)

Phase 40-06 / CC-02. **Premium-gated** via `requireTier('PREMIUM')` middleware inside each handler. The mount in `server/index.ts` applies `authMiddleware` first so that `requireTier` always sees a populated `req.user` (mirrors the `/api/ai` mount-order convention).

> The frontend FREE-tier UpgradePrompt is purely UX — the actual gate is enforced server-side. Returns 401 without auth and 403 below Premium tier.

### GET /api/transcripts/:contentType/:id

Single transcript (segments + metadata). `contentType` is `"podcast"` or `"video"`; `id` is 1–128 chars. Cached `private, max-age=3600`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "segments": [
      { "start": 0.0, "end": 5.2, "text": "..." }
    ],
    "language": "en",
    "duration": 1234.5,
    "...": "..."
  }
}
```

**Errors:** 400 `invalid_params`; 401 missing auth; 403 below Premium; 404 `transcript_unavailable`; 500 `internal_error`.

### GET /api/transcripts/:contentType/:id/search

Full-text search across the transcript. Cached `private, max-age=3600`.

**Query parameters:**
- `q` (string, required): Search query (1–200 chars)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "segments": [...],
    "total": 7
  }
}
```

**Errors:** 400 `invalid_request`; 401/403 same as above; 500 `internal_error`.

## Public API v1

External developers consume the public API at `/api/v1/public/*`. Authentication uses the `X-API-Key` header (per the OpenAPI security scheme). Implementation: `apps/web/server/routes/publicApi.ts`.

### Authentication header

```http
X-API-Key: nh_live_abcd1234..._checksum
```

- **Key format**: `nh_{env}_{random}_{checksum}` (Stripe-inspired); environment is `live` or `test`
- **Hashing**: bcrypt factor 10 (only the hash is stored at rest)
- **Pre-validation**: Checksum verified before DB lookup to short-circuit obviously-malformed keys
- **Cache**: Validated keys are cached 5 minutes in Redis (only the first 15 chars are stored as identifier)
- **Rate limit**: Tiered limit keyed by API key ID (NAT/VPN-friendly); IETF `RateLimit-*` headers in every response

### GET /api/v1/public/news

List articles. Cached 5 minutes.

**Query parameters:**
- `regions` (string): Comma-separated region codes
- `topics` (string): Comma-separated topics
- `sentiment` (string): `positive` / `negative` / `neutral`
- `search` (string): Full-text search
- `page` (number, default 1)
- `limit` (number, default 20, max 100)

> **Schema/contract gotcha**: `/api/v1/public/news` hand-maps top-level `sourceId` from `source.id` in the route handler. The read service returns only the nested `source` object; OpenAPI requires both. Any new public-API endpoint surfacing articles must replicate this mapping or it fails the schema contract.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sourceId": "cnn",
      "source": { "id": "cnn", "name": "CNN", "...": "..." },
      "...": "..."
    }
  ],
  "meta": { "total": 150, "page": 1, "limit": 20, "hasMore": true }
}
```

### GET /api/v1/public/news/:id

Single article by id. Cached 1 hour.

### GET /api/v1/public/events

Geo-located events extracted from articles via AI. Cached 15 minutes. Severity bucketing matches `/api/events/geo`.

### GET /api/v1/public/sentiment

Sentiment statistics by region. Cached 10 minutes.

```json
{
  "success": true,
  "data": [
    { "region": "usa", "positive": 32, "negative": 14, "neutral": 27, "total": 73 }
  ]
}
```

### OpenAPI spec

The spec is **code-first**: Zod schemas in `apps/web/server/openapi/schemas.ts` are the single source of truth for both runtime validation and API documentation. Regenerate with:

```bash
cd apps/web && pnpm openapi:generate
```

The output is `apps/web/public/openapi.json`, served at `GET /api/openapi.json`. The Scalar UI is rendered by the React frontend at the SPA route `/developers` (via `@scalar/api-reference-react`).

## Health & monitoring endpoints

### GET /health

**Liveness probe** for container orchestration (Kubernetes/Docker). No `/api` prefix. Returns process status only.

```json
{
  "status": "healthy",
  "version": "<build-version>",
  "commit": "<git-sha>",
  "uptime_seconds": 12345
}
```

`version` is sourced from `BUILD_VERSION` env (default `unknown`); `commit` from `BUILD_COMMIT`.

### GET /readiness

**Readiness probe** with dependency checks (DB + Redis). Used by Traefik / load balancers to decide whether to route traffic. Returns 503 once graceful shutdown begins (via `@godaddy/terminus`). Each dependency check has a 3-second timeout.

```json
{ "status": "ready", "db_latency_ms": 4, "redis_latency_ms": 1 }
```

### GET /api/health

Application-level health check with service status breakdown.

```json
{
  "status": "ok",
  "timestamp": "2026-04-29T12:00:00Z",
  "articlesCount": 12453,
  "services": {
    "database": { "available": true },
    "websocket": { "available": true, "clients": 42 },
    "cache": { "available": true, "keys": 1234, "memory": "12.5MB" },
    "ai": { "available": true, "provider": "gemini" }
  }
}
```

`articlesCount` returns `-1` if the DB count query fails (health stays as a liveness signal).

### GET /api/health/db

Dedicated PostgreSQL connectivity probe. Runs `SELECT 1` and returns `{ status, latency_ms, timestamp }`.

### GET /api/health/redis

Dedicated Redis connectivity probe. Returns key count and memory usage from `cacheService.getStats()`.

### GET /api/ping

Trivial connectivity test with no service dependencies. Returns `{ "status": "pong" }`.

### GET /metrics

**Prometheus metrics** in text exposition format. No `/api` prefix. Includes HTTP request latency histograms, WebSocket connection gauges, DB pool metrics, and rate-limit counters.

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/news",status="200"} 1234
...
```

## Error codes

The API uses standard HTTP status codes with JSON error responses:

| Status | Meaning | Example scenario |
|--------|---------|------------------|
| `200` | OK | Successful request |
| `201` | Created | Resource created (register, bookmark, comment) |
| `400` | Bad Request | Invalid input, validation error |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Insufficient role/tier (e.g., team admin required, Premium required) |
| `404` | Not Found | Article/event/comment/team/episode/transcript not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `503` | Service Unavailable | AI service / Stripe / Redis not configured |

### Error response format

All error responses include a descriptive message:

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

For rate-limit errors (429), additional fields are included:

```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 60
}
```

For tier-gated 403 errors, an `upgradeUrl` is included:

```json
{
  "success": false,
  "error": "PDF export requires Enterprise subscription",
  "upgradeUrl": "/pricing"
}
```

## Rate limits

The API uses tiered rate limiting via Redis with sliding-window counters (`express-rate-limit` + `rate-limit-redis`). Limits are enforced per IP or per user depending on the endpoint category.

| Tier | Limit | Window | Key By | Endpoints |
|------|-------|--------|--------|-----------|
| **Auth** | 5 requests | 1 minute | IP | `/api/auth/login`, `/api/auth/register`, `/api/auth/request-reset`, `/api/auth/reset-password` |
| **News** | 100 requests | 1 minute | IP | `/api/news/*`, `/api/events/*`, `/api/markets/*`, `/api/podcasts/*`, `/api/videos/*` |
| **Comment** | 5 requests | 1 minute | User | `/api/comments` (create), `/api/comments/:id/edit`, `/api/comments/:id/flag` |
| **Team invite** | 10 invites | 1 hour | (team, user) | `/api/teams/:teamId/invite` |
| **AI tier (FREE)** | 10 queries | 24 hours | User | `/api/ai/*`, `/api/analysis/*` |
| **AI tier (PREMIUM/ENTERPRISE)** | unlimited | — | User | `/api/ai/*`, `/api/analysis/*` |
| **Public API (per key)** | tier-based | 1 minute | API key id | `/api/v1/public/*` |

### Rate limit headers

Responses include IETF `RateLimit-*` headers (standardHeaders mode):

```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1714725600
```

### Rate limit exceeded response

When the limit is exceeded, the API returns HTTP 429 with a `Retry-After` header:

```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 60
}
```

For the AI tier limiter, the response also includes `upgradeUrl`:

```json
{
  "success": false,
  "error": "Daily AI query limit reached (10/day for free tier)",
  "upgradeUrl": "/pricing",
  "limit": 10
}
```

### Graceful degradation

If Redis is unavailable, **all rate limiters skip enforcement** and requests proceed normally. This ensures API availability even during cache outages, at the cost of temporary loss of rate-limit protection.

## Caching

The API uses HTTP cache headers to reduce server load and improve performance:

| Endpoint | `Cache-Control` | Duration |
|----------|-----------------|----------|
| `/api/news` | `public, max-age=300` | 5 minutes |
| `/api/news/:id` | `public, max-age=600` | 10 minutes |
| `/api/news/sources` | `public, max-age=86400` | 24 hours |
| `/api/news/sentiment` | `public, max-age=300` | 5 minutes |
| `/api/analysis/clusters` | `public, max-age=600` | 10 minutes |
| `/api/analysis/framing` | `public, max-age=600` | 10 minutes |
| `/api/analysis/coverage-gaps` | `public, max-age=600` | 10 minutes |
| `/api/ai/source-credibility/:sourceId` | `public, max-age=600` | 10 minutes |
| `/api/events` | `public, max-age=120` | 2 minutes |
| `/api/events/geo` | `public, max-age=120` | 2 minutes |
| `/api/events/timeline` | `public, max-age=300` | 5 minutes |
| `/api/events/historical` | `public, max-age=3600` | 1 hour |
| `/api/events/stats/summary` | `public, max-age=300` | 5 minutes |
| `/api/events/:id` | `public, max-age=300` | 5 minutes |
| `/api/podcasts` | `public, max-age=86400` | 24 hours |
| `/api/podcasts/:feedId/episodes` | `public, max-age=600` | 10 minutes |
| `/api/podcasts/episodes/:episodeId` | `public, max-age=3600` | 1 hour |
| `/api/podcasts/related/:articleId` | `public, max-age=3600` | 1 hour |
| `/api/videos/related/:articleId` | `public, max-age=300` | 5 minutes |
| `/api/videos/channels` | `public, max-age=86400` | 24 hours |
| `/api/videos/channel/:channelId/recent` | `public, max-age=300` | 5 minutes |
| `/api/transcripts/:contentType/:id` | `private, max-age=3600` | 1 hour (per-user) |
| `/api/transcripts/:contentType/:id/search` | `private, max-age=3600` | 1 hour (per-user) |
| `/api/v1/public/news` | `public, max-age=300` | 5 minutes |
| `/api/v1/public/news/:id` | `public, max-age=3600` | 1 hour |
| `/api/v1/public/events` | `public, max-age=900` | 15 minutes |
| `/api/v1/public/sentiment` | `public, max-age=600` | 10 minutes |
| `/api/health*`, `/readiness` | `no-cache, no-store, must-revalidate` | none |

All public cached responses include `Vary: Accept-Encoding` to support compression negotiation. Conditional caching is also enabled application-wide via the `etagMiddleware`.
