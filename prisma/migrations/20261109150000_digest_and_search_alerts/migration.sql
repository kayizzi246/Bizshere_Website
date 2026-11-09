-- Coming back (9 Nov 2026): a weekly "what's new" SMS people can turn on, and saved-search alerts that are
-- actually sent. "Save this search" has always shown a bell but there was no way to turn the alert on, so
-- every saved search had it off: they are turned on, and each can be turned off at /account.
ALTER TABLE "users" ADD COLUMN "digestSms" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "digestSentAt" TIMESTAMP(3), ADD COLUMN "alertSmsAt" TIMESTAMP(3);
ALTER TABLE "saved_searches" ALTER COLUMN "alert" SET DEFAULT true;
UPDATE "saved_searches" SET "alert" = true;
