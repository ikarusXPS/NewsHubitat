<!-- generated-by: gsd-doc-writer -->
# Contributing

Thank you for considering contributing to NewsHub! This document covers contributor onboarding, the day-to-day development workflow, and the quality bar we hold pull requests to.

NewsHub is a pnpm monorepo. All commands in this guide use `pnpm` — please do not substitute `npm` or `yarn`, since the lockfile (`pnpm-lock.yaml`) and workspace configuration (`pnpm-workspace.yaml`) require pnpm.

## Development Setup

See [README.md](README.md) for prerequisites and first-run instructions, and [CLAUDE.md](CLAUDE.md) for the canonical command list, tech stack, and architecture overview.

Quick start for local development:

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/ikarusXPS/NewsHubitat.git
   cd NewsHub
   pnpm install
   ```

2. **Start backing services** (PostgreSQL on 5433, Redis on 6379):
   ```bash
   docker compose up -d postgres redis
   ```

3. **Initialize the database and seed reference data**:
   ```bash
   cd apps/web && npx prisma generate && npx prisma db push && cd ../..
   pnpm seed
   ```

4. **Run the dev servers** (frontend on 5173, backend on 3001):
   ```bash
   pnpm dev
   ```

Configure environment variables in `apps/web/.env` — see [CLAUDE.md](CLAUDE.md) "Environment Variables" for the full list (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, AI provider keys, etc.).

## GSD Planning Workflow

NewsHub is driven by the GSD planning system. **Before starting a non-trivial change, read the planning state.**

- `.planning/STATE.md` — Current milestone, in-flight phase, and the Decisions log (read first)
- `.planning/ROADMAP.md` — Phase breakdown, dependencies, and goals
- `.planning/PROJECT.md` — Product vision and core value
- `.planning/phases/<NN-name>/` — Per-phase artifacts (`PLAN.md`, `RESEARCH.md`, `CONTEXT.md`, `SUMMARY.md`, `UAT.md`, `VERIFICATION.md`)

For new features (3+ files, architectural changes, API additions, or schema migrations), drive the work through `/gsd-plan-phase` and `/gsd-execute-phase` rather than ad-hoc edits. Append cross-cutting decisions to `STATE.md` — do not duplicate them into per-phase docs.

## Coding Standards

Contributors must follow these standards. All three checks are enforced in CI (`.github/workflows/ci.yml`) and required for merge.

- **ESLint** — TypeScript linting with React Hooks and React Refresh rules (config: `apps/web/eslint.config.js`).
  Run: `pnpm lint`
- **TypeScript** — Strict type checking across all workspace packages (TypeScript 6).
  Run: `pnpm typecheck`
- **Test coverage** — Vitest with thresholds enforced in `apps/web/vitest.config.ts`:
  statements 80%, lines 80%, functions 80%, **branches 75%**.
  Run: `pnpm test:coverage`

> **TODO — coverage waiver**: The branches threshold is temporarily set to 75% (target: 80%). When raising new code, prefer writing branch-covering tests so we can restore the 80/80/80/80 baseline.

### Project code style

These patterns are non-negotiable in production code — see [CLAUDE.md](CLAUDE.md) "Key Patterns" for context and rationale:

- **Immutability** — Never mutate state, props, or arguments. Use spread / `structuredClone`.
- **Query-key synchronization** — Components sharing TanStack Query data MUST use identical `queryKey` arrays and `staleTime`/`refetchInterval` values.
- **Multi-provider AI fallback** — Route AI calls through `aiService.ts`; do not hard-code a single provider.
- **Graceful degradation** — Treat external dependencies (Redis, AI, translation, Stripe) as optional. Return `null` or fallback data on error rather than breaking the page.
- **Class composition** — Use the `cn()` utility from `apps/web/src/lib/utils.ts` for conditional Tailwind classes.
- **Secrets** — Read only via `process.env.*`; throw on startup if a required key is missing. Never commit `.env` files.

## Pre-Submit Checklist

Run the full local pipeline before opening a PR:

```bash
pnpm typecheck && pnpm test:run && pnpm build && pnpm test:e2e
```

If any step fails locally, fix it before pushing — CI will reject the same failure.

## Branch & Commit Conventions

- **Branch from `master`**. Use a conventional prefix matching the change type:
  `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `perf/`, `ci/`.
  Example: `feat/event-map-clustering`, `fix/auth-token-refresh`.

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):

  ```
  <type>: <description>

  <optional body>
  ```

  Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
  Keep the subject under 72 characters and use the imperative mood ("add", not "added").

## Pull Request Guidelines

Open PRs against `master`. The branch is **protected** — direct pushes are blocked, and admin enforcement is enabled. Required status checks before a merge is allowed:

1. **Lint** — `pnpm lint`
2. **Type Check** — `pnpm typecheck`
3. **Unit Tests** — `pnpm test:coverage` (Vitest with the thresholds above)
4. **Build Docker Image** — production image build
5. **E2E Tests** — Playwright suite against the dev stack

A `Bundle Analysis` job also runs but is non-blocking (250KB warning threshold, CI annotation only).

### PR description template

Structure your PR body with two sections — this matches the format used across recent PRs:

```markdown
## Summary
- What changed and why (1-3 bullets)
- Link the related phase plan: `.planning/phases/<NN-name>/PLAN.md` if applicable

## Test plan
- [ ] Unit tests added/updated
- [ ] E2E coverage for user-facing flows
- [ ] `pnpm typecheck && pnpm test:run && pnpm build` green locally
- [ ] Manual verification steps (if any)
```

### Reviewer expectations

Reviewers will check:

- Spec compliance — the PR matches the approved phase `PLAN.md` (if one exists)
- Adherence to the project code style listed above
- Test coverage — new logic is exercised, branches are covered
- Documentation — `CLAUDE.md`, `README.md`, or `.planning/STATE.md` updated when behavior changes
- Security — no hardcoded secrets, validated inputs at system boundaries, parameterized DB queries, sanitized HTML
- No breaking API or schema changes without prior discussion in `.planning/STATE.md`

Address review feedback with follow-up commits (do not force-push history that has already been reviewed).

## Testing

| Suite | Command | Notes |
|-------|---------|-------|
| Unit (watch) | `pnpm test` | Vitest watch mode |
| Unit (CI) | `pnpm test:run` | Single run, no watch |
| Coverage | `pnpm test:coverage` | Fails below thresholds in `apps/web/vitest.config.ts` |
| E2E (headless) | `pnpm test:e2e` | Playwright against dev servers |
| E2E (UI) | `pnpm test:e2e:ui` | Interactive Playwright UI |
| Single unit file | `pnpm test -- apps/web/src/lib/utils.test.ts` | Path-scoped run |
| Single E2E file | `cd apps/web && npx playwright test e2e/auth.spec.ts` | Project-scoped run |

See [CLAUDE.md](CLAUDE.md) "E2E Testing Structure" for the authenticated vs. unauthenticated Playwright project layout.

## Issue Reporting

Open issues at https://github.com/ikarusXPS/NewsHubitat/issues.

For bug reports, please include:

- **Steps to reproduce** — minimal step-by-step instructions
- **Expected behavior** — what you thought would happen
- **Actual behavior** — what actually happened (paste error output / stack traces)
- **Environment** — OS, Node.js version (`node --version`), pnpm version, browser if relevant
- **Screenshots or recordings** — for UI bugs

For feature requests:

- **Use case** — the problem you are trying to solve
- **Proposed solution** — how it should behave
- **Alternatives** — other approaches you considered

## License

By contributing to NewsHub, you agree that your contributions will be licensed under the MIT License.
