# Phase 17: Docker Deployment - Research

**Researched:** 2026-04-22
**Domain:** Docker containerization, Node.js production deployment, Puppeteer/Chromium on Alpine
**Confidence:** HIGH

## Summary

This phase containerizes the NewsHub application for production deployment using Docker and Docker Compose. The primary challenges are: (1) supporting Puppeteer with system Chromium on Alpine Linux, (2) building TypeScript server code for production, and (3) orchestrating the multi-service stack (app, PostgreSQL, Redis) with proper health checks.

The existing `docker-compose.yml` already has PostgreSQL 17 and Redis 7.4-alpine services with health checks. This phase adds the NewsHub app service, creates a multi-stage Dockerfile, and implements static file serving for the SPA frontend.

**Primary recommendation:** Use `node:22-alpine3.19` as base (avoids Alpine 3.20+ Chromium timeout issues), multi-stage build with tsup for server compilation, and `depends_on` with `condition: service_healthy` for proper service orchestration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `node:22-alpine` as base image - small footprint (~180MB), includes Node 22 LTS
- **D-02:** Multi-stage build - separate builder stage (npm install + build) from runtime stage (copy artifacts only)
- **D-03:** Install system Chromium via `apk add chromium` - set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` to avoid bundled download
- **D-04:** Create `.dockerignore` to exclude node_modules, .git, coverage, test files
- **D-05:** Create non-root `node` user for runtime - security best practice, use `USER node` instruction
- **D-06:** Use `depends_on` with `condition: service_healthy` - app container waits for PostgreSQL and Redis to be ready
- **D-07:** Serve frontend static files from Express - single container, serve `dist/client` via `express.static()`
- **D-08:** Add app service health check using `/api/health/db` endpoint
- **D-09:** Default bridge network - services communicate via container names (postgres, redis)
- **D-10:** Restart policy: `unless-stopped` - matches existing postgres and redis services
- **D-11:** Use `env_file: .env` directive in compose - secrets loaded from .env file at runtime
- **D-12:** Single docker-compose.yml - switch dev/prod behavior via different .env files (no separate compose files)
- **D-13:** Update `.env.example` with all production-required variables documented
- **D-14:** DATABASE_URL uses compose service name: `postgresql://newshub:newshub_dev@postgres:5432/newshub`
- **D-15:** REDIS_URL uses compose service name: `redis://redis:6379`
- **D-16:** Run production server with `node dist/server/index.js` - simple execution with NODE_ENV=production
- **D-17:** App runs on port 3001 internally, compose maps to host port 3001 (consistent with dev environment)
- **D-18:** Set ALLOWED_ORIGINS in .env for production CORS whitelist

### Claude's Discretion
- Exact Dockerfile layer ordering for optimal caching
- Alpine package versions for Chromium dependencies (freetype, harfbuzz, etc.)
- Health check intervals and retry counts
- Container name (suggest: newshub-app)

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | CI/CD pipeline with GitHub Actions | Not in scope for this phase - handled by separate workflow |
| DEPLOY-02 | Docker containerization | Full support: multi-stage Dockerfile, docker-compose.yml extension, Puppeteer/Chromium Alpine setup, production build strategy |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Static file serving | API / Backend (Express) | - | Single container serves both API and frontend in production |
| SPA routing fallback | API / Backend (Express) | - | Express handles client routes via index.html fallback |
| Database connectivity | API / Backend | Database / Storage | Prisma client connects to PostgreSQL container |
| Cache operations | API / Backend | Database / Storage | Redis container for caching and rate limiting |
| Browser automation | API / Backend | - | Puppeteer runs in same container as Express server |
| Container orchestration | CDN / Static (Docker) | - | Docker Compose manages service dependencies |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:22-alpine3.19 | 22-alpine3.19 | Base Docker image | Avoids Alpine 3.20+ Chromium timeout issues [CITED: pptr.dev/troubleshooting] |
| tsup | 8.4.0 | Server TypeScript bundler | Zero-config, uses esbuild, industry standard for Node.js [VERIFIED: npm registry] |
| chromium (Alpine) | System package | Headless browser for scraping | Required for puppeteer-extra stealth plugin |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express.static | Built-in | Serve SPA files | Production static file serving |
| dumb-init | 1.2.5 | PID 1 signal handling | Prevent zombie processes in containers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Alpine | Debian slim | Larger image (~200MB vs ~180MB) but easier Chromium setup |
| tsup | esbuild direct | tsup provides better defaults for library-style builds |
| System Chromium | Bundled Chromium | System Chromium avoids 400MB download, matches Alpine packages |

