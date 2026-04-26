---
phase: 35-infrastructure-foundation
plan: 02
subsystem: api-keys
tags: [api-keys, authentication, bcrypt, nanoid, developer-api]
dependency_graph:
  requires:
    - 35-01 (monorepo workspace setup)
  provides:
    - ApiKey Prisma model with tier and environment enums
    - ApiKeyService singleton for key generation and validation
    - Secure key storage with bcrypt hashing
  affects:
    - prisma/schema.prisma (ApiKey model, User relation)
    - server/services/apiKeyService.ts (new service)
tech_stack:
  added:
    - nanoid 5.1.9 (already present, used for key generation)
  patterns:
    - API key format: nh_{env}_{random}_{checksum}
    - bcrypt hashing with factor 10 for key storage
    - SHA-256 checksum for pre-validation
key_files:
  created:
    - apps/web/server/services/apiKeyService.ts
    - apps/web/server/services/apiKeyService.test.ts
  modified:
    - apps/web/prisma/schema.prisma (ApiKey model, User.apiKeys relation)
    - apps/web/src/generated/prisma/* (regenerated)
decisions:
  - "API key format nh_{env}_{random}_{checksum} per D-06 and RESEARCH.md Pattern 2"
  - "bcrypt factor 10 for key hashing (consistent with password hashing)"
  - "Max 3 keys per user enforced before bcrypt hash (D-10)"
  - "Checksum pre-validation prevents unnecessary database lookups (T-35-08)"
metrics:
  duration: "8 minutes"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
  completed: "2026-04-26T08:59:11Z"
---

# Phase 35 Plan 02: API Key Generation Service Summary

Secure API key generation service with bcrypt hashing, checksum validation, and tier-based management for developer authentication.

## What Was Built

### Prisma Schema Changes

Added `ApiKey` model to support developer API authentication:

```prisma
model ApiKey {
  id          String     @id @default(cuid())
  keyHash     String     @unique  // bcrypt hash of full key
  name        String
  tier        ApiKeyTier @default(free)
  environment ApiKeyEnv  @default(live)
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  lastUsedAt  DateTime?
  requestCount Int       @default(0)
  revokedAt   DateTime?
  revokedReason String?

  @@index([userId])
  @@index([revokedAt])
  @@index([lastUsedAt])
  @@index([createdAt])
}

enum ApiKeyTier { free, pro }
enum ApiKeyEnv { live, test }
```

### API Key Service

Created `ApiKeyService` singleton with comprehensive key management:

| Method | Purpose |
|--------|---------|
| `generateApiKey(env)` | Generate key with `nh_{env}_{random}_{checksum}` format |
| `validateApiKeyFormat(key)` | Validate format and checksum before DB lookup |
| `createApiKey(userId, name, tier, env)` | Create key with bcrypt hash, enforce 3-key limit |
| `validateApiKey(key)` | Validate key against database using bcrypt.compare |
| `getUserApiKeys(userId)` | List user's active keys (metadata only, no hashes) |
| `revokeApiKey(keyId, userId, reason)` | Revoke key with authorization check |
| `trackUsage(keyId)` | Update lastUsedAt and increment requestCount |

### API Key Format

Keys follow the Stripe-inspired format for familiarity:

```
nh_live_1A2b3C4d5E6f7G8h9I0j1K2L_A3B4
├─────┤ ├────────────────────────┤ ├──┤
prefix   random (24 chars nanoid)  checksum (4 hex)
```

- **Prefix**: `nh_live_` (production) or `nh_test_` (sandbox)
- **Random**: 24 alphanumeric characters via nanoid
- **Checksum**: First 4 characters of SHA-256 hash (uppercase hex)

### Security Measures

1. **Never store plaintext**: Keys hashed with bcrypt (factor 10)
2. **Return once**: Plaintext key returned only at creation time
3. **Pre-validation**: Checksum validation prevents brute-force DB queries (T-35-04)
4. **Rate limit bypass prevention**: Max 3 keys per user (D-10)
5. **Authorization**: Users can only revoke their own keys

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2d27534 | Add ApiKey model to Prisma schema |
| 2 | 91a3a73 | Create API key service with generation and validation |
| 3 | 034b3a5 | Add unit tests for API key service |

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage

31 unit tests covering:

- Key generation with live/test prefixes
- Unique key generation across multiple calls
- Format validation with correct/incorrect checksums
- Malformed key rejection
- bcrypt hashing verification
- 3-key limit enforcement
- Key validation with bcrypt.compare
- User key listing without hash exposure
- Revocation authorization and state checks
- Usage tracking increment

## Verification Results

- [x] ApiKey model added to Prisma schema with keyHash, tier, environment
- [x] User model has apiKeys relation
- [x] ApiKeyService singleton created with getInstance()
- [x] generateApiKey returns keys with nh_{env}_ prefix and 4-char checksum
- [x] validateApiKeyFormat validates checksum before DB lookup
- [x] createApiKey enforces max 3 keys per user
- [x] createApiKey hashes keys with bcrypt before storage
- [x] validateApiKey uses bcrypt.compare for verification
- [x] Unit tests pass for all service methods (31 tests)
- [x] TypeScript type check passes

## Self-Check: PASSED

All files verified to exist:
- apps/web/prisma/schema.prisma: FOUND (contains model ApiKey)
- apps/web/server/services/apiKeyService.ts: FOUND
- apps/web/server/services/apiKeyService.test.ts: FOUND

All commits verified:
- 2d27534: FOUND
- 91a3a73: FOUND
- 034b3a5: FOUND
