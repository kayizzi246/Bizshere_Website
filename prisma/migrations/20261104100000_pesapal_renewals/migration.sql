-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'PESAPAL';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "period" "BillingPeriod";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "remindersSent" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "payments_providerRef_idx" ON "payments"("providerRef");
