---
status: pending
phase: 40-content-expansion
created: 2026-05-05
priority: high
labels: [infra, deployment, production, ci]
related_ci: 25375817908
---

# Provision production server and enable single-env deploy

## Why

NewsHub is pre-launch with no paying users yet. A two-tier staging+production
setup adds operational tax (double the secrets, env vars, seed data, monthly
hosting cost) without proportional value at this stage — "production kaputt"
and "staging kaputt" are equally low-impact when blast radius is one
developer. Per the call on 2026-05-05, the plan is **single environment,
deployed directly to production** until paying-user volume justifies a
dedicated staging tier.

The existing `.github/workflows/ci.yml` has separate `deploy-staging` and
`deploy-production` jobs from an earlier two-tier design. `deploy-staging` is
currently disabled (`if: false`) because the SSH secrets are placeholder
values (run `25375817908` confirmed this — `STAGING_HOST` literally contains
the string `SSH hostname (e.g.:`). `deploy-production` is gated behind
`needs: deploy-staging`, so it cascade-skips today.

## What

Pick a host, provision it, populate `PRODUCTION_*` secrets, then either
(a) wire `deploy-production` directly to `[build, e2e]` and remove the
`deploy-staging` dependency, or (b) keep the existing two-job structure but
treat `deploy-staging` as a no-op pass-through. Option (a) is cleaner.

### Option A — Hetzner VPS + Coolify (simplest, matches existing SSH workflow)

1. Hetzner Cloud → CX11 (€4.51/mo) or CPX11 (€4.79/mo) Ubuntu 24.04, region
   Falkenstein/Helsinki/Nuremberg.
2. SSH in, install Docker + Docker Compose. Optionally Coolify on top
   (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash`).
3. On the VPS:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N ""
   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_actions   # copy private key for the GH secret
   ```
4. Clone the repo to `/app/newshub`, create `.env` with real secrets
   (DATABASE_URL → managed Postgres or a sibling postgres container,
   REDIS_URL, JWT_SECRET ≥ 32 chars, all AI/translation/email/Stripe keys).
5. GitHub repo settings → Secrets and variables → Actions, populate:
   - `PRODUCTION_HOST` = VPS IP or hostname
   - `PRODUCTION_USER` = SSH username
   - `PRODUCTION_SSH_KEY` = full private key content
   - `STAGING_URL` = `https://<your-domain>` — Lighthouse uses this name; we
     just point it at the prod URL since there's no staging
6. Edit `.github/workflows/ci.yml`:
   - Remove the `deploy-staging` job entirely (or keep it `if: false` as a
     placeholder for later)
   - Change `deploy-production` from `needs: deploy-staging` to
     `needs: [build, e2e]`
   - Add `if: github.ref == 'refs/heads/master'` to `deploy-production`
   - Change `lighthouse` from `needs: [deploy-staging]` to
     `needs: [deploy-production]` so perf checks run against prod
     post-deploy
7. Push a no-op commit; verify Build Docker → E2E → Deploy to Production →
   Lighthouse all go green.

### Option B — Render or Railway (no SSH, deploy webhook)

1. Create platform account; new Web Service from GitHub repo
   (`ikarusXPS/NewsHubitat`, branch `master`, Dockerfile build).
2. Set env vars via the platform UI.
3. Replace the SSH step in `deploy-production` with the platform's deploy
   trigger (Render: `curl -X POST $RENDER_DEPLOY_HOOK_URL`; Railway:
   `railway up`).
4. Same workflow re-wiring as Option A step 6.

### Option C — Fly.io (token-based)

1. `flyctl launch` locally to scaffold `fly.toml`.
2. Replace SSH step with:
   ```yaml
   - uses: superfly/flyctl-actions/setup-flyctl@master
   - run: flyctl deploy --remote-only
     env:
       FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
   ```
3. Same workflow re-wiring as Option A step 6.

## Acceptance

- [ ] One option chosen and recorded in `.planning/STATE.md` decisions log.
- [ ] Production environment reachable via HTTPS at the URL stored in
      `STAGING_URL` (or rename the secret to `PRODUCTION_URL` and update
      the workflow + lighthouserc.js if you want strict naming).
- [ ] `deploy-production` runs directly from `[build, e2e]` (no
      `deploy-staging` dependency).
- [ ] `lighthouse` runs after `deploy-production` and the 90+ thresholds
      pass against the live URL.
- [ ] A pushed master commit lands all green checks through Lighthouse CI.

## When to revisit (add real staging)

Re-introduce a separate staging environment when **any** of these hits:
- 10+ paying Premium users (real customer revenue at risk)
- A backend infra change you can't reproduce locally (e.g., Phase 37
  multi-replica rollout — though `pnpm test:fanout` covers most of it)
- Compliance / SOC2 / GDPR audit requirement for separated environments

Until then: one server, deploy direct, use feature flags or Stripe test mode
for risky changes.

## Out of scope

- Domain registration / DNS (user-side decision).
- Postgres backup/restore policy (separate todo).
- Production database migration policy beyond `prisma db push` —
  `prisma migrate deploy` should be added to the deploy script before
  schema changes go live.
- CDN / edge caching (post-launch optimization).
