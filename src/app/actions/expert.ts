"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { phoneKey } from "@/lib/phone-codes";
import { ensureUsername, personalUrl, sendPin } from "@/lib/pin-accounts";

/**
 * Expert portal (/expert) and the admin's expert logins (/admin/expert-logins) and expert work
 * (/admin/expert-work).
 *
 * The team lists the expert (Admin → content → Business Experts), then registers their login:
 * that links their phone to the expert (Consultant.ownerId), gives them a personal sign-in address
 * and texts a 4-digit PIN. In the portal they keep their profile and links up to date (live at once)
 * and add their work: a photo, a file and a link per item, shown once the team approves it.
 * Every action here checks on the server that the signed-in user owns the expert.
 */

async function ownExpert() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/experts/login");
  const expert = await prisma.consultant.findUnique({ where: { ownerId: session.user.id }, include: { contentItem: { select: { id: true, slug: true } } } });
  if (!expert) redirect("/expert?error=access");
  return { expert, userId: session.user.id };
}

const refresh = (slug: string) => { revalidatePath("/expert"); revalidatePath(`/experts/${slug}`); revalidatePath("/experts"); };

// Photos and files: an uploaded file (/uploads/… or the storage's https address) or any https address.
const asset = z.string().trim().max(1000).refine((v) => v === "" || v.startsWith("/uploads/") || /^https:\/\//.test(v), "Use the Upload button or an https address.");
const link = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+/.test(v), "Links start with https://");
const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const list = (max: number) => z.string().max(2000).transform((v) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, max));
const field = (form: FormData, k: string) => String(form.get(k) ?? "");

const profileSchema = z.object({
  photoUrl: asset,
  professionalTitle: text(120),
  shortSummary: text(300),
  overview: text(5000),
  specialties: list(20),
  languages: list(10),
  district: text(80),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]),
  phone: text(40),
  website: link,
  bookingUrl: link,
  availability: text(200),
  links: z.string().max(3000).transform((v) => v.split(/\s*\n\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 10)),
});

/** The expert updates their own profile. Shows on their page at once. */
export async function saveExpertProfile(form: FormData) {
  const { expert, userId } = await ownExpert();
  const parsed = profileSchema.safeParse(Object.fromEntries(Object.keys(profileSchema.shape).map((k) => [k, field(form, k)])));
  if (!parsed.success) redirect("/expert?error=profile");
  const { shortSummary, overview, photoUrl, email, website, bookingUrl, links, ...rest } = parsed.data;
  if (links.some((l) => !/^https?:\/\/[^\s]+\.[^\s]+/.test(l))) redirect("/expert?error=links");
  await prisma.$transaction([
    prisma.consultant.update({ where: { id: expert.id }, data: { ...rest, photoUrl: photoUrl || null, email: email || null, website: website || null, bookingUrl: bookingUrl || null, links } }),
    prisma.contentItem.update({ where: { id: expert.contentItem.id }, data: { shortSummary, overview } }),
  ]);
  await audit(userId, "expert.profile_saved", "consultant", expert.id);
  refresh(expert.contentItem.slug);
  redirect("/expert?saved=profile");
}

const workSchema = z.object({
  title: z.string().trim().min(2, "Name the work").max(160),
  clientName: text(160),
  year: z.string().trim().transform((v) => (v === "" ? null : Number(v))).refine((v) => v === null || (Number.isInteger(v) && v >= 1950 && v <= 2100), "Year"),
  summary: text(2000),
  outcome: text(1000),
  imageUrl: asset,
  fileUrl: asset,
  linkUrl: link,
});

/** Add a piece of work, or update one when `id` is sent. Either way it waits for the team's approval. */
export async function saveWork(form: FormData) {
  const { expert, userId } = await ownExpert();
  const parsed = workSchema.safeParse(Object.fromEntries(Object.keys(workSchema.shape).map((k) => [k, field(form, k)])));
  if (!parsed.success) redirect("/expert?error=work");
  const { imageUrl, fileUrl, linkUrl, ...rest } = parsed.data;
  const data = { ...rest, imageUrl: imageUrl || null, fileUrl: fileUrl || null, linkUrl: linkUrl || null, status: "IN_REVIEW" as const, publicationPermitted: false };
  const id = field(form, "id");
  if (id) {
    const done = await prisma.consultantProject.updateMany({ where: { id, consultantId: expert.id }, data });
    if (!done.count) redirect("/expert?error=access");
  } else {
    await prisma.consultantProject.create({ data: { ...data, consultantId: expert.id } });
  }
  await audit(userId, id ? "expert.work_updated" : "expert.work_added", "consultant", expert.id);
  refresh(expert.contentItem.slug);
  redirect(`/expert?saved=${id ? "work-updated" : "work-added"}`);
}

