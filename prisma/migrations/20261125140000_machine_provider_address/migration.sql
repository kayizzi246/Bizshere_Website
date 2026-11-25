-- The machine provider's physical address (client, 25 Nov 2026: a physical address for every service that has one).
-- A linked supplier's own address is used when this is empty.
ALTER TABLE "machines" ADD COLUMN "providerAddress" TEXT;
