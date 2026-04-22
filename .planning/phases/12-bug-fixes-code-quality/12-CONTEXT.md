# Phase 12: Bug Fixes & Code Quality - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Source:** Direct assessment from codebase

<domain>
## Phase Boundary

This phase addresses the final milestone v1.1 requirements:
- Fix known bug B7 (Article thumbnail fallback)
- Achieve zero ESLint errors
- Ensure TypeScript compiles cleanly
- Remove dead code
- Maintain 80%+ test coverage

</domain>

<decisions>
## Implementation Decisions

### Already Met (No Action Needed)
- **QUAL-02 TypeScript**: Already passes with zero errors (`npm run typecheck` exits cleanly)
- **QUAL-04 Coverage**: Already at 91.66% statements (exceeds 80% threshold)

### ESLint Fixes (QUAL-01)
- **Current state**: 325 errors, 5 warnings
- **Approach**: Fix in batches by error type
- **Auto-fixable**: 2 errors, 3 warnings can be fixed with `--fix`
- **Common issues**:
  - `@typescript-eslint/no-unused-vars` - Remove or use variables
  - `prefer-const` - Change `let` to `const` where never reassigned
  - `@typescript-eslint/no-unsafe-function-type` - Use specific function types

### B7 Bug Fix (BUG-01)
- **Issue**: Article thumbnail doesn't show placeholder when image fails to load
- **Location**: NewsCard component or similar article display component
- **Solution**: Add `onError` handler to `<img>` tags that swaps to placeholder

### Dead Code Removal (QUAL-03)
- **Approach**: Use TypeScript compiler to identify unused exports
- **Tools**: `npx ts-prune` or manual grep for unused functions
- **Scope**: Focus on server/services and src/lib directories

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Standards
- `CLAUDE.md` - Project conventions and patterns
- `eslint.config.js` - ESLint configuration
- `tsconfig.json` - TypeScript configuration

### Files to Fix
- Files with ESLint errors (see lint output)
- `src/components/NewsCard.tsx` - Likely location of B7 bug

</canonical_refs>

<specifics>
## Specific Ideas

### ESLint Fix Strategy
1. Run `npm run lint -- --fix` first to auto-fix what's possible
2. Group remaining errors by type
3. Fix each type systematically

### B7 Implementation
```typescript
// Add to img tag:
onError={(e) => {
  e.currentTarget.src = '/placeholder-news.svg';
}}
```

</specifics>

<deferred>
## Deferred Ideas

None - this is the final phase of milestone v1.1

</deferred>

---

*Phase: 12-bug-fixes-code-quality*
*Context gathered: 2026-04-22 via direct assessment*
