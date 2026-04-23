<!-- generated-by: gsd-doc-writer -->
# API

## Authentication

The NewsHub API uses JWT (JSON Web Token) bearer authentication for protected endpoints. Tokens are issued upon successful login and must be included in the `Authorization` header for authenticated requests.

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
- **Rate limiting**: Tiered limits by endpoint category (see Rate Limits section)
- **Token blacklist**: Logout and password change operations blacklist current tokens via Redis
- **Disposable email blocking**: Registration rejects disposable email providers

## Endpoints overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| **Authentication** |
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Authenticate and receive JWT | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| GET | `/api/auth/verify` | Verify token validity | Yes |
| POST | `/api/auth/logout` | Blacklist current token | Yes |
| PATCH | `/api/auth/preferences` | Update user preferences | Yes |
| PUT | `/api/auth/password` | Change password | Yes |
| GET | `/api/auth/verify-email` | Verify email with token | No |
| POST | `/api/auth/resend-verification` | Resend verification email | Yes |
| POST | `/api/auth/request-reset` | Request password reset email | No |
| GET | `/api/auth/validate-reset-token` | Validate password reset token | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| GET | `/api/auth/verification-status` | Check email verification status | Yes |
| **News** |
| GET | `/api/news` | List articles with filters | No |
| GET | `/api/news/:id` | Get single article | No |
| GET | `/api/news/sources` | List all 130 news sources | No |
| GET | `/api/news/sentiment` | Get sentiment statistics by region | No |
| POST | `/api/news/:id/translate` | Translate article on-demand | No |
| **Analysis** |
| GET | `/api/analysis/clusters` | Get article clusters | No |
| POST | `/api/analysis/summarize` | Generate topic summary | No |
| GET | `/api/analysis/framing` | Get framing comparison | No |
| GET | `/api/analysis/coverage-gaps` | Detect coverage gaps | No |
| GET | `/api/analysis/status` | Check AI service availability | No |
| **AI** |
| POST | `/api/ai/ask` | RAG-based Q&A with article context | No |
| POST | `/api/ai/propaganda` | Propaganda detection analysis | No |
| **Events** |
| GET | `/api/events` | List timeline events | No |
| GET | `/api/events/geo` | Get geo-located events | No |
| GET | `/api/events/timeline` | Get combined timeline | No |
| GET | `/api/events/historical` | Get historical events | No |
| GET | `/api/events/stats/summary` | Get event statistics | No |
| GET | `/api/events/:id` | Get single event with related articles | No |
| **Translation** |
| POST | `/api/translate` | Translate text | No |
| POST | `/api/translate/batch` | Batch translate multiple texts | No |
| GET | `/api/translate/usage` | Get translation usage stats | No |
| **User Features** |
| POST | `/api/bookmarks` | Create bookmark | Yes |
| POST | `/api/history` | Create reading history entry | Yes |
| **Health & Monitoring** |
| GET | `/api/health` | Server health status | No |
| GET | `/api/health/db` | PostgreSQL connectivity | No |
| GET | `/api/health/redis` | Redis connectivity and stats | No |
| GET | `/api/metrics` | Prometheus metrics | No |

## Request/response formats

All API responses follow a consistent JSON envelope structure:

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

## News endpoints

### GET /api/news

List news articles with optional filters and pagination.

**Query parameters:**

- `regions` (string): Comma-separated region codes (`usa,europa,deutschland`)
- `topics` (string): Comma-separated topic keywords
- `search` (string): Search query
- `sentiment` (string): Filter by sentiment (`positive`, `negative`, `neutral`)
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset (default: 0)

**Example request:**

```
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

Get a single article by ID.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "article-id",
    "title": "Article title",
    "content": "Full article content",
    "source": { ... },
    "sentiment": "neutral",
    "publishedAt": "2026-04-23T10:00:00Z"
  }
}
```

### GET /api/news/sources

List all 130 configured news sources.

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

### POST /api/news/:id/translate

Translate a specific article on-demand.

**Request body:**

```json
{
  "targetLang": "de"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "article-id",
    "titleTranslated": {
      "de": "Übersetzter Titel"
    },
    "contentTranslated": {
      "de": "Übersetzter Inhalt"
    }
  }
}
```

## AI endpoints

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
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant",
      "content": "Previous answer"
    }
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

**AI provider fallback chain:**
1. Gemini (free tier, 1500 req/day)
2. OpenRouter (cheap, multiple free models)
3. Anthropic (premium, Claude Haiku)

If no AI providers are configured, returns HTTP 503 with error message.

### POST /api/ai/propaganda

Analyze article for propaganda indicators.

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

## Translation endpoints

### POST /api/translate

Translate text using multi-provider fallback chain (DeepL → Google → LibreTranslate → Claude).

**Request body:**

```json
{
  "text": "Text to translate",
  "targetLang": "de",
  "sourceLang": "en"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "translated": "Übersetzter Text",
    "provider": "deepl",
    "sourceLang": "en",
    "targetLang": "de"
  }
}
```

