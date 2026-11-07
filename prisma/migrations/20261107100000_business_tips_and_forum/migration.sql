-- CreateEnum
CREATE TYPE "ForumTopicStatus" AS ENUM ('OPEN', 'CLOSED', 'HIDDEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoryKind" ADD VALUE 'TIP_CATEGORY';
ALTER TYPE "CategoryKind" ADD VALUE 'FORUM_CATEGORY';

-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'BUSINESS_TIP';

-- CreateTable
CREATE TABLE "business_tips" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,

    CONSTRAINT "business_tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_tip_remarks" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_tip_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "status" "ForumTopicStatus" NOT NULL DEFAULT 'OPEN',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastPostAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "replyToId" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_tips_contentItemId_key" ON "business_tips"("contentItemId");

-- CreateIndex
CREATE INDEX "business_tip_remarks_tipId_createdAt_idx" ON "business_tip_remarks"("tipId", "createdAt");

-- CreateIndex
CREATE INDEX "forum_topics_status_isPinned_lastPostAt_idx" ON "forum_topics"("status", "isPinned", "lastPostAt");

-- CreateIndex
CREATE INDEX "forum_topics_categoryId_idx" ON "forum_topics"("categoryId");

-- CreateIndex
CREATE INDEX "forum_posts_topicId_createdAt_idx" ON "forum_posts"("topicId", "createdAt");

-- AddForeignKey
ALTER TABLE "business_tips" ADD CONSTRAINT "business_tips_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tip_remarks" ADD CONSTRAINT "business_tip_remarks_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "business_tips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tip_remarks" ADD CONSTRAINT "business_tip_remarks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tip_remarks" ADD CONSTRAINT "business_tip_remarks_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "forum_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

