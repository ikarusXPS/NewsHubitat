# syntax=docker/dockerfile:1.6
# =============================================================================
# Stage 1: Dependencies (pnpm workspace install — production + dev for builder)
# =============================================================================
FROM node:22-alpine3.19 AS deps
WORKDIR /app

# Enable pnpm via corepack (matches CI: pnpm/action-setup@v4 version: 10)
# Upgrade corepack first — Node 22's bundled corepack ships with outdated
# signing keys and rejects pnpm 10.x signatures (Cannot find matching keyid).
# See: https://github.com/nodejs/corepack/issues/612
RUN npm install -g corepack@latest \
 && corepack enable \
 && corepack prepare pnpm@10.32.1 --activate

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

# Upgrade corepack first — Node 22's bundled corepack ships with outdated
# signing keys and rejects pnpm 10.x signatures (Cannot find matching keyid).
# See: https://github.com/nodejs/corepack/issues/612
RUN npm install -g corepack@latest \
 && corepack enable \
 && corepack prepare pnpm@10.32.1 --activate

# Bring in the dep tree from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

# Copy source (after .dockerignore trim — context should be small)
COPY . .

# Build-time stub DATABASE_URL — prisma.config.ts has a fail-fast guard
# that throws if DATABASE_URL is unset, and `prisma generate` loads the
# config file even though it never opens a real connection. The runtime
# image uses the real DATABASE_URL injected via env vars (docker compose /
# Swarm secrets), which overrides this stub.
ENV DATABASE_URL=postgresql://build-stub:stub@localhost:5432/stub

# Generate Prisma client against apps/web/prisma/schema.prisma → apps/web/src/generated/prisma
RUN pnpm --filter @newshub/web exec prisma generate

# Build frontend (vite → apps/web/dist) + backend (tsup → apps/web/dist/server)
RUN pnpm --filter @newshub/web build

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:22-alpine3.19 AS runner
WORKDIR /app

# Upgrade corepack first — Node 22's bundled corepack ships with outdated
# signing keys and rejects pnpm 10.x signatures (Cannot find matching keyid).
# See: https://github.com/nodejs/corepack/issues/612
RUN npm install -g corepack@latest \
 && corepack enable \
 && corepack prepare pnpm@10.32.1 --activate

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

# Copy Prisma schema + config + built artifacts from builder.
# prisma.config.ts is required at runtime by `prisma db push` and
# `prisma migrate deploy` — without it, Prisma 7 cannot resolve
# datasource.url (the schema intentionally defers URL definition
# to the config file, see apps/web/prisma/schema.prisma).
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/prisma.config.ts ./apps/web/prisma.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/src/generated ./apps/web/src/generated
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/server/instrument.mjs ./apps/web/server/instrument.mjs
# @newshub/types is a TypeScript-source workspace package (main: "index.ts",
# no build step). tsup has already inlined its types into dist/server/index.js
# at build time, so the runtime image doesn't strictly need this — but we copy
# the source anyway so the pnpm symlink at apps/web/node_modules/@newshub/types
# resolves to a real file rather than dangling (defensive).
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/index.ts ./packages/types/index.ts

# NOTE: We do NOT re-run `prisma generate` here. Builder and runner
# stages both use node:22-alpine3.19 — same kernel, same musl libc,
# same Prisma engine binary. The client copied from /app/apps/web/src/generated
# is platform-compatible. Skipping the regenerate avoids the build-time
# DATABASE_URL requirement from prisma.config.ts and shaves seconds off
# the build.

# Logs directory for winston
RUN mkdir -p logs && chown nodejs:nodejs logs

# Hand ownership of /app to nodejs so Prisma 7 can lazy-load its engine
# binaries into /app/node_modules/.pnpm/@prisma+engines@*/... at runtime
# (Prisma writes to its own node_modules dir on first invocation if engines
# are missing — pnpm 10 skips @prisma/engines' postinstall script by default
# as a security feature, so the binaries aren't pre-staged). Without this,
# `prisma db push` and `prisma migrate deploy` fail with EACCES under the
# non-root nodejs user.
RUN chown -R nodejs:nodejs /app

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
