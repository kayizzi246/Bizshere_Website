import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { normalizePhone } from "./phone";
import { sendSms } from "./sms";
import { allow, clientIp, LIMITS } from "./rate-limit";

/**
 * Passwordless phone sign-in: we text a one-time code, the person types it back.
 *
 * Test login (local only): set OTP_TEST_PHONE and OTP_TEST_CODE in .env, e.g.
 * 123456789 / 0000. That number signs in with that code and no SMS is sent.
 * Never set these on the live server: anyone who knows them could sign in.
 */
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 30;
const MAX_CODES_PER_HOUR = 5;
/**
 * Codes that stay valid together: the newest few, each for CODE_MINUTES. Someone who asks for a code on
 * their laptop and again on their phone gets two SMS, and either one must work: before, asking again
 * cancelled the first SMS and typing it said "wrong code" (Nov 2026). Wrong tries count for the number
 * as a whole (MAX_ATTEMPTS across these codes), so guessing is no easier.
 */
const KEEP_CODES = 3;

const digits = (s: string) => s.replace(/\D/g, "");
const testPhone = () => digits(process.env.OTP_TEST_PHONE ?? "");
const testCode = () => process.env.OTP_TEST_CODE ?? "";

/** The phone key we store, or null if invalid. The test number is kept as typed (+123456789). */
export function phoneKey(raw: string): string | null {
  if (testPhone() && testCode() && digits(raw) === testPhone()) return `+${testPhone()}`;
  return normalizePhone(raw);
}

const isTest = (phone: string) => Boolean(testPhone() && testCode() && phone === `+${testPhone()}`);

/** True for the configured test/demo number (OTP_TEST_PHONE). Used to grant the demo its member access. */
export const isTestPhone = isTest;

const CODE_LENGTH = 6;

/** `length` lets the code box submit by itself once enough digits are typed. */
export type SendResult = { ok: true; phone: string; length: number } | { ok: false; error: string };

export async function sendCode(raw: string): Promise<SendResult> {
  const phone = phoneKey(raw);
  if (!phone) return { ok: false, error: "Enter a valid phone number, e.g. 0772 123 456" };
  if (isTest(phone)) return { ok: true, phone, length: testCode().length };

  const last = await prisma.phoneCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_SECONDS * 1000) {
    return { ok: false, error: "A code was just sent. Wait a few seconds before asking for another." };
  }
  // At most MAX_CODES_PER_HOUR texts to one number, so the form can't be used to flood a phone.
  const sentLastHour = await prisma.auditLog.count({ where: { action: "auth.code_sent", entityId: phone, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (sentLastHour >= MAX_CODES_PER_HOUR) {
    return { ok: false, error: "Too many codes were requested for this number. Please try again in an hour." };
  }
  // SMS pumping: a bot cycling through many numbers from one address, or a flood from many. Each text
  // costs credit, so both one address and the whole site are capped (src/lib/rate-limit.ts).
  const ip = await clientIp();
  if (!(await allow(`sms:ip:${ip}`, ...LIMITS.smsPerIp)) || !(await allow("sms:all", ...LIMITS.smsAll))) {
    await prisma.auditLog.create({ data: { action: "auth.code_limited", entityType: "phone", entityId: phone, details: { ip } } });
    return { ok: false, error: "Too many codes were requested. Please try again in an hour." };
  }
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  // Saved before it is texted, so the code works the moment the SMS arrives. Earlier codes keep working
  // until they expire (the newest KEEP_CODES of them).
  const row = await prisma.phoneCode.create({ data: { phone, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } });
  const sent = await sendSms(phone, `Your BizSphere-Ug code is ${code}. It expires in ${CODE_MINUTES} minutes.`);
  if (!sent) {
    await prisma.phoneCode.deleteMany({ where: { id: row.id } });
    return { ok: false, error: "We can't send text messages yet. Please try again later." };
  }
  await prisma.auditLog.create({ data: { action: "auth.code_sent", entityType: "phone", entityId: phone } });
  const keep = await prisma.phoneCode.findMany({ where: { phone }, orderBy: { createdAt: "desc" }, take: KEEP_CODES, select: { id: true } });
  await prisma.phoneCode.deleteMany({ where: { phone, id: { notIn: keep.map((k) => k.id) } } });
  return { ok: true, phone, length: CODE_LENGTH };
}

/**
 * True when `code` is one of the codes texted to `phone` in the last CODE_MINUTES (the newest
 * KEEP_CODES). A used code can't be used again. Spaces typed or pasted with the code are ignored.
 */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  code = code.replace(/\s/g, "");
  if (isTest(phone)) return code === testCode();
  const rows = await prisma.phoneCode.findMany({ where: { phone, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: KEEP_CODES });
  // Wrong tries count for the number, across its codes
  if (!rows.length || rows.reduce((n, r) => n + r.attempts, 0) >= MAX_ATTEMPTS) return false;
  let match: (typeof rows)[number] | null = null;
  for (const r of rows) if (await bcrypt.compare(code, r.codeHash)) { match = r; break; }
  if (!match) {
    await prisma.phoneCode.updateMany({ where: { id: rows[0].id, attempts: { lt: MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
    return false;
  }
  // Consume only the verified row atomically: of two requests with the same code, one wins.
  const consumed = await prisma.phoneCode.deleteMany({
    where: { id: match.id, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
  });
  if (consumed.count !== 1) return false;
  // Signed in: the codes sent before this one are done with; one asked for since stays (preserve any newly issued replacement)
  await prisma.phoneCode.deleteMany({ where: { phone, createdAt: { lt: match.createdAt } } });
  return true;
}
