-- Free 24-hour pass, invites, promo codes and price watches (18 Nov 2026).

-- The free pass (one per person, ever) and the person's own invite code
ALTER TABLE "users" ADD COLUMN "trialUsedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- What a promo code took off a payment, and the "you didn't finish paying" text
ALTER TABLE "payments" ADD COLUMN "discount" DECIMAL(14,2);
ALTER TABLE "payments" ADD COLUMN "promoCodeId" TEXT;
ALTER TABLE "payments" ADD COLUMN "recoverySentAt" TIMESTAMP(3);
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

CREATE TYPE "PromoKind" AS ENUM ('PERCENT', 'AMOUNT');

CREATE TABLE "promo_codes" (
  "id"             TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "kind"           "PromoKind" NOT NULL,
  "value"          DECIMAL(14,2) NOT NULL,
  "periods"        "BillingPeriod"[],
  "maxRedemptions" INTEGER,
  "startsAt"       TIMESTAMP(3),
  "expiresAt"      TIMESTAMP(3),
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "note"           TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

CREATE TABLE "promo_redemptions" (
  "id"          TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "paymentId"   TEXT NOT NULL,
  "amountOff"   DECIMAL(14,2) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promo_redemptions_paymentId_key" ON "promo_redemptions"("paymentId");
CREATE UNIQUE INDEX "promo_redemptions_promoCodeId_userId_key" ON "promo_redemptions"("promoCodeId", "userId");

CREATE TABLE "referrals" (
  "id"         TEXT NOT NULL,
  "inviterId"  TEXT NOT NULL,
  "inviteeId"  TEXT NOT NULL,
  "rewardDays" INTEGER NOT NULL DEFAULT 0,
  "rewardedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_inviteeId_key" ON "referrals"("inviteeId");
CREATE INDEX "referrals_inviterId_idx" ON "referrals"("inviterId");

CREATE TABLE "price_watches" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "productId"      TEXT NOT NULL,
  "lastPrice"      DECIMAL(14,2),
  "lastSuppliers"  INTEGER NOT NULL DEFAULT 0,
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_watches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "price_watches_userId_productId_key" ON "price_watches"("userId", "productId");
CREATE INDEX "price_watches_productId_idx" ON "price_watches"("productId");

ALTER TABLE "payments" ADD CONSTRAINT "payments_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_watches" ADD CONSTRAINT "price_watches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_watches" ADD CONSTRAINT "price_watches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
