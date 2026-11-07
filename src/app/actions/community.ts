"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { audit } from "@/lib/audit";
import { allow, LIMITS } from "@/lib/rate-limit";
import { BODY_MAX, messageSelect, TITLE_MAX, toMessage, type ChatMessage } from "@/lib/forum";

/**
 * Writing in the Business Forum and under Business Tips. Anyone can read; members and the team can
 * write. Everything shows at once (it is a conversation); the team hides what shouldn't be there at
 * /admin/forum. Each person is held to a few messages a minute.
 */

type Writer = { id: string } | { error: string };

async function writer(): Promise<Writer> {
  const viewer = await getViewer();
  if (!viewer.userId) return { error: "Log in to write here." };
  if (!viewer.isMember) return { error: "Writing here is for members. Join to take part." };
  const user = await prisma.user.findUnique({ where: { id: viewer.userId }, select: { isSuspended: true } });
  if (!user || user.isSuspended) return { error: "Your account can't write here. Contact our team." };
  return { id: viewer.userId };
}

const text = (max: number) => z.string().trim().min(1, "Write something first").max(max, `Keep it under ${max} letters`);

/** One chat message in a topic, from the chat screen. Returns the message, ready to show. */
export async function sendForumMessage(input: { topicId: string; body: string; replyToId?: string | null }): Promise<{ message: ChatMessage } | { error: string }> {
  const who = await writer();
  if ("error" in who) return who;
  const parsed = z.object({ topicId: z.string().min(1).max(64), body: text(BODY_MAX), replyToId: z.string().max(64).nullish() }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Not sent" };
  const { topicId, body, replyToId } = parsed.data;

  const topic = await prisma.forumTopic.findUnique({ where: { id: topicId }, select: { status: true } });
  if (!topic || topic.status === "HIDDEN") return { error: "This topic is no longer here." };
  if (topic.status === "CLOSED") return { error: "This topic is closed. Start a new one." };
  if (replyToId && !(await prisma.forumPost.findFirst({ where: { id: replyToId, topicId }, select: { id: true } }))) return { error: "That message is no longer here." };
  if (!(await allow(`forum:msg:${who.id}`, ...LIMITS.forumMessagePerUser))) return { error: "You are sending too fast. Wait a minute." };

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.forumPost.create({ data: { topicId, authorId: who.id, body, replyToId: replyToId || null }, select: messageSelect });
    await tx.forumTopic.update({ where: { id: topicId }, data: { lastPostAt: created.createdAt } });
    return created;
  });
  return { message: toMessage(post, who.id) };
}

/** A new topic: a title, a category and the first message. Opens the new topic. */
export async function startForumTopic(form: FormData) {
  const fail = (msg: string): never => redirect(`/forum?error=${encodeURIComponent(msg)}#start`);
  const who = await writer();
  if ("error" in who) fail(who.error);
  const id = (who as { id: string }).id;
  const parsed = z.object({
    title: z.string().trim().min(5, "Give the topic a title of at least 5 letters").max(TITLE_MAX, `Keep the title under ${TITLE_MAX} letters`),
    categoryId: z.string().max(64),
    body: text(BODY_MAX),
  }).safeParse({ title: form.get("title") ?? "", categoryId: form.get("categoryId") ?? "", body: form.get("body") ?? "" });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Not saved");
  const { title, categoryId, body } = parsed.data!;
  const category = categoryId ? await prisma.category.findFirst({ where: { id: categoryId, kind: "FORUM_CATEGORY" }, select: { id: true } }) : null;
  if (!(await allow(`forum:topic:${id}`, ...LIMITS.forumTopicPerUser))) fail("You have started a lot of topics. Try again in an hour.");

  const topic = await prisma.forumTopic.create({
    data: { title, categoryId: category?.id ?? null, authorId: id, posts: { create: { authorId: id, body } } },
    select: { id: true },
  });
  await audit(id, "forum.topic.created", "forum_topic", topic.id);
  redirect(`/forum/${topic.id}`);
}

/** A member's remark under a business tip. */
export async function addTipRemark(form: FormData) {
  const tipId = String(form.get("tipId") ?? "").slice(0, 64);
  const tip = await prisma.businessTip.findFirst({ where: { id: tipId, contentItem: { publicationStatus: "PUBLISHED" } }, select: { contentItem: { select: { slug: true } } } });
  if (!tip) redirect("/tips");
  const back = `/tips/${tip.contentItem.slug}`;
  const fail = (msg: string): never => redirect(`${back}?remark=${encodeURIComponent(msg)}#remarks`);
  const who = await writer();
  if ("error" in who) fail(who.error);
  const id = (who as { id: string }).id;
  const parsed = text(1000).safeParse(form.get("body") ?? "");
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Not saved");
  if (!(await allow(`tip:remark:${id}`, ...LIMITS.tipRemarkPerUser))) fail("You are adding remarks too fast. Wait a few minutes.");
  await prisma.businessTipRemark.create({ data: { tipId, authorId: id, body: parsed.data! } });
  redirect(`${back}?remark=sent#remarks`);
}
