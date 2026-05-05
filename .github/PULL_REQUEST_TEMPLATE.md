<!--
Thanks for the PR! Quick checklist before you click "Create":
- This is the master branch — branch protection requires CI to pass
- Run `pnpm typecheck && pnpm test:run && pnpm build` locally first
- See CLAUDE.md for monorepo conventions and anti-patterns
-->

## Summary

<!-- 1–3 bullets. What does this PR do, and why? "Why" matters more than "what". -->

-

## Related

<!-- Phase / GSD plan / issue / TODO references. Use "Closes #N" syntax to auto-close on merge. -->

- Phase:
- Plan:
- Closes:

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (API / schema / behavior)
- [ ] Refactor / cleanup (no behavior change)
- [ ] Documentation only
- [ ] CI / DevOps only
- [ ] Performance
- [ ] Security

## Test plan

<!-- How did you verify this works? Bullet list of what you exercised. -->

- [ ]
- [ ]

## Pre-merge checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (unit + integration)
- [ ] `pnpm build` produces a working bundle
- [ ] If touching `apps/web/prisma/schema.prisma`: ran `npx prisma generate` and committed the result; verified `prisma db push` works on a fresh database
- [ ] If touching auth / billing / public API: added or updated tests covering the new branches
- [ ] If touching i18n strings: keys exist in all three locale files (`de`, `en`, `fr`) — see `apps/web/public/locales/`
- [ ] If touching mobile (`apps/mobile`): no clickable upgrade CTAs, no `/pricing` references (Apple Rule 3.1.1(a) / Google Play equivalent)
- [ ] No new secrets committed; `process.env.*` access for any new keys
- [ ] No mutation patterns introduced (immutable updates only — see CLAUDE.md)
- [ ] No `console.log` / `console.error` left in production code paths

## Screenshots / video (UI changes only)

<!-- Drag and drop images here. Before/after recommended. -->

## Additional notes

<!-- Migration steps, rollout plan, follow-up TODOs, anything reviewers should know. -->
