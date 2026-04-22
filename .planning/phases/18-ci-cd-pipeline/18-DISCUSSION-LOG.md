# Phase 18: CI/CD Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 18-ci-cd-pipeline
**Areas discussed:** Workflow Architecture, Container Registry, Deployment Strategy, Test & Quality Gates

---

## Workflow Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single workflow (Recommended) | One ci.yml with jobs for lint, test, build, push, deploy. Simpler to maintain, clear dependency chain. | ✓ |
| Separate workflows | ci.yml for tests, deploy.yml for deployments. More modular but more files to maintain. | |
| Reusable workflows | Shared workflow templates in .github/workflows. Good for multiple repos but overkill for single project. | |

**User's choice:** Single workflow (Recommended)
**Notes:** User wants simplicity and clear dependency chain

---

| Option | Description | Selected |
|--------|-------------|----------|
| PR + main push (Recommended) | Full pipeline on pull requests, same pipeline on merge to main. Standard GitFlow approach. | ✓ |
| PR only, manual deploy | Tests on PR, deployment is always manual trigger via workflow_dispatch. | |
| All branches | Run CI on all branch pushes. More testing but higher runner costs. | |

**User's choice:** PR + main push (Recommended)
**Notes:** Standard GitFlow approach

---

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL + Redis services (Recommended) | Full integration test environment matching production. Your tests already expect these. | ✓ |
| Mocked services only | Run with in-memory mocks. Faster but less realistic. | |
| Claude decides | Let planning decide based on existing test setup | |

**User's choice:** PostgreSQL + Redis services (Recommended)
**Notes:** Match production environment for reliable tests

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with Playwright (Recommended) | Run full E2E suite. You have 62 Playwright tests. Uses GitHub hosted runner with browser. | ✓ |
| Unit tests only in CI | Skip E2E in CI, run manually. Faster CI but less coverage. | |
| E2E on main only | Full suite on main, unit tests only on PRs. Balance speed and coverage. | |

**User's choice:** Yes, with Playwright (Recommended)
**Notes:** Full E2E suite for comprehensive coverage

---

| Option | Description | Selected |
|--------|-------------|----------|
| Linear chain (Recommended) | lint → typecheck → unit tests → build → e2e → push → deploy. Clear flow, fail fast. | ✓ |
| Parallel where possible | lint, typecheck, unit run parallel, then build, then e2e, push, deploy. Faster but more complex. | |
| Claude decides | Let planning optimize based on job durations | |

**User's choice:** Linear chain (Recommended)
**Notes:** Clear flow, fail fast approach

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cache node_modules + npm (Recommended) | Use actions/cache for ~/.npm and node_modules. Speeds up subsequent runs significantly. | ✓ |
| No caching | Fresh install every run. Slower but simpler, no cache invalidation issues. | |
| Claude decides | Let planning decide caching strategy | |

**User's choice:** Cache node_modules + npm (Recommended)
**Notes:** Optimize CI speed with caching

---

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub hosted ubuntu-latest (Recommended) | Standard runner, 2-core, 7GB RAM. Free for public repos, included minutes for private. | ✓ |
| Self-hosted runner | Your own infrastructure. More control but requires setup and maintenance. | |
| Larger GitHub runner | 4-core or 8-core. Faster but costs more for private repos. | |

**User's choice:** GitHub hosted ubuntu-latest (Recommended)
**Notes:** Standard runner, cost-effective

---

## Container Registry

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Container Registry (Recommended) | ghcr.io — native to GitHub, free storage, seamless Actions auth via GITHUB_TOKEN | ✓ |
| Docker Hub | docker.io — industry standard, free tier has rate limits, needs separate credentials | |
| AWS ECR | AWS-native, good if deploying to AWS. Requires IAM setup. | |

**User's choice:** GitHub Container Registry (Recommended)
**Notes:** Native to GitHub, seamless authentication

---

| Option | Description | Selected |
|--------|-------------|----------|
| SHA + latest + branch (Recommended) | Tag with commit SHA, update :latest, add branch name (e.g., :main). Full traceability. | ✓ |
| Semantic versioning only | Tag with vX.Y.Z from git tags. Clean but requires explicit version tagging. | |
| SHA only | Just the commit SHA. Minimal but requires looking up commits. | |

**User's choice:** SHA + latest + branch (Recommended)
**Notes:** Full traceability with multiple tags

---

## Deployment Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| SSH + docker compose (Recommended) | SSH into server, docker compose pull && docker compose up -d. Simple, works with existing compose setup. | ✓ |
| Docker context remote | Use docker context to run commands on remote host. No SSH script needed but requires context setup. | |
| Kubernetes | Deploy to K8s cluster. More complex but better for scale. Marked out of scope in requirements. | |

**User's choice:** SSH + docker compose (Recommended)
**Notes:** Works with existing docker-compose.yml

---

| Option | Description | Selected |
|--------|-------------|----------|
| Separate servers (Recommended) | Different SSH hosts for staging vs prod. Each has its own .env and database. Clean isolation. | ✓ |
| Same server, different compose projects | Run staging and prod on same host with different project names/ports. Cheaper but less isolated. | |
| Claude decides | Let planning decide based on your infrastructure | |

**User's choice:** Separate servers (Recommended)
**Notes:** Clean isolation between environments

---

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Environments protection (Recommended) | Use GitHub Environments with required reviewers. Native UI, audit trail, works with workflow. | ✓ |
| Manual workflow dispatch | Separate workflow triggered manually to deploy to prod. More control but extra steps. | |
| PR-based approval | Deploy to prod requires a separate PR to a deploy branch. Git-based audit trail. | |

**User's choice:** GitHub Environments protection (Recommended)
**Notes:** Native GitHub UI for approval workflow

---

## Test & Quality Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Full suite (Recommended) | Lint + TypeCheck + Unit Tests + E2E Tests + Build. All must pass. Matches your existing quality bar. | ✓ |
| Core only | Lint + TypeCheck + Unit Tests. Skip E2E for faster PR feedback. | |
| Claude decides | Let planning decide based on job duration estimates | |

**User's choice:** Full suite (Recommended)
**Notes:** Maintain existing quality bar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, 80% threshold (Recommended) | Fail CI if coverage drops below 80%. Matches your existing vitest.config.ts threshold. | ✓ |
| Coverage report only | Generate coverage report but don't fail. Track trend without blocking. | |
| No coverage in CI | Skip coverage analysis to speed up CI. | |

**User's choice:** Yes, 80% threshold (Recommended)
**Notes:** Enforce existing 80% threshold

---

## Claude's Discretion

- Exact GitHub Actions syntax and job naming conventions
- Cache key patterns and invalidation strategy
- SSH deployment script structure
- Playwright browser installation approach in CI
- Environment variable naming in GitHub Secrets

## Deferred Ideas

None — discussion stayed within phase scope
