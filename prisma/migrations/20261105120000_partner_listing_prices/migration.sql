-- Sample prices for supplier and expert listings, so the join pages can be tried end to end.
-- Only where no price is set yet: prices already chosen at /admin/plans are kept.
-- Change them at Admin > Prices.
INSERT INTO "membership_plans" ("id", "code", "name", "audience", "entitlements", "sortOrder") VALUES
  ('plan_supplier_listing', 'supplier_listing', 'Supplier listing', 'BUSINESS', '{"listing": true}', 20),
  ('plan_expert_listing', 'expert_listing', 'Expert listing', 'BUSINESS', '{"listing": true}', 21)
ON CONFLICT ("code") DO NOTHING;

UPDATE "membership_plans" SET "priceWeekly" = 15000 WHERE "code" = 'supplier_listing' AND "priceWeekly" IS NULL;
UPDATE "membership_plans" SET "priceMonthly" = 50000 WHERE "code" = 'supplier_listing' AND "priceMonthly" IS NULL;
UPDATE "membership_plans" SET "priceYearly" = 500000 WHERE "code" = 'supplier_listing' AND "priceYearly" IS NULL;
UPDATE "membership_plans" SET "priceWeekly" = 10000 WHERE "code" = 'expert_listing' AND "priceWeekly" IS NULL;
UPDATE "membership_plans" SET "priceMonthly" = 35000 WHERE "code" = 'expert_listing' AND "priceMonthly" IS NULL;
UPDATE "membership_plans" SET "priceYearly" = 350000 WHERE "code" = 'expert_listing' AND "priceYearly" IS NULL;
