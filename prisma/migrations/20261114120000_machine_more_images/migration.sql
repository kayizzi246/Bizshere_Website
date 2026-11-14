-- AlterTable
ALTER TABLE "machines" ADD COLUMN     "moreImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
