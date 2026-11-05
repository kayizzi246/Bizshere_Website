import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The pass between the two halves of a staff password reset: once the texted code is right, this
 * lets the person choose a new password for the next 10 minutes. It is signed, and tied to the
 * current password, so it stops working the moment the password changes and can't be used twice.
 */
const MINUTES = 10;

function sign(userId: string, expires: number, passwordHash: string | null) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  const current = createHash("sha256").update(passwordHash ?? "").digest("hex");
  return createHmac("sha256", secret).update(`staff-reset.${userId}.${expires}.${current}`).digest("hex");
}

export function makeResetPass(userId: string, passwordHash: string | null) {
  const expires = Date.now() + MINUTES * 60_000;
  return `${userId}.${expires}.${sign(userId, expires, passwordHash)}`;
}

/** The user id inside a pass, read before the signature can be checked. */
export const resetPassUser = (pass: string) => pass.split(".")[0] ?? "";

export function resetPassValid(pass: string, passwordHash: string | null) {
  const [userId, rawExpires, signature] = pass.split(".");
  const expires = Number(rawExpires);
  if (!userId || !signature || !Number.isFinite(expires) || expires < Date.now()) return false;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(userId, expires, passwordHash));
  return a.length === b.length && timingSafeEqual(a, b);
}

const EASY = new Set(["123456", "1234567", "12345678", "123456789", "1234567890", "654321", "987654321", "password", "qwerty", "bizsphere"]);

/**
 * What's wrong with a team password, or null. Numbers alone are fine, as the password is now the
 * only thing between a phone number and the admin it must not be one of the first guesses.
 * Wrong tries are paused after 5 (src/lib/auth.ts).
 */
export function staffPasswordProblem(v: string) {
  if (v.length < 6) return "Your password needs at least 6 digits or letters.";
  if (v.length > 200) return "That password is too long.";
  if (EASY.has(v.toLowerCase()) || /^(.)\1+$/.test(v)) return "That password is too easy to guess. Choose another.";
  return null;
}
