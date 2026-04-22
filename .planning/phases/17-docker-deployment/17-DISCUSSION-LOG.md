# Phase 17: Docker Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 17-docker-deployment
**Areas discussed:** Dockerfile strategy, Docker Compose orchestration, Environment management, Production build

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Dockerfile strategy | Multi-stage build, base images, layer caching, and puppeteer-bundled chromium handling | ✓ |
| Docker Compose orchestration | App service config, dependency order, health checks, restart policies | ✓ |
| Environment management | Secrets injection, .env vs docker env, production vs development configs | ✓ |
| Production build | Node production flags, Vite static serving approach, ALLOWED_ORIGINS setup | ✓ |

**User's choice:** All 4 areas
**Notes:** Full discussion requested for final deployment phase of v1.2

---

## Dockerfile Strategy

### Base Image

| Option | Description | Selected |
|--------|-------------|----------|
| node:22-alpine (Recommended) | Small (~180MB), includes Node 22 LTS. You'll need to install Chromium separately for Puppeteer. | ✓ |
| node:22-slim | Debian-based (~400MB), easier system package installs, heavier image. | |
| node:22-bookworm | Full Debian (~1GB+), maximum compatibility, largest image. | |

**User's choice:** node:22-alpine (Recommended)
**Notes:** Alpine chosen for smallest image size, acceptable tradeoff for Chromium manual install

### Chromium Handling

| Option | Description | Selected |
|--------|-------------|----------|
| System Chromium (Recommended) | Install chromium via apk, set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true. Smaller image, controlled version. | ✓ |
| Bundled Chromium | Let Puppeteer download its own Chromium. Larger image (~300MB more), but version matches puppeteer package. | |
| Disable scraping in prod | Skip Chromium entirely in Docker, use stealthScraper only in dev. Requires code changes. | |

**User's choice:** System Chromium (Recommended)
**Notes:** System chromium reduces image size significantly

---

## Docker Compose Orchestration

### Dependency Waiting

| Option | Description | Selected |
|--------|-------------|----------|
| depends_on + health (Recommended) | Use depends_on with condition: service_healthy. App starts only when DB/Redis pass health checks. | ✓ |
| Application retry | App handles connection retries internally. Simpler compose, but requires code changes for retry logic. | |
| External healthcheck script | wait-for-it.sh or dockerize. Extra tooling in image. | |

**User's choice:** depends_on + health (Recommended)
**Notes:** Leverages existing health check endpoints from Phase 13/14

### Static File Serving

| Option | Description | Selected |
|--------|-------------|----------|
| Express static serve (Recommended) | Serve dist/client from the same Express server. Single container, simpler setup. | ✓ |
| Separate nginx container | Nginx serves static files, proxies /api to Node. Two containers, better static file performance. | |

**User's choice:** Express static serve (Recommended)
**Notes:** Single container keeps deployment simple for current scale

---

## Environment Management

### Secrets Handling

| Option | Description | Selected |
|--------|-------------|----------|
| env_file in compose (Recommended) | Reference .env via env_file directive. Simple, works with docker compose up. | ✓ |
| Docker secrets | Use Docker swarm secrets or compose secrets. More secure, requires swarm mode or file mounting. | |
| Environment in compose | Hard-code environment vars in docker-compose.yml. Not recommended for secrets. | |

**User's choice:** env_file in compose (Recommended)
**Notes:** Standard approach for compose-based deployments

### Dev/Prod Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Single compose + env override (Recommended) | One docker-compose.yml, switch behavior via .env.production vs .env.development | ✓ |
| Two compose files | docker-compose.yml (dev) and docker-compose.prod.yml. More explicit, more files to maintain. | |
| Compose override pattern | docker-compose.yml + docker-compose.override.yml. Standard pattern for dev overrides. | |

**User's choice:** Single compose + env override (Recommended)
**Notes:** Minimizes file count, environment vars control behavior

---

## Production Build

### Node Execution

| Option | Description | Selected |
|--------|-------------|----------|
| node dist/server/index.js (Recommended) | Direct node execution with NODE_ENV=production. Simple, uses existing npm start script. | ✓ |
| PM2 in container | Process manager for restarts. Adds complexity but provides auto-restart on crash. | |
| tsx in prod | Keep using tsx for runtime TypeScript. Slower startup, but no build step needed. | |

**User's choice:** node dist/server/index.js (Recommended)
**Notes:** Docker handles restarts via restart policy, PM2 redundant

### Port Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| 3001 (internal), map to 80 (Recommended) | App runs on 3001 inside container, compose maps to host 80. Standard HTTP. | ✓ |
| 3001 both | Keep same port inside and out. Simpler for development parity. | |
| 8080 both | Use 8080, common container convention. | |

**User's choice:** 3001 (internal), map to 80 (Recommended)
**Notes:** Standard HTTP port for production access

---

## Claude's Discretion

- Exact Dockerfile layer ordering for optimal caching
- Alpine package versions for Chromium dependencies
- Health check intervals and retry counts
- Network configuration (bridge vs custom)

## Deferred Ideas

None
