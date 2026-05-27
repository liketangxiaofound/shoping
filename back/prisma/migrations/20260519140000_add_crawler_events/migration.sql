-- CreateTable
CREATE TABLE "CrawlerEvent" (
    "id" SERIAL NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "path" TEXT,
    "method" TEXT,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 1,
    "userId" INTEGER,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlerEvent_ipAddress_createdAt_idx" ON "CrawlerEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "CrawlerEvent_reason_createdAt_idx" ON "CrawlerEvent"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "CrawlerEvent_createdAt_idx" ON "CrawlerEvent"("createdAt");
