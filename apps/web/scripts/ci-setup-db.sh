#!/usr/bin/env bash
# CI-only DB setup.
#
# `prisma db push` fails on a fresh Postgres because three Unsupported("tsvector")
# columns in schema.prisma carry @default(dbgenerated("to_tsvector(... COALESCE(col,'') ...)"))
# clauses. Postgres rejects DEFAULT expressions that reference sibling columns —
# those columns are GENERATED ALWAYS AS (...) STORED in production, and the
# `dbgenerated` annotation is only there so subsequent push calls leave the
# already-existing GENERATED columns alone. On a fresh CI database the column
# does not exist yet, so push tries to CREATE it and Postgres bails on the
# first table creation.
#
# Local dev never hits this because raw FTS migrations under
# prisma/migrations/*-fts/ landed first (Phase 38 + Phase 40); subsequent
# `prisma db push` calls see existing GENERATED columns and leave them alone.
#
# This script replicates that order in CI:
#   1. Strip `@default(dbgenerated(...))` from the three tsvector columns so
#      `prisma db push` emits a regular nullable `tsvector` column instead of
#      an invalid DEFAULT clause.
#   2. Push the (stripped) schema. Base tables are created.
#   3. Drop the regular tsvector columns and re-add them via the raw FTS
#      migrations, which create them as `GENERATED ALWAYS AS (...) STORED`.
#   4. Restore the original schema and regenerate the Prisma client (so the
#      generated types still know the columns are dbgenerated).

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
SCHEMA="prisma/schema.prisma"
BACKUP="${SCHEMA}.ci-bak"

cleanup() {
  if [ -f "$BACKUP" ]; then
    mv "$BACKUP" "$SCHEMA"
  fi
}
trap cleanup EXIT

# Step 1: strip the dbgenerated DEFAULT clauses on tsvector columns.
# Use Node (rather than perl) because the dbgenerated() argument is a quoted
# string with nested parens and escaped quotes — not safely matchable with a
# simple regex.
cp "$SCHEMA" "$BACKUP"
node "$SCRIPT_DIR/strip-tsvector-defaults.cjs" "$SCHEMA"

# Step 2: push the stripped schema (base tables created, tsvector columns regular).
# Prisma 7 dropped --skip-generate; client regen is implicit. We re-run `prisma
# generate` explicitly in step 4 against the restored schema so the dbgenerated
# annotation is present in the generated types.
pnpm exec prisma db push

# Step 3: drop the regular tsvector columns and re-add via raw FTS migrations
PSQL_BIN="${PSQL:-psql}"
"$PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 <<-'SQL'
ALTER TABLE "NewsArticle" DROP COLUMN IF EXISTS search_tsv;
ALTER TABLE "Video" DROP COLUMN IF EXISTS search_tsv;
ALTER TABLE "Transcript" DROP COLUMN IF EXISTS search_tsv;
SQL

"$PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260429120000_38_news_article_fts/migration.sql
"$PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260504_40_video_fts/migration.sql
"$PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260504_40_transcript_fts/migration.sql

# Step 4: restore original schema (cleanup trap does this on success too) and regenerate client
mv "$BACKUP" "$SCHEMA"
pnpm exec prisma generate

echo "ci-setup-db: done — base schema pushed, tsvector columns added as GENERATED, Prisma client regenerated"
