-- CreateTable
CREATE TABLE "site_updates" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_updates_isActive_sortOrder_idx" ON "site_updates"("isActive", "sortOrder");
