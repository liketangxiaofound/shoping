/*
  Warnings:

  - A unique constraint covering the columns `[orderNo]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderNo` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address" JSONB,
ADD COLUMN     "orderNo" TEXT NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_orderNo_idx" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
