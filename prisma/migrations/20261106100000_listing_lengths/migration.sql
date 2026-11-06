-- Supplier and expert listings are now sold for 6 months, 1, 2 or 3 years.
-- AlterEnum
ALTER TYPE "BillingPeriod" ADD VALUE 'HALF_YEARLY';
ALTER TYPE "BillingPeriod" ADD VALUE 'TWO_YEARS';
ALTER TYPE "BillingPeriod" ADD VALUE 'THREE_YEARS';

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN "priceHalfYearly" DECIMAL(14,2);
ALTER TABLE "membership_plans" ADD COLUMN "priceTwoYears" DECIMAL(14,2);
ALTER TABLE "membership_plans" ADD COLUMN "priceThreeYears" DECIMAL(14,2);

-- Starting prices worked out from the current 1-year price, at the same rate per year, so all four
-- lengths are offered straight away. Change them at Admin > Subscription prices.
UPDATE "membership_plans"
SET "priceHalfYearly" = ROUND("priceYearly" / 2),
    "priceTwoYears" = "priceYearly" * 2,
    "priceThreeYears" = "priceYearly" * 3
WHERE "code" IN ('supplier_listing', 'expert_listing') AND "priceYearly" > 0;
