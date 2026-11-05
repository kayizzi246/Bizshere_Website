"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { staffAccess } from "@/lib/access";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { phoneKey, sendCode, verifyCode } from "@/lib/phone-codes";
import { clearFailures } from "@/lib/pin-accounts";
import { prisma } from "@/lib/prisma";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";
import { signOutUser } from "@/lib/sessions";
import { sendSms } from "@/lib/sms";
import { makeResetPass, resetPassUser, resetPassValid, staffPasswordProblem } from "@/lib/staff-reset";

/**
 * Staff looking after their own sign-in. First log-in and forgot password: a code texted to the phone on
 * the account, then a password of their own. My account (/admin/account): name, email, phone, password.
 *
 * Forgot password answers the same whether or not the account exists, so it can't be used to find
 * out who is on the team. Changes in My account ask for the current password, a new phone is proved
 * by a code sent to it, and each change tells the person on the old details, in case it wasn't them.
 */
const BUSY = "Too many tries. Please wait a while and try again.";

async function staffBy(identifier: string) {
  const id = identifier.trim();
  const phone = id.includes("@") ? null : phoneKey(id);
  if (!phone && !id.includes("@")) return null;
  const user = await prisma.user.findUnique({ where: phone ? { phone } : { email: id.toLowerCase() } });
  return user && !user.isSuspended && (user.role === "ADMIN" || user.role === "EDITOR") ? user : null;
}

/** Tells someone their sign-in details changed, on the phone and email they had. */
async function warn(to: { phone: string | null; email: string | null }, what: string) {
  const text = `${what} on your BizSphere-Ug team account. If this wasn't you, contact your super admin now.`;
  await Promise.all([
    to.phone ? sendSms(to.phone, text).catch(() => false) : false,
    to.email ? sendEmail(to.email, "Your BizSphere-Ug team account changed", text).catch(() => false) : false,
  ]);
}

// ── Forgot password ──

/**
 * A new team member's first log-in: they have no password yet, so their number gets the code and
 * they go on to choose one. Everyone else, known or not, carries on to the password check.
 */
export async function staffLoginStep(identifier: string): Promise<{ next: "password" } | { next: "code" } | { next: "error"; error: string }> {
  if (!(await allow(`staff-reset:ip:${await clientIp()}`, ...LIMITS.staffLoginPerIp))) return { next: "error", error: BUSY };
  const user = await staffBy(String(identifier));
  if (!user?.phone || user.passwordHash) return { next: "password" };
  const sent = await sendCode(user.phone);
  if (!sent.ok) return { next: "error", error: sent.error };
  await audit(user.id, "auth.staff_first_login", "user", user.id);
  return { next: "code" };
}

/** Step 1. Always answers the same; a code goes out only to a team account with a phone. */
export async function requestStaffReset(identifier: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await allow(`staff-reset:ip:${await clientIp()}`, ...LIMITS.staffResetPerIp))) return { ok: false, error: BUSY };
  const user = await staffBy(String(identifier));
  if (user?.phone) {
    const sent = await sendCode(user.phone);
    // Not shown on the form, which must not reveal the account: the log and audit trail have it
    if (!sent.ok) console.error(`staff reset: code not sent: ${sent.error}`);
    await audit(user.id, sent.ok ? "auth.staff_reset_requested" : "auth.staff_reset_sms_failed", "user", user.id);
  }
  return { ok: true };
}

/** Step 2. The right code gives a short-lived pass to choose a new password. */
export async function checkStaffResetCode(identifier: string, code: string): Promise<{ ok: true; pass: string } | { ok: false; error: string }> {
  if (!(await allow(`login:ip:${await clientIp()}`, ...LIMITS.loginPerIp))) return { ok: false, error: BUSY };
  const user = await staffBy(String(identifier));
  if (!user?.phone || !(await verifyCode(user.phone, String(code)))) return { ok: false, error: "That code is wrong or has expired. Ask for a new one." };
  return { ok: true, pass: makeResetPass(user.id, user.passwordHash) };
}

