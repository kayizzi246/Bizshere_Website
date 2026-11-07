"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";

/** The team's controls for the forum and the remarks under tips (/admin/forum). Nothing is deleted: hidden things can be shown again. */

const s = (form: FormData, k: string) => String(form.get(k) ?? "").slice(0, 64);
const done = (show: string, msg: string): never => redirect(`/admin/forum?show=${show}&done=${encodeURIComponent(msg)}`);

export async function setTopic(form: FormData) {
  const editor = await requireArea("community");
  const id = s(form, "id"), act = s(form, "act");
  const data = act === "open" ? { status: "OPEN" as const } : act === "close" ? { status: "CLOSED" as const } : act === "hide" ? { status: "HIDDEN" as const }
    : act === "pin" ? { isPinned: true } : act === "unpin" ? { isPinned: false } : null;
  if (!data) done("topics", "Unknown action");
  await prisma.forumTopic.update({ where: { id }, data: data! });
  await audit(editor.id, `forum.topic.${act}`, "forum_topic", id);
  revalidatePath("/admin/forum");
  done("topics", { open: "Topic open again", close: "Topic closed", hide: "Topic hidden", pin: "Topic pinned", unpin: "Topic unpinned" }[act]!);
}

export async function setMessage(form: FormData) {
  const editor = await requireArea("community");
  const id = s(form, "id"), hide = s(form, "act") === "hide";
  await prisma.forumPost.update({ where: { id }, data: hide ? { hiddenAt: new Date(), hiddenById: editor.id } : { hiddenAt: null, hiddenById: null } });
  await audit(editor.id, hide ? "forum.message.hidden" : "forum.message.shown", "forum_post", id);
  done("messages", hide ? "Message hidden" : "Message shown again");
}

export async function setRemark(form: FormData) {
  const editor = await requireArea("community");
  const id = s(form, "id"), hide = s(form, "act") === "hide";
  await prisma.businessTipRemark.update({ where: { id }, data: hide ? { hiddenAt: new Date(), hiddenById: editor.id } : { hiddenAt: null, hiddenById: null } });
  await audit(editor.id, hide ? "tip.remark.hidden" : "tip.remark.shown", "business_tip_remark", id);
  done("remarks", hide ? "Remark hidden" : "Remark shown again");
}
