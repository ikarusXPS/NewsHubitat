---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: high
labels: [infra, deployment, staging, ci]
related_ci: 25375817908
---

# Provision staging server and re-enable Deploy to Staging job

## Why

Phase 40 unblocking surfaced that `Deploy to Staging` in
`.github/workflows/ci.yml` has been failing on every push to master, going
back to before this milestone. Root cause is not code — it is missing
infrastructure: the GitHub Actions secrets `STAGING_HOST`, `STAGING_USER`,
`STAGING_SSH_KEY`, and `STAGING_URL` were never populated with real values.
Run `25375817908` deploy log shows literally `dial tcp: lookup SSH hostname
(e.g.: no such host`, meaning `STAGING_HOST` contains the placeholder text
`SSH hostname (e.g.:` instead of an actual host.

The application itself is deploy-ready: Lint, Type Check, Unit Tests, Build
Docker Image, E2E Tests, Source Bias Coverage, Bundle Analysis are all
green on master. The deploy job was disabled (`if: false` on `deploy-staging`)
to clear the persistent red checkmark; `lighthouse` and `deploy-production`
cascade-skip via their `needs:` dependency.

## What

Choose a staging platform, provision it, configure secrets, re-enable the job.

### Option A — Hetzner VPS + Coolify (matches current SSH workflow as-is)

1. Create a Hetzner Cloud account; provision a CX11 (€4.51/mo) or CPX11
   (€4.79/mo) Ubuntu 24.04 VPS in Falkenstein/Helsinki/Nuremberg.
2. Install Coolify (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash`)
   OR install Docker + Docker Compose directly.
3. Generate an SSH keypair on the VPS for GitHub Actions:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N ""
   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_actions   # copy the private key
   ```
4. Clone the repo to `/app/newshub` on the VPS, set up `.env` with secrets
   (DATABASE_URL pointing to a managed Postgres or local Postgres container,
   REDIS_URL, JWT_SECRET 32+ chars, AI keys, etc.).
5. Configure GitHub Actions secrets at
   `https://github.com/ikarusXPS/NewsHubitat/settings/secrets/actions`:
   - `STAGING_HOST` = VPS public IP or domain
   - `STAGING_USER` = SSH username (typically `root` or `deploy`)
   - `STAGING_SSH_KEY` = full content of `~/.ssh/github_actions` private key
   - `STAGING_URL` = `https://staging.newshub.yourdomain.com` (or IP if no domain yet)
6. Re-enable the deploy job by removing `if: false` and restoring
   `if: github.ref == 'refs/heads/master'` on `deploy-staging` in
   `.github/workflows/ci.yml` (lines around 384–388).
7. Push a no-op commit to master and verify Deploy to Staging goes green +
   the `/api/health/db` smoke check inside the deploy script passes.

### Option B — Render or Railway (rewrite deploy job, no SSH)

1. Create Render/Railway account; create a Web Service from the GitHub repo.
2. Set environment variables via the platform UI (DATABASE_URL, REDIS_URL,
   JWT_SECRET, AI keys, ...).
3. Replace the `Deploy via SSH` step in `deploy-staging` with the platform's
   deploy hook — e.g.:
   ```yaml
   - name: Trigger Render deploy
     run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
   ```
4. Replace `STAGING_HOST/USER/SSH_KEY` secrets with `RENDER_DEPLOY_HOOK_URL`
   (or Railway equivalent), keep `STAGING_URL` so Lighthouse can hit it.
5. Re-enable the deploy job (`if: github.ref == 'refs/heads/master'`).

### Option C — Fly.io (rewrite deploy job, token-based)

1. `flyctl launch` against the repo to scaffold `fly.toml`.
2. Replace deploy step with:
   ```yaml
   - uses: superfly/flyctl-actions/setup-flyctl@master
   - run: flyctl deploy --remote-only
     env:
       FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
   ```
3. Update secrets accordingly. Re-enable the deploy job.

## Acceptance

- [ ] One option chosen and documented in `.planning/STATE.md` decisions log.
- [ ] Staging environment is reachable via HTTPS at the URL stored in
      `STAGING_URL`.
- [ ] `Deploy to Staging` job re-enabled in `.github/workflows/ci.yml`
      (the `if: false` block removed).
- [ ] A pushed commit to master shows green checkmarks all the way through
      `Lighthouse CI` (the existing Lighthouse 90+ thresholds for
      performance / accessibility / best-practices / SEO must pass against
      the real staging URL).
- [ ] `Deploy to Production` remains disabled or is gated behind manual
      approval until the production environment is also provisioned (separate
      todo).

## Out of scope

- Production deployment — separate todo once staging is verified.
- Database migration strategy across environments — the deploy script
  currently runs `docker compose pull && up -d --wait`; Prisma migrations
  on staging should be addressed before first real deploy (see
  `.planning/todos/pending/` for migration-policy todos if any).
- Domain registration / DNS — out of scope for the GSD planning phase;
  user-side decision.
- Backup / restore policy for staging Postgres.