export async function deleteWork(form: FormData) {
  const { expert } = await ownExpert();
  await prisma.consultantProject.deleteMany({ where: { id: field(form, "id"), consultantId: expert.id } });
  refresh(expert.contentItem.slug);
  redirect("/expert?saved=work-deleted");
}

// ── Admin: expert logins (/admin/expert-logins) ──

/** Registers the expert's login: links the phone, gives a personal sign-in address and texts a 4-digit PIN. */
export async function addExpertLogin(form: FormData) {
  const staff = await requireArea("experts");
  const expert = await prisma.consultant.findUnique({ where: { id: field(form, "consultantId") } });
  const phone = phoneKey(field(form, "phone"));
  if (!expert || !phone) redirect("/admin/expert-logins?error=phone");
  const existing = await prisma.user.findUnique({ where: { phone }, include: { expertProfile: { select: { id: true } } } });
  if (existing && (existing.role === "ADMIN" || existing.role === "EDITOR")) redirect("/admin/expert-logins?error=staff");
  if (existing?.expertProfile && existing.expertProfile.id !== expert.id) redirect("/admin/expert-logins?error=taken");
  const user = existing ?? (await prisma.user.create({ data: { name: expert.fullName, phone, role: "USER" } }));
  await prisma.consultant.update({ where: { id: expert.id }, data: { ownerId: user.id } });
  const username = await ensureUsername(user.id, expert.fullName);
  const sent = await sendPin(user.id, phone, (code) => `${expert.fullName}, you are now listed as an expert on BizSphere-Ug. Your PIN is ${code}. Sign in at ${personalUrl(username)} and choose your own PIN.`);
  await audit(staff.id, "expert.login_added", "consultant", expert.id);
  revalidatePath("/admin/expert-logins");
  redirect(`/admin/expert-logins?saved=${sent ? "1" : "pin-not-sent"}`);
}

/** Texts the expert a new PIN (when they can't reset it themselves). */
export async function setExpertPin(form: FormData) {
  await requireArea("experts");
  const expert = await prisma.consultant.findUnique({ where: { id: field(form, "consultantId") }, include: { owner: true } });
  if (!expert?.owner?.phone) redirect("/admin/expert-logins?error=phone");
  const username = await ensureUsername(expert.owner.id, expert.fullName);
  const sent = await sendPin(expert.owner.id, expert.owner.phone, (code) => `Your new BizSphere-Ug expert PIN is ${code}. Sign in at ${personalUrl(username)} and choose your own PIN.`);
  revalidatePath("/admin/expert-logins");
  redirect(`/admin/expert-logins?saved=${sent ? "pin" : "pin-not-sent"}`);
}

/** Gives an older login its personal sign-in address. */
export async function makeExpertLink(form: FormData) {
  await requireArea("experts");
  const expert = await prisma.consultant.findUnique({ where: { id: field(form, "consultantId") }, select: { ownerId: true, fullName: true } });
  if (expert?.ownerId) await ensureUsername(expert.ownerId, expert.fullName);
  revalidatePath("/admin/expert-logins");
  redirect("/admin/expert-logins?saved=link");
}

export async function removeExpertLogin(form: FormData) {
  const staff = await requireArea("experts");
  await prisma.consultant.update({ where: { id: field(form, "consultantId") }, data: { ownerId: null } });
  await audit(staff.id, "expert.login_removed", "consultant", field(form, "consultantId"));
  revalidatePath("/admin/expert-logins");
  redirect("/admin/expert-logins?saved=removed");
}

// ── Admin: approve work experts added (/admin/expert-work) ──

export async function reviewExpertWork(form: FormData) {
  const staff = await requireArea("experts");
  const approve = field(form, "decision") === "approve";
  const work = await prisma.consultantProject.update({
    where: { id: field(form, "id") },
    data: { status: approve ? "PUBLISHED" : "ARCHIVED", publicationPermitted: approve },
    include: { consultant: { include: { contentItem: { select: { slug: true } } } } },
  });
  await audit(staff.id, approve ? "expert.work_approved" : "expert.work_rejected", "consultant_project", work.id);
  refresh(work.consultant.contentItem.slug);
  revalidatePath("/admin/expert-work");
  redirect(`/admin/expert-work?done=${approve ? "approved" : "rejected"}`);
}
