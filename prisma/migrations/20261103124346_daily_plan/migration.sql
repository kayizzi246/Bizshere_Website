-- AlterEnum
ALTER TYPE "BillingPeriod" ADD VALUE 'DAILY';

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN     "priceDaily" DECIMAL(14,2);
