-- A supplier's contact person and WhatsApp number, typed in the admin (client, 14 Nov 2026). Both optional.
ALTER TABLE "suppliers" ADD COLUMN "contactPerson" TEXT, ADD COLUMN "whatsapp" TEXT;
