-- A machine's provider (10 Nov 2026): link a supplier already on the site, and/or type the
-- provider's name, phone, email and website.
ALTER TABLE "machines"
  ADD COLUMN "supplierId" TEXT,
  ADD COLUMN "providerName" TEXT,
  ADD COLUMN "providerPhone" TEXT,
  ADD COLUMN "providerEmail" TEXT,
  ADD COLUMN "providerWebsite" TEXT;

CREATE INDEX "machines_supplierId_idx" ON "machines"("supplierId");

ALTER TABLE "machines" ADD CONSTRAINT "machines_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
