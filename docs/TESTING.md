<!-- generated-by: gsd-doc-writer -->
# Testing

This document describes the testing framework, test execution, and coverage requirements for NewsHub.

## Test Framework and Setup

NewsHub uses two complementary testing frameworks:

### Unit Testing: Vitest
- **Framework**: Vitest v4.0.18
- **Test Runner**: `@vitest/coverage-v8` for coverage reporting
- **Environment**: jsdom (simulates browser environment)
- **Setup File**: `src/test/setup.ts`

The setup file configures:
- JWT_SECRET environment variable for testing
- `@testing-library/jest-dom` matchers
- Automatic cleanup after each test
- Browser API mocks (matchMedia, ResizeObserver, IntersectionObserver)

### E2E Testing: Playwright
- **Framework**: Playwright v1.58.2
- **Test Directory**: `e2e/`
- **Browser**: Chromium (Desktop Chrome)
- **Projects**: Two configurations (unauthenticated and authenticated)

Setup requirements before running E2E tests:
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start PostgreSQL
docker compose up -d

# Push database schema
npx prisma db push

# Seed test data (badges and personas)
npm run seed
```

## Running Tests

### Unit Tests

Run the full unit test suite:
```bash
npm run test
```

Run tests once (CI mode):
```bash
npm run test:run
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage report:
```bash
npm run test:coverage
```

Run tests with interactive UI:
```bash
npm run test:ui
```

Run a single test file:
```bash
npm run test -- src/lib/utils.test.ts
```

Run tests matching a pattern:
```bash
npm run test -- -t "mapCentering"
```

### E2E Tests

Run all E2E tests (headless):
```bash
npm run test:e2e
```

Run E2E tests with browser visible:
```bash
npm run test:e2e:headed
```

Run E2E tests in interactive UI mode:
```bash
npm run test:e2e:ui
```

Run a single E2E test file:
```bash
npx playwright test e2e/auth.spec.ts
```

Generate screenshots:
```bash
npm run screenshots
```

Debug E2E tests:
```bash
npx playwright test --debug
```

View last test report:
```bash
npx playwright show-report
```

## Writing New Tests

### Unit Test File Naming
Unit tests use the `*.test.ts` pattern and are co-located with source files:
- Frontend: `src/**/*.test.ts` (e.g., `src/lib/utils.test.ts`)
- Backend: `server/**/*.test.ts` (e.g., `server/services/authService.test.ts`)

### E2E Test File Naming
E2E tests use the `*.spec.ts` pattern in the `e2e/` directory:
- `e2e/auth.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/profile.spec.ts`

### Test Helpers
- **Unit Tests**: `src/test/setup.ts` provides global test configuration and mocks
- **E2E Tests**: `e2e/auth.setup.ts` creates authenticated user state for auth-required tests

### Authentication in E2E Tests
Playwright splits tests into two projects:

**Unauthenticated tests** (chromium project):
- Run without authentication state
- Examples: `auth.spec.ts`, `dashboard.spec.ts`, `navigation.spec.ts`, `bookmarks.spec.ts`

**Authenticated tests** (chromium-auth project):
- Use stored authentication state from `playwright/.auth/user.json`
- Require the setup project to run first
- Examples: `profile.spec.ts`, `settings.spec.ts`, `history.spec.ts`

To write an authenticated test, add to `playwright.config.ts`:
```typescript
testMatch: ['**/your-test.spec.ts']
```
in the `chromium-auth` project configuration.

## Coverage Requirements

Unit tests enforce an 80% coverage threshold for all metrics:

| Coverage Type | Threshold |
|--------------|-----------|
| Statements   | 80%       |
| Branches     | 80%       |
| Functions    | 80%       |
| Lines        | 80%       |

Coverage is provided by `@vitest/coverage-v8` with the following exclusions:
- `node_modules/`
- `src/test/` (test utilities)
- `**/*.d.ts` (TypeScript declarations)
- `**/*.config.*` (configuration files)
- `**/types/**` (type definitions)

To view the coverage report after running tests:
```bash
npm run test:coverage
# Report available at coverage/index.html
```

Failing to meet the 80% threshold will cause the build to fail.

## CI Integration

Tests run in GitHub Actions CI pipeline (`.github/workflows/ci.yml`):

### Unit Tests Job
- **Trigger**: Pull requests and pushes to master
- **Services**: PostgreSQL 17 and Redis 7.4-alpine
- **Command**: `npm run test:coverage`
- **Environment Variables**:
  - `DATABASE_URL=postgresql://newshub:test@localhost:5432/newshub`
  - `REDIS_URL=redis://localhost:6379`
  - `JWT_SECRET=test-jwt-secret-for-ci`

### E2E Tests Job
- **Trigger**: After successful build
- **Services**: PostgreSQL 17 and Redis 7.4-alpine
- **Browser**: Chromium only (installed via `npx playwright install --with-deps chromium`)
- **Command**: `npx playwright test --reporter=html`
- **Timeout**: 30 minutes
- **Seed Data**: Runs `npm run seed` before tests
- **Artifacts**: Uploads Playwright HTML report (retained for 7 days)

Both jobs include database health checks and Prisma schema synchronization via `npx prisma db push`.

## Performance Configuration

### Vitest
- **Pool**: `forks` (isolated process per test file)
- **Timeout**: 10 seconds per test
- **Parallel Execution**: Enabled by default

### Playwright
- **Parallel Execution**: Fully parallel (`fullyParallel: true`)
- **Workers**: 4 workers in CI, undefined (CPU-based) locally
- **Retries**: 1 retry in CI, 0 retries locally
- **Timeouts**:
  - Test timeout: 30 seconds
  - Expect timeout: 10 seconds
  - Action timeout: 10 seconds
  - Navigation timeout: 20 seconds
- **Web Server Timeout**: 120 seconds (for dev server startup)

## Load Testing

NewsHub includes k6 load tests for performance benchmarking:

```bash
# Smoke test (minimal load)
npm run load:smoke

# Full load test
npm run load:full
```

Load test configuration is located in `k6/load-test.js`.
