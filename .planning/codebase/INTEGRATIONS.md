# External Integrations

**Analysis Date:** 2026-04-18

## AI & Machine Learning

### OpenRouter (Primary AI Provider)
- **Purpose:** Multi-model AI access for article analysis, summarization, sentiment
- **SDK:** `openai` package (OpenAI-compatible API)
- **Auth:** `OPENROUTER_API_KEY` env var
- **Endpoint:** `https://openrouter.ai/api/v1`
- **Implementation:** `server/services/aiService.ts`
- **Model Fallback Chain (all free):**
  1. `google/gemma-4-31b-it:free`
  2. `google/gemma-4-26b-a4b-it:free`
  3. `openai/gpt-oss-120b:free`
  4. `z-ai/glm-4.5-air:free`
  5. `minimax/minimax-m2.5:free`

### Google Gemini (Secondary AI Provider)
- **Purpose:** Fallback AI for analysis when OpenRouter fails
- **SDK:** `@google/generative-ai`
- **Auth:** `GEMINI_API_KEY` env var
- **Rate Limit:** 1500 requests/day (free tier)
- **Implementation:** `server/services/aiService.ts`
- **Model Fallback:**
  1. `gemma-3-27b-it` (primary)
  2. `gemma-2-27b-it` (fallback)

### Anthropic Claude (Tertiary AI Provider)
- **Purpose:** Premium fallback when all free providers fail
- **SDK:** `@anthropic-ai/sdk`
- **Auth:** `ANTHROPIC_API_KEY` env var
- **Model:** `claude-3-haiku-20240307`
- **Implementation:** `server/services/aiService.ts`, `server/services/translationService.ts`

## Translation Services

### DeepL (Primary Translation)
- **Purpose:** High-quality translation (best quality)
- **SDK:** `deepl-node`
- **Auth:** `DEEPL_API_KEY` env var
- **Rate Limit:** 500,000 chars/month (free tier)
- **Implementation:** `server/services/translationService.ts`
- **Quality Score:** 0.95

### Google Translate (Secondary Translation)
- **Purpose:** Translation fallback
- **SDK:** REST API via `fetch`
- **Auth:** `GOOGLE_TRANSLATE_API_KEY` env var
- **Endpoint:** `https://translation.googleapis.com/language/translate/v2`
- **Implementation:** `server/services/translationService.ts`
- **Quality Score:** 0.9

### LibreTranslate (Tertiary Translation)
- **Purpose:** Free/self-hosted translation fallback
- **SDK:** REST API via `fetch`
- **Auth:** None required (public instance)
- **Endpoint:** Configurable via `LIBRETRANSLATE_URL` (default: `https://libretranslate.com`)
- **Implementation:** `server/services/translationService.ts`
- **Quality Score:** 0.75

### Claude Translation (Fallback)
- **Purpose:** AI-based translation when all others fail
- **Uses:** Anthropic Claude SDK
- **Implementation:** `server/services/translationService.ts`
- **Quality Score:** 0.85

## Data Storage

### SQLite (Development)
- **Purpose:** Local development database
- **Driver:** `better-sqlite3` via Prisma adapter
- **Connection:** `file:./dev.db`
- **Config:** `prisma.config.ts`, `server/db/prisma.ts`
- **Schema:** `prisma/schema.prisma`
- **Client Output:** `src/generated/prisma/`

### PostgreSQL (Production)
- **Purpose:** Production database
- **Driver:** `pg` via Prisma
- **Connection:** `DATABASE_URL` env var (PostgreSQL connection string)
- **Config:** Same Prisma schema, different URL

### Redis (Optional Caching)
- **Purpose:** API response caching, sessions, rate limiting, pub/sub
- **Client:** `ioredis`
- **Auth:** `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- **Key Prefix:** `newshub:`
- **Implementation:** `server/services/cacheService.ts`
- **TTL Presets:** SHORT (1m), MEDIUM (5m), LONG (30m), HOUR, DAY, WEEK

## News Data Sources

### RSS Feeds (Primary)
- **Purpose:** Main news ingestion method
- **Parser:** `rss-parser`
- **Sources:** 130+ configured in `server/config/sources.ts`
- **Regions:** USA, Western Europe, Middle East, Turkey, Russia, China, Alternative
- **Implementation:** `server/services/newsAggregator.ts`

### News APIs (Additional Sources)
- **GNews:** `GNEWS_API_KEY` - 100 req/day free
- **NewsAPI:** `NEWSAPI_KEY` - 100 req/day free
- **MediaStack:** `MEDIASTACK_API_KEY` - 500 req/month free
- **Implementation:** `server/services/newsApiService.ts`

### Google News RSS
- **Purpose:** Supplementary news via Google News search
- **Endpoint:** `https://news.google.com/rss/search?q=source:{source}+when:1d`
- **Used by:** Many sources in `server/config/sources.ts`

### HTML Crawling (Fallback)
- **Purpose:** Scraping sites without RSS feeds
- **Parser:** `cheerio`
- **Implementation:** `server/services/newsCrawler.ts`
- **Targets:** Sites with broken/missing RSS (sputnik, presstv, cgtn, xinhua, globaltimes)

