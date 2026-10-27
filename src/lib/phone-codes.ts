import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { normalizePhone } from "./phone";
import { sendSms } from "./sms";

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

const digits = (s: string) => s.replace(/\D/g, "");
const testPhone = () => digits(process.env.OTP_TEST_PHONE ?? "");
const testCode = () => process.env.OTP_TEST_CODE ?? "";

/** The phone key we store, or null if invalid. The test number is kept as typed (+123456789). */
export function phoneKey(raw: string): string | null {
  if (testPhone() && testCode() && digits(raw) === testPhone()) return `+${testPhone()}`;
  return normalizePhone(raw);
}

const isTest = (phone: string) => Boolean(testPhone() && testCode() && phone === `+${testPhone()}`);

export type SendResult = { ok: true; phone: string } | { ok: false; error: string };

export async function sendCode(raw: string): Promise<SendResult> {
  const phone = phoneKey(raw);
  if (!phone) return { ok: false, error: "Enter a valid phone number, e.g. 0772 123 456" };
  if (isTest(phone)) return { ok: true, phone };

  const last = await prisma.phoneCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_SECONDS * 1000) {
    return { ok: false, error: "A code was just sent. Wait a few seconds before asking for another." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const sent = await sendSms(phone, `Your BizSphere-Ug code is ${code}. It expires in ${CODE_MINUTES} minutes.`);
  if (!sent) return { ok: false, error: "We can't send text messages yet. Please try again later." };
  await prisma.phoneCode.deleteMany({ where: { phone } });
  await prisma.phoneCode.create({ data: { phone, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } });
  return { ok: true, phone };
}

/** True when `code` is the current code for `phone`. A used code can't be used again. */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  code = code.trim();
  if (isTest(phone)) return code === testCode();
  const row = await prisma.phoneCode.findFirst({ where: { phone, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  if (!(await bcrypt.compare(code, row.codeHash))) {
    await prisma.phoneCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.phoneCode.deleteMany({ where: { phone } });
  return true;
}
