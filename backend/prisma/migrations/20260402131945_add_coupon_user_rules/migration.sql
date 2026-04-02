-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxUsesPerUser" INTEGER;
