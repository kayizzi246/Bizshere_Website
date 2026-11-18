-- A discount code can be shown on the homepage as a live offer, with its own headline (18 Nov 2026).
ALTER TABLE "promo_codes" ADD COLUMN "showOnSite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "promo_codes" ADD COLUMN "headline" TEXT;
