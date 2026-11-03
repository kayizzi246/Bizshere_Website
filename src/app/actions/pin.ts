"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { phoneKey, sendCode, verifyCode } from "@/lib/phone-codes";
import { canUse, clearFailures, pinAccount, PORTAL, type PinKind } from "@/lib/pin-accounts";

/**
 * Sign-in steps shared by the seller and expert logins (src/components/PinLogin.tsx): is this a
 * registered account, forgotten PIN by SMS, and choosing your own PIN. `login` is a phone number
 * or, on a personal sign-in address, the username. `kind` is the portal the form is for; "any"
 * on the personal address.
 */
type Kind = PinKind | "any";
const kindOf = (k: string): Kind => (k === "supplier" || k === "expert" ? k : "any");
const pin = z.string().regex(/^\d{4}$/, "4 digits");

async function account(login: string, kind: string) {
  const a = await pinAccount(login);
  return a && canUse(a, kindOf(kind)) ? a : null;
}

const notRegistered = (kind: string) => (kind === "expert" ? "This number isn't registered as an expert." : kind === "supplier" ? "This number isn't registered as a seller." : "This account can't sign in here.");

/** Before signing in: lets the form say "not registered, call us" instead of "wrong PIN". */
export async function pinStatus(login: string, kind: string): Promise<"ok" | "not-registered" | "no-password" | "invalid"> {
  const a = await pinAccount(login);
  if (!a) return phoneKey(login) || /^[a-z0-9-]{3,40}$/i.test(login.trim()) ? "not-registered" : "invalid";
  if (!canUse(a, kindOf(kind))) return "not-registered";
  return a.passwordHash ? "ok" : "no-password";
}

/** Forgot PIN: texts a one-time code to the account's phone (same codes and limits as phone sign-in). */
export async function requestPinReset(login: string, kind: string): Promise<{ ok: true; length: number } | { ok: false; error: string }> {
  const a = await account(login, kind);
  if (!a?.phone) return { ok: false, error: notRegistered(kind) };
  const sent = await sendCode(a.phone);
  return sent.ok ? { ok: true, length: sent.length } : { ok: false, error: sent.error };
}

/** Forgot PIN, second step: the texted code proves it's them; save the new PIN. The form then signs in with it. */
export async function resetPinWithCode(login: string, code: string, next: string, kind: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await account(login, kind);
  if (!a?.phone) return { ok: false, error: notRegistered(kind) };
  if (!pin.safeParse(next).success) return { ok: false, error: "Your new PIN must be 4 digits." };
  if (!(await verifyCode(a.phone, code))) return { ok: false, error: "That code is wrong or has expired. Ask for a new one." };
  await prisma.user.update({ where: { id: a.id }, data: { passwordHash: await bcrypt.hash(next, 10), pinMustChange: false } });
  await clearFailures(a.phone);
  return { ok: true };
}

/** The signed-in seller or expert chooses their own PIN (after a texted PIN, or any time in their portal). */
export async function changeMyPin(form: FormData) {
  const back = form.get("back") === PORTAL.expert ? PORTAL.expert : PORTAL.supplier;
  const session = await getSession();
  if (!session?.user?.id) redirect(back === PORTAL.expert ? "/experts/login" : "/suppliers/login");
  const next = pin.safeParse(String(form.get("password") ?? ""));
  if (!next.success || form.get("password") !== form.get("confirm")) redirect(`${back}?error=password`);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(next.data, 10), pinMustChange: false } });
  redirect(`${back}?saved=password`);
}
