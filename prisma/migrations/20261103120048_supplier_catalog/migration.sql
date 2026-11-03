-- AlterTable
ALTER TABLE "supplier_product_listings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "status" "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "pictureCredit" TEXT,
ADD COLUMN     "pictureUrl" TEXT;
