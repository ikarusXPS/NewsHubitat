# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:22-alpine3.19 AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:22-alpine3.19 AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for linux-musl (Alpine)
RUN npx prisma generate

# Build frontend (Vite) and backend (tsup)
RUN npm run build

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:22-alpine3.19 AS runner
WORKDIR /app

# Install Chromium dependencies for Puppeteer (D-03)
# See: https://pptr.dev/troubleshooting#running-puppeteer-on-alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Environment for Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Create non-root user for security (D-05)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy production dependencies only (reinstall without devDeps)
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# Regenerate Prisma client for runtime (ensures platform match)
RUN npx prisma generate

# Copy built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port (D-17)
EXPOSE 3001

# Health check using wget (curl not in alpine by default)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:3001/api/health/db || exit 1

# Start server (D-16)
CMD ["node", "dist/server/index.js"]