### POST /api/translate/batch

Translate multiple texts in a single request.

**Request body:**

```json
{
  "texts": ["Text 1", "Text 2", "Text 3"],
  "targetLang": "de"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "original": "Text 1",
      "translated": "Text 1 übersetzt"
    },
    {
      "original": "Text 2",
      "translated": "Text 2 übersetzt"
    }
  ]
}
```

## Events endpoints

### GET /api/events/geo

Get geo-located events for map visualization.

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

### GET /api/events/timeline

Get combined timeline with current and historical events.

**Query parameters:**

- `start` (ISO date): Start date filter
- `end` (ISO date): End date filter
- `historical` (boolean): Include historical events (default: true)
- `limit` (number): Maximum events to return (default: 50)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-id",
      "date": "2026-04-20T00:00:00Z",
      "title": "Event title",
      "description": "Event description",
      "category": "military",
      "severity": 8,
      "sources": ["source-1", "source-2"]
    }
  ],
  "meta": {
    "total": 50,
    "currentEvents": 30,
    "historicalEvents": 20
  }
}
```

## Analysis endpoints

### GET /api/analysis/clusters

Get article clusters with optional AI-generated summaries.

**Query parameters:**

- `summaries` (boolean): Include AI-generated summaries (`true` or `false`)

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
          "sentiment": "neutral"
        }
      ],
      "summary": "AI-generated cluster summary (if summaries=true)"
    }
  ],
  "meta": {
    "aiAvailable": true
  }
}
```

### GET /api/analysis/framing

Get framing comparison by topic showing how different regions cover the same story.

**Query parameters:**

- `topic` (string): Topic to analyze

**Response (200):**

```json
{
  "success": true,
  "data": {
    "topic": "Climate Policy",
    "regions": {
      "usa": {
        "count": 15,
        "avgSentiment": -0.2
      },
      "europa": {
        "count": 22,
        "avgSentiment": 0.4
      }
    },
    "framing": {
      "usa": "Economic impact focus",
      "europa": "Environmental urgency focus"
    },
    "aiGenerated": true
  }
}
```

## User feature endpoints

### POST /api/bookmarks

Create a bookmark for an article (idempotent).

**Request body:**

```json
{
  "articleId": "article-id"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "bookmark-id",
    "userId": "user-id",
    "articleId": "article-id",
    "createdAt": "2026-04-23T10:00:00Z"
  }
}
```

### POST /api/history

Create a reading history entry.

**Request body:**

```json
{
  "articleId": "article-id",
  "title": "Article title",
  "source": "Source name",
  "readAt": "2026-04-23T10:00:00Z"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "history-id",
    "userId": "user-id",
    "articleId": "article-id",
    "title": "Article title",
    "readAt": "2026-04-23T10:00:00Z"
  }
}
```

## Error codes

The API uses standard HTTP status codes with JSON error responses:

| Status | Meaning | Example scenario |
|--------|---------|------------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (register, bookmark) |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Not Found | Article/event not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | AI service not configured |

### Error response format

All error responses include a descriptive message:

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

For rate limit errors (429), additional fields are included:

```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 60,
  "rateLimited": true
}
```

## Rate limits

The API uses tiered rate limiting via Redis with sliding window counters. Limits are enforced per IP or per user depending on the endpoint category.

| Tier | Limit | Window | Key By | Endpoints |
|------|-------|--------|--------|-----------|
| **Auth** | 5 requests | 1 minute | IP | `/api/auth/login`, `/api/auth/register`, `/api/auth/request-reset`, `/api/auth/reset-password` |
| **AI** | 10 requests | 1 minute | User (or IP if unauthenticated) | `/api/ai/ask`, `/api/analysis/clusters`, `/api/analysis/framing` |
| **News** | 100 requests | 1 minute | IP | `/api/news`, `/api/events`, `/api/markets` |

### Rate limit headers

Responses include rate limit information in headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1714725600
```

### Rate limit exceeded response

When rate limit is exceeded, the API returns HTTP 429 with a `Retry-After` header:

```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 60
}
```

### Graceful degradation

If Redis is unavailable, rate limiting is **disabled** and requests proceed normally. This ensures API availability even during cache failures.

## Caching

The API uses HTTP cache headers to reduce server load and improve performance:

| Endpoint | Cache-Control | Duration |
|----------|---------------|----------|
| `/api/news` | `public, max-age=300` | 5 minutes |
| `/api/news/:id` | `public, max-age=600` | 10 minutes |
| `/api/news/sources` | `public, max-age=86400` | 24 hours |
| `/api/analysis/clusters` | `public, max-age=600` | 10 minutes |
| `/api/events/geo` | `public, max-age=120` | 2 minutes |
| `/api/events/historical` | `public, max-age=3600` | 1 hour |

All cached responses include `Vary: Accept-Encoding` to support compression negotiation.
