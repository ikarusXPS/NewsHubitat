# Phase 35: Infrastructure Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 35-infrastructure-foundation
**Areas discussed:** Monorepo structure, Public API design, Developer portal, Rate limit enforcement

---

## Monorepo Structure

### Package Split
| Option | Description | Selected |
|--------|-------------|----------|
| Types + API Client only | packages/types + packages/api-client. Minimal extraction, mobile apps import these. | ✓ |
| Types + API + State | Add packages/state with Zustand store slices. More code sharing but tighter coupling. | |
| Aggressive splitting | Types, API client, state, utils, UI components. Maximum sharing but significant refactoring. | |

**User's choice:** Types + API Client only
**Notes:** Recommended option selected. Minimal extraction to start, can expand later.

### Repository Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Flat packages/ | Root: packages/types, packages/api-client. apps/web stays at root. | |
| apps/ + packages/ | Move existing app to apps/web, create apps/mobile later. packages/ for shared code. | ✓ |
| Nested domains | packages/shared/types, packages/shared/api-client. Deeper nesting. | |

**User's choice:** apps/ + packages/
**Notes:** User chose more restructuring now for cleaner long-term organization.

### TypeScript Build Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Source-only | Packages export raw .ts files, consumed directly by apps. No build step. | ✓ |
| Pre-built with tsc | Packages compile to dist/ with .d.ts files. Slower dev loop. | |

**User's choice:** Source-only
**Notes:** Faster iteration during development.

---

## Public API Design

### Versioning
| Option | Description | Selected |
|--------|-------------|----------|
| URL prefix /api/v1/public/* | Clear version in path. Easy to add /api/v2 later. | ✓ |
| Header-based versioning | Accept-Version: v1 header. Cleaner URLs but harder to debug. | |
| Query param ?version=1 | Flexible but ugly URLs. | |

**User's choice:** URL prefix /api/v1/public/*
**Notes:** Standard REST versioning approach.

### Authentication
| Option | Description | Selected |
|--------|-------------|----------|
| X-API-Key header | Simple header-based auth. Key format: nh_live_xxxx or nh_test_xxxx. | ✓ |
| Bearer token | Authorization: Bearer xxx. Mixes with user JWT tokens. | |
| Query param &api_key=xxx | Keys leak in logs and browser history. | |

**User's choice:** X-API-Key header
**Notes:** Standard for developer APIs.

### OpenAPI Documentation Tool
| Option | Description | Selected |
|--------|-------------|----------|
| Scalar | Modern, beautiful API docs. Open source. Try-it-out panel. | ✓ |
| Swagger UI | Industry standard. Dated UI but familiar. | |
| Redoc | Clean three-panel layout. Read-only. | |

**User's choice:** Scalar
**Notes:** Better UX for developer experience focus.

### API Scope
| Option | Description | Selected |
|--------|-------------|----------|
| News + Events + Sentiment | Read-only access to articles, events, sentiment stats. Core value without AI costs. | ✓ |
| News only | Just article endpoints. Minimal scope. | |
| Full read access | Include AI analysis. Higher value but AI costs. | |

**User's choice:** News + Events + Sentiment
**Notes:** Balanced scope for Free tier.

---

## Developer Portal

### Location
| Option | Description | Selected |
|--------|-------------|----------|
| Settings > API Keys | New tab under existing /settings page. Minimal new UI. | |
| Dedicated /developers page | Separate page with full docs, examples, key management. | ✓ |
| External subdomain | developers.newshub.com. Complex infrastructure. | |

**User's choice:** Dedicated /developers page
**Notes:** User chose more prominent placement over minimal option.

### Key Limits
| Option | Description | Selected |
|--------|-------------|----------|
| 3 keys per user | Enough for dev/staging/prod. Easy upgrade path. | ✓ |
| 1 key per user | Simplest model. | |
| Unlimited keys | Maximum flexibility but risk of sprawl. | |

**User's choice:** 3 keys per user
**Notes:** Supports standard workflow.

### Dashboard Content
| Option | Description | Selected |
|--------|-------------|----------|
| Basic: Keys + Usage count | List of keys with creation date, last used, request count this month. | ✓ |
| Detailed analytics | Charts, error rates, endpoint breakdown. | |
| Minimal: Keys only | Just key management, no metrics. | |

**User's choice:** Basic: Keys + Usage count
**Notes:** Simple and actionable.

---

## Rate Limit Enforcement

### Tier Differentiation
| Option | Description | Selected |
|--------|-------------|----------|
| Stored on API key record | ApiKey model has tier field. Limiter looks up from Redis cache. | ✓ |
| Tied to user subscription | Premium user = Pro API tier automatically. | |
| Separate purchase | API Pro tier purchased separately. | |

**User's choice:** Stored on API key record
**Notes:** Decouples API access from subscription.

### Rate Limit Headers
| Option | Description | Selected |
|--------|-------------|----------|
| Standard RateLimit headers | RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset. IETF draft standard. | ✓ |
| X-RateLimit-* headers | Legacy format being deprecated. | |
| Response body only | Requires parsing body. | |

**User's choice:** Standard RateLimit headers
**Notes:** Modern standard, libraries understand it.

### Quota Reset
| Option | Description | Selected |
|--------|-------------|----------|
| Sliding window | Requests counted over rolling 60 seconds. Smoother distribution. | ✓ |
| Fixed window | Reset at minute boundary. Allows burst at edges. | |
| Token bucket | Complex, overkill for this use case. | |

**User's choice:** Sliding window
**Notes:** Already implemented for internal limits.

---

## Claude's Discretion

- API key format details (prefix length, charset, checksum)
- Exact Scalar UI customization (colors, logo placement)
- OpenAPI spec generation approach (code-first vs spec-first)
- Database schema for ApiKey model (indexes, constraints)

## Deferred Ideas

None — discussion stayed within phase scope
