-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleTranslated" TEXT,
    "content" TEXT NOT NULL,
    "contentTranslated" TEXT,
    "summary" TEXT,
    "originalLanguage" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sentiment" TEXT NOT NULL,
    "sentimentScore" REAL NOT NULL,
    "perspective" TEXT NOT NULL,
    "topics" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "translationQuality" REAL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "NewsArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "politicalBias" REAL NOT NULL,
    "reliability" INTEGER NOT NULL,
    "ownership" TEXT NOT NULL,
    "apiEndpoint" TEXT,
    "rateLimit" INTEGER NOT NULL,
    "lastFetched" DATETIME
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preferences" TEXT
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalTitle" TEXT NOT NULL,
    "articles" TEXT NOT NULL,
    "perspectives" TEXT NOT NULL,
    "biasDistribution" TEXT NOT NULL,
    "framingDifferences" TEXT NOT NULL,
    "significance" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_perspective_idx" ON "NewsArticle"("perspective");

-- CreateIndex
CREATE INDEX "NewsArticle_sentiment_idx" ON "NewsArticle"("sentiment");

-- CreateIndex
CREATE INDEX "NewsArticle_sourceId_idx" ON "NewsArticle"("sourceId");

-- CreateIndex
CREATE INDEX "NewsSource_region_idx" ON "NewsSource"("region");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_articleId_key" ON "Bookmark"("userId", "articleId");

-- CreateIndex
CREATE INDEX "StoryCluster_createdAt_idx" ON "StoryCluster"("createdAt");
