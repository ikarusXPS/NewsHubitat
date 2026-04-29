# syntax=docker/dockerfile:1.6
# =============================================================================
# Stage 1: Dependencies (pnpm workspace install — production + dev for builder)
# =============================================================================
FROM node:22-alpine3.19 AS deps
WORKDIR /app

# Enable pnpm via corepack (matches CI: pnpm/action-setup@v4 version: 10)
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy ONLY workspace manifests + lockfile so this layer caches on lockfile change.
# When adding a new workspace package to pnpm-workspace.yaml, add its package.json here.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

# Workspace install scoped to @newshub/web and its transitive workspace deps
# (currently @newshub/types). The frozen-lockfile flag fails the build if
# pnpm-lock.yaml does not match the manifests (same lockfile-strictness
# guarantee that the legacy install command provided).
RUN pnpm install --frozen-lockfile --filter @newshub/web...

# =============================================================================
# Stage 2: Builder (Prisma generate + Vite + tsup)
# =============================================================================
FROM node:22-alpine3.19 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Bring in the dep tree from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

# Copy source (after .dockerignore trim — context should be small)
COPY . .

# Generate Prisma client against apps/web/prisma/schema.prisma → apps/web/src/generated/prisma
RUN pnpm --filter @newshub/web exec prisma generate

# Build frontend (vite → apps/web/dist) + backend (tsup → apps/web/dist/server)
RUN pnpm --filter @newshub/web build

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:22-alpine3.19 AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Chromium dependencies for Puppeteer (D-03; preserved from legacy Dockerfile)
# See: https://pptr.dev/troubleshooting#running-puppeteer-on-alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

# Puppeteer points at the system chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Non-root user for security (D-05)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Reinstall workspace deps in production-only mode (slimmer node_modules)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --filter @newshub/web... --prod

# Copy Prisma schema + built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/src/generated ./apps/web/src/generated
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/server/instrument.mjs ./apps/web/server/instrument.mjs
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist

# Regenerate Prisma client for the runtime platform (linux-musl on Alpine)
RUN pnpm --filter @newshub/web exec prisma generate

# Logs directory for winston
RUN mkdir -p logs && chown nodejs:nodejs logs

USER nodejs

EXPOSE 3001

# Liveness probe — /api/health/db returns 200 when Prisma can SELECT 1.
# Do NOT use /api/ready here: that endpoint returns 503 during graceful drain
# (phase 37 plan-05) and would cause Docker/Swarm to kill the container mid-drain.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:3001/api/health/db || exit 1

# Sentry instrument.mjs MUST be preloaded via --import (matches apps/web/package.json start script).
# Path is monorepo-relative from /app.
CMD ["node", "--import", "./apps/web/server/instrument.mjs", "apps/web/dist/server/index.js"]
