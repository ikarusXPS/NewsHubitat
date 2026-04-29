<!-- generated-by: gsd-doc-writer -->
# DEPLOYMENT.md

## Deployment Targets

NewsHub supports multiple deployment strategies with Docker as the primary target:

| Target | Config File | Description |
|--------|-------------|-------------|
| Docker Compose | `docker-compose.yml` | Full stack deployment with PostgreSQL, Redis, Prometheus, Grafana, and Alertmanager |
| Docker (standalone) | `Dockerfile` | Multi-stage build optimized for production with Alpine Linux |
| GitHub Container Registry | `.github/workflows/ci.yml` | Automated image builds pushed to `ghcr.io` on master branch commits |
| SSH Deployment | `.github/workflows/ci.yml` | Automated staging and production deployment via SSH action |

The Docker image uses a three-stage build pattern: dependencies installation, build (Vite + tsup), and production runtime with non-root user for security.

## Build Pipeline

The CI/CD pipeline defined in `.github/workflows/ci.yml` runs on pull requests and pushes to master:

1. **Trigger**: Push to master or pull request
2. **Lint & Typecheck** (parallel):
   - `npm run lint` - ESLint validation
   - `npm run typecheck` - TypeScript validation
3. **Unit Tests**:
   - Start PostgreSQL 17 and Redis 7.4 services
   - Generate Prisma client for Linux
   - Run `npx prisma db push` to sync schema
   - Execute `npm run test:coverage` (80% coverage threshold enforced)
4. **Build**:
   - Run `npm run build` (frontend via Vite, backend via tsup)
   - Upload source maps to Sentry with release tag `newshub@{commit-sha}`
   - Build Docker image with Buildx
   - Tag with commit SHA and `latest` (master branch only)
   - Push to GitHub Container Registry (`ghcr.io/{owner}/{repo}`)
   - Use GitHub Actions cache for Docker layers
5. **E2E Tests**:
   - Seed database with `npm run seed`
   - Install Playwright with Chromium dependencies
   - Run `npx playwright test --reporter=html`
   - Upload test report artifact (7-day retention)
6. **Deploy to Staging** (master branch only):
   - SSH to staging server
   - Run `docker compose pull && docker compose up -d --wait`
   - Health check via `/api/health/db` endpoint
   - <!-- VERIFY: Staging URL https://staging.newshub.example.com -->
7. **Deploy to Production** (after staging success):
   - SSH to production server
   - Run `docker compose pull && docker compose up -d --wait`
   - Health check via `/api/health/db` endpoint
   - <!-- VERIFY: Production URL https://newshub.example.com -->

Build artifacts include frontend static files in `dist/client/` and bundled backend in `dist/server/index.js`.

## Environment Setup

