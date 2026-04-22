# Phase 17: Docker Deployment - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 7 (2 new, 5 modified/extended)
**Analogs found:** 5 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `Dockerfile` | config | build | None (NEW) | no-analog |
| `.dockerignore` | config | build | `.gitignore` | role-match |
| `docker-compose.yml` | config | orchestration | Self (existing) | exact |
| `tsup.config.ts` | config | build | `vite.config.ts` | role-match |
| `server/index.ts` | controller | request-response | Self (existing) | exact |
| `package.json` | config | build | Self (existing) | exact |
| `.env.example` | config | documentation | Self (existing) | exact |

## Pattern Assignments

### `Dockerfile` (config, build)

**Analog:** None - new file type for this project

**Reference patterns from RESEARCH.md** (lines 182-226):
- Multi-stage build pattern with `deps`, `builder`, `runner` stages
- Alpine-specific Chromium dependencies
- Non-root user setup

**RESEARCH.md recommended structure:**
```dockerfile
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
# ... Chromium deps, non-root user, copy artifacts
```

---

### `.dockerignore` (config, build)

**Analog:** `D:\NewsHub\.gitignore`

**Imports pattern** (lines 1-39):
```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Claude Code (v6 Post-Dev Workflow)
.claude/handoff.md
.claude/checkpoints/
.claude/web-checklist-state.json

/src/generated/prisma

# Database
dev.db
*.db

# Playwright auth state (security: contains session tokens)
playwright/.auth/user.json
```

**Adaptation notes:**
- Keep: `node_modules`, `*.log`, `.vscode`, `.idea`, `.DS_Store`
- Add: `dist`, `.git`, `coverage`, `playwright-report`, `test-results`, `*.test.ts`, `*.spec.ts`, `__tests__`, `__mocks__`, `.planning`, `.claude`, `*.md`, `docs`, `Dockerfile*`, `docker-compose*`, `.dockerignore`, `.github`
- Remove: `!.vscode/extensions.json` (not needed in Docker)

---

### `docker-compose.yml` (config, orchestration)

**Analog:** Self - `D:\NewsHub\docker-compose.yml`

**Existing service pattern** (lines 1-45):
```yaml
services:
  postgres:
    image: postgres:17
    container_name: newshub-db
    environment:
      POSTGRES_USER: newshub
      POSTGRES_PASSWORD: newshub_dev
      POSTGRES_DB: newshub
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U newshub -d newshub"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  redis:
    image: redis:7.4-alpine
    container_name: newshub-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --save 60 10000
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Extension pattern for app service:**
- Follow same structure: `container_name`, `ports`, `healthcheck`, `restart`
- Add `depends_on` with `condition: service_healthy` for postgres and redis
- Add `env_file: .env` for secrets
- Add `build: .` context
- Health check pattern: `test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health/db"]`
- Naming convention: `newshub-app` (matches `newshub-db`, `newshub-redis`)

---

### `tsup.config.ts` (config, build)

**Analog:** `D:\NewsHub\node_modules\@electric-sql\pglite-socket\tsup.config.ts`

**Import pattern** (lines 1-2):
```typescript
import { defineConfig } from 'tsup'
```

**Core pattern** (lines 7-19):
```typescript
export default defineConfig([
  {
    entry: entryPoints,
    sourcemap: true,
    dts: {
      entry: entryPoints,
      resolve: true,
    },
    clean: true,
    minify: minify,
    shims: true,
    format: ['esm', 'cjs'],
  },
])
```

**Secondary analog:** `D:\NewsHub\vite.config.ts` (defineConfig pattern)

**Adaptation for server build:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist/server',
  clean: true,
  sourcemap: true,
  external: [
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-adblocker',
    '@prisma/client',
  ],
});
```

---

### `server/index.ts` (controller, request-response)

**Analog:** Self - `D:\NewsHub\server\index.ts`

**Import pattern** (lines 1-34):
```typescript
// Load environment variables FIRST before any other imports
import 'dotenv/config';

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
// ... route imports
```

**Static file serving insertion point** - after all API routes, before error handler (lines 236-245):
```typescript
// Error handler

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});
```

**Pattern for production static serving** (insert before error handler):
```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production static file serving (after all API routes)
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

