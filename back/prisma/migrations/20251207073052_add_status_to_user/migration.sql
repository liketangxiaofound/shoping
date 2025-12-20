-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'draft');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'active';
