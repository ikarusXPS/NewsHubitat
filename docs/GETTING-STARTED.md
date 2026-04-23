<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you through setting up NewsHub for local development, from installing prerequisites to running your first development server.

## Prerequisites

Before installing NewsHub, ensure you have the following installed on your system:

- **Node.js**: >= 22.0.0 (specified in Dockerfile and CI workflow)
- **npm**: Included with Node.js (package manager)
- **PostgreSQL**: 17 (via Docker recommended, see Installation Steps)
- **Redis**: 7.4-alpine (optional, enables caching and rate limiting)
- **Docker**: Latest version (for database, Redis, and monitoring stack)
- **Git**: For cloning the repository

**Optional Tools:**
- **Docker Compose**: Included with Docker Desktop (for orchestrating services)

## Installation Steps

Follow these steps to clone the repository and install all dependencies:

1. **Clone the repository:**

```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
```

2. **Install Node.js dependencies:**

```bash
npm install
```

**Note:** The CI workflow uses `npm ci --legacy-peer-deps` for deterministic builds. The `--legacy-peer-deps` flag resolves peer dependency conflicts with vite-plugin-pwa and Vite 8.

3. **Start PostgreSQL and Redis containers:**

```bash
docker compose up -d postgres redis
```

This starts PostgreSQL on port 5433 (mapped from container port 5432) and Redis on port 6379.

4. **Configure environment variables:**

Copy the example environment file and edit it with your configuration:

```bash
cp .env.example .env
```

**Required configuration in `.env`:**

- `JWT_SECRET`: Minimum 32 characters (generate with `openssl rand -base64 32`)
- At least one AI provider key:
  - `OPENROUTER_API_KEY` (recommended, free tier with multiple models)
  - `GEMINI_API_KEY` (free tier, 1500 requests/day)
  - `ANTHROPIC_API_KEY` (premium fallback)

**Optional but recommended:**

- `DEEPL_API_KEY`: Translation service (500k chars/month free tier)
- `SENDGRID_API_KEY`: Email verification and digests (60-day free trial)
- `REDIS_URL`: Set to `redis://localhost:6379` if using the Docker Redis container

5. **Initialize the database:**

Generate the Prisma client, sync the database schema, and seed initial data:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

The `npm run seed` command runs all seed scripts (badges and AI personas). You can run them individually:
- `npm run seed:badges` - Gamification badges only
- `npm run seed:personas` - AI personas only (8 built-in personalities)

## First Run

Start the development server with a single command:

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) concurrently:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

**Alternative: Run servers separately**

If you need to run the frontend and backend in separate terminal windows:

```bash
# Terminal 1: Frontend only
npm run dev:frontend

# Terminal 2: Backend only
npm run dev:backend
```

**Verify the application is running:**

1. Open your browser to http://localhost:5173
2. The NewsHub dashboard should load with the 3D globe view
3. Check backend health: http://localhost:3001/api/health (should return JSON with `status: "ok"`)

## Common Setup Issues

### Issue 1: Missing Environment Variables

**Symptom:** Server fails to start with error: `JWT_SECRET not configured` or `No AI provider configured`

**Solution:**
1. Verify `.env` file exists in project root
2. Set `JWT_SECRET` to a secure random string (minimum 32 characters):
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```
3. Configure at least one AI provider (see `.env.example` for API key instructions)

### Issue 2: Port Already in Use

**Symptom:** Error: `EADDRINUSE: address already in use :::3001` or `:::5173`

**Solution:**
1. Check which process is using the port:
   ```bash
   # Linux/macOS
   lsof -i :3001
   lsof -i :5173

   # Windows
   netstat -ano | findstr :3001
   netstat -ano | findstr :5173
   ```
2. Stop the conflicting process or change the port in `.env`:
   ```bash
   PORT=3002  # Backend port
   # Frontend port: edit vite.config.ts server.port
   ```

### Issue 3: PostgreSQL Connection Failed

**Symptom:** `Error: connect ECONNREFUSED ::1:5433` or Prisma client errors

**Solution:**
1. Verify PostgreSQL container is running:
   ```bash
   docker compose ps postgres
   ```
2. If not running, start it:
   ```bash
   docker compose up -d postgres
   ```
3. Check health status (should show "healthy"):
   ```bash
   docker compose ps postgres | grep healthy
   ```
4. Verify `DATABASE_URL` in `.env` matches the Docker Compose configuration:
   ```bash
   DATABASE_URL="postgresql://newshub:newshub_dev@localhost:5433/newshub?schema=public"
   ```

### Issue 4: Prisma Client Not Generated

**Symptom:** TypeScript errors about `@prisma/client` or missing Prisma types

**Solution:**
1. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
2. If errors persist, delete the generated client and regenerate:
   ```bash
   rm -rf src/generated/prisma
   npx prisma generate
   ```

### Issue 5: Redis Connection Warnings

**Symptom:** Console warnings about Redis connection failed (non-fatal)

**Solution:**

Redis is optional. The application gracefully degrades to in-memory fallback. To enable Redis:
1. Start the Redis container:
   ```bash
   docker compose up -d redis
   ```
2. Set `REDIS_URL` in `.env`:
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

### Issue 6: Node.js Version Mismatch

**Symptom:** Build errors or dependency installation failures related to Node.js version

**Solution:**
1. Check your Node.js version:
   ```bash
   node --version
   ```
2. NewsHub requires Node.js >= 22.0.0 (specified in Dockerfile and CI workflow)
3. Install Node.js 22 using nvm:
   ```bash
   nvm install 22
   nvm use 22
   ```
4. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Next Steps

Once the development server is running successfully:

- **Development Workflow**: See [docs/DEVELOPMENT.md](DEVELOPMENT.md) for build commands, code style, and PR guidelines
- **Testing**: See [docs/TESTING.md](TESTING.md) for running unit tests (Vitest) and E2E tests (Playwright)
- **Configuration**: See [docs/CONFIGURATION.md](CONFIGURATION.md) for detailed environment variable documentation
- **Architecture**: See [docs/ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design and component structure
- **Project Guide**: See [CLAUDE.md](../CLAUDE.md) for comprehensive developer documentation, including tech stack, API endpoints, and common patterns

**Quick verification checklist before development:**

- [ ] `npm run dev` starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend health check passes: http://localhost:3001/api/health
- [ ] PostgreSQL container is healthy: `docker compose ps postgres`
- [ ] Database schema is synced: `npx prisma db push` (no changes expected)
- [ ] At least one AI provider is configured in `.env`