**Installation:**
```bash
npm install -D tsup
```

**Version verification:**
```bash
npm view tsup version
# 8.4.0 [VERIFIED: npm registry 2026-04-22]

npm view puppeteer version
# 24.42.0 [VERIFIED: npm registry 2026-04-22]

npm view puppeteer-extra version
# 3.3.6 [VERIFIED: npm registry 2026-04-22]
```

## Architecture Patterns

### System Architecture Diagram

```
                                  Docker Host
    ┌─────────────────────────────────────────────────────────────────┐
    │                      Docker Bridge Network                       │
    │                                                                  │
    │  ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐  │
    │  │   newshub-app    │    │   postgres   │    │    redis     │  │
    │  │  (Port 3001)     │    │ (Port 5432)  │    │ (Port 6379)  │  │
    │  ├──────────────────┤    ├──────────────┤    ├──────────────┤  │
    │  │ Express Server   │───▶│ PostgreSQL   │    │ Redis        │  │
    │  │   ↓              │    │ 17           │    │ 7.4-alpine   │  │
    │  │ /api/* routes    │    └──────────────┘    └──────────────┘  │
    │  │ /dist/* static   │            ▲                  ▲          │
    │  │ /* SPA fallback  │            │                  │          │
    │  │                  │◀───────────┴──────────────────┘          │
    │  │ Puppeteer/       │    (Prisma)        (ioredis)             │
    │  │ Chromium         │                                          │
    │  └──────────────────┘                                          │
    │           │                                                     │
    └───────────┼─────────────────────────────────────────────────────┘
                │
                ▼
         Host Port 3001
         (Browser Access)
```

### Data Flow: Request Handling

```
Browser Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
├─────────────────────────────────────────────────────────────┤
│  1. /api/* routes → Route handlers → Prisma/Redis          │
│                                                              │
│  2. /dist/* static → express.static('dist') → Cached files │
│                                                              │
│  3. /* catch-all → index.html (SPA routing)                 │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
NewsHub/
├── Dockerfile                    # Multi-stage build
├── .dockerignore                 # Exclude dev files
├── docker-compose.yml            # Extended with app service
├── .env.example                  # Production env documentation
├── dist/                         # Vite frontend build output
│   ├── index.html
│   ├── assets/
│   └── ...
├── dist/server/                  # tsup server build output (NEW)
│   └── index.js
├── server/                       # Server source (TypeScript)
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   └── ...
├── tsup.config.ts                # Server build configuration (NEW)
└── package.json                  # Updated build scripts
```

### Pattern 1: Multi-Stage Dockerfile

**What:** Separate build environment from runtime environment
**When to use:** Always for production Node.js images

```dockerfile
# Source: https://dev.to/axiom_agent/dockerizing-nodejs-for-production-the-complete-2026-guide-7n3
# Stage 1: Dependencies
FROM node:22-alpine3.19 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine3.19 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:22-alpine3.19 AS runner
WORKDIR /app

# Install Chromium dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Environment for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Copy only production artifacts
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

EXPOSE 3001
CMD ["node", "dist/server/index.js"]
```

### Pattern 2: SPA Static File Serving with Express

**What:** Serve Vite build output from Express, with fallback for client-side routing
**When to use:** Production single-container deployment

```typescript
// Source: https://expressjs.com/en/starter/static-files.html + SPA pattern
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// API routes first (existing)
app.use('/api', apiRoutes);

// Static assets with caching (production only)
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../dist');

  // Serve static files with cache headers
  app.use(express.static(staticPath, {
    maxAge: '7d',
    etag: true,
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}
```

### Pattern 3: Docker Compose Service Orchestration

**What:** Define app service with health-based dependencies
**When to use:** Multi-service Docker deployment

```yaml
# Source: https://docs.docker.com/compose/how-tos/startup-order/
services:
  app:
    build: .
    container_name: newshub-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub
      - REDIS_URL=redis://redis:6379
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health/db"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped
```

### Anti-Patterns to Avoid

