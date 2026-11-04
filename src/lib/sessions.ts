import { prisma } from "./prisma";

/**
 * "Sign everyone out": sessions are signed tokens kept in each browser, so there is no list of
 * them to delete. Instead every sign-in records when it happened (token.signedInAt), and the
 * session check in src/lib/auth.ts refuses any session that started before this cut-off.
 * Admin → Team → "Sign everyone out" moves it to now.
 */
const KEY = "sessions.validAfter";

/** Sessions that started before this time (ms) are signed out. 0 when never set. */
export async function sessionsValidAfter(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  const t = row ? Date.parse(row.value) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** Ends every session on every device, including the caller's. */
export async function signOutEveryone() {
  const value = new Date().toISOString();
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return value;
}
