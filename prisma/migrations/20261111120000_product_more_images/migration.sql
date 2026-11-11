-- A product can have several photos (client, 11 Nov 2026). "imageUrl" stays the main photo, shown on the
-- cards; the others are kept here, in order, and shown in the gallery on the product's page.
ALTER TABLE "supplier_product_listings" ADD COLUMN "moreImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