- **Running as root in containers:** Always use non-root user (`USER nodejs`) for security
- **Including node_modules in COPY:** Always install dependencies in container to match architecture
- **Not using health checks:** Without health checks, `depends_on` only waits for container start, not readiness
- **Hardcoding secrets in Dockerfile:** Use `env_file` or runtime environment injection
- **Single-stage builds:** Production images should not include dev dependencies or build tools
- **Using Alpine 3.20+ with Puppeteer:** Known timeout issues with Chromium [CITED: github.com/puppeteer/puppeteer/issues/13694]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript compilation | Custom tsc config | tsup | Zero-config, 10x faster with esbuild, handles ESM correctly |
| Process signal handling | Custom signal handlers | dumb-init or --init flag | Proper SIGTERM forwarding, prevents zombie processes |
| Static file serving | Custom file reading | express.static | Battle-tested, handles caching headers, etags |
| Health check endpoint | Complex availability check | Simple SELECT 1 | Existing `/api/health/db` endpoint suffices |
| Chromium installation | Manual download | Alpine packages | System packages match libc, fewer conflicts |

**Key insight:** Docker deployment is an infrastructure pattern with well-established solutions. Custom solutions for process management, static serving, or health checks introduce bugs that containers have already solved.

## Common Pitfalls

### Pitfall 1: Alpine Chromium Timeout

**What goes wrong:** Puppeteer hangs for 180 seconds then throws "Protocol timed out"
**Why it happens:** Alpine 3.20+ Chromium has compatibility issues with Puppeteer's DevTools Protocol
**How to avoid:** Use `node:22-alpine3.19` specifically, not `node:22-alpine` (which pulls latest)
**Warning signs:** Tests pass locally but fail in Docker with timeout errors

### Pitfall 2: Missing Server Build

**What goes wrong:** `npm run start` fails with "Cannot find module dist/server/index.js"
**Why it happens:** Current `tsc -b` only type-checks (noEmit: true), doesn't produce output
**How to avoid:** Add tsup configuration for server compilation
**Warning signs:** package.json `start` script references non-existent files

### Pitfall 3: Native Module Architecture Mismatch

**What goes wrong:** "Error: Cannot find module './build/Release/...'" in container
**Why it happens:** node_modules copied from host (Windows/Mac) don't match Alpine's musl libc
**How to avoid:** Always run `npm ci` inside the container, never copy node_modules from host
**Warning signs:** Works on host, fails in container with native module errors

### Pitfall 4: Health Check Timing

**What goes wrong:** App container starts before PostgreSQL is ready, connection errors
**Why it happens:** `depends_on` without condition only waits for container start, not service readiness
**How to avoid:** Use `condition: service_healthy` and ensure health check `start_period` is sufficient
**Warning signs:** Intermittent connection errors on first deploy, works after restart

### Pitfall 5: SPA Routing 404s

**What goes wrong:** Direct navigation to `/analysis` returns 404
**Why it happens:** Express returns 404 for routes without matching static files
**How to avoid:** Add catch-all route that serves index.html for non-API routes
**Warning signs:** App works from homepage but 404s on refresh or direct URL access

## Code Examples

### tsup.config.ts for Server Build

```typescript
// Source: https://github.com/egoist/tsup [CITED: official docs]
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist/server',
  clean: true,
  sourcemap: true,
  // External packages that should not be bundled
  external: [
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-adblocker',
    '@prisma/client',
  ],
  // Don't bundle node_modules for server
  noExternal: [],
  // Generate ESM output
  shims: false,
});
```

### Updated package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "vite",
    "dev:backend": "tsx watch server/index.ts",
    "build": "npm run build:frontend && npm run build:server",
    "build:frontend": "vite build",
    "build:server": "tsup",
    "start": "node dist/server/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

### Complete .dockerignore

```dockerignore
# Source: https://dev.to/axiom_agent/dockerizing-nodejs-for-production-the-complete-2026-guide-7n3
# Dependencies - installed in container
node_modules
npm-debug.log
yarn-error.log

# Build outputs - rebuilt in container
dist

# Development files
.env.local
.env.development
.env*.local

# Testing
coverage
.nyc_output
*.test.ts
*.test.tsx
*.spec.ts
__tests__
__mocks__
playwright-report
test-results

# IDE and editor
.vscode
.idea
*.swp
*.swo
.DS_Store

# Git
.git
.gitignore

# Docker files not needed in context
Dockerfile*
docker-compose*
.dockerignore

# Documentation
*.md
docs
LICENSE

# CI/CD
.github
.gitlab-ci.yml

# Planning files
.planning
.claude
```

