# Phase 17: Docker Deployment - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Containerize the NewsHub application for production deployment. This phase creates a Dockerfile for the app (frontend + backend) and extends the existing docker-compose.yml to include the app service alongside PostgreSQL and Redis. The goal is a single `docker compose up` command that runs the entire stack.

</domain>

<decisions>
## Implementation Decisions

### Dockerfile Strategy
- **D-01:** Use `node:22-alpine` as base image — small footprint (~180MB), includes Node 22 LTS
- **D-02:** Multi-stage build — separate builder stage (npm install + build) from runtime stage (copy artifacts only)
- **D-03:** Install system Chromium via `apk add chromium` — set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` to avoid bundled download
- **D-04:** Create `.dockerignore` to exclude node_modules, .git, coverage, test files
- **D-05:** Create non-root `node` user for runtime — security best practice, use `USER node` instruction

### Docker Compose Orchestration
- **D-06:** Use `depends_on` with `condition: service_healthy` — app container waits for PostgreSQL and Redis to be ready
- **D-07:** Serve frontend static files from Express — single container, serve `dist/client` via `express.static()`
- **D-08:** Add app service health check using `/api/health/db` endpoint
- **D-09:** Default bridge network — services communicate via container names (postgres, redis)
- **D-10:** Restart policy: `unless-stopped` — matches existing postgres and redis services

### Environment Management
- **D-11:** Use `env_file: .env` directive in compose — secrets loaded from .env file at runtime
- **D-12:** Single docker-compose.yml — switch dev/prod behavior via different .env files (no separate compose files)
- **D-13:** Update `.env.example` with all production-required variables documented
- **D-14:** DATABASE_URL uses compose service name: `postgresql://newshub:newshub_dev@postgres:5432/newshub`
- **D-15:** REDIS_URL uses compose service name: `redis://redis:6379`

### Production Build
- **D-16:** Run production server with `node dist/server/index.js` — simple execution with NODE_ENV=production
- **D-17:** App runs on port 3001 internally, compose maps to host port 3001 (consistent with dev environment)
- **D-18:** Set ALLOWED_ORIGINS in .env for production CORS whitelist

### Claude's Discretion
- Exact Dockerfile layer ordering for optimal caching
- Alpine package versions for Chromium dependencies (freetype, harfbuzz, etc.)
- Health check intervals and retry counts
- Container name (suggest: newshub-app)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Docker Infrastructure
- `docker-compose.yml` — PostgreSQL 17 and Redis 7.4-alpine services with health checks (Phase 13, 14)
- `package.json` — Build scripts: `npm run build`, `npm start`

### Build Configuration
- `vite.config.ts` — Frontend build with PWA, compression, chunk splitting
- `tsconfig.json` — TypeScript project references (tsconfig.app.json, tsconfig.node.json)

### Health Endpoints
- `server/index.ts` lines 131-179 — `/api/health/db` and `/api/health/redis` implementations

### Environment Variables
- `.env.example` — Current documented environment variables

### Puppeteer Dependencies
- `server/services/stealthScraper.ts` — Uses puppeteer-extra with stealth plugin

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker-compose.yml` — Already has PostgreSQL and Redis with health checks, just add app service
- Health endpoints ready — `/api/health/db` and `/api/health/redis` exist for container orchestration
- Build scripts ready — `npm run build` produces `dist/` with frontend and compiled backend

### Established Patterns
- Service health checks use `test: ["CMD-SHELL", ...]` in compose
- PostgreSQL uses 10s interval, 5s timeout, 5 retries, 30s start_period
- Redis uses 10s interval, 5s timeout, 5 retries, 10s start_period
- Named volumes for data persistence (postgres_data, redis_data)
- All services use `restart: unless-stopped`

### Integration Points
- `server/index.ts` — Add `express.static('dist/client')` for serving frontend in production
- `docker-compose.yml` — Add newshub-app service with build context
- `.env.example` — Document production environment variables with container service names

</code_context>

<specifics>
## Specific Ideas

- Dockerfile should copy package*.json first, then npm ci, then copy source and build — maximizes layer caching
- Alpine Chromium requires: `chromium`, `nss`, `freetype`, `freetype-dev`, `harfbuzz`, `ca-certificates`, `ttf-freefont`
- Container name: `newshub-app` following existing pattern (newshub-db, newshub-redis)
- App health check: `curl -f http://localhost:3001/api/health/db || exit 1`
- Add `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` environment variable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-docker-deployment*
*Context gathered: 2026-04-22*
