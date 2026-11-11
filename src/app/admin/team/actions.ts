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
import { signOutEveryone } from "@/lib/sessions";
import { sendSms, trySms } from "@/lib/sms";
import { allow } from "@/lib/rate-limit";
import { staffPasswordProblem } from "@/lib/staff-reset";
import { site } from "@/config/site";

/**
 * The admin team (/admin/team), super admin only: add sub-admins with the areas they may manage, new
 * people or someone who already has an account (a member who has paid, say), change their areas or
 * password, suspend them, or take their access away. Given a phone and no password, they are texted
 * an invitation; their first log-in texts a code and they choose their own password.
 */
const back = (q: string): never => redirect(`/admin/team?${q}`);
const areasOf = (form: FormData) => form.getAll("areas").map(String).filter((a) => AREA_KEYS.includes(a));
const password = z.string().refine((v) => !staffPasswordProblem(v));

const newStaff = z.object({
  name: z.string().trim().max(120),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email()]),
  phone: z.string().trim().max(40),
  password: z.union([z.literal(""), password]),
});

export async function addSubAdmin(form: FormData) {
  const admin = await requireAdmin();
  const parsed = newStaff.safeParse({ name: form.get("name") ?? "", email: form.get("email") ?? "", phone: form.get("phone") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) back(`add=1&error=${parsed.error.issues.some((i) => i.path[0] === "password") ? "password" : "invalid"}`);
  const d = parsed.data!;
  const email = d.email || null;
  const phone = d.phone ? phoneKey(d.phone) : null;
  if (d.phone && !phone) back("add=1&error=phone");
  if (!email && !phone) back("add=1&error=contact");
  // Without a password they set their own by SMS, which needs a phone
  if (!phone && !d.password) back("add=1&error=needs-phone");
  // "Everything" on the form: a super admin, who needs no areas
  const superAdmin = form.get("access") === "super";
  const role = superAdmin ? ("ADMIN" as const) : ("EDITOR" as const);
  const areas = superAdmin ? [] : areasOf(form);
  if (!superAdmin && !areas.length) back("add=1&error=areas");

  const [byPhone, byEmail] = await Promise.all([
    phone ? prisma.user.findUnique({ where: { phone } }) : null,
    email ? prisma.user.findUnique({ where: { email } }) : null,
  ]);
  if (byPhone && byEmail && byPhone.id !== byEmail.id) back("add=1&error=exists");
  const existing = byPhone ?? byEmail;
  if (existing && (existing.role === "ADMIN" || existing.role === "EDITOR")) back("add=1&error=already");
  if (!existing && d.name.length < 2) back("add=1&error=invalid");

  // Someone with an account keeps it. Their old password or seller PIN is cleared: an admin chooses a new one.
  const passwordHash = d.password ? await bcrypt.hash(d.password, 10) : null;
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role, adminAreas: areas, passwordHash, pinMustChange: false, phone: existing.phone ?? phone, email: existing.email ?? email } })
    : await prisma.user.create({ data: { name: d.name, email, phone, role, adminAreas: areas, passwordHash } });
  await audit(admin.id, existing ? "staff.promoted" : "staff.added", "user", user.id, { areas, role });

  revalidatePath("/admin/team");
  if (d.password) back(`saved=added-password&user=${user.id}`);
  const link = `${site.url.replace(/\/$/, "")}/login?callbackUrl=%2Fadmin`;
  const sent = await sendSms(user.phone!, `You've been added to the BizSphere-Ug team. Log in with this number at ${link} and we'll text you a code to set your password.`).catch(() => false);
  back(`saved=${sent ? "added" : "added-no-sms"}&user=${user.id}`);
}

/** Proves SMS really goes out: a text to any number, showing EgoSMS's own answer if it refuses. */
export async function sendTestSms(form: FormData) {
  const admin = await requireAdmin();
  const phone = phoneKey(String(form.get("phone") ?? ""));
  if (!phone) back("error=phone");
  if (!(await allow(`sms-test:${admin.id}`, 10, 3600))) back("error=sms-busy");
  const sent = await trySms(phone!, "BizSphere-Ug test: text messages are working.");
  await audit(admin.id, sent.ok ? "sms.test_sent" : "sms.test_failed", "user", admin.id, sent.ok ? {} : { reason: sent.reason });
  if (sent.ok) back("saved=sms-ok");
  back(`error=sms-failed&why=${encodeURIComponent(sent.ok ? "" : sent.reason)}`);
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

/** Ends every session on every device (members, sellers, experts and staff, including you). */
export async function signOutAllDevices(form: FormData) {
  const admin = await requireAdmin();
  if (form.get("confirm") !== "yes") back("error=confirm");
  const at = await signOutEveryone();
  await audit(admin.id, "sessions.signed_out_everyone", "system", undefined, { at });
  back("saved=signedout");
}

/**
 * The phone a staff member's sign-in code is texted to (src/lib/auth.ts: password + SMS code).
 * For others, like the other changes here. For yourself only to add one when your account has
 * none: switching on the second step is always safe, changing where codes go is not.
 */
export async function setStaffPhone(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const self = id === admin.id;
  const user = self
    ? await prisma.user.findUnique({ where: { id }, select: { id: true, phone: true } })
    : (await subAdmin(id)).user;
  if (!user || (self && "phone" in user && user.phone)) back("error=self");
  const phone = phoneKey(String(form.get("phone") ?? ""));
  if (!phone) back(`error=phone&user=${id}`);
  const taken = await prisma.user.findFirst({ where: { phone: phone!, id: { not: id } }, select: { id: true } });
  if (taken) back(`error=exists&user=${id}`);
  await prisma.user.update({ where: { id }, data: { phone } });
  await audit(admin.id, "staff.phone_set", "user", id);
  revalidatePath("/admin/team");
  back(`saved=phone&user=${id}`);
}