/** Step 3. Saves the new password, ends the person's other sessions and tells them. */
export async function finishStaffReset(pass: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = staffPasswordProblem(String(next));
  if (problem) return { ok: false, error: problem };
  const user = await prisma.user.findUnique({ where: { id: resetPassUser(String(pass)) } });
  if (!user || user.isSuspended || (user.role !== "ADMIN" && user.role !== "EDITOR") || !resetPassValid(String(pass), user.passwordHash)) {
    return { ok: false, error: "This reset has expired. Please start again." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10), pinMustChange: false } });
  await signOutUser(user.id);
  if (user.phone) await clearFailures(user.phone);
  await audit(user.id, "auth.staff_password_reset", "user", user.id);
  if (user.passwordHash) await warn(user, "Your password was changed"); // not on the first one they choose
  return { ok: true };
}

// ── My account ──

/** The signed-in team member, and whether `current` is their password. Limited, so it can't be guessed. */
async function me(current: string) {
  const staff = await staffAccess();
  if (!(await allow(`account:user:${staff.id}`, ...LIMITS.accountPerUser))) return { user: null, error: BUSY };
  const user = await prisma.user.findUnique({ where: { id: staff.id } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    await audit(staff.id, "auth.account_wrong_password", "user", staff.id);
    return { user: null, error: "Your current password is not correct." };
  }
  return { user, error: null };
}

const back = (q: string): never => redirect(`/admin/account?${q}`);

export async function saveMyName(form: FormData) {
  const staff = await staffAccess();
  const name = z.string().trim().min(2).max(120).safeParse(form.get("name"));
  if (!name.success) back("error=name");
  await prisma.user.update({ where: { id: staff.id }, data: { name: name.data } });
  revalidatePath("/admin", "layout");
  back("saved=name");
}

export async function saveMyEmail(form: FormData) {
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(form.get("email"));
  if (!email.success) back("error=email");
  const { user, error } = await me(String(form.get("current") ?? ""));
  if (!user) return back(`error=${error === BUSY ? "busy" : "current"}`);
  const taken = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } });
  if (taken && taken.id !== user.id) back("error=email-taken");
  await prisma.user.update({ where: { id: user.id }, data: { email: email.data } });
  await audit(user.id, "staff.email_changed", "user", user.id);
  await warn(user, "Your email was changed");
  back("saved=email");
}

/** Phone, step 1: texts a code to the new number. */
export async function sendPhoneChangeCode(rawPhone: string, current: string): Promise<{ ok: true; length: number } | { ok: false; error: string }> {
  const { user, error } = await me(String(current));
  if (!user) return { ok: false, error: error! };
  const phone = phoneKey(String(rawPhone));
  if (!phone) return { ok: false, error: "Enter a valid phone number, e.g. 0772 123 456." };
  if (phone === user.phone) return { ok: false, error: "That is already your number." };
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) return { ok: false, error: "That number is on another account." };
  const sent = await sendCode(phone);
  return sent.ok ? { ok: true, length: sent.length } : { ok: false, error: sent.error };
}

/** Phone, step 2: the code proves the new number is theirs. */
export async function savePhoneChange(rawPhone: string, code: string, current: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, error } = await me(String(current));
  if (!user) return { ok: false, error: error! };
  const phone = phoneKey(String(rawPhone));
  if (!phone || !(await verifyCode(phone, String(code)))) return { ok: false, error: "That code is wrong or has expired. Ask for a new one." };
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) return { ok: false, error: "That number is on another account." };
  await prisma.user.update({ where: { id: user.id }, data: { phone } });
  await audit(user.id, "staff.phone_changed", "user", user.id);
  await warn(user, "Your phone number was changed");
  revalidatePath("/admin/account");
  return { ok: true };
}

/** Ends every session of this person, this one included: the page then sends them to sign in again. */
export async function changeMyPassword(form: FormData) {
  const next = String(form.get("next") ?? "");
  const problem = staffPasswordProblem(next);
  if (problem) back(`error=${problem.includes("easy") ? "easy" : "short"}`);
  if (next !== form.get("confirm")) back("error=match");
  const { user, error } = await me(String(form.get("current") ?? ""));
  if (!user) return back(`error=${error === BUSY ? "busy" : "current"}`);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await signOutUser(user.id);
  await audit(user.id, "staff.password_changed", "user", user.id);
  await warn(user, "Your password was changed");
  back("saved=password");
}
