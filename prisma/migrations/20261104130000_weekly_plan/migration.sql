-- AlterEnum
ALTER TYPE "BillingPeriod" ADD VALUE 'WEEKLY';

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN     "priceWeekly" DECIMAL(14,2);

-- Test prices for the member plan, so payments can be tried end to end (Pesapal sandbox).
-- Only where no price is set yet: prices already chosen at /admin/plans are kept.
-- Change them at /admin/plans, or with: npm run plans:test-prices -- <daily> <weekly> <monthly> <yearly>
UPDATE "membership_plans" SET "priceDaily" = 500 WHERE "code" = 'member' AND "priceDaily" IS NULL;
UPDATE "membership_plans" SET "priceWeekly" = 2000 WHERE "code" = 'member' AND "priceWeekly" IS NULL;
UPDATE "membership_plans" SET "priceMonthly" = 5000 WHERE "code" = 'member' AND "priceMonthly" IS NULL;
UPDATE "membership_plans" SET "priceYearly" = 50000 WHERE "code" = 'member' AND "priceYearly" IS NULL;