### Stealth Scraping (Anti-Bot Bypass)
- **Purpose:** Scraping sites with bot protection
- **Engine:** `puppeteer-extra` with stealth and adblocker plugins
- **Implementation:** `server/services/stealthScraper.ts`
- **Targets:** Reuters, Middle East Eye, and other protected sites

## Market Data

### Yahoo Finance
- **Purpose:** Stock quotes, commodities, market data
- **SDK:** `yahoo-finance2`
- **Auth:** None required (public API)
- **Implementation:** `server/services/marketDataService.ts`
- **Symbols Tracked:** OIL (CL=F), GOLD (GC=F), DAX (^GDAXI), S&P 500 (^GSPC)
- **Cache TTL:** 60 seconds

## Real-Time Communication

### WebSocket (Socket.IO)
- **Purpose:** Real-time news updates, notifications, live events
- **Server:** `socket.io` (4.8.3)
- **Implementation:** `server/services/websocketService.ts`
- **Events Emitted:**
  - `news:new`, `news:updated`, `news:breaking`
  - `event:new`, `event:updated`, `event:severity-change`
  - `analysis:cluster-updated`, `analysis:tension-index`
  - `notification`, `bookmark:synced`
- **Room Subscriptions:** Region-based, topic-based

## Email Services

### SMTP (Nodemailer)
- **Purpose:** Email digests, notifications, transactional emails
- **SDK:** `nodemailer`
- **Auth:** `SMTP_USER`, `SMTP_PASS` env vars
- **Config:** `SMTP_HOST` (default: smtp.gmail.com), `SMTP_PORT` (default: 587)
- **From:** `SMTP_FROM` env var
- **Implementation:** `server/services/emailService.ts`
- **Features:**
  - Daily/weekly/realtime news digests
  - Welcome emails
  - Password reset emails

## Authentication

### JWT (Custom Implementation)
- **Purpose:** Stateless authentication
- **SDK:** `jsonwebtoken`
- **Secret:** `JWT_SECRET` env var (REQUIRED, min 32 chars)
- **Expiry:** 7 days
- **Implementation:** `server/services/authService.ts`
- **Password Hashing:** bcryptjs (10 rounds)
- **Min Password Length:** 12 characters

## API Endpoints

### Internal REST API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | List articles with filters |
| `/api/news/:id` | GET | Single article |
| `/api/news/sources` | GET | All 130 news sources |
| `/api/translate` | POST | Translate text |
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/me` | GET | Current user (protected) |
| `/api/analysis/clusters` | GET | Topic clustering |
| `/api/ai/ask` | POST | RAG Q&A |
| `/api/events/geo` | GET | Geo-located events |
| `/api/events/timeline` | GET | Historical timeline |
| `/api/markets` | GET | Market data |
| `/api/focus` | GET/POST | Focus presets |
| `/api/personas` | GET/POST | AI personas |
| `/api/share` | POST | Social sharing |
| `/api/email` | POST | Email subscriptions |
| `/api/health` | GET | Server health check |
| `/api/ping` | GET | Simple availability check |

## Environment Variables Summary

**Required:**
```bash
JWT_SECRET=           # Auth token signing (min 32 chars)
DATABASE_URL=         # SQLite or PostgreSQL connection
```

**AI Providers (at least one required):**
```bash
OPENROUTER_API_KEY=   # Primary (free models)
GEMINI_API_KEY=       # Secondary (free tier)
ANTHROPIC_API_KEY=    # Tertiary (paid)
```

**Translation (recommended):**
```bash
DEEPL_API_KEY=        # Best quality
GOOGLE_TRANSLATE_API_KEY=  # Fallback
```

**Optional Services:**
```bash
# Redis
REDIS_URL=            # Or REDIS_HOST/PORT/PASSWORD

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# News APIs
GNEWS_API_KEY=
NEWSAPI_KEY=
MEDIASTACK_API_KEY=

# App
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:5173
ALLOWED_ORIGINS=      # Comma-separated CORS origins
```

## Fallback Patterns

### AI Fallback Chain
```
OpenRouter (5 free models)
  → Gemini (2 models)
    → Anthropic Claude
      → Keyword-based analysis
```

### Translation Fallback Chain
```
DeepL → Google → LibreTranslate → Claude → Return original
```

### News Ingestion Fallback
```
RSS Feeds → News APIs → HTML Crawling → Stealth Scraping
```

### Database Fallback
```
SQLite (dev) ↔ PostgreSQL (prod)
```

### Cache Fallback
```
Redis → In-memory Maps
```

## Security Considerations

- **JWT_SECRET:** Server exits if not set
- **Password Hashing:** bcrypt with 10 rounds
- **CORS:** Whitelist-based origin validation
- **No secrets in code:** All credentials via environment variables
- **Rate limiting:** Implemented via Redis (when available)

## Webhooks & Callbacks

**Incoming:**
- None implemented

**Outgoing:**
- None implemented

---

*Integration audit: 2026-04-18*
