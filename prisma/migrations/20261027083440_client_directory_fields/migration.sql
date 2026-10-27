-- AlterTable
ALTER TABLE "business_ideas" ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "keyRequirements" TEXT,
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "consultants" ADD COLUMN     "country" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "funding_programmes" ADD COLUMN     "eligibleBusinessTypes" TEXT[],
ADD COLUMN     "providerCategory" TEXT;

-- AlterTable
ALTER TABLE "guides" ADD COLUMN     "downloadUrl" TEXT;

-- AlterTable
ALTER TABLE "machines" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UGX',
ADD COLUMN     "pictureUrl" TEXT,
ADD COLUMN     "priceMax" DECIMAL(16,2),
ADD COLUMN     "priceMin" DECIMAL(16,2),
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "sources" TEXT,
ADD COLUMN     "videoUrls" TEXT[];

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "country" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "items" TEXT[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "downloadUrl" TEXT;

-- AlterTable
ALTER TABLE "useful_websites" ADD COLUMN     "remarks" TEXT;
