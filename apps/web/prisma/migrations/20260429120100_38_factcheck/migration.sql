-- Phase 38: FactCheck audit trail (D-16 LOCKED + RESEARCH.md Q-04)
-- Hand-written because the legacy migration_lock.toml is sqlite and the live dev DB
-- was bootstrapped via `prisma db push`, not `migrate deploy` — `migrate dev --create-only`
-- refuses to run in this repo state (P3019). The contents of this file mirror what
-- Prisma 7 would emit for the FactCheck model in apps/web/prisma/schema.prisma:
--   - userId Cascade (matches Bookmark/Comment/ApiKey pattern)
--   - articleId SetNull (audit row outlives article cleanup)
--   - four indexes (claimHash for D-18 dedup, userId/articleId/createdAt)

-- CreateTable
CREATE TABLE "FactCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT,
    "claimText" TEXT NOT NULL,
    "claimHash" TEXT NOT NULL,
    "claimLanguage" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "methodologyMd" TEXT NOT NULL,
    "citationArticleIds" TEXT[],
    "modelUsed" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FactCheck_claimHash_idx" ON "FactCheck"("claimHash");

-- CreateIndex
CREATE INDEX "FactCheck_userId_idx" ON "FactCheck"("userId");

-- CreateIndex
CREATE INDEX "FactCheck_articleId_idx" ON "FactCheck"("articleId");

-- CreateIndex
CREATE INDEX "FactCheck_createdAt_idx" ON "FactCheck"("createdAt");

-- AddForeignKey
ALTER TABLE "FactCheck" ADD CONSTRAINT "FactCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactCheck" ADD CONSTRAINT "FactCheck_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
