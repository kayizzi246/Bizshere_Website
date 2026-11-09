-- The client's funding template (9 Nov 2026): target group, tenor and how to apply on each fund,
-- and the funder's phone and email (website and logo are already on the organization).
ALTER TABLE "funding_programmes" ADD COLUMN "targetGroup" TEXT, ADD COLUMN "tenor" TEXT, ADD COLUMN "howToApply" TEXT;
ALTER TABLE "funding_providers" ADD COLUMN "phone" TEXT, ADD COLUMN "email" TEXT;
