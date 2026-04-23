---
phase: 18-ci-cd-pipeline
plan: 02
subsystem: ci-cd
tags: [deployment, ssh, github-environments, staging, production]

requires: [ci-workflow, docker-build]
provides: [staging-deploy, production-deploy, approval-gate]
affects: [deployment-process, release-workflow]

tech-stack:
  added: [github-environments, ssh-deployment]

key-files:
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - decision: SSH deployment via appleboy/ssh-action
    rationale: Simple, reliable, works with existing docker-compose setup
  - decision: Environment-scoped secrets
    rationale: Prevents staging secrets from being used in production (and vice versa)
  - decision: Health check after deployment
    rationale: Ensures deployment succeeded before marking job complete
  - decision: Sequential staging → production
    rationale: Staging acts as final validation before production

requirements-completed:
  - CICD-03
  - CICD-04

duration: 5 min
completed: 2026-04-23
---

# Phase 18 Plan 02: SSH Deployment Jobs Summary

Added SSH-based deployment jobs with automatic staging deployment and manual production approval gate.

## What Was Built

### Deployment Jobs Added to Workflow

```
[build] ──► [e2e] ──► [deploy-staging] ──► [deploy-production]
                           │                      │
                           │                      └─ Requires approval
                           └─ Auto on main
```

**deploy-staging:**
- Triggers: Only on `main` branch (not PRs)
- Depends on: `build` and `e2e` jobs
- Environment: `staging` (no protection rules)
- Deployment: SSH → `docker compose pull && up -d --wait`
- Verification: `curl -f /api/health/db || exit 1`

**deploy-production:**
- Triggers: After staging succeeds
- Depends on: `deploy-staging`
- Environment: `production` (required reviewers)
- Deployment: Same SSH script as staging
- Approval: Pauses workflow until reviewer approves in GitHub UI

### GitHub Environments Configured

| Environment | Protection | Secrets |
|-------------|------------|---------|
| staging | None | STAGING_HOST, STAGING_USER, STAGING_SSH_KEY |
| production | Required reviewers | PRODUCTION_HOST, PRODUCTION_USER, PRODUCTION_SSH_KEY |

### Security Measures

- Environment-scoped secrets (staging job cannot access production secrets)
- SSH action pinned to commit SHA (not version tag)
- Health check prevents marking failed deployments as successful
- PRs never trigger deployment (main branch only)
- Production requires explicit human approval

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| Add deployment jobs to workflow | Done | 5822e0a |
| Configure GitHub Environments | Done | (manual UI) |

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Added deploy-staging and deploy-production jobs (+43 lines) |

## Verification Results

```
✓ Deployment jobs exist (deploy-staging, deploy-production)
✓ Environments configured (staging, production)
✓ Main branch condition present
✓ SSH action present (pinned to commit SHA)
✓ Docker compose commands present
✓ Health check present
✓ Production depends on staging
✓ SSH action uses commit SHA (not version tag)
```

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Ready for Plan 18-03: End-to-end pipeline verification with real PR and deployment test.
