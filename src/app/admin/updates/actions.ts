"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";

// Date inputs give YYYY-MM-DD. Read them as Kampala days: a start date opens at
// 00:00 and an end date runs to the end of that day.
const day = (edge: "start" | "end") =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : `${v}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+03:00`),
    z.coerce.date().optional(),
  );

const updateSchema = z.object({
  message: z.string().trim().min(1, "Write the update text").max(200, "Keep updates under 200 characters"),
  href: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.string().regex(/^(\/|https?:\/\/)\S*$/, "Links must start with / (a page on this site) or https://").optional(),
  ),
  startsAt: day("start"),
  endsAt: day("end"),
  isActive: z.boolean(),
}).refine((d) => !d.startsAt || !d.endsAt || d.startsAt <= d.endsAt, { message: "End date can't be before the start date", path: ["endsAt"] });

function parse(form: FormData) {
  const parsed = updateSchema.safeParse({ ...Object.fromEntries(form), isActive: form.get("isActive") === "on" });
  if (!parsed.success) redirect(`/admin/updates?error=${encodeURIComponent(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? parsed.error.issues[0]?.message ?? "Invalid input")}`);
  const d = parsed.data;
  return { message: d.message, href: d.href ?? null, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, isActive: d.isActive };
}

function done(flag: string) {
  revalidatePath("/admin/updates");
  revalidatePath("/");
  redirect(`/admin/updates?${flag}=1`);
}

export async function createUpdate(form: FormData) {
  const editor = await requireStaff();
  const data = parse(form);
  const last = await prisma.siteUpdate.aggregate({ _max: { sortOrder: true } });
  const u = await prisma.siteUpdate.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  await audit(editor.id, "site_update.created", "site_update", u.id);
  done("added");
}

export async function saveUpdate(form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id") ?? "");
  const data = parse(form);
  await prisma.siteUpdate.update({ where: { id }, data });
  await audit(editor.id, "site_update.updated", "site_update", id);
  done("saved");
}

export async function toggleUpdate(form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id") ?? "");
  const u = await prisma.siteUpdate.findUniqueOrThrow({ where: { id } });
  await prisma.siteUpdate.update({ where: { id }, data: { isActive: !u.isActive } });
  await audit(editor.id, u.isActive ? "site_update.hidden" : "site_update.shown", "site_update", id);
  done("saved");
}

/** Swaps an update with its neighbour so the marquee order changes by one step. */
export async function moveUpdate(dir: "up" | "down", form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id") ?? "");
  const all = await prisma.siteUpdate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const i = all.findIndex((u) => u.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) done("saved");
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((u, n) => prisma.siteUpdate.update({ where: { id: u.id }, data: { sortOrder: n + 1 } })));
  await audit(editor.id, "site_update.moved", "site_update", id, { dir });
  done("saved");
}

export async function deleteUpdate(form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id") ?? "");
  const u = await prisma.siteUpdate.delete({ where: { id } });
  await audit(editor.id, "site_update.deleted", "site_update", id, { message: u.message });
  done("deleted");
}
