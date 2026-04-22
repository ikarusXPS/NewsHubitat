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

### Non-root User (Session 2 Update)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, create node user (Recommended) | Add USER node instruction — security best practice | ✓ |
| No, run as root | Simpler but less secure | |

**User's choice:** Yes, create node user (Recommended)
**Notes:** Added as D-05 in context — security best practice for production containers

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

### Container Networking (Session 2 Update)

| Option | Description | Selected |
|--------|-------------|----------|
| Default bridge network (Recommended) | Services communicate via container names (postgres, redis) | ✓ |
| Custom network with alias | Create newshub-network with explicit aliases | |
| Host network mode | Containers share host networking (simpler but less isolated) | |

**User's choice:** Default bridge network (Recommended)
**Notes:** Services will communicate using container names as hostnames

### Restart Policy (Session 2 Update)

| Option | Description | Selected |
|--------|-------------|----------|
| unless-stopped (Recommended) | Restart on failure, respect manual stops — matches existing services | ✓ |
| always | Always restart, even after manual stops | |
| on-failure:5 | Restart up to 5 times on failure, then stop | |

**User's choice:** unless-stopped (Recommended)
**Notes:** Matches existing postgres and redis services for consistency

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

### DATABASE_URL Format (Session 2 Update)

| Option | Description | Selected |
|--------|-------------|----------|
| Use compose service name (Recommended) | DATABASE_URL=postgresql://newshub:newshub_dev@postgres:5432/newshub | ✓ |
| Keep localhost with port mapping | App uses host network to reach postgres via localhost:5433 | |
| Make it configurable | Document both patterns in .env.example | |

**User's choice:** Use compose service name (Recommended)
**Notes:** Container-to-container communication via service names

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

### Port Configuration (Updated Session 2)

| Option | Description | Selected |
|--------|-------------|----------|
| Port 3001 (Recommended) | Match dev environment — consistent for local Docker testing | ✓ |
| Port 80 | Standard HTTP — requires no port in URL | |
| Port 8080 | Common alternative — no root privileges needed | |

**User's choice:** Port 3001 (Recommended)
**Notes:** Changed from 80 to 3001 for development/production consistency

---

## Claude's Discretion

- Exact Dockerfile layer ordering for optimal caching
- Alpine package versions for Chromium dependencies
- Health check intervals and retry counts
- Container name (suggested: newshub-app)

## Deferred Ideas

None — discussion stayed within phase scope
