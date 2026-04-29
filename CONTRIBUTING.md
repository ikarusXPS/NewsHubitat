<!-- generated-by: gsd-doc-writer -->
# Contributing

Thank you for considering contributing to NewsHub! This document provides guidelines for contributing to the project.

## Development Setup

See [README.md](README.md) for prerequisites and first-run instructions. For local development setup, you'll need:

1. **Clone and Install**:
```bash
git clone https://github.com/ikarusXPS/NewsHubitat.git
cd NewsHub
npm install
```

2. **Start Services**:
```bash
docker compose up -d postgres redis
```

3. **Initialize Database**:
```bash
npx prisma generate
npx prisma db push
npm run seed
```

4. **Start Development Server**:
```bash
npm run dev
```

Access the application at `http://localhost:5173` (frontend) and `http://localhost:3001` (backend).

## Coding Standards

Contributors must follow these linting and formatting standards:

- **ESLint** — TypeScript linting with React Hooks rules and React Refresh (config: `eslint.config.js`)
  - Run: `npm run lint`
  - Enforced in CI via `.github/workflows/ci.yml` lint job
- **TypeScript** — Strict type checking required (TypeScript 6)
  - Run: `npm run typecheck`
  - Enforced in CI via typecheck job
- **Test Coverage** — 80% minimum coverage enforced via Vitest
  - Run: `npm run test:coverage`
  - Enforced in CI via test job with coverage threshold

All three checks must pass before submitting a pull request.

## Pull Request Guidelines

When submitting a pull request:

- **Branch Naming**: Use descriptive branch names with conventional prefixes (`feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`)
- **Commit Messages**: Follow conventional commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `ci:`)
- **Tests Required**: Write unit tests for new features (maintain 80%+ coverage)
- **Quality Checks**: Run `npm run typecheck && npm run lint && npm run test:run` before committing
- **Build Verification**: Ensure `npm run build` succeeds
- **E2E Tests**: Run `npm run test:e2e` for user-facing changes

The CI pipeline (`.github/workflows/ci.yml`) runs the following checks on all pull requests:

1. **Lint** — ESLint validation
2. **Type Check** — TypeScript compilation
3. **Unit Tests** — Vitest with coverage (80% threshold)
4. **Build** — Frontend and backend build verification
5. **E2E Tests** — Playwright tests for critical user flows

All checks must pass before a PR can be merged.

## Issue Reporting

To report bugs or request features, open a GitHub issue at: https://github.com/ikarusXPS/NewsHubitat/issues

When reporting bugs, please include:

- **Steps to reproduce** — Clear step-by-step instructions
- **Expected behavior** — What should happen
- **Actual behavior** — What actually happened
- **Environment** — OS, Node.js version, browser (if frontend bug)
- **Screenshots** — If applicable

For feature requests, describe:

- **Use case** — What problem does this solve?
- **Proposed solution** — How should it work?
- **Alternatives** — Other solutions you've considered

## Development Workflow

1. Fork the repository and create a feature branch from `master`
2. Make your changes following the coding standards
3. Write tests (unit tests with Vitest, E2E tests with Playwright if needed)
4. Run quality checks: `npm run typecheck && npm run lint && npm run test:run`
5. Commit with conventional commits format
6. Push to your fork and create a pull request to `master`
7. Address review feedback and ensure CI passes

## Testing

- **Unit Tests**: `npm run test` (Vitest with 80% coverage threshold)
- **E2E Tests**: `npm run test:e2e` (Playwright headless)
- **Interactive E2E**: `npm run test:e2e:ui` (Playwright UI mode)
- **Coverage Report**: `npm run test:coverage`

See [CLAUDE.md](CLAUDE.md) for detailed testing documentation.

## Code Review Process

All pull requests require review before merging. Reviewers will check for:

- Code quality and adherence to coding standards
- Test coverage and test quality
- Documentation updates if needed
- No breaking changes without discussion
- Security concerns (no hardcoded secrets, input validation, etc.)

## License

By contributing to NewsHub, you agree that your contributions will be licensed under the MIT License.
