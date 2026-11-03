"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access";
import { audit } from "@/lib/audit";
import { AREA_KEYS } from "@/lib/admin-areas";
import { phoneKey } from "@/lib/phone-codes";

/**
 * The admin team (/admin/team), super admin only: add sub-admins with the areas they may manage,
 * change their areas or password, suspend them, or take their access away. Sub-admins sign in at
 * /admin with their email (or phone) and the password set here.
 */
const back = (q: string): never => redirect(`/admin/team?${q}`);
const areasOf = (form: FormData) => form.getAll("areas").map(String).filter((a) => AREA_KEYS.includes(a));
const password = z.string().min(10, "At least 10 characters").max(200);

const newStaff = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email()]),
  phone: z.string().trim().max(40),
  password,
});

export async function addSubAdmin(form: FormData) {
  const admin = await requireAdmin();
  const parsed = newStaff.safeParse({ name: form.get("name"), email: form.get("email") ?? "", phone: form.get("phone") ?? "", password: form.get("password") });
  if (!parsed.success) back(`add=1&error=${parsed.error.issues.some((i) => i.path[0] === "password") ? "password" : "invalid"}`);
  const d = parsed.data!;
  const email = d.email || null;
  const phone = d.phone ? phoneKey(d.phone) : null;
  if (d.phone && !phone) back("add=1&error=phone");
  if (!email && !phone) back("add=1&error=contact");
  if ((email && (await prisma.user.findUnique({ where: { email } }))) || (phone && (await prisma.user.findUnique({ where: { phone } })))) back("add=1&error=exists");
  const areas = areasOf(form);
  if (!areas.length) back("add=1&error=areas");
  const user = await prisma.user.create({ data: { name: d.name, email, phone, role: "EDITOR", adminAreas: areas, passwordHash: await bcrypt.hash(d.password, 10) } });
  await audit(admin.id, "staff.added", "user", user.id, { areas });
  revalidatePath("/admin/team");
  back(`saved=added&user=${user.id}`);
}

/** Only sub-admins: the super admin opens everything anyway. */
async function subAdmin(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) back("error=self");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user || (user.role !== "EDITOR" && user.role !== "ADMIN")) back("error=missing");
  return { admin, user: user! };
}

export async function saveAreas(form: FormData) {
  const { admin, user } = await subAdmin(String(form.get("id")));
  if (user.role !== "EDITOR") back("error=super");
  const areas = areasOf(form);
  await prisma.user.update({ where: { id: user.id }, data: { adminAreas: areas } });
  await audit(admin.id, "staff.areas_changed", "user", user.id, { areas });
  revalidatePath("/admin/team");
  back(`saved=areas&user=${user.id}`);
}

export async function setStaffPassword(form: FormData) {
  const { admin, user } = await subAdmin(String(form.get("id")));
  const next = password.safeParse(String(form.get("password") ?? ""));
  if (!next.success) back(`error=password&user=${user.id}`);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next.data!, 10) } });
  // Lift any wrong-password pause on their email or phone.
  const keys = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, phone: true } });
  await prisma.auditLog.deleteMany({ where: { action: "auth.login_failed", entityId: { in: [keys?.email, keys?.phone].filter((k): k is string => Boolean(k)).map((k) => k.toLowerCase()) } } });
  await audit(admin.id, "staff.password_set", "user", user.id);
  back(`saved=password&user=${user.id}`);
}

/** Suspend or restore: a suspended account is signed out within minutes (src/lib/auth.ts). */
export async function setStaffSuspended(form: FormData) {
  const { admin, user } = await subAdmin(String(form.get("id")));
  const suspend = form.get("suspend") === "1";
  await prisma.user.update({ where: { id: user.id }, data: { isSuspended: suspend } });
  await audit(admin.id, suspend ? "staff.suspended" : "staff.restored", "user", user.id);
  revalidatePath("/admin/team");
  back(`saved=${suspend ? "suspended" : "restored"}&user=${user.id}`);
}

/** Super admin ↔ sub-admin. A new super admin opens everything; a demoted one keeps the areas ticked. */
export async function setSuperAdmin(form: FormData) {
  const { admin, user } = await subAdmin(String(form.get("id")));
  const makeSuper = form.get("super") === "1";
  await prisma.user.update({ where: { id: user.id }, data: { role: makeSuper ? "ADMIN" : "EDITOR", ...(makeSuper ? {} : { adminAreas: areasOf(form) }) } });
  await audit(admin.id, "staff.role_changed", "user", user.id, { role: makeSuper ? "ADMIN" : "EDITOR" });
  revalidatePath("/admin/team");
  back(`saved=role&user=${user.id}`);
}

/** Takes away admin access: the account becomes an ordinary user (their history stays). */
export async function removeStaff(form: FormData) {
  const { admin, user } = await subAdmin(String(form.get("id")));
  await prisma.user.update({ where: { id: user.id }, data: { role: "USER", adminAreas: [] } });
  await audit(admin.id, "staff.removed", "user", user.id);
  revalidatePath("/admin/team");
  back("saved=removed");
}