### Health Check Script Alternative (wget)

```bash
# Alpine doesn't have curl by default, use wget
wget -q --spider http://localhost:3001/api/health/db || exit 1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node for production | tsup/esbuild for compilation | 2024+ | 10x faster builds, smaller output |
| node:alpine (latest) | Pinned alpine version (3.19) | 2025 | Avoids Chromium compatibility issues |
| depends_on (no condition) | depends_on with service_healthy | Docker Compose 2.17+ | Proper startup ordering |
| Custom wait-for-it scripts | Native health checks | 2023+ | Built-in, no extra scripts needed |
| Separate frontend/backend containers | Unified container | Current | Simpler orchestration for small apps |

**Deprecated/outdated:**
- **ts-node in production:** Too slow, use compiled output
- **puppeteer with bundled Chromium in Docker:** Adds 400MB, conflicts with Alpine libc
- **Alpine 3.20+ for Puppeteer:** Known timeout issues, use 3.19

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Alpine 3.19 resolves Chromium timeout issues | Common Pitfalls | Build may fail; fallback to Debian slim |
| A2 | tsup handles server ES modules correctly | Standard Stack | Build errors; may need custom esbuild config |
| A3 | Existing health endpoints are sufficient for Docker | Architecture Patterns | May need additional health check logic |

## Open Questions

1. **Prisma Client Generation in Docker**
   - What we know: Prisma client is pre-generated in `src/generated/prisma/`
   - What's unclear: Whether generation needs to run in container or can use pre-built client
   - Recommendation: Include `npx prisma generate` in build stage to ensure platform-specific client

2. **PWA Service Worker in Production**
   - What we know: Phase 16 added PWA with workbox service worker
   - What's unclear: Whether service worker paths work correctly when served from Express
   - Recommendation: Test SW registration after containerization; may need path adjustments

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container build | Yes | 29.4.0 | - |
| Docker Compose | Service orchestration | Yes | 5.1.1 | - |
| Node.js | Build step | Yes | 25.4.0 | - |
| PostgreSQL | Database | Yes (container) | 17 | - |
| Redis | Caching | Yes (container) | 7.4-alpine | - |

**Missing dependencies with no fallback:**
- None - all required tooling is available

**Missing dependencies with fallback:**
- None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT stored securely, not in Dockerfile |
| V3 Session Management | Yes | Redis for session/token blacklist |
| V4 Access Control | No | Handled by application code |
| V5 Input Validation | Yes | Zod validation (existing) |
| V6 Cryptography | No | Uses standard Node.js crypto |
| V14 Configuration | Yes | env_file injection, no hardcoded secrets |

### Known Threat Patterns for Docker + Node.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Container escape via root | Elevation of Privilege | Non-root USER directive |
| Secrets in image layers | Information Disclosure | Runtime env injection via env_file |
| Outdated base image | Tampering | Pin specific image version, regular updates |
| Zombie processes | Denial of Service | Use --init flag or dumb-init |

## Sources

### Primary (HIGH confidence)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting) - Alpine setup, environment variables
- [Docker Compose depends_on](https://docs.docker.com/compose/how-tos/startup-order/) - service_healthy condition
- [Express Static Files](https://expressjs.com/en/starter/static-files.html) - Static serving patterns

### Secondary (MEDIUM confidence)
- [Dockerizing Node.js 2026 Guide](https://dev.to/axiom_agent/dockerizing-nodejs-for-production-the-complete-2026-guide-7n3) - Multi-stage builds, npm ci, non-root users
- [tsup GitHub](https://github.com/egoist/tsup) - Server bundling configuration
- [Alpine Chromium Issue #13694](https://github.com/puppeteer/puppeteer/issues/13694) - Alpine 3.21 timeout fix

### Tertiary (LOW confidence)
- General Docker best practices (multiple sources, consistent patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-documented patterns, verified versions
- Architecture: HIGH - Follows established Docker + Node.js patterns
- Pitfalls: HIGH - Based on official issue trackers and documentation
- Alpine Chromium fix: MEDIUM - Based on recent GitHub issues, may need validation

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days - stable infrastructure patterns)
