-- An expert's service has a duration and a picture (client, 24 Nov 2026: Service Name, Description, Duration, Price, Picture).
ALTER TABLE "consultant_services" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "consultant_services" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
