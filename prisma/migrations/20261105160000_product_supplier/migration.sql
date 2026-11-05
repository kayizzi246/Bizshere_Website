-- The supplier linked from a product's row on the prices page, chosen at Admin > Markets and Prices.
ALTER TABLE "products" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