**Existing health endpoint pattern** (lines 131-162):
```typescript
// Database health check - dedicated endpoint for container orchestration (D-05)
app.get('/api/health/db', async (_req, res) => {
  console.log('[HEALTH/DB] Received database health request');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const start = Date.now();
  try {
    // Simple connectivity check - SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    logDbHealthCheck(true, duration);

    res.json({
      status: 'healthy',
      latency_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // ... error handling
  }
});
```

---

### `package.json` (config, build)

**Analog:** Self - `D:\NewsHub\package.json`

**Existing scripts pattern** (lines 12-31):
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "vite",
    "dev:backend": "tsx watch server/index.ts",
    "build": "tsc -b && vite build",
    "start": "node dist/server/index.js",
    "lint": "eslint .",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "seed": "npx tsx prisma/seed.ts",
    "seed:badges": "npx tsx prisma/seed-badges.ts",
    "seed:personas": "npx tsx prisma/seed-personas.ts"
  }
}
```

**Updated scripts pattern:**
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

**Key changes:**
- `build` script changes from `tsc -b && vite build` to `npm run build:frontend && npm run build:server`
- Add `build:frontend` script for Vite build
- Add `build:server` script for tsup build

---

### `.env.example` (config, documentation)

**Analog:** Self - `D:\NewsHub\.env.example`

**Existing structure** (lines 1-92):
```bash
# Server
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:5173

# REQUIRED: JWT Secret (minimum 32 characters, generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# CORS: Comma-separated allowed origins (optional, defaults to localhost)
# ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# ============================================================================
# DATABASE (PostgreSQL)
# ============================================================================
# Local development (via Docker Compose):
DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5432/newshub?schema=public"
# Production: DATABASE_URL="postgresql://user:password@host:5432/newshub?schema=public"

# ============================================================================
# REDIS (optional - enables caching and real-time features)
# ============================================================================
# Local: redis://localhost:6379
# Cloud: redis://user:password@host:6379
# REDIS_URL=redis://localhost:6379
```

**Extension pattern for Docker production:**
```bash
# ============================================================================
# DOCKER PRODUCTION (container service names)
# ============================================================================
# When running via docker compose, use container service names:
# DATABASE_URL="postgresql://newshub:newshub_dev@postgres:5432/newshub?schema=public"
# REDIS_URL=redis://redis:6379

# ============================================================================
# PUPPETEER (Docker only)
# ============================================================================
# Set automatically in Docker, but can override:
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

---

## Shared Patterns

### Health Check Endpoints
**Source:** `D:\NewsHub\server\index.ts` lines 131-204
**Apply to:** Docker Compose app service health check

Pattern: `/api/health/db` returns `{ status: 'healthy' }` on success, 503 on failure.

Docker health check command:
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/api/health/db"]
```

### Service Naming Convention
**Source:** `D:\NewsHub\docker-compose.yml`
**Apply to:** New app service

Pattern: `newshub-{service}` where service is `db`, `redis`, or `app`.

### Restart Policy
**Source:** `D:\NewsHub\docker-compose.yml` lines 19, 41
**Apply to:** App service

Pattern: `restart: unless-stopped` for all services.

### Health Check Timing
**Source:** `D:\NewsHub\docker-compose.yml` lines 13-18, 35-40
**Apply to:** App service

PostgreSQL pattern:
```yaml
healthcheck:
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

App service recommended (longer start due to Prisma generation):
```yaml
healthcheck:
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### Config File Pattern
**Source:** `D:\NewsHub\vite.config.ts`, `D:\NewsHub\playwright.config.ts`, `D:\NewsHub\prisma.config.ts`
**Apply to:** `tsup.config.ts`

Pattern: Use `defineConfig` wrapper for type safety and IDE support.
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  // config options
});
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `Dockerfile` | config | build | No Docker infrastructure existed before Phase 13/14 |

**Recommendation:** Use RESEARCH.md Pattern 1 (lines 177-226) for multi-stage Dockerfile structure.

---

## Metadata

**Analog search scope:** `D:\NewsHub\` (root level config files, server/, docker-compose.yml)
**Files scanned:** 15
**Pattern extraction date:** 2026-04-23
