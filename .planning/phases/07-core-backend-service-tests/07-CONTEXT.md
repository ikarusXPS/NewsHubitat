# Phase 7: Core Backend Service Tests - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Unit test coverage for 5 core infrastructure services: aiService, authService, cacheService, cleanupService, emailService. Each service must reach 80%+ coverage with specific edge cases tested per ROADMAP.md success criteria.

</domain>

<decisions>
## Implementation Decisions

### Mocking Strategy
- **D-01:** Use `vi.mock()` at file top for external dependencies (standard Vitest pattern)
- **D-02:** Mock Prisma object directly (`vi.mock('../db/prisma')`) - no test database for unit tests
- **D-03:** Use minimal response mocks for AI provider SDKs (Anthropic, OpenAI, Gemini) - focus on service logic, not SDK behavior

### Test File Location
- **D-04:** Co-located test files following project convention: `server/services/aiService.test.ts` next to `server/services/aiService.ts`

### Coverage Priorities
- **D-05:** aiService: Focus on provider failure cascade (OpenRouter fails -> Gemini -> Anthropic -> keyword fallback)
- **D-06:** authService: Focus on expired/invalid token scenarios (JWT expiry, malformed tokens, wrong signature)
- **D-07:** cacheService: Use `vi.useFakeTimers()` for TTL expiration testing - fast and deterministic
- **D-08:** emailService: Verify HTML output contains expected variables (user name, verification link) via string assertions

### Test Isolation
- **D-09:** Reset singleton instance between tests using `(Service as any).instance = null` in afterEach
- **D-10:** Test-only reset - no `resetInstance()` methods added to production code

### Claude's Discretion
- cleanupService deletion grace period testing approach
- Specific mock data structures beyond minimal requirements
- Test grouping and describe block organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Patterns
- `.planning/codebase/TESTING.md` - Vitest/Playwright patterns, factory pattern, mock utilities
- `.planning/codebase/CONVENTIONS.md` - Naming conventions, error handling patterns

### Service Code (to be tested)
- `server/services/aiService.ts` - AI provider fallback chain, caching
- `server/services/authService.ts` - JWT, bcrypt, email verification
- `server/services/cacheService.ts` - Redis wrapper, TTL handling
- `server/services/cleanupService.ts` - Unverified account lifecycle
- `server/services/emailService.ts` - Nodemailer, template rendering

### Existing Test Examples
- `server/routes/ai.test.ts` - Backend test pattern reference
- `src/test/factories.ts` - Factory pattern for mock data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/factories.ts` - Mock data factory pattern (getMockNewsArticle, etc.)
- Vitest globals configured (`vitest.config.ts`) - no imports needed for describe/it/expect

### Established Patterns
- Singleton services use `getInstance()` - all 5 target services follow this
- Winston logger used in backend - may need to be mocked/silenced in tests
- External dependencies: ioredis, @prisma/client, nodemailer, AI SDKs

### Integration Points
- Services import from `../db/prisma` - single Prisma instance
- Services use `../utils/logger` - Winston logger instance
- EmailService imported by CleanupService (inter-service dependency)

</code_context>

<specifics>
## Specific Ideas

No specific requirements - open to standard testing approaches within the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 07-core-backend-service-tests*
*Context gathered: 2026-04-20*
