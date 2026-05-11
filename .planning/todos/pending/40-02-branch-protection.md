---
created: 2026-05-04
phase: 40-content-expansion
plan: 02
priority: medium
type: manual-config
---

# Promote `Source Bias Coverage` to required status check

After 40-02 lands and the first PR demonstrates the `Source Bias Coverage` CI job passing on actual GitHub Actions, promote it to a required branch-protection check on master.

## Steps

1. Open https://github.com/ikarusXPS/NewsHubitat/settings/branches
2. Edit the `master` rule
3. Under "Require status checks to pass before merging", add `Source Bias Coverage` to the list
4. Save

## Why

The CI job is wired (`.github/workflows/ci.yml`) and runs on every PR + master push, but adding new sources without bias-balance compliance can still merge until this is required.

## Why not automated

Branch protection settings require the GitHub UI or a privileged API token. Cannot be wired up via PR.
