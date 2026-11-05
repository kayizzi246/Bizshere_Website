-- Client template for experts: business name, address and profile download on the expert;
-- price and remark on each service. All optional.
ALTER TABLE "consultants" ADD COLUMN "businessName" TEXT, ADD COLUMN "address" TEXT, ADD COLUMN "profileUrl" TEXT;
ALTER TABLE "consultant_services" ADD COLUMN "price" TEXT, ADD COLUMN "remark" TEXT;
