-- 3.2 大数据数据采集表

CREATE TABLE "LoginLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "ipAddress" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrowseBehaviorLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER,
    "category" TEXT,
    "dwellSeconds" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "browsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrowseBehaviorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseRecord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "category" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "content" TEXT NOT NULL,
    "ipAddress" TEXT,
    "operatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginLog_userId_loginAt_idx" ON "LoginLog"("userId", "loginAt");
CREATE INDEX "LoginLog_role_loginAt_idx" ON "LoginLog"("role", "loginAt");
CREATE INDEX "LoginLog_loginAt_idx" ON "LoginLog"("loginAt");

CREATE INDEX "BrowseBehaviorLog_userId_browsedAt_idx" ON "BrowseBehaviorLog"("userId", "browsedAt");
CREATE INDEX "BrowseBehaviorLog_category_browsedAt_idx" ON "BrowseBehaviorLog"("category", "browsedAt");
CREATE INDEX "BrowseBehaviorLog_browsedAt_idx" ON "BrowseBehaviorLog"("browsedAt");

CREATE INDEX "PurchaseRecord_userId_purchaseDate_idx" ON "PurchaseRecord"("userId", "purchaseDate");
CREATE INDEX "PurchaseRecord_category_purchaseDate_idx" ON "PurchaseRecord"("category", "purchaseDate");
CREATE INDEX "PurchaseRecord_orderId_idx" ON "PurchaseRecord"("orderId");
CREATE INDEX "PurchaseRecord_purchaseDate_idx" ON "PurchaseRecord"("purchaseDate");

CREATE INDEX "OperationLog_userId_operatedAt_idx" ON "OperationLog"("userId", "operatedAt");
CREATE INDEX "OperationLog_role_operatedAt_idx" ON "OperationLog"("role", "operatedAt");
CREATE INDEX "OperationLog_operatedAt_idx" ON "OperationLog"("operatedAt");

ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowseBehaviorLog" ADD CONSTRAINT "BrowseBehaviorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowseBehaviorLog" ADD CONSTRAINT "BrowseBehaviorLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
