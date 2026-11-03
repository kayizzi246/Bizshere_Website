-- AlterTable
ALTER TABLE "consultant_projects" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "status" "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "consultants" ADD COLUMN     "links" TEXT[],
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "consultants_ownerId_key" ON "consultants"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Editors already on the team keep what they could do before areas existed (everything except money).
-- From now on the super admin picks each sub-admin's areas at /admin/team.
UPDATE "users" SET "adminAreas" = ARRAY[
  'review', 'corrections', 'prices', 'suppliers', 'experts', 'homepage',
  'content:BUSINESS_IDEA', 'content:MACHINE', 'content:SUPPLIER', 'content:FUNDING_PROGRAMME', 'content:INVESTMENT_OPPORTUNITY',
  'content:GUIDE', 'content:CONSULTANT', 'content:TOOL', 'content:WEBSITE', 'content:NEWS'
]::TEXT[] WHERE "role" = 'EDITOR';
