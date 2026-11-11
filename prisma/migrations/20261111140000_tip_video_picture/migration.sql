-- A business tip can have a video (a YouTube link, shown on the tip's page and as its card picture)
-- and a photo (client, 11 Nov 2026). Both optional.
ALTER TABLE "business_tips" ADD COLUMN "videoUrl" TEXT, ADD COLUMN "pictureUrl" TEXT;
