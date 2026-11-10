-- Sales leads from the contact form and "Talk to us" links (10 Nov 2026), followed up in Admin > Leads.
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

CREATE TABLE "leads" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "email"     TEXT,
  "interest"  TEXT NOT NULL,
  "message"   TEXT,
  "page"      TEXT,
  "userId"    TEXT,
  "status"    "LeadStatus" NOT NULL DEFAULT 'NEW',
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");
