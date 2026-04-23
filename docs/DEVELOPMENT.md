<!-- generated-by: gsd-doc-writer -->
# Development Guide

This guide covers local development setup, build commands, code quality tools, and contribution workflows for NewsHub.

## Local Setup

### Prerequisites

Before starting, ensure you have:

- **Node.js >= 22** (check `package.json` engines field)
- **npm** (comes with Node.js)
- **Docker** (for PostgreSQL and Redis containers)
- **Git** (for version control)

### Initial Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHubitat
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the example environment file and configure required values:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` - Generate with `openssl rand -base64 32`
- At least one AI provider key (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`)
- Database and Redis URLs (defaults work for local Docker setup)

See [CONFIGURATION.md](CONFIGURATION.md) for full environment variable documentation.

4. **Start PostgreSQL and Redis**

```bash
docker compose up -d postgres redis
```

5. **Generate Prisma client and sync database schema**

```bash
npx prisma generate
npx prisma db push
```

6. **Seed initial data (optional)**

```bash
npm run seed
```

7. **Start development servers**

```bash
npm run dev
```

This starts both frontend (port 5173) and backend (port 3001) concurrently.

## Build Commands

All available npm scripts from `package.json`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend development servers concurrently |
| `npm run dev:frontend` | Start only frontend dev server (Vite, port 5173) |
| `npm run dev:backend` | Start only backend dev server (tsx watch mode, port 3001) |
| `npm run build` | Build both frontend and backend for production |
| `npm run build:frontend` | Build frontend only (Vite production build) |
| `npm run build:server` | Build backend only (tsup) |
| `npm run start` | Start production server (runs built backend) |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm run typecheck` | Run TypeScript compiler type checking (no emit) |
| `npm run preview` | Preview frontend production build locally |
| `npm run test` | Run Vitest unit tests in watch mode |
| `npm run test:run` | Run unit tests once (CI mode) |
| `npm run test:watch` | Run unit tests in watch mode (explicit) |
| `npm run test:coverage` | Run unit tests with coverage report (80% threshold enforced) |
| `npm run test:ui` | Run Vitest with interactive UI |
| `npm run test:e2e` | Run Playwright E2E tests (headless) |
| `npm run test:e2e:ui` | Run Playwright tests with interactive UI mode |
| `npm run test:e2e:headed` | Run Playwright tests with browser visible |
| `npm run screenshots` | Generate screenshots using Playwright |
| `npm run seed` | Run all seed scripts (badges + personas) |
| `npm run seed:badges` | Seed gamification badges only |
| `npm run seed:personas` | Seed AI personas only |
| `npm run seed:load-test` | Seed load test users for performance testing |
| `npm run load:smoke` | Run k6 smoke test |
| `npm run load:full` | Run k6 full load test |
| `npm run validate:ci` | Validate GitHub Actions workflow syntax |

## Code Style

### ESLint

**Configuration**: `eslint.config.js` (flat config format)

**Plugins**:
- `@eslint/js` - JavaScript recommended rules
- `typescript-eslint` - TypeScript support
- `eslint-plugin-react-hooks` - React Hooks linting
- `eslint-plugin-react-refresh` - React Fast Refresh validation

**Custom Rules**:
- Unused variables starting with underscore (`_`) are allowed
- Test files (`*.test.ts`, `*.spec.ts`) allow `any` types for mocks

**Run linting**:

```bash
npm run lint
```

ESLint is enforced in CI via the `lint` job in `.github/workflows/ci.yml`.

### TypeScript

**Configuration**: `tsconfig.json`

**Type checking** (no code emission, validation only):

```bash
npm run typecheck
```

TypeScript strict mode is enabled. Type checking is enforced in CI via the `typecheck` job.

### No Prettier Configuration

The project does not currently use Prettier or any other code formatter. Code style is enforced through ESLint rules only.

### No .editorconfig

The project does not have an `.editorconfig` file. Rely on ESLint for style consistency.

## Branch Conventions

- **Main branch**: `master` (deploy target for staging and production)
- **Branch naming**: No documented convention found. Use descriptive names (e.g., `feat/add-bookmarks`, `fix/auth-bug`, `refactor/cleanup-services`)

## PR Process

### Before Submitting a PR

1. **Run the validation pipeline locally**:

```bash
npm run typecheck && npm run test:run && npm run build
```

This ensures lint, type checking, tests, and build succeed before pushing.

2. **Ensure all tests pass**:

```bash
npm run test:coverage
```

Coverage must meet the 80% threshold configured in `vitest.config.ts`.

3. **Write or update tests** for new features or bug fixes. The project uses TDD (Test-Driven Development) as a core principle.

### Submitting the PR

1. Push your branch to the remote repository
2. Open a pull request against the `master` branch
3. CI will automatically run:
   - Lint check
   - Type checking
   - Unit tests with coverage (80% threshold)
   - Docker image build
   - E2E tests (Playwright)

All CI jobs must pass before merge.

### PR Review Checklist

Reviewers look for:

- [ ] Code follows ESLint rules
- [ ] TypeScript type checking passes
- [ ] Unit test coverage meets 80% threshold
- [ ] E2E tests cover critical user flows (if applicable)
- [ ] No hardcoded secrets or API keys
- [ ] Environment variables used for configuration
- [ ] Build succeeds without errors
- [ ] Docker image builds successfully (on `master` branch)

### CI Workflow

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on all pull requests and pushes to `master`:

1. **Lint** - ESLint validation
2. **Type Check** - TypeScript type validation
3. **Unit Tests** - Vitest with 80% coverage threshold (PostgreSQL + Redis services)
4. **Build** - Docker image build (pushed to `ghcr.io` on `master` branch only)
5. **E2E Tests** - Playwright end-to-end tests (depends on build)
6. **Deploy Staging** - Deploy to staging environment (on `master` branch only)
7. **Deploy Production** - Deploy to production environment (after staging succeeds)

## Database Development

### Prisma Workflow

1. **Edit schema**: Modify `prisma/schema.prisma`
2. **Generate client**: `npx prisma generate`
3. **Sync to database**: `npx prisma db push`
4. **Open database GUI**: `npx prisma studio` (opens on `localhost:5555`)

### Generated Client Location

Prisma generates the client to `src/generated/prisma/`. **Do not edit files in this directory** - they are auto-generated.

### Database Reset (Development Only)

```bash
docker compose down -v
docker compose up -d postgres
npx prisma db push
npm run seed
```

This destroys all data and recreates the database from scratch.

## Docker Development

### Local Docker Stack

```bash
docker compose up -d
```

This starts:
- **app** - NewsHub application container
- **postgres** - PostgreSQL database
- **redis** - Redis cache
- **prometheus** - Metrics scraping
- **grafana** - Dashboards (localhost:3000, admin/admin)
- **alertmanager** - Alert routing

### Rebuild After Code Changes

```bash
docker compose build app
docker compose up -d
```

### View Logs

```bash
docker compose logs -f app
```

### Check Service Health

```bash
docker compose ps
```

All services should show `healthy` or `running` status.

## Common Development Tasks

### Adding a New API Endpoint

1. Create route handler in `server/routes/`
2. Add route to `server/index.ts`
3. Write unit tests in `server/routes/*.test.ts`
4. Update `CLAUDE.md` API endpoints table
5. Run `npm run typecheck && npm run test:run`

### Adding a New React Component

1. Create component in `src/components/`
2. Write component tests in `src/components/*.test.tsx`
3. Import and use in page component
4. Run `npm run typecheck && npm run test:coverage`

### Adding a New News Source

Edit `server/config/sources.ts`:

```typescript
{
  id: 'source-id',
  name: 'Source Name',
  country: 'XX',
  region: 'usa',  // One of 13 supported regions
  language: 'en',
  bias: { political: 0, reliability: 8, ownership: 'private' },
  apiEndpoint: 'https://example.com/rss.xml',
  rateLimit: 100,
}
```

Restart backend to load new source.

### Updating Database Schema

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push`
4. Update seed scripts if needed (`prisma/seed*.ts`)
5. Run `npm run seed`

## Debugging

### Backend Debugging

Use `tsx watch` for hot reload during development:

```bash
npm run dev:backend
```

Logs appear in terminal. Add `console.log` statements for quick debugging (remove before committing).

### Frontend Debugging

```bash
npm run dev:frontend
```

Open browser DevTools. React Query DevTools are available in development mode.

### E2E Test Debugging

```bash
npx playwright test --debug
```

Opens Playwright Inspector with step-through debugging.

Interactive UI mode:

```bash
npm run test:e2e:ui
```

View last test report:

```bash
npx playwright show-report
```

## Performance Testing

### k6 Load Tests

```bash
npm run load:smoke    # Smoke test (1 VU, 30s)
npm run load:full     # Full load test (50 VUs, 5min)
```

Requires k6 CLI installed: `https://k6.io/docs/getting-started/installation/`

## Security Best Practices

1. **Never commit secrets** - Use `.env` for all API keys and sensitive values
2. **Validate all user input** - Use Zod schemas in API routes
3. **Use parameterized queries** - Prisma handles this automatically
4. **Review before commit** - Run `npm run typecheck && npm run test:run && npm run build`

See the project's global coding principles in `C:\Users\krsat\.claude\rules\security.md` for comprehensive security guidelines.

## Next Steps

- See [TESTING.md](TESTING.md) for detailed testing strategies
- See [CONFIGURATION.md](CONFIGURATION.md) for environment variable reference
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design overview
- See `CLAUDE.md` for comprehensive project documentation
