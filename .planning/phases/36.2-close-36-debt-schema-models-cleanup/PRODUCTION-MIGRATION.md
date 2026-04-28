# Production Migration Note — Phase 36.2 Enum Conversion

**Status:** Not executed in 36.2. Dev DB only.
**Owner of execution:** Production-readiness phase (TBD).
**Drafted:** 2026-04-28 by Phase 36.2.

## What 36.2 Did (Dev Only)

`prisma db push --accept-data-loss` (Plan 03 of Phase 36.2) converted `User.subscriptionTier` and `User.subscriptionStatus` from `String?` to Prisma enums (`SubscriptionTier`, `SubscriptionStatus`). On the dev DB the existing 5 columns held `NULL` for all users (no real Stripe data), so the conversion was lossless.

The same `db push` also added 4 new tables (ProcessedWebhookEvent, ReferralReward, Campaign, StudentVerification), 8 new columns on the User table, and 5 new indexes — all of which are purely additive and safe for production.

## What Production Requires

Production may have non-null `text` values in `User.subscriptionTier` and `User.subscriptionStatus`. `prisma db push` is **unsafe in production** — Prisma 7 may attempt a drop-and-recreate on type changes, which destroys the data.

A hand-written SQL migration is required for the type conversion only. The new tables and columns can be added with the standard `prisma migrate deploy` (or a generated migration via `prisma migrate diff`).

### Step 1 — Verify existing values are valid enum members

```sql
SELECT DISTINCT "subscriptionTier" FROM "User" WHERE "subscriptionTier" IS NOT NULL;
SELECT DISTINCT "subscriptionStatus" FROM "User" WHERE "subscriptionStatus" IS NOT NULL;
```

Expected outputs:
- `subscriptionTier`: only `'FREE'`, `'PREMIUM'`, `'ENTERPRISE'` (or NULL)
- `subscriptionStatus`: only `'ACTIVE'`, `'PAST_DUE'`, `'CANCELED'`, `'PAUSED'` (or NULL)

If any value is NOT in the allowed set (e.g. lowercase, or legacy values like `'PRO'`), STOP and patch the data first:

```sql
UPDATE "User" SET "subscriptionTier" = 'PREMIUM' WHERE "subscriptionTier" = 'PRO';
-- (one update per legacy value)
```

### Step 2 — Create the enum types

Prisma will emit these as part of `migrate deploy` on a fresh DB; on a production DB you may need to apply them manually first if `migrate deploy` is configured to skip type changes:

```sql
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');
```

### Step 3 — Cast the columns

Run inside a single transaction so a failed cast rolls back atomically:

```sql
BEGIN;

ALTER TABLE "User"
  ALTER COLUMN "subscriptionTier" TYPE "SubscriptionTier"
    USING "subscriptionTier"::text::"SubscriptionTier",
  ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus"
    USING "subscriptionStatus"::text::"SubscriptionStatus";

-- Apply the new defaults (Prisma's @default(FREE) / @default(ACTIVE))
ALTER TABLE "User"
  ALTER COLUMN "subscriptionTier" SET DEFAULT 'FREE',
  ALTER COLUMN "subscriptionStatus" SET DEFAULT 'ACTIVE';

-- Backfill any remaining NULLs to the new defaults (the schema declares both as NOT NULL with defaults)
UPDATE "User" SET "subscriptionTier" = 'FREE' WHERE "subscriptionTier" IS NULL;
UPDATE "User" SET "subscriptionStatus" = 'ACTIVE' WHERE "subscriptionStatus" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "subscriptionTier" SET NOT NULL,
  ALTER COLUMN "subscriptionStatus" SET NOT NULL;

COMMIT;
```

### Step 4 — Apply the additive schema (new tables, columns, indexes)

```bash
# From apps/web in production deployment context
npx prisma migrate deploy
```

This is safe — additive only. The 4 new tables, 8 new columns, and 5 new indexes will be created.

### Step 5 — Verify

```sql
\d "User"           -- confirm subscriptionTier and subscriptionStatus are now enum types, NOT NULL with defaults
\dT "Subscription*" -- confirm both enum types exist
\dt                 -- confirm 4 new tables exist
```

## Pre-Requisites

1. **Maintenance window** — The cast in Step 3 takes an exclusive lock on the User table. Schedule during low traffic.
2. **Backup** — Take a full Postgres backup before Step 3. The transaction should roll back on failure, but a backup is the disaster-recovery escape hatch.
3. **Rollback rehearsal** — Test the entire migration on a staging copy of production data before running it on production. The rollback SQL is the inverse of Step 3 (`ALTER COLUMN ... TYPE text USING ...::text`).
4. **Application compatibility** — The application code (this version) expects the columns to be NOT NULL enums. Deploy the app code at the same time as (or AFTER) the migration. Older app versions that wrote literal strings will continue to work because the new enum has the same UPPERCASE values.

## Why This Wasn't In 36.2

Phase 36.2 is dev-only schema work. Production migration choreography (maintenance window scheduling, backup rehearsal, rollback verification, deployment ordering) belongs in the production-readiness phase. This note is the hand-off so that phase has a starting point and does not need to re-derive the SQL from scratch.

---

*Created: 2026-04-28 by Phase 36.2*
*Phase: 36.2-close-36-debt-schema-models-cleanup*
*References: 36.2-CONTEXT.md D-02 specifies dev-only scope; 36.2-PATTERNS.md lines 501-558 specifies the tone and SQL template.*