Required environment variables for production deployment are documented in CONFIGURATION.md. Critical production-specific variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (use `postgres:5432` in Docker) |
| `REDIS_URL` | Yes | Redis connection string (use `redis:6379` in Docker) |
| `JWT_SECRET` | Yes | Minimum 32 characters, generate with `openssl rand -base64 32` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed CORS origins <!-- VERIFY: Production domain --> |
| `OPENROUTER_API_KEY` or `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` | Yes (one) | AI provider for analysis features |
| `SENTRY_DSN` | Recommended | Error tracking and performance monitoring |
| `SENTRY_RELEASE` | Recommended | Release tag for source map linking (set to `newshub@{commit-sha}`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional | Email verification and digest delivery |
| `ALERT_EMAIL` | Optional | Recipient for Prometheus/Alertmanager notifications |

The Docker Compose file overrides `DATABASE_URL` and `REDIS_URL` to use container service names (`postgres:5432`, `redis:6379`) instead of localhost.

**Production secrets must be set via the deployment platform's secret manager** <!-- VERIFY: Specific secret manager used --> and should never be committed to the repository.

## Docker Deployment

### Local Production Build

Build and run the full stack locally:

```bash
# Build the app container
docker compose build app

# Start all services (app, postgres, redis, prometheus, grafana, alertmanager)
docker compose up -d

# Check container health status
docker compose ps

# View app logs
docker compose logs -f app

# Health check
curl http://localhost:3001/api/health/db
```

Access monitoring dashboards:
- Prometheus: http://localhost:9090 (metrics scraping from `/metrics` endpoint every 15 seconds)
- Grafana: http://localhost:3000 (login: admin/admin)
- Alertmanager: http://localhost:9093 (alert routing and silencing)

### Environment Configuration

For production deployment, create a `.env` file with production values (see `.env.example` for the full list). The Docker Compose file automatically loads `.env` and injects environment variables into containers.

Critical Dockerfile features:
- Multi-stage build reduces final image size (separates build dependencies from runtime)
- Alpine Linux base (`node:22-alpine3.19`) for minimal footprint
- Chromium and Puppeteer dependencies installed for web scraping
- Non-root user (`nodejs`) for security (UID/GID isolation)
- Health check via `/api/health/db` endpoint (30s interval, 60s start period, 3 retries)
- Prisma client generated twice (build stage for linux-musl, runtime for platform match)

### Database Migrations

The project uses Prisma db push (not migrations) for schema management:

```bash
# Inside the app container or on deployment
npx prisma generate  # Generate Prisma client
npx prisma db push   # Sync schema to PostgreSQL
npm run seed         # Seed badges and personas (optional)
```

Prisma schema is located at `prisma/schema.prisma`, and the generated client is at `src/generated/prisma/`.

## Rollback Procedure

If a deployment fails or introduces issues:

### Docker Compose Rollback

1. Identify the previous working image tag from GitHub Container Registry or commit history
2. Update the image tag in `docker-compose.yml` or pull a specific version:
   ```bash
   docker pull ghcr.io/{owner}/{repo}:{previous-commit-sha}
   docker tag ghcr.io/{owner}/{repo}:{previous-commit-sha} ghcr.io/{owner}/{repo}:latest
   ```
3. Restart the stack:
   ```bash
   docker compose down
   docker compose up -d --wait
   docker compose ps
   ```
4. Verify health:
   ```bash
   curl http://localhost:3001/api/health/db
   ```

### CI/CD Pipeline Rollback

The CI workflow does not include an automated rollback mechanism. To roll back a production deployment:

1. Revert the problematic commit locally or on GitHub
2. Push to master to trigger a new CI build with the reverted code
3. The pipeline will automatically deploy the reverted version to staging, then production

Alternatively, manually SSH to the server and execute the rollback steps above.

### Database Rollback

Prisma db push is non-reversible. To roll back a schema change:

1. Restore the previous `prisma/schema.prisma` file from git history
2. Run `npx prisma db push --force-reset` (⚠️ WARNING: Drops all data)
3. Restore database from backup <!-- VERIFY: Backup strategy and restore procedure -->

**Best practice**: Test schema changes in staging environment before deploying to production.

## Monitoring

NewsHub includes a comprehensive monitoring stack deployed via Docker Compose:

### Error Tracking

Sentry is integrated for both frontend and backend error tracking:

- **Frontend**: Errors are captured by `@sentry/react` and reported to Sentry dashboard
- **Backend**: Errors are captured by `@sentry/node` with performance tracing
- **Source Maps**: Uploaded during CI build via `@sentry/vite-plugin` for error stack traces
- **Release Tracking**: Each deployment is tagged with `newshub@{commit-sha}` for version correlation
- **Configuration**: `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT` in `.env`

<!-- VERIFY: Sentry dashboard URL and project name -->

### Metrics Collection

Prometheus scrapes metrics from the `/metrics` endpoint (powered by `prom-client`):

- **Scrape Interval**: 15 seconds
- **Retention**: 15 days (`prometheus.yml` config)
- **Metrics Exported**: HTTP request count, latency histogram, custom business metrics
- **Alert Evaluation**: 15 seconds
- **Dashboard**: http://localhost:9090

### Alert Rules

Alert rules are defined in `prometheus/alert.rules.yml`:

| Alert | Condition | Severity | Duration |
|-------|-----------|----------|----------|
| HighErrorRate | 5xx errors > 1% of total requests | Critical | 5 minutes |
| HighLatency | p95 latency > 2 seconds | Warning | 5 minutes |
| ServiceDown | Service unreachable | Critical | 1 minute |
| HighEmailBounceRate | Email bounces > 5% of sent | Critical | 5 minutes |
| LowEmailDeliveryRate | Delivery success < 95% | Warning | 1 hour |

### Alert Delivery

Alertmanager routes alerts to email notifications:

- **SMTP Configuration**: Uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from `.env`
- **Recipient**: Set via `ALERT_EMAIL` environment variable
- **Grouping**: Alerts grouped by name, 30-second group wait
- **Repeat Interval**: Same alert won't repeat for 4 hours
- **Silencing**: Managed via Alertmanager UI at http://localhost:9093

### Visualization

Grafana provides pre-configured dashboards:

- **Access**: http://localhost:3000 (default login: admin/admin)
- **Data Source**: Prometheus (auto-configured via provisioning)
- **Dashboards**: <!-- VERIFY: Specific dashboard names and IDs if pre-configured -->
- **Provisioning**: Dashboards and data sources configured in `grafana/provisioning/`

**Production recommendation**: Change Grafana admin password immediately after first deployment (`GF_SECURITY_ADMIN_PASSWORD` in `docker-compose.yml`).

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Generate strong `JWT_SECRET` (minimum 32 characters)
- [ ] Configure `ALLOWED_ORIGINS` with production domain(s)
- [ ] Set at least one AI provider API key (OpenRouter, Gemini, or Anthropic)
- [ ] Configure Sentry DSN and release tracking
- [ ] Set production `DATABASE_URL` and `REDIS_URL` (or use Docker service names)
- [ ] Configure SMTP settings for email verification and digests (if using email features)
- [ ] Set `ALERT_EMAIL` for monitoring notifications
- [ ] Change Grafana admin password from default
- [ ] Test health endpoints (`/api/health`, `/api/health/db`, `/api/health/redis`)
- [ ] Verify Prometheus is scraping metrics successfully
- [ ] Test alert delivery via Alertmanager
- [ ] Run database seed scripts (`npm run seed`) if deploying for the first time
- [ ] Configure backup strategy for PostgreSQL and Redis data volumes <!-- VERIFY: Backup strategy -->
- [ ] Set up log aggregation for `logs/` directory <!-- VERIFY: Log aggregation service -->
