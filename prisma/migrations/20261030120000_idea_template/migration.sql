-- AlterTable
ALTER TABLE "business_ideas" ADD COLUMN     "businessSize" TEXT,
ADD COLUMN     "capitalMax" DECIMAL(16,2),
ADD COLUMN     "capitalMin" DECIMAL(16,2),
ADD COLUMN     "capitalNotes" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UGX',
ADD COLUMN     "locationNotes" TEXT,
ADD COLUMN     "profitPotential" TEXT,
ADD COLUMN     "setupTime" TEXT;
